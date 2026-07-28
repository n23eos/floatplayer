"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Нижний центральный блок управления в PiP-окне: назад / стоп-плей / вперёд
// (стандартные круглые кнопки с полупрозрачным фоном), плюс пауза по клику
// в центр видео с полупрозрачным значком посередине.
YTFP.pipNav = (() => {
  const ICONS = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    next: "M6 18l8.5-6L6 6v12zM16 6h2v12h-2z",
    prev: "M6 6h2v12H6zM18 18l-8.5-6L18 6v12z"
  };

  function createIcon(doc, name, size) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  /**
   * onPrev/onNext — колбэки перехода (для видео и шортсов разные).
   * Возвращает { element, cleanup }.
   */
  function build(pipDocument, { getVideo, onPrev, onNext }) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-nav-root";

    // --- Полупрозрачный значок по центру (виден на паузе) ------------------
    // Показывает play: клик по нему продолжает воспроизведение.
    const badge = pipDocument.createElement("div");
    badge.className = "ytfp-center-badge";
    badge.appendChild(createIcon(pipDocument, "play", 36));
    badge.addEventListener("click", () => {
      const video = getVideo();
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    });

    // --- Нижний ряд кнопок ---------------------------------------------------
    const nav = pipDocument.createElement("div");
    nav.className = "ytfp-nav";

    function makeButton(name, title, extraClass, onClick) {
      const button = pipDocument.createElement("button");
      button.className = `ytfp-nav-btn ${extraClass}`.trim();
      button.title = title;
      button.appendChild(createIcon(pipDocument, name, extraClass ? 26 : 20));
      button.addEventListener("click", onClick);
      return button;
    }

    function togglePlayPause() {
      const video = getVideo();
      if (!video) {
        return;
      }
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    const prevButton = makeButton("prev", t("navPrev", "Назад"), "", () => onPrev());
    const playButton = makeButton("pause", t("playTooltip", "Пауза / воспроизведение"), "ytfp-nav-btn--main", togglePlayPause);
    const nextButton = makeButton("next", t("navNext", "Вперёд"), "", () => onNext());
    nav.append(prevButton, playButton, nextButton);

    function refreshPlayState() {
      const video = getVideo();
      const isPaused = Boolean(video && video.paused);
      playButton.replaceChildren(createIcon(pipDocument, isPaused ? "play" : "pause", 26));
      badge.classList.toggle("ytfp-center-badge--visible", isPaused);
    }

    // --- Клик в центр видео = пауза ------------------------------------------
    // Слушаем в capture-фазе: контроллер глушит click для скриптов YouTube
    // (stopPropagation на document), но слушатели на самом document в
    // capture-фазе успевают отработать.
    function onDocumentClick(event) {
      const target = event.target;
      if (!target || !target.closest) {
        return;
      }
      // Наши элементы и любые кнопки обрабатывают клики сами.
      if (target.closest("button, input, select, .ytfp-bar, .ytfp-nav, .ytfp-progress-wrap, .ytfp-related-root, .ytfp-center-badge")) {
        return;
      }
      if (target.closest("#movie_player, #shorts-player")) {
        togglePlayPause();
      }
    }
    pipDocument.addEventListener("click", onDocumentClick, true);

    const video = getVideo();
    if (video) {
      video.addEventListener("play", refreshPlayState);
      video.addEventListener("pause", refreshPlayState);
    }
    refreshPlayState();

    root.append(badge, nav);

    function cleanup() {
      pipDocument.removeEventListener("click", onDocumentClick, true);
      const currentVideo = getVideo();
      if (currentVideo) {
        currentVideo.removeEventListener("play", refreshPlayState);
        currentVideo.removeEventListener("pause", refreshPlayState);
      }
    }

    return { element: root, cleanup };
  }

  return { build };
})();
