"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Точка входа: кнопка в панели плеера, реакция на SPA-навигацию YouTube,
// горячие клавиши из service worker, опциональный авто-PiP.
(() => {
  const BUTTON_CLASS = "ytfp-open-button";

  // Иконка: прямоугольник экрана + маленькое окно поверх (стиль иконок YouTube).
  const BUTTON_SVG = `
    <svg height="100%" viewBox="0 0 36 36" width="100%">
      <path d="M7 9h22v14h-8v-2h6V11H9v10h6v2H7V9z" fill="#fff"></path>
      <rect x="17" y="19" width="12" height="8" rx="1" fill="#fff"></rect>
    </svg>`;

  function buildButton() {
    const button = document.createElement("button");
    button.className = `ytp-button ${BUTTON_CLASS}`;
    button.title = "Вынести видео поверх всех окон (Alt+P)";
    button.innerHTML = BUTTON_SVG;
    button.addEventListener("click", () => {
      YTFP.pip.toggle();
    });
    return button;
  }

  /** Вставляет кнопку в правую группу контролов, если её там ещё нет. */
  function ensureButton() {
    if (!YTFP.playerApi.isWatchPage()) {
      return;
    }
    const rightControls = document.querySelector(YTFP.SELECTORS.rightControls);
    if (!rightControls || rightControls.querySelector(`.${BUTTON_CLASS}`)) {
      return;
    }
    const settingsButton = rightControls.querySelector(".ytp-settings-button");
    rightControls.insertBefore(buildButton(), settingsButton);
  }

  // Контролы плеера рендерятся асинхронно после навигации — несколько попыток.
  function ensureButtonWithRetries() {
    const RETRY_DELAYS_MS = [0, 500, 1500, 3000];
    RETRY_DELAYS_MS.forEach((delay) => setTimeout(ensureButton, delay));
  }

  function onNavigateFinish() {
    ensureButtonWithRetries();
    // Ушли со страницы просмотра — окно больше не к чему привязывать.
    if (!YTFP.playerApi.isWatchPage() && YTFP.pip.isOpen()) {
      YTFP.pip.close();
    }
  }

  // Горячие клавиши приходят сообщениями из service worker.
  chrome.runtime.onMessage.addListener((message) => {
    switch (message && message.command) {
      case "toggle-pip":
        YTFP.pip.toggle();
        break;
      case "play-pause":
        YTFP.playerApi.togglePlayPause();
        break;
      case "seek-back":
        YTFP.playerApi.seekBy(-YTFP.SEEK_STEP_SECONDS);
        break;
      case "seek-forward":
        YTFP.playerApi.seekBy(YTFP.SEEK_STEP_SECONDS);
        break;
      default:
        break;
    }
  });

  // Авто-PiP: Chrome сам зовёт этот обработчик при уходе со вкладки,
  // если пользователь включил опцию (Media Session API, Chrome 120+).
  function syncAutoPip() {
    try {
      navigator.mediaSession.setActionHandler(
        "enterpictureinpicture",
        YTFP.settings.get().autoPip ? () => YTFP.pip.open() : null
      );
    } catch (error) {
      // Старый Chrome без поддержки действия — просто игнорируем.
    }
  }

  async function init() {
    await YTFP.settings.load();
    syncAutoPip();
    YTFP.settings.onChange(syncAutoPip);

    // YouTube — SPA: полная загрузка одна, дальше только yt-navigate-finish.
    document.addEventListener("yt-navigate-finish", onNavigateFinish);
    ensureButtonWithRetries();
  }

  init();
})();
