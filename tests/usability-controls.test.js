// @vitest-environment jsdom
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  buildWatchPage,
  createPipWindowStub,
  installChromeStub,
  loadContentScripts
} from "./helpers/extension-env.js";

const require = createRequire(import.meta.url);
installChromeStub();
globalThis.matchMedia = () => ({
  matches: false,
  addListener() {},
  removeListener() {}
});
globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));
const YTFP = loadContentScripts();
require("../extension/content/pip-history.js");

let page;
let cleanups = [];
let videoNumber = 0;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(async () => {
  page = buildWatchPage();
  window.history.replaceState({}, "", `/watch?v=${String(++videoNumber).padStart(11, "0")}`);
  await YTFP.settings.load();
  Object.assign(YTFP.settings.get(), {
    autoplayNext: false,
    nightMode: "off",
    shortsHistory: true,
    windowMode: "document"
  });
  Object.defineProperties(page.video, {
    duration: { value: 45, configurable: true },
    paused: { value: false, configurable: true }
  });
  page.video.play = vi.fn(async () => {});
  page.video.pause = vi.fn();
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  if (YTFP.pip.isOpen()) YTFP.pip.close();
  window.history.replaceState({}, "", "/");
  YTFP.shortsRuntime.sync();
  vi.restoreAllMocks();
});

test("Shorts history retries failed loading and navigation", async () => {
  const item = { id: "BBBBBBBBBBB", title: "Saved short", at: Date.now() };
  const visits = vi.spyOn(YTFP.localRecords, "visits")
    .mockRejectedValueOnce(new Error("storage"))
    .mockResolvedValue([item]);
  const revisit = vi.spyOn(YTFP.shortsRuntime, "revisit")
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const ui = YTFP.pipHistory.build(document);
  cleanups.push(ui.cleanup);
  document.body.append(ui.element);

  ui.element.click();
  await tick();
  expect(ui.panel.getAttribute("role")).toBe("dialog");
  expect(ui.panel.hasAttribute("data-ytfp-tool-popover")).toBe(true);
  expect(ui.panel.textContent).toContain("Could not load local data");

  ui.panel.querySelector(".ytfp-history-retry").click();
  await tick();
  const entry = ui.panel.querySelector(".ytfp-history-item");
  expect(entry.textContent).toContain("Saved short");
  expect(visits).toHaveBeenCalledTimes(2);

  entry.click();
  await tick();
  expect(ui.panel.textContent).toContain("Could not switch video");
  ui.panel.querySelector(".ytfp-history-retry").click();
  await tick();
  expect(revisit).toHaveBeenCalledTimes(2);
  expect(ui.panel.hidden).toBe(true);
});

test("Shorts history closes with Escape and outside press and ignores stale loading", async () => {
  let finishLoad;
  vi.spyOn(YTFP.localRecords, "visits").mockReturnValue(
    new Promise(resolve => { finishLoad = resolve; })
  );
  const ui = YTFP.pipHistory.build(document);
  document.body.append(ui.element);
  ui.open();
  expect(document.activeElement).toBe(ui.panel.querySelector(".ytfp-history-close"));

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(ui.panel.hidden).toBe(true);
  expect(document.activeElement).toBe(ui.element);

  ui.open();
  window.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  expect(ui.panel.hidden).toBe(true);

  ui.open();
  ui.cleanup();
  finishLoad([{ id: "CCCCCCCCCCC", title: "Late", at: Date.now() }]);
  await tick();
  expect(ui.panel.isConnected).toBe(false);
  expect(ui.panel.querySelector(".ytfp-history-item")).toBeNull();
});

test("search submit is named and cancel paths return focus", () => {
  const ui = YTFP.pipSearch.build(document);
  cleanups.push(ui.cleanup);
  document.body.append(ui.element);
  const open = ui.element.querySelector(":scope > button");
  const form = ui.element.querySelector("form");
  const input = ui.element.querySelector("input");
  const submit = ui.element.querySelector('button[type="submit"]');
  const cancel = ui.element.querySelector('button[type="button"]:not(:first-child)');
  expect(submit.getAttribute("aria-label")).toBe("Search");

  open.click();
  expect(document.activeElement).toBe(input);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(form.hidden).toBe(true);
  expect(document.activeElement).toBe(open);

  open.click();
  cancel.click();
  expect(form.hidden).toBe(true);
  expect(document.activeElement).toBe(open);
});

test("loop, autoplay and night mode expose their current state", async () => {
  const pipWindow = createPipWindowStub();
  window.documentPictureInPicture = { requestWindow: vi.fn(async () => pipWindow) };
  await YTFP.pip.open();
  const loop = pipWindow.document.querySelector('[aria-label="Loop this video"]');
  const autoplay = pipWindow.document.querySelector('[aria-label^="Autoplay"]');
  const night = pipWindow.document.querySelector(".ytfp-btn--night");

  expect(loop.getAttribute("aria-pressed")).toBe("false");
  loop.click();
  expect(loop.getAttribute("aria-pressed")).toBe("true");
  expect(autoplay.getAttribute("aria-pressed")).toBe("false");
  autoplay.click();
  expect(autoplay.getAttribute("aria-pressed")).toBe("true");
  expect(night.getAttribute("aria-label")).toBe("Night mode: Off");
  night.click();
  expect(night.getAttribute("aria-label")).toBe("Night mode: Warm");
  expect(night.getAttribute("aria-pressed")).toBe("true");
});

test("Shorts More menu exposes the unpinnable history control", async () => {
  window.history.replaceState({}, "", `/shorts/${String(videoNumber).padStart(11, "0")}`);
  page.player.id = "shorts-player";
  const pipWindow = createPipWindowStub();
  window.documentPictureInPicture = { requestWindow: vi.fn(async () => pipWindow) };
  await YTFP.pip.open();
  const trigger = pipWindow.document.querySelector(".ytfp-history-trigger");
  expect(trigger).not.toBeNull();
  expect(trigger.closest(".ytfp-tool-row").querySelector('input[type="checkbox"]').hidden).toBe(true);

  const menu = pipWindow.document.querySelector(".ytfp-more");
  const menuPanel = pipWindow.document.querySelector(".ytfp-more-panel");
  menu.open = true;
  menuPanel.hidden = false;
  trigger.click();
  const historyPanel = pipWindow.document.querySelector(".ytfp-history-panel");
  expect(historyPanel.hidden).toBe(false);
  historyPanel.dispatchEvent(new pipWindow.Event("pointerdown", { bubbles: true }));
  expect(menu.open).toBe(true);

  historyPanel.querySelector(".ytfp-history-close").dispatchEvent(
    new pipWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  expect(historyPanel.hidden).toBe(true);
  expect(menu.open).toBe(true);
  pipWindow.document.dispatchEvent(
    new pipWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  expect(menu.open).toBe(false);
});

test("queue movement buttons name their direction and item", () => {
  vi.spyOn(YTFP.watchQueue, "get").mockReturnValue({
    items: [
      { videoId: "BBBBBBBBBBB", title: "First" },
      { videoId: "CCCCCCCCCCC", title: "Second" }
    ],
    error: "",
    busy: false
  });
  const related = YTFP.pipRelated.build(document);
  cleanups.push(related.cleanup);
  document.body.append(related.element);
  related.element.querySelector(".ytfp-related-toggle").click();
  const first = related.element.querySelector(".ytfp-queue-item");
  expect(first.querySelector('[aria-label="Move up: First"]')).not.toBeNull();
  expect(first.querySelector('[aria-label="Move down: First"]')).not.toBeNull();
});
