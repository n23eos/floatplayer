import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { vi } from "vitest";

const require = createRequire(import.meta.url);

// Порядок ровно как в манифесте. inject-button.js — точка входа со сторожевым
// setInterval и слушателями навигации: в тестах ядра он только мешает, поэтому
// сюда не входит (список сверяется с манифестом отдельным тестом ниже).
export const CONTENT_SCRIPTS = [
  "shared/settings-schema.js",
  "content/constants.js",
  "content/utils.js",
  "content/settings.js",
  "content/player-api.js",
  "content/audio-boost.js",
  "content/night-mode.js",
  "content/pip-tooltip.js",
  "content/pip-controls.js",
  "content/pip-progress.js",
  "content/pip-related.js",
  "content/pip-nav.js",
  "content/pip-comments.js",
  "content/pip-chat.js",
  "content/pip-reactions.js",
  "content/shorts-search.js",
  "content/pip-extras.js",
  "content/pip-overlay.js",
  "content/pip-controller.js",
  "content/sponsor-block.js",
  "content/page-panel.js",
  "content/page-controls.js"
];

/** Заглушка chrome API: ровно те методы, которые трогают content-скрипты. */
export function installChromeStub(storage = {}) {
  const sync = { ...storage };
  const local = {};
  globalThis.chrome = {
    runtime: {
      getURL: (file) => `chrome-extension://test/${file}`,
      onMessage: { addListener: vi.fn() },
      getManifest: () => ({ version: "0.0.0-test" })
    },
    i18n: {
      getMessage: () => "",
      getUILanguage: () => "en-US"
    },
    storage: {
      sync: {
        get: vi.fn(async (defaults) => {
          const result = {};
          for (const [key, fallback] of Object.entries(defaults)) {
            result[key] = key in sync ? sync[key] : fallback;
          }
          return result;
        }),
        set: vi.fn(async (values) => Object.assign(sync, values))
      },
      local: {
        get: vi.fn(async (key) => (key in local ? { [key]: local[key] } : {})),
        set: vi.fn(async (values) => Object.assign(local, values)),
        remove: vi.fn(async () => {})
      },
      onChanged: { addListener: vi.fn() }
    }
  };
  return { sync, local };
}

/**
 * Разметка страницы YouTube в объёме, который щупают наши модули: плеер в
 * своём контейнере, внутри — <video> и панель контролов.
 */
export function buildWatchPage() {
  // jsdom не реализует Picture-in-Picture API, и свойства просто нет. В
  // браузере оно всегда есть и равно null, когда нативный PiP не запущен, —
  // на это опирается pip.isOpen(), иначе окно всегда считалось бы открытым.
  if (!("pictureInPictureElement" in document)) {
    document.pictureInPictureElement = null;
  }
  document.body.replaceChildren();
  document.body.innerHTML = `
    <div id="columns">
      <div id="primary">
        <div id="player-container"><div id="movie_player"></div></div>
        <ytd-watch-metadata></ytd-watch-metadata>
      </div>
      <div id="secondary"></div>
    </div>
  `;
  const player = document.getElementById("movie_player");
  const video = document.createElement("video");
  video.className = "html5-main-video";
  const controls = document.createElement("div");
  controls.className = "ytp-chrome-bottom";
  const progressBar = document.createElement("div");
  progressBar.className = "ytp-progress-bar";
  controls.appendChild(progressBar);
  player.append(video, controls);
  return { player, video, container: document.getElementById("player-container") };
}

/**
 * Двойник окна Document PiP. Своё jsdom-окно: у настоящего тоже отдельный
 * документ, и перенос узла между документами — как раз то, что проверяем.
 */
export function createPipWindowStub() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  const pipWindow = dom.window;
  pipWindow.innerWidth = 480;
  pipWindow.innerHeight = 270;
  pipWindow.outerWidth = 480;
  pipWindow.outerHeight = 300;
  pipWindow.resizeTo = vi.fn();
  // jsdom не закрывает окно так, как это делает Chrome: держим флаг сами и
  // отправляем pagehide вручную — именно на него подписан pip-controller.
  let closed = false;
  Object.defineProperty(pipWindow, "closed", { get: () => closed });
  pipWindow.close = vi.fn(() => {
    closed = true;
    pipWindow.dispatchEvent(new pipWindow.Event("pagehide"));
  });
  return pipWindow;
}

/** Загружает content-скрипты в порядке манифеста в текущий globalThis. */
export function loadContentScripts() {
  for (const file of CONTENT_SCRIPTS) {
    require(`../../extension/${file}`);
  }
  return globalThis.YTFP;
}
