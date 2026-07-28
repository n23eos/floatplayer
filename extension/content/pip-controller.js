"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Ядро расширения: перенос всего #movie_player в Document PiP-окно и обратно.
// Переносим целый плеер (не голый <video>), поэтому родные контролы YouTube,
// субтитры и главы продолжают работать внутри PiP-окна.
YTFP.pip = (() => {
  // Состояние открытого PiP-окна; null — окно закрыто.
  let state = null;

  function isOpen() {
    return state !== null;
  }

  /** Плеер, который сейчас перенесён в PiP-окно (для player-api). */
  function getMovedPlayer() {
    return state ? state.playerEl : null;
  }

  async function loadPipCss() {
    try {
      const response = await fetch(chrome.runtime.getURL("pip/pip.css"));
      return await response.text();
    } catch (error) {
      console.warn("[YTFP] Failed to load pip.css:", error);
      return "";
    }
  }

  async function getSavedSize() {
    try {
      const { pipWidth, pipHeight } = await chrome.storage.local.get(["pipWidth", "pipHeight"]);
      if (pipWidth > 0 && pipHeight > 0) {
        return { width: pipWidth, height: pipHeight };
      }
    } catch (error) {
      console.warn("[YTFP] Failed to read saved size:", error);
    }
    return YTFP.DEFAULT_PIP_SIZE;
  }

  function saveSize(pipWindow) {
    chrome.storage.local
      .set({ pipWidth: pipWindow.innerWidth, pipHeight: pipWindow.innerHeight })
      .catch(() => {});
  }

  /** Заглушка на странице вместо уехавшего плеера. */
  function buildOverlay(parent) {
    // Заглушка позиционируется absolute — родитель обязан быть positioned.
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    // Строим DOM без innerHTML: YouTube включает Trusted Types.
    const overlay = document.createElement("div");
    overlay.className = "ytfp-page-overlay";

    const inner = document.createElement("div");
    inner.className = "ytfp-page-overlay-inner";

    const icon = document.createElement("div");
    icon.className = "ytfp-page-overlay-icon";
    icon.textContent = "▶";

    const message = document.createElement("div");
    message.textContent = "Видео играет в мини-окне";

    const returnButton = document.createElement("button");
    returnButton.className = "ytfp-page-overlay-return";
    returnButton.textContent = "Вернуть сюда";
    returnButton.addEventListener("click", close);

    inner.append(icon, message, returnButton);
    overlay.appendChild(inner);
    parent.appendChild(overlay);
    return overlay;
  }

  function injectOverlayStyles() {
    if (document.getElementById("ytfp-page-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "ytfp-page-styles";
    style.textContent = `
      .ytfp-page-overlay {
        position: absolute; inset: 0; z-index: 100;
        display: flex; align-items: center; justify-content: center;
        background: #0f0f0f; color: #fff; min-height: 200px;
        font-family: "Roboto", Arial, sans-serif; font-size: 15px;
      }
      .ytfp-page-overlay-inner { text-align: center; display: grid; gap: 12px; }
      .ytfp-page-overlay-icon { font-size: 40px; opacity: 0.6; }
      .ytfp-page-overlay-return {
        cursor: pointer; border: 0; border-radius: 18px; padding: 8px 18px;
        background: #f1f1f1; color: #0f0f0f; font-size: 14px; font-weight: 500;
      }
      .ytfp-page-overlay-return:hover { background: #d9d9d9; }
    `;
    document.head.appendChild(style);
  }

  /** Открыть PiP. Возвращает true при успехе. */
  async function open() {
    if (state) {
      return true;
    }
    const playerEl = YTFP.playerApi.getPlayerRoot();
    if (!playerEl || !YTFP.playerApi.isWatchPage()) {
      return false;
    }

    // Фолбэк для Chrome без Document PiP: обычный видео-PiP.
    if (!("documentPictureInPicture" in window)) {
      const video = YTFP.playerApi.getVideo();
      if (video) {
        video.requestPictureInPicture().catch((error) => {
          console.warn("[YTFP] Native PiP fallback failed:", error);
        });
      }
      return false;
    }

    const size = await getSavedSize();
    let pipWindow;
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow(size);
    } catch (error) {
      // Чаще всего: вызов без жеста пользователя.
      console.warn("[YTFP] requestWindow failed:", error);
      return false;
    }

    const parent = playerEl.parentElement;
    // Маркер позиции, чтобы вернуть плеер ровно на своё место.
    const placeholder = document.createElement("div");
    placeholder.hidden = true;
    parent.insertBefore(placeholder, playerEl);

    // Стили PiP-окна.
    const style = pipWindow.document.createElement("style");
    style.textContent = await loadPipCss();
    pipWindow.document.head.appendChild(style);
    pipWindow.document.title = document.title;

    // Переносим плеер целиком.
    pipWindow.document.body.appendChild(playerEl);

    injectOverlayStyles();
    const overlay = buildOverlay(parent);

    const controls = YTFP.pipControls.buildBar(pipWindow.document, {
      getVideo: () => playerEl.querySelector("video.html5-main-video"),
      onReturnRequested: close
    });
    pipWindow.document.body.appendChild(controls.element);

    state = { pipWindow, playerEl, placeholder, overlay, controls };

    // Пользователь закрыл окно (крестик или наш close()) — возвращаем плеер.
    pipWindow.addEventListener("pagehide", restore);

    // Запоминаем размер окна (с дебаунсом).
    let resizeTimer = null;
    pipWindow.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => saveSize(pipWindow), 300);
      // Пинаем страницу: плеер YouTube пересчитывает размеры по resize.
      window.dispatchEvent(new Event("resize"));
    });

    // YouTube мог поставить inline-размеры под старый контейнер — пересчёт.
    window.dispatchEvent(new Event("resize"));
    return true;
  }

  /** Вернуть плеер на страницу (закрывает окно; restore сработает по pagehide). */
  function close() {
    if (state) {
      state.pipWindow.close();
    }
  }

  function restore() {
    if (!state) {
      return;
    }
    const { playerEl, placeholder, overlay, controls } = state;
    state = null;

    controls.cleanup();
    overlay.remove();

    if (placeholder.parentElement) {
      placeholder.parentElement.insertBefore(playerEl, placeholder);
    } else {
      // Контейнер исчез (навигация) — пусть YouTube пересоздаст разметку сам.
      console.warn("[YTFP] Original container gone, player not restored in place");
    }
    placeholder.remove();

    // Плеер вернулся — пересчитать размеры под страницу.
    window.dispatchEvent(new Event("resize"));
  }

  async function toggle() {
    if (state) {
      close();
      return true;
    }
    return open();
  }

  return { open, close, toggle, isOpen, getMovedPlayer };
})();
