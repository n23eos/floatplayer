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

  // Монохромные SVG-иконки (сетка 24x24, fill: currentColor).
  const ICONS = {
    skip: "M4 6v12l8.5-6L4 6zm9 0v12l8.5-6L13 6z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
    sleep: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
  };

  function createIcon(doc, name) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  /** content — строка или DOM-узел (иконка). */
  function createButton(doc, content, title, onClick) {
    const button = doc.createElement("button");
    button.className = "ytfp-btn";
    if (typeof content === "string") {
      button.textContent = content;
    } else {
      button.appendChild(content);
    }
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

    // --- Промотка интеграций --------------------------------------------------
    // Один клик — прыжок вперёд на настроенный шаг (по умолчанию 30 сек):
    // удобно проматывать рекламные интеграции внутри видео.
    const skipStep = () => YTFP.settings.get().skipStepSeconds;
    const skipButton = createButton(
      pipDocument,
      createIcon(pipDocument, "skip"),
      t("skipTooltip", "Промотать вперёд (интеграция)"),
      () => {
        const video = getVideo();
        if (!video) {
          return;
        }
        video.currentTime = Math.min(
          video.duration || Infinity,
          video.currentTime + skipStep()
        );
      }
    );
    const skipStepLabel = pipDocument.createElement("span");
    skipStepLabel.textContent = String(skipStep());
    skipButton.appendChild(skipStepLabel);

    // --- Скорость: ползунок с шагами -----------------------------------------
    const speedWrap = pipDocument.createElement("label");
    speedWrap.className = "ytfp-speed";
    speedWrap.title = t("speedTooltip", "Скорость воспроизведения");

    const speedSlider = pipDocument.createElement("input");
    speedSlider.type = "range";
    speedSlider.min = String(YTFP.SPEED_MIN);
    speedSlider.max = String(YTFP.SPEED_MAX);
    speedSlider.step = String(YTFP.settings.get().speedStep);
    speedSlider.value = "1";

    const speedLabel = pipDocument.createElement("span");
    speedLabel.className = "ytfp-speed-label";
    speedLabel.title = t("speedResetTooltip", "Сбросить скорость на 1x");

    function refreshSpeedControls() {
      const video = getVideo();
      const rate = video ? video.playbackRate : 1;
      speedLabel.textContent = `${rate}x`;
      speedSlider.value = String(rate);
    }

    speedSlider.addEventListener("input", () => {
      const video = getVideo();
      if (video) {
        video.playbackRate = Number(speedSlider.value);
      }
    });
    speedLabel.addEventListener("click", () => {
      const video = getVideo();
      if (video) {
        video.playbackRate = 1;
      }
    });

    speedWrap.append(speedSlider, speedLabel);

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

    boostWrap.append(createIcon(pipDocument, "volume"), boostSlider, boostLabel);

    // --- Таймер сна -----------------------------------------------------------
    // По истечении — пауза. Живёт, пока открыто мини-окно.
    const SLEEP_PRESETS_MIN = [15, 30, 45, 60, 90];
    let sleepDeadline = null;   // timestamp окончания, ms
    let sleepTicker = null;     // interval обновления обратного отсчёта

    const sleepWrap = pipDocument.createElement("label");
    sleepWrap.className = "ytfp-sleep";
    sleepWrap.title = t("sleepTooltip", "Таймер сна: по истечении видео ставится на паузу");

    const sleepSelect = pipDocument.createElement("select");
    sleepSelect.className = "ytfp-select";
    const offOption = pipDocument.createElement("option");
    offOption.value = "0";
    offOption.textContent = t("sleepOff", "выкл");
    sleepSelect.appendChild(offOption);
    for (const minutes of SLEEP_PRESETS_MIN) {
      const option = pipDocument.createElement("option");
      option.value = String(minutes);
      option.textContent = `${minutes} ${t("sleepMinutes", "мин")}`;
      sleepSelect.appendChild(option);
    }

    const sleepCountdown = pipDocument.createElement("span");
    sleepCountdown.className = "ytfp-sleep-countdown";

    function stopSleepTimer() {
      clearInterval(sleepTicker);
      sleepTicker = null;
      sleepDeadline = null;
      sleepCountdown.textContent = "";
      sleepSelect.value = "0";
    }

    function tickSleepTimer() {
      const remainingSeconds = Math.round((sleepDeadline - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        const video = getVideo();
        if (video) {
          video.pause();
        }
        stopSleepTimer();
        return;
      }
      sleepCountdown.textContent = YTFP.utils.formatTime(remainingSeconds);
    }

    sleepSelect.addEventListener("change", () => {
      const minutes = Number(sleepSelect.value);
      clearInterval(sleepTicker);
      if (minutes <= 0) {
        stopSleepTimer();
        return;
      }
      sleepDeadline = Date.now() + minutes * 60 * 1000;
      sleepTicker = setInterval(tickSleepTimer, 1000);
      tickSleepTimer();
    });

    sleepWrap.append(createIcon(pipDocument, "sleep"), sleepSelect, sleepCountdown);

    // --- Возврат на страницу ------------------------------------------------
    const returnButton = createButton(
      pipDocument,
      createIcon(pipDocument, "back"),
      t("returnTooltip", "Вернуть видео на страницу"),
      onReturnRequested
    );
    returnButton.classList.add("ytfp-btn--return");

    bar.append(abButton, skipButton, speedWrap, boostWrap, sleepWrap, returnButton);

    // Слушатели на <video>: время (для A-B) и скорость (для ползунка).
    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ratechange", refreshSpeedControls);
    }
    refreshSpeedControls();

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
        case "<":
        case ">": {
          const direction = event.key === ">" ? 1 : -1;
          currentVideo.playbackRate = YTFP.utils.nextSpeed(
            currentVideo.playbackRate,
            YTFP.settings.get().speedStep,
            direction,
            YTFP.SPEED_MIN,
            YTFP.SPEED_MAX
          );
          break;
        }
        default:
          break;
      }
    }
    pipDocument.addEventListener("keydown", onKeyDown);

    function cleanup() {
      const currentVideo = getVideo();
      if (currentVideo) {
        currentVideo.removeEventListener("timeupdate", onTimeUpdate);
        currentVideo.removeEventListener("ratechange", refreshSpeedControls);
      }
      pipDocument.removeEventListener("keydown", onKeyDown);
      clearInterval(sleepTicker);
    }

    return { element: bar, cleanup };
  }

  return { buildBar };
})();
