"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Ядро расширения: перенос всего #movie_player в Document PiP-окно и обратно.
// Переносим целый плеер (не голый <video>), поэтому родные контролы YouTube,
// субтитры и главы продолжают работать внутри PiP-окна.
YTFP.pip = (() => {
  // Состояние открытого PiP-окна; null — окно закрыто.
  let state = null;

  function isOpen() {
    return state !== null || document.pictureInPictureElement !== null;
  }

  /** Нативный видео-PiP: без рамки Chrome, но и без нашей панели. */
  async function openNative() {
    const video = YTFP.playerApi.getVideo();
    if (!video) {
      return false;
    }
    try {
      await video.requestPictureInPicture();
      return true;
    } catch (error) {
      console.warn("[YTFP] Native PiP failed:", error);
      return false;
    }
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

  /**
   * Размер окна: ширину берём сохранённую (или дефолт), высоту считаем
   * из пропорций текущего видео — окно открывается без чёрных полос.
   */
  async function getInitialSize(video) {
    let width = YTFP.DEFAULT_PIP_SIZE.width;
    try {
      const { pipWidth } = await chrome.storage.local.get("pipWidth");
      if (pipWidth > 0) {
        width = pipWidth;
      }
    } catch (error) {
      console.warn("[YTFP] Failed to read saved size:", error);
    }
    const hasDimensions = video && video.videoWidth > 0 && video.videoHeight > 0;
    const aspect = hasDimensions
      ? video.videoWidth / video.videoHeight
      : 16 / 9;
    return { width, height: Math.round(width / aspect) };
  }

  function saveSize(pipWindow) {
    if (!(pipWindow.innerWidth > 0)) {
      return;
    }
    chrome.storage.local.set({ pipWidth: pipWindow.innerWidth }).catch(() => {});
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
    message.textContent = chrome.i18n.getMessage("overlayPlaying") || "Видео играет в мини-окне";

    const returnButton = document.createElement("button");
    returnButton.className = "ytfp-page-overlay-return";
    returnButton.textContent = chrome.i18n.getMessage("overlayReturn") || "Вернуть сюда";
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
    if (isOpen()) {
      return true;
    }
    const playerEl = YTFP.playerApi.getPlayerRoot();
    if (!playerEl || !YTFP.playerApi.isWatchPage()) {
      return false;
    }

    // Режим «чистое видео»: нативный PiP без рамки Chrome и без панели.
    // Тот же путь — фолбэк для Chrome без Document PiP API.
    if (YTFP.settings.get().windowMode === "native" || !("documentPictureInPicture" in window)) {
      return openNative();
    }

    const size = await getInitialSize(YTFP.playerApi.getVideo());
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
    // Пустой заголовок: в системной полоске окна остаётся только origin
    // (youtube.com) — совсем убрать её Chrome не позволяет.
    pipWindow.document.title = "";

    // Скорость до переноса: защита от YouTube-фичи «удержание = 2x»,
    // которая могла сработать из-за потерянного mouseup при переносе.
    const video = playerEl.querySelector("video.html5-main-video");
    const rateBeforeMove = video ? video.playbackRate : 1;

    // Переносим плеер целиком.
    pipWindow.document.body.appendChild(playerEl);

    if (video) {
      video.playbackRate = rateBeforeMove;
      // YouTube может включить 2x с задержкой — контрольный сброс.
      setTimeout(() => {
        if (state && video.playbackRate !== rateBeforeMove) {
          video.playbackRate = rateBeforeMove;
        }
      }, 700);
    }

    // Глушим нажатия по зоне плеера для скриптов YouTube: их фича
    // «удержание мыши = 2x» ломается в PiP-окне (mouseup теряется из-за
    // перетаскивания окна) и скорость залипает. Наши элементы работают —
    // они слушают click, который синтезируется независимо от propagation.
    const blockPlayerPress = (event) => {
      if (event.target && event.target.closest && event.target.closest("#movie_player")) {
        event.stopPropagation();
      }
    };
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
      pipWindow.document.addEventListener(type, blockPlayerPress, true);
    }

    injectOverlayStyles();
    const overlay = buildOverlay(parent);

    const getMovedVideo = () => playerEl.querySelector("video.html5-main-video");

    const controls = YTFP.pipControls.buildBar(pipWindow.document, {
      getVideo: getMovedVideo,
      onReturnRequested: close
    });
    pipWindow.document.body.appendChild(controls.element);

    // Красная полоска прогресса внизу (родные контролы YouTube скрыты в CSS).
    const progress = YTFP.pipProgress.build(pipWindow.document, { getVideo: getMovedVideo });
    pipWindow.document.body.appendChild(progress.element);

    // Стрелка справа: колонка рекомендаций.
    const related = YTFP.pipRelated.build(pipWindow.document);
    pipWindow.document.body.appendChild(related.element);

    state = { pipWindow, playerEl, placeholder, overlay, controls, progress, related, resizeTimer: null };

    // Пользователь закрыл окно (крестик или наш close()) — возвращаем плеер.
    pipWindow.addEventListener("pagehide", restore);

    // Запоминаем размер окна (с дебаунсом). Таймер живёт в state,
    // чтобы restore() мог его погасить — иначе отложенный saveSize
    // прочитает размеры уже закрытого окна (нули) и затрёт сохранённые.
    // Подгонка окна под пропорции видео: после ресайза высоту снапим к
    // аспекту, чтобы не оставалось пустых технических полей вокруг видео.
    // resizeTo в Document PiP работает не всегда (нужна активация
    // пользователя) — тогда просто молча пропускаем.
    const ASPECT_SNAP_TOLERANCE_PX = 8;
    const snapToVideoAspect = () => {
      if (!state || pipWindow.closed) {
        return;
      }
      const video = getMovedVideo();
      if (!video || !(video.videoWidth > 0) || !(video.videoHeight > 0)) {
        return;
      }
      const aspect = video.videoWidth / video.videoHeight;
      const frameWidth = pipWindow.outerWidth - pipWindow.innerWidth;
      const frameHeight = pipWindow.outerHeight - pipWindow.innerHeight;
      const targetInnerHeight = Math.round(pipWindow.innerWidth / aspect);
      if (Math.abs(targetInnerHeight - pipWindow.innerHeight) <= ASPECT_SNAP_TOLERANCE_PX) {
        return;
      }
      try {
        pipWindow.resizeTo(
          pipWindow.innerWidth + frameWidth,
          targetInnerHeight + frameHeight
        );
      } catch (error) {
        // Нет активации пользователя — Chrome не разрешил, не страшно.
      }
    };

    const scheduleSaveSize = () => {
      clearTimeout(state && state.resizeTimer);
      if (!state) {
        return;
      }
      state.resizeTimer = setTimeout(() => {
        if (!pipWindow.closed) {
          snapToVideoAspect();
          saveSize(pipWindow);
        }
      }, 300);
    };
    pipWindow.addEventListener("resize", () => {
      scheduleSaveSize();
      // Пинаем страницу: плеер YouTube пересчитывает размеры по resize.
      window.dispatchEvent(new Event("resize"));
    });

    // Смена видео в окне (рекомендации, плейлист) — новые пропорции,
    // подгоняем окно под них. Слушатель снимается в restore().
    const movedVideo = getMovedVideo();
    if (movedVideo) {
      movedVideo.addEventListener("loadedmetadata", snapToVideoAspect);
      state.aspectVideo = movedVideo;
      state.onAspectChange = snapToVideoAspect;
    }

    // YouTube мог поставить inline-размеры под старый контейнер — пересчёт.
    window.dispatchEvent(new Event("resize"));
    return true;
  }

  /** Вернуть плеер на страницу (закрывает окно; restore сработает по pagehide). */
  function close() {
    if (state) {
      state.pipWindow.close();
    } else if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  function restore() {
    if (!state) {
      return;
    }
    const { playerEl, placeholder, overlay, controls, progress, related, resizeTimer, aspectVideo, onAspectChange } = state;
    // Сначала гасим таймер и слушатели, потом обнуляем state.
    clearTimeout(resizeTimer);
    if (aspectVideo && onAspectChange) {
      aspectVideo.removeEventListener("loadedmetadata", onAspectChange);
    }
    controls.cleanup();
    progress.cleanup();
    related.cleanup();
    state = null;

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
    if (isOpen()) {
      close();
      return true;
    }
    return open();
  }

  return { open, close, toggle, isOpen, getMovedPlayer };
})();
