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

  // Клик по краям видео: левая треть — назад, правая — вперёд.
  const EDGE_CLICK_SEEK_SECONDS = 10;
  // Кнопки по краям нижнего ряда.
  const JUMP_BUTTON_SECONDS = 30;

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
      YTFP.tooltips.attach(button, title);
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

    function seekBy(deltaSeconds) {
      const video = getVideo();
      // Во время рекламы YouTube перемотка запрещена: currentTime — время
      // рекламного ролика, и сдвиг означал бы его пропуск.
      if (!video || YTFP.playerApi.isAdShowing()) {
        return;
      }
      // Границы, а не длительность: у прямого эфира длительность не конечна,
      // и мотать надо в пределах DVR-буфера.
      const bounds = YTFP.playerApi.getSeekRange(video);
      if (!bounds) {
        return;
      }
      video.currentTime = YTFP.utils.clamp(
        video.currentTime + deltaSeconds,
        bounds.start,
        bounds.end
      );
      flashSeekIndicator(deltaSeconds);
    }

    /** Текстовая круглая кнопка (−30 / +30) в том же стиле. */
    function makeJumpButton(label, title, deltaSeconds) {
      const button = pipDocument.createElement("button");
      button.className = "ytfp-nav-btn ytfp-nav-btn--text";
      YTFP.tooltips.attach(button, title);
      button.textContent = label;
      button.addEventListener("click", () => seekBy(deltaSeconds));
      return button;
    }

    // Мгновенная подсказка «±10s / ±30s» у соответствующего края.
    const seekIndicator = pipDocument.createElement("div");
    seekIndicator.className = "ytfp-seek-indicator";
    let seekIndicatorTimer = null;

    function flashSeekIndicator(deltaSeconds) {
      seekIndicator.textContent = `${deltaSeconds > 0 ? "»" : "«"} ${Math.abs(deltaSeconds)}${t("secShort", "s")}`;
      seekIndicator.classList.toggle("ytfp-seek-indicator--left", deltaSeconds < 0);
      seekIndicator.classList.add("ytfp-seek-indicator--visible");
      clearTimeout(seekIndicatorTimer);
      seekIndicatorTimer = setTimeout(() => {
        seekIndicator.classList.remove("ytfp-seek-indicator--visible");
      }, 600);
    }

    const back30Button = makeJumpButton(`−${JUMP_BUTTON_SECONDS}`, t("jumpBack", "Back 30 seconds"), -JUMP_BUTTON_SECONDS);
    const prevButton = makeButton("prev", t("navPrev", "Previous"), "", () => onPrev());
    const playButton = makeButton("pause", t("playTooltip", "Play / pause"), "ytfp-nav-btn--main", togglePlayPause);
    const nextButton = makeButton("next", t("navNext", "Next"), "", () => onNext());
    const forward30Button = makeJumpButton(`+${JUMP_BUTTON_SECONDS}`, t("jumpForward", "Forward 30 seconds"), JUMP_BUTTON_SECONDS);
    nav.append(back30Button, prevButton, playButton, nextButton, forward30Button);

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
        // Зоны клика: левая треть — назад, правая — вперёд, центр — пауза.
        const windowWidth = pipDocument.documentElement.clientWidth;
        if (event.clientX < windowWidth / 3) {
          seekBy(-EDGE_CLICK_SEEK_SECONDS);
        } else if (event.clientX > (windowWidth * 2) / 3) {
          seekBy(EDGE_CLICK_SEEK_SECONDS);
        } else {
          togglePlayPause();
        }
      }
    }
    pipDocument.addEventListener("click", onDocumentClick, true);

    const video = getVideo();
    if (video) {
      video.addEventListener("play", refreshPlayState);
      video.addEventListener("pause", refreshPlayState);
    }
    refreshPlayState();

    // Ряд кнопок в корень не кладём: его забирает нижняя капсула
    // (pip-controller). Здесь остаётся то, что рисуется поверх кадра —
    // значок паузы по центру и всплывающая подпись перемотки.
    root.append(badge, seekIndicator);

    function cleanup() {
      clearTimeout(seekIndicatorTimer);
      pipDocument.removeEventListener("click", onDocumentClick, true);
      // Тот же элемент, на который вешали, — не результат нового getVideo().
      if (video) {
        video.removeEventListener("play", refreshPlayState);
        video.removeEventListener("pause", refreshPlayState);
      }
    }

    // element — слой поверх видео, row — ряд кнопок для нижней капсулы.
    return { element: root, row: nav, cleanup };
  }

  return { build };
})();
