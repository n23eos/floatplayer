// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  buildWatchPage,
  installChromeStub,
  loadContentScripts
} from "./helpers/extension-env.js";

installChromeStub();
globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));
const YTFP = loadContentScripts();

let page;
let sequence = 0;

beforeEach(async () => {
  page = buildWatchPage();
  window.history.replaceState({}, "", `/watch?v=${String(++sequence).padStart(11, "0")}`);
  await YTFP.settings.load();
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
  YTFP.pagePanel.ensurePanel();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("page panel updates playback by events without periodic layout reads", async () => {
  vi.useFakeTimers();
  const rootRect = vi.spyOn(page.player, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 800,
    bottom: 450,
    width: 800,
    height: 450
  });
  Object.defineProperty(page.video, "paused", { configurable: true, value: true });

  YTFP.pagePanel.ensurePanel();
  await Promise.resolve();
  await Promise.resolve();
  const panel = document.querySelector(".ytfp-page-panel");
  const play = [...panel.querySelectorAll("button")].find((button) => button.textContent === "▶");
  expect(play).not.toBeUndefined();

  rootRect.mockClear();
  vi.advanceTimersByTime(2000);
  expect(rootRect).not.toHaveBeenCalled();

  Object.defineProperty(page.video, "paused", { configurable: true, value: false });
  page.video.dispatchEvent(new Event("play"));
  expect(play.textContent).toBe("Ⅱ");
  expect(rootRect).not.toHaveBeenCalled();

  window.dispatchEvent(new Event("resize"));
  expect(rootRect).toHaveBeenCalledTimes(1);
});

test("timeline keyboard handling wins over global capture hotkeys", () => {
  Object.defineProperty(page.video, "duration", { configurable: true, value: 200 });
  page.video.currentTime = 60;
  const progress = YTFP.pipProgress.build(document, {
    getVideo: () => page.player.querySelector("video")
  });
  document.body.append(progress.element);
  const hotkeys = YTFP.playbackHotkeys.attach(document, {
    getVideo: () => page.player.querySelector("video")
  });
  const track = progress.element.querySelector(".ytfp-progress");
  const press = (key) => track.dispatchEvent(new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true
  }));

  try {
    track.focus();
    expect(document.activeElement).toBe(track);
    press("ArrowRight");
    expect(page.video.currentTime).toBe(65);
    press("Home");
    expect(page.video.currentTime).toBe(0);
    press("End");
    expect(page.video.currentTime).toBe(200);
  } finally {
    hotkeys.cleanup();
    progress.cleanup();
    progress.element.remove();
  }
});

test("timeline observer ignores unrelated player mutations without rendering", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = undefined;
  Object.defineProperty(page.video, "duration", { configurable: true, value: 100 });
  const getVideo = vi.fn(() => page.player.querySelector("video"));
  const progress = YTFP.pipProgress.build(document, {
    getVideo
  });
  document.body.append(progress.element);
  await Promise.resolve();
  const seekRange = vi.spyOn(YTFP.playerApi, "getSeekRange");
  seekRange.mockClear();
  getVideo.mockClear();

  try {
    page.player.appendChild(document.createElement("span"));
    await vi.waitFor(() => expect(getVideo).toHaveBeenCalled());
    expect(seekRange).not.toHaveBeenCalled();
  } finally {
    progress.cleanup();
    progress.element.remove();
    globalThis.fetch = originalFetch;
  }
});
