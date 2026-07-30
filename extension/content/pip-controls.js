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
    loop: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
    sleep: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    // Автовоспроизведение: рамка с треугольником play внутри — тот же язык,
    // что у родной кнопки автозапуска YouTube.
    autoplay: "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14v10zM10 9.5v5l4-2.5-4-2.5z"
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

  // Ночной режим: во сколько раз давим каждый канал (R, G, B).
  // Честное масштабирование каналов, как у f.lux: картинка теплеет,
  // но не мутнеет, как от sepia().
  const NIGHT_LEVELS = ["off", "warm", "deep"];
  const NIGHT_MATRICES = {
    warm: [1, 0.93, 0.72],
    deep: [1, 0.82, 0.5]
  };

  /** Скрытый <svg> с фильтрами ночного режима для документа PiP-окна. */
  function createNightFilters(doc) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "ytfp-night-defs");
    svg.setAttribute("aria-hidden", "true");
    for (const [level, [red, green, blue]] of Object.entries(NIGHT_MATRICES)) {
      const filter = doc.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", `ytfp-night-${level}`);
      // Явный sRGB: по умолчанию SVG-фильтры считаются в линейном
      // пространстве, и картинка заметно светлеет.
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const matrix = doc.createElementNS(SVG_NS, "feColorMatrix");
      matrix.setAttribute("type", "matrix");
      matrix.setAttribute("values", [
        red, 0, 0, 0, 0,
        0, green, 0, 0, 0,
        0, 0, blue, 0, 0,
        0, 0, 0, 1, 0
      ].join(" "));
      filter.appendChild(matrix);
      svg.appendChild(filter);
    }
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
      // Во время рекламы currentTime — время ролика: цикл не применяем,
      // иначе перемотка стала бы пропуском рекламы.
      if (!video || YTFP.playerApi.isAdShowing()) {
        return;
      }
      const target = YTFP.utils.abLoopTarget(video.currentTime, pointA, pointB);
      if (target !== null) {
        video.currentTime = target;
      }
    }

    // --- Loop всего видео -----------------------------------------------------
    const loopButton = createButton(
      pipDocument,
      createIcon(pipDocument, "loop"),
      t("loopTooltip", "Loop this video"),
      () => {
        const video = getVideo();
        if (!video) {
          return;
        }
        video.loop = !video.loop;
        loopButton.classList.toggle("ytfp-btn--active", video.loop);
      }
    );

    // --- Автовоспроизведение --------------------------------------------------
    // Флаг читает pip-controller по окончании видео (когда очередь пуста).
    // Здесь только переключатель и его подсветка.
    // Локальное состояние, а не чтение настроек на каждый клик: кэш настроек
    // обновляется асинхронно через storage.onChanged, и два быстрых клика
    // прочитали бы одно и то же значение.
    let isAutoplayOn = Boolean(YTFP.settings.get().autoplayNext);
    const autoplayButton = createButton(
      pipDocument,
      createIcon(pipDocument, "autoplay"),
      t("autoplayTooltip", "Autoplay: start the next video when this one ends"),
      () => {
        isAutoplayOn = !isAutoplayOn;
        autoplayButton.classList.toggle("ytfp-btn--active", isAutoplayOn);
        chrome.storage.sync.set({ autoplayNext: isAutoplayOn }).catch(() => {});
      }
    );
    autoplayButton.classList.toggle("ytfp-btn--active", isAutoplayOn);

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
      // Заодно синхронизируем подсветку loop: у <video> нет события "loop",
      // а само видео могло смениться (рекомендации, плейлист, шортсы).
      loopButton.classList.toggle("ytfp-btn--active", Boolean(video && video.loop));
    }

    // --- Прямой эфир ----------------------------------------------------------
    // На обычном видео кнопки нет вообще. На стриме: у края эфира горит
    // красная точка, при отставании — на сколько отстали, клик возвращает.
    // Отставание меньше секунды считаем эфиром: край растёт непрерывно, и
    // подпись иначе дёргалась бы на «−0:00».
    const LIVE_EDGE_TOLERANCE_SECONDS = 1;

    const liveButton = pipDocument.createElement("button");
    liveButton.className = "ytfp-btn ytfp-btn--live";
    liveButton.title = t("liveTooltip", "Jump to the live edge");
    const liveDot = pipDocument.createElement("span");
    liveDot.className = "ytfp-live-dot";
    const liveLabel = pipDocument.createElement("span");
    liveButton.append(liveDot, liveLabel);
    liveButton.addEventListener("click", () => {
      const edge = YTFP.playerApi.getLiveEdge();
      const video = getVideo();
      if (video && edge !== null) {
        video.currentTime = edge;
      }
    });

    function refreshLiveState() {
      const video = getVideo();
      const isLive = Boolean(video) && YTFP.playerApi.isLive();
      liveButton.hidden = !isLive;
      if (!isLive) {
        return;
      }
      const behind = YTFP.utils.behindLiveSeconds(
        YTFP.playerApi.getLiveEdge(),
        video.currentTime
      );
      const atEdge = behind === null || behind < LIVE_EDGE_TOLERANCE_SECONDS;
      liveButton.classList.toggle("ytfp-btn--live-edge", atEdge);
      liveLabel.textContent = atEdge
        ? t("liveLabel", "LIVE")
        : `−${YTFP.utils.formatTime(behind)}`;
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
        // Реклама не мотается: во время неё currentTime принадлежит ролику.
        if (!video || YTFP.playerApi.isAdShowing()) {
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

    // --- Аудио-пресеты (Web Audio фильтры) ------------------------------------
    const PRESET_KEYS = [
      ["off", t("presetOff", "Normal")],
      ["night", t("presetNight", "Night")],
      ["voice", t("presetVoice", "Voice")],
      ["bass", t("presetBass", "Bass")]
    ];
    const presetSelect = pipDocument.createElement("select");
    presetSelect.className = "ytfp-select ytfp-preset";
    presetSelect.title = t("presetTooltip", "Audio preset");
    for (const [value, label] of PRESET_KEYS) {
      const option = pipDocument.createElement("option");
      option.value = value;
      option.textContent = label;
      presetSelect.appendChild(option);
    }
    // Значение из настроек может оказаться мусором (правка storage вручную,
    // старая версия) — тогда select стал бы пустым. Проверяем по списку.
    const storedPreset = YTFP.settings.get().audioPreset;
    presetSelect.value = PRESET_KEYS.some(([value]) => value === storedPreset)
      ? storedPreset
      : "off";

    function applyPreset(presetName) {
      const ok = YTFP.audioBoost.setPreset(getVideo(), presetName);
      if (!ok) {
        presetSelect.value = "off";
        return;
      }
      presetSelect.value = presetName;
    }

    presetSelect.addEventListener("change", () => {
      applyPreset(presetSelect.value);
      // Запоминаем выбор между сессиями (страница options не нужна).
      chrome.storage.sync.set({ audioPreset: presetSelect.value }).catch(() => {});
    });
    // Пресет из настроек применяем не сразу, а при первом действии пользователя
    // в окне. Причина: создание AudioContext без пользовательской активации
    // может остаться в состоянии suspended — тогда весь звук уйдёт в тишину.
    if (presetSelect.value !== "off") {
      const applyStoredPreset = () => applyPreset(presetSelect.value);
      // Capture-фаза: наш обработчик хоткеев и глушилка кликов по плееру
      // зовут stopPropagation(), и bubble-слушатель на этом же документе до
      // них не доживает — пресет молча не применился бы.
      pipDocument.addEventListener("pointerdown", applyStoredPreset, { once: true, capture: true });
      pipDocument.addEventListener("keydown", applyStoredPreset, { once: true, capture: true });
    }

    // --- Ночной режим ---------------------------------------------------------
    // Клик по Луне циклом убавляет синий канал: off → warm → deep → off.
    // Фильтр вешаем классом на <body> PiP-окна, а не инлайном на <video>:
    // тело окна умирает вместе с окном, поэтому видео возвращается на страницу
    // чистым и снимать фильтр вручную не нужно.
    pipDocument.body.appendChild(createNightFilters(pipDocument));

    const storedNight = YTFP.settings.get().nightMode;
    let nightLevel = NIGHT_LEVELS.includes(storedNight) ? storedNight : "off";

    const nightButton = createButton(
      pipDocument,
      createIcon(pipDocument, "sleep"),
      t("nightTooltip", "Night mode: cuts blue light (click to change strength)"),
      () => {
        const nextIndex = (NIGHT_LEVELS.indexOf(nightLevel) + 1) % NIGHT_LEVELS.length;
        nightLevel = NIGHT_LEVELS[nextIndex];
        applyNightLevel();
        // Запоминаем между сессиями (как аудио-пресет выше).
        chrome.storage.sync.set({ nightMode: nightLevel }).catch(() => {});
      }
    );
    nightButton.classList.add("ytfp-btn--night");

    function applyNightLevel() {
      for (const level of NIGHT_LEVELS) {
        pipDocument.body.classList.toggle(
          `ytfp-night--${level}`,
          level !== "off" && level === nightLevel
        );
      }
      nightButton.classList.toggle("ytfp-btn--active", nightLevel !== "off");
      // Заливка кнопки показывает силу режима — отдельной подписи не нужно.
      nightButton.dataset.night = nightLevel;
    }

    applyNightLevel();

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

    // Иконка Луны отсюда уехала в отдельную кнопку ночного режима: внутри
    // <label> клик по ней открывал бы выпадающий список минут.
    sleepWrap.append(sleepSelect, sleepCustomInput, sleepCountdown);

    // --- Возврат на страницу ------------------------------------------------
    const returnButton = createButton(
      pipDocument,
      createIcon(pipDocument, "back"),
      t("returnTooltip", "Return video to the page"),
      onReturnRequested
    );
    returnButton.classList.add("ytfp-btn--return");

    if (isShorts) {
      bar.append(playButton, speedWrap, boostWrap, presetSelect, nightButton, sleepWrap, returnButton);
    } else {
      bar.append(playButton, liveButton, abButton, loopButton, autoplayButton, skipButton, speedWrap, boostWrap, presetSelect, nightButton, sleepWrap, returnButton);
    }

    // Слушатели на <video>: время (для A-B), скорость, пауза (для иконки).
    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("timeupdate", refreshLiveState);
      video.addEventListener("ratechange", refreshSpeedControls);
      video.addEventListener("play", refreshPlayIcon);
      video.addEventListener("pause", refreshPlayIcon);
    }
    refreshSpeedControls();
    refreshPlayIcon();
    refreshLiveState();

    // Клавиши, которые обрабатываем сами. Всё остальное (f, c, i) уходит
    // к YouTube без изменений.
    const HANDLED_KEYS = new Set([
      " ", "k", "m", "<", ">",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"
    ]);

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
      const isDigit = /^[0-9]$/.test(event.key);
      if (isDigit || HANDLED_KEYS.has(event.key)) {
        // Плеер переехал в это окно вместе со слушателями YouTube, и они
        // обрабатывают те же клавиши. Без этого пробел давал двойное
        // переключение: пауза от YouTube и тут же снятие от нас.
        event.stopPropagation();
      }
      // Цифры 0–9 — прыжок к N×10% видео (как на самом YouTube).
      if (isDigit) {
        if (YTFP.playerApi.isAdShowing()) {
          return; // реклама не мотается
        }
        const target = YTFP.utils.digitSeekTime(currentVideo.duration, Number(event.key));
        if (target !== null) {
          currentVideo.currentTime = target;
        }
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
        // Границы берём из getSeekRange: у прямого эфира длительности нет,
        // а мотать надо в пределах DVR-буфера.
        case "ArrowLeft":
        case "ArrowRight": {
          if (YTFP.playerApi.isAdShowing()) {
            break; // реклама не мотается
          }
          const bounds = YTFP.playerApi.getSeekRange(currentVideo);
          if (!bounds) {
            break;
          }
          const step = event.key === "ArrowRight"
            ? YTFP.SEEK_STEP_SECONDS
            : -YTFP.SEEK_STEP_SECONDS;
          currentVideo.currentTime = YTFP.utils.clamp(
            currentVideo.currentTime + step,
            bounds.start,
            bounds.end
          );
          break;
        }
        case "m":
          currentVideo.muted = !currentVideo.muted;
          break;
        case "ArrowUp":
        case "ArrowDown": {
          // Громкость ±10% через тот же тракт, что и слайдер (0–300%).
          event.preventDefault();
          const VOLUME_KEY_STEP_PERCENT = 10;
          const delta = event.key === "ArrowUp" ? VOLUME_KEY_STEP_PERCENT : -VOLUME_KEY_STEP_PERCENT;
          const nextPercent = YTFP.audioBoost.getBoostPercent() + delta;
          const ok = YTFP.audioBoost.setBoostPercent(currentVideo, nextPercent);
          if (ok) {
            // Синхронизируем слайдер и подпись с фактическим значением.
            const applied = YTFP.audioBoost.getBoostPercent();
            boostSlider.value = String(applied);
            boostLabel.textContent = `${applied}%`;
          }
          break;
        }
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
    // Capture-фаза обязательна: слушатели YouTube висят внутри переехавшего
    // плеера и в bubble-фазе успевают отработать раньше нас. Capture на
    // документе идёт первым, поэтому stopPropagation() внутри onKeyDown их
    // отсекает. Заодно пробел на кнопке в фокусе больше не порождает
    // нативный click — событие до кнопки не доходит.
    pipDocument.addEventListener("keydown", onKeyDown, true);

    function cleanup() {
      // Тот же элемент, на который вешали, — не результат нового getVideo().
      if (video) {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("timeupdate", refreshLiveState);
        video.removeEventListener("ratechange", refreshSpeedControls);
        video.removeEventListener("play", refreshPlayIcon);
        video.removeEventListener("pause", refreshPlayIcon);
      }
      pipDocument.removeEventListener("keydown", onKeyDown, true);
      clearInterval(sleepTicker);
      clearTimeout(peekTimer);
      pipDocument.removeEventListener("mousemove", onSleepMouseMove);
    }

    return { element: bar, cleanup };
  }

  return { buildBar };
})();
