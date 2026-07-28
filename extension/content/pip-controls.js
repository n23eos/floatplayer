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
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    skip: "M4 6v12l8.5-6L4 6zm9 0v12l8.5-6L13 6z",
    link: "M3.9 12A3.1 3.1 0 0 1 7 8.9h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 1 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z",
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
  function buildBar(pipDocument, { getVideo, onReturnRequested, isShorts }) {
    const bar = pipDocument.createElement("div");
    bar.className = "ytfp-bar";
    if (YTFP.settings.get().compactMode) {
      bar.classList.add("ytfp-bar--compact");
    }
    // Узкое вертикальное окно шортсов: компактная панель без нишевых
    // кнопок (A-B и промотки интеграций), с короткими ползунками.
    if (isShorts) {
      bar.classList.add("ytfp-bar--narrow");
    }

    // --- A-B повтор ---------------------------------------------------------
    let pointA = null;
    let pointB = null;

    const abButton = createButton(
      pipDocument,
      "A-B",
      t("abTooltip", "A-B loop: click 1 sets A, click 2 sets B, click 3 resets"),
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

    // --- Play/pause -------------------------------------------------------------
    // Родные контролы YouTube в окне скрыты, поэтому пауза живёт здесь.
    const playButton = createButton(
      pipDocument,
      createIcon(pipDocument, "pause"),
      t("playTooltip", "Play / pause"),
      () => {
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
    );

    function refreshPlayIcon() {
      const video = getVideo();
      playButton.replaceChildren(
        createIcon(pipDocument, video && video.paused ? "play" : "pause")
      );
    }

    // --- Промотка интеграций --------------------------------------------------
    // Один клик — прыжок вперёд на настроенный шаг (по умолчанию 30 сек):
    // удобно проматывать рекламные интеграции внутри видео.
    const skipStep = () => YTFP.settings.get().skipStepSeconds;
    const skipButton = createButton(
      pipDocument,
      createIcon(pipDocument, "skip"),
      t("skipTooltip", "Skip ahead (sponsor segment)"),
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
    speedWrap.title = t("speedTooltip", "Playback speed");

    const speedSlider = pipDocument.createElement("input");
    speedSlider.type = "range";
    speedSlider.min = String(YTFP.SPEED_MIN);
    speedSlider.max = String(YTFP.SPEED_MAX);
    speedSlider.step = String(YTFP.settings.get().speedStep);
    speedSlider.value = "1";

    const speedLabel = pipDocument.createElement("span");
    speedLabel.className = "ytfp-speed-label";
    speedLabel.title = t("speedResetTooltip", "Reset speed to 1x");

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
    boostWrap.title = t("boostTooltip", "Volume: 0–100% quieter, above 100% boost");

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
      boostLabel.textContent = ok ? `${boostSlider.value}%` : "n/a";
    });

    boostWrap.append(createIcon(pipDocument, "volume"), boostSlider, boostLabel);

    // --- Таймер сна -----------------------------------------------------------
    // По истечении — пауза. Живёт, пока открыто мини-окно.
    const SLEEP_PRESETS_MIN = [15, 30, 45, 60, 90];
    let sleepDeadline = null;   // timestamp окончания, ms
    let sleepTicker = null;     // interval обновления обратного отсчёта

    const sleepWrap = pipDocument.createElement("label");
    sleepWrap.className = "ytfp-sleep";
    sleepWrap.title = t("sleepTooltip", "Sleep timer: pauses the video when it runs out");

    const sleepSelect = pipDocument.createElement("select");
    sleepSelect.className = "ytfp-select";
    const offOption = pipDocument.createElement("option");
    offOption.value = "0";
    offOption.textContent = t("sleepOff", "off");
    sleepSelect.appendChild(offOption);
    for (const minutes of SLEEP_PRESETS_MIN) {
      const option = pipDocument.createElement("option");
      option.value = String(minutes);
      option.textContent = `${minutes} ${t("sleepMinutes", "min")}`;
      sleepSelect.appendChild(option);
    }
    // Произвольное значение: пункт «своё…» открывает поле ввода минут.
    const customOption = pipDocument.createElement("option");
    customOption.value = "custom";
    customOption.textContent = t("sleepCustom", "custom…");
    sleepSelect.appendChild(customOption);

    const sleepCustomInput = pipDocument.createElement("input");
    sleepCustomInput.type = "number";
    sleepCustomInput.className = "ytfp-sleep-input";
    sleepCustomInput.min = "1";
    sleepCustomInput.max = "720";
    sleepCustomInput.placeholder = t("sleepMinutes", "min");
    sleepCustomInput.style.display = "none";

    const sleepCountdown = pipDocument.createElement("span");
    sleepCountdown.className = "ytfp-sleep-countdown";

    // Пока таймер идёт, интерфейс окна прячется полностью;
    // движение мыши показывает его на пару секунд.
    const PEEK_MS = 3000;
    let peekTimer = null;

    function onSleepMouseMove() {
      pipDocument.body.classList.add("ytfp-peek");
      clearTimeout(peekTimer);
      peekTimer = setTimeout(() => {
        pipDocument.body.classList.remove("ytfp-peek");
      }, PEEK_MS);
    }

    function setSleepingUi(isSleeping) {
      pipDocument.body.classList.toggle("ytfp-sleeping", isSleeping);
      pipDocument.body.classList.remove("ytfp-peek");
      clearTimeout(peekTimer);
      if (isSleeping) {
        pipDocument.addEventListener("mousemove", onSleepMouseMove);
      } else {
        pipDocument.removeEventListener("mousemove", onSleepMouseMove);
      }
    }

    function stopSleepTimer() {
      clearInterval(sleepTicker);
      sleepTicker = null;
      sleepDeadline = null;
      sleepCountdown.textContent = "";
      sleepSelect.value = "0";
      sleepCustomInput.style.display = "none";
      sleepCustomInput.value = "";
      setSleepingUi(false);
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

    function startSleepTimer(minutes) {
      clearInterval(sleepTicker);
      sleepDeadline = Date.now() + minutes * 60 * 1000;
      sleepTicker = setInterval(tickSleepTimer, 1000);
      tickSleepTimer();
      setSleepingUi(true);
    }

    sleepSelect.addEventListener("change", () => {
      if (sleepSelect.value === "custom") {
        // Ввод своего значения: показываем поле, таймер стартует по Enter.
        clearInterval(sleepTicker);
        sleepCountdown.textContent = "";
        sleepCustomInput.style.display = "";
        sleepCustomInput.focus();
        return;
      }
      sleepCustomInput.style.display = "none";
      const minutes = Number(sleepSelect.value);
      if (minutes <= 0) {
        stopSleepTimer();
        return;
      }
      startSleepTimer(minutes);
    });

    function commitCustomSleep() {
      const minutes = Math.floor(Number(sleepCustomInput.value));
      if (minutes >= 1) {
        startSleepTimer(Math.min(minutes, 720));
      } else {
        stopSleepTimer();
      }
    }

    sleepCustomInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        commitCustomSleep();
      } else if (event.key === "Escape") {
        stopSleepTimer();
      }
    });
    sleepCustomInput.addEventListener("change", commitCustomSleep);

    sleepWrap.append(createIcon(pipDocument, "sleep"), sleepSelect, sleepCustomInput, sleepCountdown);

    // --- Скопировать ссылку на видео -----------------------------------------
    const shareButton = createButton(
      pipDocument,
      createIcon(pipDocument, "link"),
      t("copyLink", "Copy video link"),
      async () => {
        try {
          await navigator.clipboard.writeText(location.href);
        } catch (error) {
          console.warn("[YTFP] Clipboard write failed:", error);
          return;
        }
        // Короткое подтверждение: галочка на полторы секунды.
        shareButton.textContent = "✓";
        setTimeout(() => {
          shareButton.replaceChildren(createIcon(pipDocument, "link"));
        }, 1500);
      }
    );

    // --- Возврат на страницу ------------------------------------------------
    const returnButton = createButton(
      pipDocument,
      createIcon(pipDocument, "back"),
      t("returnTooltip", "Return video to the page"),
      onReturnRequested
    );
    returnButton.classList.add("ytfp-btn--return");

    if (isShorts) {
      bar.append(playButton, speedWrap, boostWrap, sleepWrap, shareButton, returnButton);
    } else {
      bar.append(playButton, abButton, skipButton, speedWrap, boostWrap, sleepWrap, shareButton, returnButton);
    }

    // Слушатели на <video>: время (для A-B), скорость, пауза (для иконки).
    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ratechange", refreshSpeedControls);
      video.addEventListener("play", refreshPlayIcon);
      video.addEventListener("pause", refreshPlayIcon);
    }
    refreshSpeedControls();
    refreshPlayIcon();

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
      // Тот же элемент, на который вешали, — не результат нового getVideo().
      if (video) {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("ratechange", refreshSpeedControls);
        video.removeEventListener("play", refreshPlayIcon);
        video.removeEventListener("pause", refreshPlayIcon);
      }
      pipDocument.removeEventListener("keydown", onKeyDown);
      clearInterval(sleepTicker);
      clearTimeout(peekTimer);
      pipDocument.removeEventListener("mousemove", onSleepMouseMove);
    }

    return { element: bar, cleanup };
  }

  return { buildBar };
})();
