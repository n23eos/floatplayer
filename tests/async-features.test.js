import { describe, test, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load(file, globals = {}) {
  const context = vm.createContext({ console, setTimeout, clearTimeout, AbortController, ...globals });
  vm.runInContext(readFileSync(new URL(`../extension/${file}`, import.meta.url), "utf8"), context);
  return context;
}
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const response = id => ({ ok: true, text: async () => `/shorts/${id}` });
afterEach(() => vi.restoreAllMocks());
describe("Shorts cancellation", () => {
  function setup() {
    const first = deferred(), second = deferred();
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const window = { postMessage: vi.fn(), location: { origin: "https://www.youtube.com" } };
    const { YTFP } = load("content/shorts-search.js", { fetch, window });
    return { search: YTFP.shortsSearch, first, second, fetch, window };
  }
  test("stopping ignores a response even if fetch did not honor abort", async () => {
    const env = setup(); const pending = env.search.search("first"); env.search.stop();
    expect(env.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    env.first.resolve(response("AAAAAAAAAAA"));
    expect((await pending).cancelled).toBe(true);
    expect(env.search.isActive()).toBe(false); expect(env.window.postMessage).not.toHaveBeenCalled();
  });
  test("an older query cannot replace a newer result", async () => {
    const env = setup(); const old = env.search.search("old"), latest = env.search.search("new");
    env.second.resolve(response("BBBBBBBBBBB")); await latest;
    env.first.resolve(response("AAAAAAAAAAA")); await old;
    expect(env.window.postMessage).toHaveBeenCalledTimes(1);
    expect(env.window.postMessage.mock.calls[0][0].videoId).toBe("BBBBBBBBBBB");
    expect(env.search.getState()).toEqual({ index: 1, count: 1 });
  });
});

describe("saved queue", () => {
  function setup(storage = {}) {
    const local = { get: vi.fn(async key => ({ [key]: storage[key] })), set: vi.fn(async values => Object.assign(storage, values)) };
    const go = vi.fn(async () => false);
    const { YTFP } = load("content/watch-queue.js", { chrome: { runtime: { sendMessage: async () => ({ tabId: 12 }) }, storage: { local } }, YTFP: { navigation: { go } } });
    return { queue: YTFP.watchQueue, go, storage, local };
  }
  test("retains failed items, removes only confirmed navigation, persists order", async () => {
    const env = setup(); await env.queue.add({ videoId: "AAAAAAAAAAA", title: "A" }); await env.queue.add({ videoId: "BBBBBBBBBBB", title: "B" }, true);
    expect(env.storage["queue:12"].map(item => item.title)).toEqual(["B", "A"]);
    await env.queue.playNext(); expect(env.queue.get().items).toHaveLength(2); expect(env.queue.get().error).toBe(true);
    env.go.mockResolvedValue(true); await env.queue.playNext();
    expect(env.queue.get().items.map(item => item.title)).toEqual(["A"]);
    const restored = setup(env.storage); await restored.queue.ready;
    expect(restored.queue.get().items.map(item => item.title)).toEqual(["A"]);
  });
  test("waits for storage load before editing and serializes persistence", async () => {
    const env = setup({ "queue:12": [{ videoId: "AAAAAAAAAAA", title: "A" }] });
    await env.queue.add({ videoId: "BBBBBBBBBBB", title: "B" });
    await env.queue.move("BBBBBBBBBBB", -1);
    expect(env.storage["queue:12"].map(item => item.title)).toEqual(["B", "A"]);
    await env.queue.remove("BBBBBBBBBBB"); expect(env.queue.get().items).toHaveLength(1);
  });
  test("reports storage failures without destroying the in-memory queue", async () => {
    const env = setup(); env.local.set.mockRejectedValue(new Error("quota"));
    await env.queue.add({ videoId: "AAAAAAAAAAA", title: "A" });
    expect(env.queue.get().error).toBe(true); expect(env.queue.get().items).toHaveLength(1);
  });
});

describe("command routing", () => {
  test("prefers paused PiP over an audible or focused YouTube tab", async () => {
    const chrome = {
      runtime: { setUninstallURL: async () => {}, onInstalled: { addListener() {} }, onMessage: { addListener() {} } },
      tabs: { query: vi.fn(async args => args.url ? [{ id: 1, audible: true, active: true }, { id: 2 }] : [{ id: 1 }]),
        sendMessage: vi.fn(async id => ({ playerPage: true, pipOpen: id === 2 })), onRemoved: { addListener() {} } },
      commands: { onCommand: { addListener() {} } }
    };
    const context = load("background/service-worker.js", { chrome });
    expect((await context.findTargetTab()).id).toBe(2);
    chrome.tabs.sendMessage.mockImplementation(async id => { if (id === 2) throw new Error("gone"); return { playerPage: true }; });
    expect((await context.findTargetTab()).id).toBe(1);
  });
});

test("a failed queue read never overwrites saved entries with an empty queue", async () => {
  const local = { get: vi.fn().mockRejectedValue(new Error("offline")), set: vi.fn() };
  const { YTFP } = load("content/watch-queue.js", { chrome: { runtime: { sendMessage: async () => ({ tabId: 12 }) }, storage: { local } }, YTFP: {} });
  await YTFP.watchQueue.add({ videoId: "BBBBBBBBBBB", title: "B" });
  expect(local.set).not.toHaveBeenCalled();
  local.get.mockResolvedValue({ "queue:12": [{ videoId: "AAAAAAAAAAA", title: "A" }] });
  await YTFP.watchQueue.retry();
  expect(YTFP.watchQueue.get().items.map(item => item.title)).toEqual(["A"]);
});
