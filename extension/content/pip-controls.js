"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Панель дополнительных функций внутри PiP-окна.
// Родные контролы YouTube (таймлайн, главы, субтитры, next/prev) переезжают
// вместе с плеером, поэтому здесь только то, чего у YouTube нет:
// A-B повтор, быстрая скорость, громкость 0–300%, кнопка возврата.
YTFP.pipControls = (() => {
  // Локализация с фолбэком: расширение работает и без записи в messages.json.
  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function createButton(doc, label, title, onClick) {
    const button = doc.createElement("button");
    button.className = "ytfp-btn";
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", onClick);
    return button;
  }

  /**
   * Строит панель в документе PiP-окна.
   * Возвращает объект с cleanup() для снятия слушателей с <video>.
   */
  function buildBar(pipDocument, { getVideo, onReturnRequested }) {
    const bar = pipDocument.createElement("div");
    bar.className = "ytfp-bar";
    if (YTFP.settings.get().compactMode) {
      bar.classList.add("ytfp-bar--compact");
    }

    // --- A-B повтор ---------------------------------------------------------
    let pointA = null;
    let pointB = null;

    const abButton = createButton(
      pipDocument,
      "A-B",
      t("abTooltip", "A-B повтор: клик 1 — точка A, клик 2 — точка B, клик 3 — сброс"),
      () => {
        const video = getVideo();
        if (!video) {
          return;
        }
        if (pointA === null) {
          pointA = video.currentTime;
          abButton.textContent = `A ${YTFP.utils.formatTime(pointA)}…`;
          abButton.classList.add("ytfp-btn--active");
        } else if (pointB === null) {
          pointB = video.currentTime;
          if (pointB <= pointA) {
            // B раньше A — бессмысленно, сбрасываем.
            resetAb();
            return;
          }
          abButton.textContent = `${YTFP.utils.formatTime(pointA)}–${YTFP.utils.formatTime(pointB)}`;
        } else {
          resetAb();
        }
      }
    );

    function resetAb() {
      pointA = null;
      pointB = null;
      abButton.textContent = "A-B";
      abButton.classList.remove("ytfp-btn--active");
    }

    function onTimeUpdate() {
      const video = getVideo();
      if (!video) {
        return;
      }
      const target = YTFP.utils.abLoopTarget(video.currentTime, pointA, pointB);
      if (target !== null) {
        video.currentTime = target;
      }
    }

    // --- Скорость -----------------------------------------------------------
    const speedLabel = pipDocument.createElement("span");
    speedLabel.className = "ytfp-speed-label";

    function refreshSpeedLabel() {
      const video = getVideo();
      speedLabel.textContent = `${video ? video.playbackRate : 1}x`;
    }

    function changeSpeed(direction) {
      const video = getVideo();
      if (!video) {
        return;
      }
      video.playbackRate = YTFP.utils.nextSpeed(
        video.playbackRate,
        YTFP.settings.get().speedStep,
        direction,
        YTFP.SPEED_MIN,
        YTFP.SPEED_MAX
      );
    }

    const slowerButton = createButton(pipDocument, "−", t("slowerTooltip", "Медленнее"), () => changeSpeed(-1));
    const fasterButton = createButton(pipDocument, "+", t("fasterTooltip", "Быстрее"), () => changeSpeed(1));
    speedLabel.title = t("speedResetTooltip", "Сбросить скорость на 1x");
    speedLabel.addEventListener("click", () => {
      const video = getVideo();
      if (video) {
        video.playbackRate = 1;
      }
    });

    // --- Громкость 0–300% (Web Audio) ----------------------------------------
    const boostWrap = pipDocument.createElement("label");
    boostWrap.className = "ytfp-boost";
    boostWrap.title = t("boostTooltip", "Громкость: 0–100% тише, выше 100% — усиление");

    const boostSlider = pipDocument.createElement("input");
    boostSlider.type = "range";
    boostSlider.min = "0";
    boostSlider.max = String(YTFP.settings.get().volumeBoostMax);
    boostSlider.step = "10";
    boostSlider.value = String(YTFP.audioBoost.getBoostPercent());

    const boostLabel = pipDocument.createElement("span");
    boostLabel.textContent = `${boostSlider.value}%`;

    boostSlider.addEventListener("input", () => {
      const ok = YTFP.audioBoost.setBoostPercent(getVideo(), Number(boostSlider.value));
      boostLabel.textContent = ok ? `${boostSlider.value}%` : "н/д";
    });

    boostWrap.append("🔊", boostSlider, boostLabel);

    // --- Возврат на страницу ------------------------------------------------
    const returnButton = createButton(
      pipDocument,
      "↩",
      t("returnTooltip", "Вернуть видео на страницу"),
      onReturnRequested
    );
    returnButton.classList.add("ytfp-btn--return");

    bar.append(abButton, slowerButton, speedLabel, fasterButton, boostWrap, returnButton);

    // Слушатели на <video>: время (для A-B) и скорость (для лейбла).
    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ratechange", refreshSpeedLabel);
    }
    refreshSpeedLabel();

    // Горячие клавиши внутри PiP-окна: фокус там, страница их не слышит.
    function onKeyDown(event) {
      const tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        return; // стрелки на слайдере двигают слайдер, не видео
      }
      const currentVideo = getVideo();
      if (!currentVideo) {
        return;
      }
      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          if (currentVideo.paused) {
            currentVideo.play().catch(() => {});
          } else {
            currentVideo.pause();
          }
          break;
        case "ArrowLeft":
          currentVideo.currentTime = Math.max(0, currentVideo.currentTime - YTFP.SEEK_STEP_SECONDS);
          break;
        case "ArrowRight":
          currentVideo.currentTime = Math.min(
            currentVideo.duration || Infinity,
            currentVideo.currentTime + YTFP.SEEK_STEP_SECONDS
          );
          break;
        case "m":
          currentVideo.muted = !currentVideo.muted;
          break;
        default:
          break;
      }
    }
    pipDocument.addEventListener("keydown", onKeyDown);

    function cleanup() {
      const currentVideo = getVideo();
      if (currentVideo) {
        currentVideo.removeEventListener("timeupdate", onTimeUpdate);
        currentVideo.removeEventListener("ratechange", refreshSpeedLabel);
      }
      pipDocument.removeEventListener("keydown", onKeyDown);
    }

    return { element: bar, cleanup };
  }

  return { buildBar };
})();
