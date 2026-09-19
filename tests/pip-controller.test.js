// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CONTENT_SCRIPTS,
  installChromeStub,
  buildWatchPage,
  createPipWindowStub,
  loadContentScripts
} from "./helpers/extension-env.js";

// Перенос плеера в мини-окно и возврат — самая рискованная логика проекта:
// узел #movie_player физически уезжает в другой документ, и любая ошибка тут
// оставляет пользователя без видео на странице. Чистыми функциями это не
// проверить, поэтому здесь настоящий DOM (jsdom) и двойник Document PiP.

const dirname = path.dirname(fileURLToPath(import.meta.url));

installChromeStub();
// jsdom не реализует matchMedia, а page-panel зовёт её на верхнем уровне.
globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));

const YTFP = loadContentScripts();

let page;
let pipWindow;

beforeEach(async () => {
  page = buildWatchPage();
  window.history.replaceState({}, "", "/watch?v=aaaaaaaaaaa");
  pipWindow = createPipWindowStub();
  window.documentPictureInPicture = { requestWindow: vi.fn(async () => pipWindow) };
  await YTFP.settings.load();
});

afterEach(() => {
  if (YTFP.pip.isOpen()) {
    YTFP.pip.close();
  }
});

describe("opening the window", () => {
  test("moves the whole player into the pip document", async () => {
    expect(await YTFP.pip.open()).toBe(true);

    expect(pipWindow.document.body.contains(page.player)).toBe(true);
    expect(document.contains(page.player)).toBe(false);
    // Видео уезжает вместе с плеером — ради этого всё и затевалось.
    expect(page.player.contains(page.video)).toBe(true);
    expect(YTFP.pip.getMovedPlayer()).toBe(page.player);
    expect(YTFP.pip.isOpen()).toBe(true);
  });

  test("leaves the return overlay on the page in place of the player", async () => {
    await YTFP.pip.open();
    const overlay = page.container.querySelector(".ytfp-page-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector("button")).not.toBeNull();
  });

  test("does not open a second window while one is already open", async () => {
    await YTFP.pip.open();
    expect(await YTFP.pip.open()).toBe(true);
    expect(window.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
  });

  test("refuses to open when the page has no player", async () => {
    page.player.remove();
    expect(await YTFP.pip.open()).toBe(false);
    expect(window.documentPictureInPicture.requestWindow).not.toHaveBeenCalled();
  });

  test("uses native picture-in-picture when that mode is requested", async () => {
    page.video.requestPictureInPicture = vi.fn(async () => {});
    expect(await YTFP.pip.open({ mode: "native" })).toBe(true);
    expect(page.video.requestPictureInPicture).toHaveBeenCalled();
    // Плеер при этом остаётся на странице: рамку рисует сам Chrome.
    expect(document.contains(page.player)).toBe(true);
    expect(window.documentPictureInPicture.requestWindow).not.toHaveBeenCalled();
  });

  test("gives up without stealing the player if the window dies while loading", async () => {
    window.documentPictureInPicture.requestWindow = vi.fn(async () => {
      pipWindow.close();
      return pipWindow;
    });
    expect(await YTFP.pip.open()).toBe(false);
    // Главное: плеер не уехал в мёртвый документ, иначе он пропал бы совсем.
    expect(page.container.contains(page.player)).toBe(true);
  });
});

describe("closing the window", () => {
  test("puts the player back exactly where it was", async () => {
    const nextSibling = page.player.nextSibling;
    await YTFP.pip.open();
    YTFP.pip.close();

    expect(page.container.contains(page.player)).toBe(true);
    expect(page.player.nextSibling).toBe(nextSibling);
    expect(YTFP.pip.isOpen()).toBe(false);
    expect(YTFP.pip.getMovedPlayer()).toBeNull();
  });

  test("removes the overlay and the placeholder from the page", async () => {
    await YTFP.pip.open();
    YTFP.pip.close();
    expect(document.querySelector(".ytfp-page-overlay")).toBeNull();
    // Заглушка позиции — единственный скрытый div, который мы добавляли.
    expect(page.container.querySelectorAll("div[hidden]")).toHaveLength(0);
  });

  test("clears the letterbox geometry it put on the player", async () => {
    await YTFP.pip.open();
    expect(page.player.style.position).toBe("absolute");
    YTFP.pip.close();
    for (const property of ["position", "width", "height", "left", "top"]) {
      expect(page.player.style.getPropertyValue(property)).toBe("");
    }
  });

  test("survives the window closing on its own", async () => {
    await YTFP.pip.open();
    // Крестик в рамке окна: Chrome шлёт pagehide, close() мы не звали.
    pipWindow.dispatchEvent(new pipWindow.Event("pagehide"));
    expect(YTFP.pip.isOpen()).toBe(false);
    expect(page.container.contains(page.player)).toBe(true);
  });
});

describe("ensurePlayerPlacement", () => {
  test("takes the player back when the page pulls it out of the window", async () => {
    await YTFP.pip.open();
    // Автовоспроизведение YouTube иногда возвращает узел на страницу,
    // не закрывая окна: окно висит пустым, видео играет во вкладке.
    page.container.appendChild(page.player);

    YTFP.pip.ensurePlayerPlacement();

    expect(pipWindow.document.body.contains(page.player)).toBe(true);
    expect(YTFP.pip.isOpen()).toBe(true);
  });

  test("restores the page overlay if the container was redrawn", async () => {
    await YTFP.pip.open();
    page.container.replaceChildren();
    page.container.appendChild(page.player);

    YTFP.pip.ensurePlayerPlacement();

    expect(page.container.querySelector(".ytfp-page-overlay")).not.toBeNull();
  });

  test("closes the window when the page builds a brand new player", async () => {
    await YTFP.pip.open();
    // Страница пересоздала разметку: контролы окна построены вокруг старого
    // узла и к новому не относятся.
    const fresh = document.createElement("div");
    fresh.id = "movie_player";
    page.container.appendChild(fresh);

    YTFP.pip.ensurePlayerPlacement();

    expect(YTFP.pip.isOpen()).toBe(false);
    // Старый узел не должен встать рядом с новым — двух плееров на странице
    // быть не может.
    expect(document.querySelectorAll("#movie_player")).toHaveLength(1);
    expect(document.querySelector("#movie_player")).toBe(fresh);
  });

  test("does nothing while the window is closed", () => {
    expect(() => YTFP.pip.ensurePlayerPlacement()).not.toThrow();
    expect(YTFP.pip.isOpen()).toBe(false);
  });
});

describe("the harness matches the manifest", () => {
  test("loads the same content scripts, in the same order", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(dirname, "../extension/manifest.json"), "utf8")
    );
    const [main] = manifest.content_scripts;
    // Точка входа сознательно не грузится — см. комментарий в helpers.
    const expected = main.js.filter((file) => file !== "content/inject-button.js");
    expect(CONTENT_SCRIPTS).toEqual(expected);
  });
});

describe("new controls and live settings", () => {
  function update(values) {
    const changes = Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { newValue }]));
    for (const [listener] of chrome.storage.onChanged.addListener.mock.calls) listener(changes, "sync");
  }
  test("keeps advanced tools in More and pins the same live control", async () => {
    await YTFP.pip.open();
    const menu = pipWindow.document.querySelector(".ytfp-more");
    expect(menu.open).toBe(false);
    const tools = pipWindow.document.querySelector(".ytfp-more-panel");
    const loop = tools.querySelector('[aria-label="Loop this video"]');
    expect(loop).not.toBeNull();
    update({ pinnedTools: ["loop"] });
    expect(pipWindow.document.querySelector(".ytfp-pinned-tools").contains(loop)).toBe(true);
    update({ pinnedTools: [] }); expect(tools.contains(loop)).toBe(true);
  });
  test("closes More on a shielded video press, but keeps inside controls usable", async () => {
    await YTFP.pip.open();
    const doc = pipWindow.document;
    const menu = doc.querySelector(".ytfp-more");
    const panel = doc.querySelector(".ytfp-more-panel");
    menu.open = true; panel.hidden = false;
    panel.querySelector("button").dispatchEvent(new pipWindow.Event("pointerdown", { bubbles: true }));
    expect(menu.open).toBe(true);
    page.video.dispatchEvent(new pipWindow.Event("pointerdown", { bubbles: true }));
    expect(menu.open).toBe(false);
    expect(panel.hidden).toBe(true);
    menu.open = true; panel.hidden = false;
    doc.body.dispatchEvent(new pipWindow.Event("click", { bubbles: true }));
    expect(menu.open).toBe(false);
    expect(panel.hidden).toBe(true);
  });
  test("updates scale, compact mode, speed step and volume limit without reopening", async () => {
    await YTFP.pip.open();
    const panel = pipWindow.document.querySelector(".ytfp-bottom");
    update({ panelScale: 180, compactMode: false, speedStep: .1, volumeBoostMax: 100 });
    expect(pipWindow.document.documentElement.style.getPropertyValue("--ytfp-cap-user")).toBe("1.8");
    expect(panel.classList.contains("ytfp-bottom--compact")).toBe(false);
    expect(panel.querySelector(".ytfp-speed input").step).toBe("0.1");
    expect(panel.querySelector(".ytfp-boost input").max).toBe("100");
    expect(window.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
  });
  test("sleep timer survives closing and reopening the window", async () => {
    await YTFP.pip.open(); YTFP.sleepTimer.start(30); YTFP.pip.close();
    expect(YTFP.sleepTimer.get().mode).toBe("time");
    pipWindow = createPipWindowStub(); window.documentPictureInPicture.requestWindow = vi.fn(async () => pipWindow);
    await YTFP.pip.open();
    expect(pipWindow.document.querySelector(".ytfp-sleep-countdown").textContent).toMatch(/29:59|30:00/);
    YTFP.sleepTimer.stop();
  });
  test("size preset respects portrait aspect and requests resize only on click", async () => {
    Object.defineProperties(page.video, { videoWidth: { value: 720 }, videoHeight: { value: 1280 } });
    await YTFP.pip.open(); expect(pipWindow.resizeTo).not.toHaveBeenCalled();
    const small = [...pipWindow.document.querySelectorAll(".ytfp-size-controls button")].find(el => el.textContent === "Small");
    small.click(); expect(pipWindow.resizeTo).toHaveBeenCalledWith(280, 528);
  });
  test("no longer queries timeline data every three seconds", async () => {
    await YTFP.pip.open();
    YTFP.pip.close();
    vi.useFakeTimers();
    // Open a fresh progress view so its timers use the fake clock.
    const progress = YTFP.pipProgress.build(pipWindow.document, { getVideo: () => page.video });
    const reads = vi.spyOn(YTFP.sponsorBlock, "getSegments");
    vi.advanceTimersByTime(60000);
    expect(reads).toHaveBeenCalledTimes(6);
    document.dispatchEvent(new Event("ytfp-segments-changed")); expect(reads).toHaveBeenCalledTimes(7);
    progress.cleanup(); reads.mockRestore(); vi.useRealTimers();
  });
});
