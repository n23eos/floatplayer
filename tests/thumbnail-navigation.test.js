import { afterEach, describe, expect, test, vi } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const NAVIGATION_SOURCE = readFileSync(new URL("../extension/content/navigation.js", import.meta.url), "utf8");
const BRIDGE_SOURCE = readFileSync(new URL("../extension/content/yt-navigate-bridge.js", import.meta.url), "utf8");
const VIDEO_ID = "AAAAAAAAAAA";
const OTHER_VIDEO_ID = "BBBBBBBBBBB";

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event) {
      for (const listener of [...(listeners.get(type) || [])]) listener(event);
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    }
  };
}

function setupNavigation({ pathname = "/watch", search = `?v=${VIDEO_ID}`, readyState = 1 } = {}) {
  const windowEvents = createEventTarget();
  const documentEvents = createEventTarget();
  const location = { origin: "https://www.youtube.com", pathname, search };
  const video = { readyState };
  const player = { querySelector: selector => selector === "video" ? video : null };
  const document = {
    ...documentEvents,
    querySelector: selector => selector === "#movie_player" ? player : null
  };
  const window = {
    ...windowEvents,
    postMessage: vi.fn()
  };
  let uuid = 0;
  const context = vm.createContext({
    window,
    document,
    location,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    crypto: { randomUUID: () => `request_${String(++uuid).padStart(16, "0")}` }
  });
  vm.runInContext(NAVIGATION_SOURCE, context);
  const reply = (request, overrides = {}, source = window, origin = location.origin) => {
    windowEvents.dispatch("message", {
      source,
      origin,
      data: {
        type: "ytfp-player-ready-result",
        requestId: request.requestId,
        videoId: request.videoId,
        ready: true,
        ...overrides
      }
    });
  };
  return { navigation: context.YTFP.navigation, window, windowEvents, documentEvents, location, video, reply };
}

function setupBridge({ pathname = "/watch", search = `?v=${VIDEO_ID}`, playerVideoId = VIDEO_ID, readyState = 1 } = {}) {
  const events = createEventTarget();
  const location = { origin: "https://www.youtube.com", pathname, search };
  const video = { readyState };
  const player = {
    classList: { contains: name => name === "ad-showing" },
    getVideoData: () => ({ video_id: playerVideoId }),
    querySelector: selector => selector === "video" ? video : null
  };
  const app = { fire: vi.fn() };
  const document = { querySelector: selector => selector === "#movie_player" ? player : selector === "ytd-app" ? app : null };
  const window = { ...events, postMessage: vi.fn() };
  const context = vm.createContext({ window, document, location, URLSearchParams });
  vm.runInContext(BRIDGE_SOURCE, context);
  const send = (data, source = window, origin = location.origin) => {
    events.dispatch("message", { source, origin, data });
  };
  return { send, window, app, location, video };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("navigation.waitForPlayer", () => {
  test("accepts a correlated ready reply for the current root player", async () => {
    const env = setupNavigation();
    const result = env.navigation.waitForPlayer(VIDEO_ID);
    const request = env.window.postMessage.mock.calls[0][0];

    env.reply(request);

    await expect(result).resolves.toBe(true);
    expect(env.windowEvents.listenerCount("message")).toBe(0);
  });

  test("ignores stale replies and a player for another video", async () => {
    const env = setupNavigation();
    const resolved = vi.fn();
    const result = env.navigation.waitForPlayer(VIDEO_ID).then(resolved);
    const request = env.window.postMessage.mock.calls[0][0];

    env.reply(request, { requestId: "request_0000000000000099" });
    env.reply(request, { videoId: OTHER_VIDEO_ID });
    env.reply(request, {}, {});
    env.reply(request, {}, env.window, "https://evil.example");
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    env.reply(request);
    await result;
    expect(resolved).toHaveBeenCalledWith(true);
  });

  test("does not accept bridge readiness until the root video has metadata", async () => {
    const env = setupNavigation({ readyState: 0 });
    const resolved = vi.fn();
    const result = env.navigation.waitForPlayer(VIDEO_ID).then(resolved);
    const request = env.window.postMessage.mock.calls[0][0];

    env.reply(request);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    env.video.readyState = 1;
    env.reply(request);
    await result;
    expect(resolved).toHaveBeenCalledWith(true);
  });

  test("rejects a request when the page is not the target watch page", async () => {
    const env = setupNavigation({ pathname: "/", search: "" });

    await expect(env.navigation.waitForPlayer(VIDEO_ID)).resolves.toBe(false);
    expect(env.window.postMessage).not.toHaveBeenCalled();
    expect(env.windowEvents.listenerCount("message")).toBe(0);
  });

  test("times out and leaves no poll or listener behind", async () => {
    vi.useFakeTimers();
    const env = setupNavigation();
    const result = env.navigation.waitForPlayer(VIDEO_ID);

    await vi.advanceTimersByTimeAsync(10000);

    await expect(result).resolves.toBe(false);
    expect(env.windowEvents.listenerCount("message")).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("aborts polling and ignores a late ready reply", async () => {
    vi.useFakeTimers();
    const env = setupNavigation();
    const controller = new AbortController();
    const result = env.navigation.waitForPlayer(VIDEO_ID, { signal: controller.signal });
    const request = env.window.postMessage.mock.calls[0][0];

    controller.abort();
    env.reply(request);

    await expect(result).resolves.toBe(false);
    expect(env.windowEvents.listenerCount("message")).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("navigation.go", () => {
  test("does not send navigation for an already aborted request", async () => {
    const env = setupNavigation();
    const controller = new AbortController();
    controller.abort();

    await expect(env.navigation.go(VIDEO_ID, false, { signal: controller.signal })).resolves.toBe(false);
    expect(env.window.postMessage).not.toHaveBeenCalled();
  });

  test("cancels an in-flight navigation and removes its listener", async () => {
    vi.useFakeTimers();
    const env = setupNavigation();
    const controller = new AbortController();
    const result = env.navigation.go(VIDEO_ID, false, { signal: controller.signal });

    controller.abort();

    await expect(result).resolves.toBe(false);
    expect(env.documentEvents.listenerCount("yt-navigate-finish")).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("MAIN navigation bridge readiness", () => {
  const request = {
    type: "ytfp-player-ready",
    requestId: "request_0000000000000001",
    videoId: VIDEO_ID
  };

  test("reports the target as ready even while the native player shows an ad", () => {
    const env = setupBridge();

    env.send(request);

    expect(env.window.postMessage).toHaveBeenCalledWith({
      type: "ytfp-player-ready-result",
      requestId: request.requestId,
      videoId: VIDEO_ID,
      ready: true
    }, "https://www.youtube.com");
  });

  test("reports false for a stale player or wrong page", () => {
    const stale = setupBridge({ playerVideoId: OTHER_VIDEO_ID });
    stale.send(request);
    expect(stale.window.postMessage.mock.calls[0][0].ready).toBe(false);

    const homepage = setupBridge({ pathname: "/", search: "" });
    homepage.send(request);
    expect(homepage.window.postMessage.mock.calls[0][0].ready).toBe(false);
  });

  test("rejects foreign senders, origins and malformed identifiers", () => {
    const env = setupBridge();

    env.send(request, {});
    env.send(request, env.window, "https://evil.example");
    env.send({ ...request, requestId: "short" });
    env.send({ ...request, videoId: "invalid" });

    expect(env.window.postMessage).not.toHaveBeenCalled();
    expect(env.app.fire).not.toHaveBeenCalled();
  });
});
