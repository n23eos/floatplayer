// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { test, expect, vi } from "vitest";
import {
  installChromeStub,
  buildWatchPage,
  loadContentScripts
} from "./helpers/extension-env.js";

const require = createRequire(import.meta.url);

test("popup shows the saved mode and persists a new choice before opening", async () => {
  const html = readFileSync(resolve("extension/popup/popup.html"), "utf8");
  const schema = readFileSync(resolve("extension/shared/settings-schema.js"), "utf8");
  const script = readFileSync(resolve("extension/popup/popup.js"), "utf8");
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "chrome-extension://test/popup/popup.html"
  });
  const events = [];
  let releaseFirstSave;
  const stored = { windowMode: "document" };
  const set = vi.fn((values) => {
    events.push(`save:${values.windowMode || Object.keys(values)[0]}`);
    Object.assign(stored, values);
    if (set.mock.calls.length === 1) {
      return new Promise((resolve) => { releaseFirstSave = resolve; });
    }
    return Promise.resolve();
  });
  dom.window.chrome = {
    i18n: { getMessage: (key) => ({ modeControls: "With controls", modeVideo: "Video only" })[key] || "" },
    runtime: {
      sendMessage: vi.fn(async () => ({
        id: 7,
        url: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
        playerState: { playerPage: true, pipOpen: false }
      })),
      openOptionsPage: vi.fn()
    },
    tabs: { sendMessage: vi.fn(async () => { events.push("open"); return { ok: true }; }) },
    commands: { getAll: vi.fn(async () => []) },
    storage: {
      sync: {
        get: vi.fn(async (defaults) => ({ ...defaults, ...stored })),
        set
      }
    }
  };
  dom.window.close = vi.fn();
  dom.window.eval(schema);
  dom.window.eval(script);

  const documentMode = dom.window.document.querySelector('[data-mode="document"]');
  const nativeMode = dom.window.document.querySelector('[data-mode="native"]');
  const primary = dom.window.document.getElementById("primary");
  await vi.waitFor(() => {
    expect(primary.disabled).toBe(false);
    expect(documentMode.getAttribute("aria-pressed")).toBe("true");
  });
  expect(documentMode.title).toBe("With controls");
  expect(nativeMode.title).toBe("Video only");

  nativeMode.click();
  primary.click();
  expect(nativeMode.getAttribute("aria-pressed")).toBe("true");
  await vi.waitFor(() => expect(events).toEqual(["save:native"]));

  releaseFirstSave();
  await vi.waitFor(() => expect(events).toEqual(["save:native", "save:native", "open"]));
  expect(dom.window.chrome.tabs.sendMessage).toHaveBeenCalledWith(7, {
    command: "toggle-pip",
    mode: "native"
  });
  dom.window.close();
});

test("popup does not overwrite an unread mode and recovers after an explicit choice", async () => {
  const html = readFileSync(resolve("extension/popup/popup.html"), "utf8");
  const schema = readFileSync(resolve("extension/shared/settings-schema.js"), "utf8");
  const script = readFileSync(resolve("extension/popup/popup.js"), "utf8");
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "chrome-extension://test/popup/popup.html"
  });
  const set = vi.fn(async () => {});
  const sendMessage = vi.fn(async () => ({ ok: true }));
  dom.window.chrome = {
    i18n: { getMessage: () => "" },
    runtime: {
      sendMessage: vi.fn(async () => ({
        id: 7,
        url: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
        playerState: { playerPage: true, pipOpen: false }
      })),
      openOptionsPage: vi.fn()
    },
    tabs: { sendMessage },
    commands: { getAll: vi.fn(async () => []) },
    storage: {
      sync: {
        get: vi.fn(async (defaults) => {
          if (Object.keys(defaults).length === 1 && "windowMode" in defaults) {
            throw new Error("read failed");
          }
          return defaults;
        }),
        set
      }
    }
  };
  dom.window.console.warn = vi.fn();
  dom.window.close = vi.fn();
  dom.window.eval(schema);
  dom.window.eval(script);

  const nativeMode = dom.window.document.querySelector('[data-mode="native"]');
  const primary = dom.window.document.getElementById("primary");
  await vi.waitFor(() => {
    expect(primary.disabled).toBe(false);
    expect(nativeMode.getAttribute("aria-pressed")).toBe("false");
  });
  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith(7, { command: "toggle-pip" }));
  expect(set).not.toHaveBeenCalled();

  sendMessage.mockClear();
  nativeMode.click();
  await vi.waitFor(() => expect(set).toHaveBeenCalledWith({ windowMode: "native" }));
  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith(7, {
    command: "toggle-pip",
    mode: "native"
  }));
});

test("popup opens with the loaded mode when its final persistence attempt fails", async () => {
  const html = readFileSync(resolve("extension/popup/popup.html"), "utf8");
  const schema = readFileSync(resolve("extension/shared/settings-schema.js"), "utf8");
  const script = readFileSync(resolve("extension/popup/popup.js"), "utf8");
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "chrome-extension://test/popup/popup.html"
  });
  const sendMessage = vi.fn(async () => ({ ok: true }));
  dom.window.chrome = {
    i18n: { getMessage: () => "" },
    runtime: {
      sendMessage: vi.fn(async () => ({
        id: 7,
        url: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
        playerState: { playerPage: true, pipOpen: false }
      })),
      openOptionsPage: vi.fn()
    },
    tabs: { sendMessage },
    commands: { getAll: vi.fn(async () => []) },
    storage: {
      sync: {
        get: vi.fn(async (defaults) => ({ ...defaults, windowMode: "native" })),
        set: vi.fn(async () => { throw new Error("write failed"); })
      }
    }
  };
  dom.window.console.warn = vi.fn();
  dom.window.close = vi.fn();
  dom.window.eval(schema);
  dom.window.eval(script);

  const primary = dom.window.document.getElementById("primary");
  await vi.waitFor(() => {
    expect(primary.disabled).toBe(false);
    expect(dom.window.document.querySelector('[data-mode="native"]').getAttribute("aria-pressed")).toBe("true");
  });
  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith(7, {
    command: "toggle-pip",
    mode: "native"
  }));
  expect(dom.window.close).toHaveBeenCalled();
});

test("page mode buttons stay icon-only, highlight the saved mode and open explicitly", async () => {
  installChromeStub({ windowMode: "native" });
  globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));
  const YTFP = loadContentScripts();
  const page = buildWatchPage();
  window.history.replaceState({}, "", "/watch?v=AAAAAAAAAAA");
  await YTFP.settings.load();
  const open = vi.spyOn(YTFP.pip, "open").mockResolvedValue(true);

  YTFP.pagePanel.ensurePanel();
  const documentMode = page.player.querySelector('button[data-mode="document"]');
  const nativeMode = page.player.querySelector('button[data-mode="native"]');
  expect(documentMode.textContent).toBe("");
  expect(nativeMode.textContent).toBe("");
  expect(documentMode.querySelector("svg[aria-hidden=true]")).not.toBeNull();
  expect(nativeMode.getAttribute("aria-pressed")).toBe("true");

  documentMode.click();
  expect(documentMode.getAttribute("aria-pressed")).toBe("true");
  expect(nativeMode.getAttribute("aria-pressed")).toBe("false");
  expect(open).toHaveBeenCalledWith({ mode: "document" });
  expect(chrome.storage.sync.set).toHaveBeenCalledWith({ windowMode: "document" });

  const storageListener = chrome.storage.onChanged.addListener.mock.calls[0][0];
  storageListener({ windowMode: { newValue: "native" } }, "sync");
  expect(nativeMode.getAttribute("aria-pressed")).toBe("true");

  window.history.replaceState({}, "", "/");
  YTFP.pagePanel.ensurePanel();
  vi.restoreAllMocks();
});

test("toggle message acknowledges false results, runtime failures and success", async () => {
  vi.useFakeTimers();
  try {
    installChromeStub();
    globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));
    const YTFP = loadContentScripts();
    const toggle = vi.spyOn(YTFP.pip, "toggle")
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error("runtime failure"))
      .mockResolvedValueOnce(true);
    require("../extension/content/inject-button.js");
    const listener = chrome.runtime.onMessage.addListener.mock.calls.at(-1)[0];

    const sendToggle = mode => new Promise(resolve => {
      expect(listener({ command: "toggle-pip", mode }, {}, resolve)).toBe(true);
    });
    await expect(sendToggle("document")).resolves.toEqual({ ok: false });
    await expect(sendToggle("native")).resolves.toEqual({ ok: false });
    await expect(sendToggle("unexpected")).resolves.toEqual({ ok: true });
    expect(toggle).toHaveBeenNthCalledWith(1, { mode: "document" });
    expect(toggle).toHaveBeenNthCalledWith(2, { mode: "native" });
    expect(toggle).toHaveBeenNthCalledWith(3, {});
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
