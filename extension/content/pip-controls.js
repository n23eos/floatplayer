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
    autoplay: "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14v10zM10 9.5v5l4-2.5-4-2.5z",
    // Автопереход к следующему шортсу: та же рамка, что у автовоспроизведения,
    // но стрелка вниз — лента шортсов листается сверху вниз.
    shortsAutoNext:
      "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" +
      "m0 12H5V7h14v10zM8 10h8l-4 5z",
    // Лупа: поиск шортсов по слову.
    search:
      "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3" +
      "S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99" +
      "L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5" +
      " 11.99 14 9.5 14z"
  };

  /** Отдаёт дорожке ползунка долю пройденного — по ней рисуется заливка. */
  const paintSlider = slider => YTFP.ui.paintSlider(slider);

  function createIcon(doc, name) { return YTFP.ui.icon(doc, ICONS[name], 14); }

  /** content — строка или DOM-узел (иконка). */
  function createButton(doc, content, title, onClick) {
    const button = doc.createElement("button");
    button.className = "ytfp-btn";
    if (typeof content === "string") {
      button.textContent = content;
    } else {
      button.appendChild(content);
    }
    YTFP.tooltips.attach(button, title);
    button.addEventListener("click", onClick);
    return button;
  }

  /**
   * Строит панель в документе PiP-окна.
   * Возвращает объект с cleanup() для снятия слушателей с <video>.
   */
  function buildBar(pipDocument, { getVideo, isShorts, navRow, chatToggle, reactionButtons, copyButton, onPrev, onNext }) {
    const bar = pipDocument.createElement("div");
    // Единственная панель окна — внизу. Ряд воспроизведения (navRow) и кнопку
    // боковой колонки (chatToggle) строят соседние модули, сюда они приходят
    // готовыми: панель одна, а собирается из трёх источников.
    bar.className = "ytfp-bottom";
    if (isShorts || YTFP.settings.get().compactMode) {
      bar.classList.add("ytfp-bottom--compact");
    }
    // Узкое вертикальное окно шортсов: компактная панель без нишевых
    // кнопок (A-B и промотки интеграций), с короткими ползунками.
    if (isShorts) {
      bar.classList.add("ytfp-bottom--narrow");
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
        loopButton.setAttribute("aria-pressed", String(video.loop));
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
        autoplayButton.setAttribute("aria-pressed", String(isAutoplayOn));
        chrome.storage.sync.set({ autoplayNext: isAutoplayOn }).catch(() => {});
      }
    );
    autoplayButton.classList.toggle("ytfp-btn--active", isAutoplayOn);
    autoplayButton.setAttribute("aria-pressed", String(isAutoplayOn));

    // --- Автопереход к следующему шортсу --------------------------------------
    // Тот же приём, что у автовоспроизведения: локальный флаг + запись в
    // настройки. Сам переход делает pip-controller по окончании ролика,
    // он читает shortsAutoNext на каждом тике.
    let isShortsAutoOn = Boolean(YTFP.settings.get().shortsAutoNext);
    const shortsAutoButton = createButton(
      pipDocument,
      createIcon(pipDocument, "shortsAutoNext"),
      t("shortsAutoTooltip", "Auto-advance to the next short"),
      () => {
        isShortsAutoOn = !isShortsAutoOn;
        shortsAutoButton.classList.toggle("ytfp-btn--active", isShortsAutoOn);
        shortsAutoButton.setAttribute("aria-pressed", String(isShortsAutoOn));
        chrome.storage.sync.set({ shortsAutoNext: isShortsAutoOn }).catch(() => {});
      }
    );
    shortsAutoButton.classList.toggle("ytfp-btn--active", isShortsAutoOn);
    shortsAutoButton.setAttribute("aria-pressed", String(isShortsAutoOn));

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
          YTFP.sleepTimer?.resume();
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
      loopButton.setAttribute("aria-pressed", String(Boolean(video && video.loop)));
    }

    // --- Прямой эфир ----------------------------------------------------------
    // На обычном видео кнопки нет вообще. На стриме: у края эфира горит
    // красная точка LIVE, при заметном отставании — на сколько отстали,
    // клик возвращает к эфиру. Что считать «у края», решает единая проверка
    // playerApi.isAtLiveEdge() — та же, что красит полоску прогресса.
    const liveButton = pipDocument.createElement("button");
    liveButton.className = "ytfp-btn ytfp-btn--live";
    YTFP.tooltips.attach(liveButton, t("liveTooltip", "Jump to the live edge"));
    const liveDot = pipDocument.createElement("span");
    liveDot.className = "ytfp-live-dot";
    const liveLabel = pipDocument.createElement("span");
    liveButton.append(liveDot, liveLabel);
    liveButton.addEventListener("click", () => {
      YTFP.playerApi.seekToLive(getVideo());
    });

    function refreshLiveState() {
      const video = getVideo();
      const isLive = Boolean(video) &&
        !YTFP.playerApi.isAdShowing(video) &&
        YTFP.playerApi.isLive(video);
      liveButton.hidden = !isLive;
      if (!isLive) {
        return;
      }
      const atEdge = YTFP.playerApi.isAtLiveEdge(video);
      liveButton.classList.toggle("ytfp-btn--live-edge", atEdge);
      if (atEdge) {
        liveLabel.textContent = t("liveLabel", "LIVE");
      } else {
        const behind = YTFP.utils.behindLiveSeconds(
          YTFP.playerApi.getLiveEdge(video),
          video.currentTime
        );
        liveLabel.textContent = behind === null
          ? t("liveUnknownShort", "LIVE ?")
          : `−${YTFP.utils.formatTime(behind)}`;
      }
    }

    // --- Скорость: ползунок с шагами -----------------------------------------
    const speedWrap = pipDocument.createElement("label");
    speedWrap.className = "ytfp-speed";
    YTFP.tooltips.attach(speedWrap, t("speedTooltip", "Playback speed"));

    const speedSlider = pipDocument.createElement("input");
    speedSlider.type = "range";
    // Границы выравниваем по шагу: сетка range считается от min, и при
    // шаге 0.1 от 0.25 ровной единицы в ней не было — браузер подменял
    // 1x на ближайшее допустимое 1.05x.
    let speedStep = YTFP.settings.get().speedStep;
    let speedRange = YTFP.utils.speedSliderRange(
      YTFP.SPEED_MIN,
      YTFP.SPEED_MAX,
      speedStep
    );
    speedSlider.min = String(speedRange.min);
    speedSlider.max = String(speedRange.max);
    speedSlider.step = String(speedStep);
    speedSlider.value = "1";

    const speedLabel = pipDocument.createElement("button");
    speedLabel.type = "button";
    speedLabel.className = "ytfp-speed-label";
    YTFP.tooltips.attach(speedLabel, t("speedCycleTooltip", "Speed presets: 1 → 1.5 → 2"));

    function refreshSpeedControls() {
      const video = getVideo();
      const rate = video ? video.playbackRate : 1;
      speedLabel.textContent = `${rate}x`;
      speedSlider.value = String(rate);
      paintSlider(speedSlider);
    }

    speedSlider.addEventListener("input", () => {
      const video = getVideo();
      if (video) {
        video.playbackRate = Number(speedSlider.value);
      }
      paintSlider(speedSlider);
    });
    speedLabel.addEventListener("click", () => {
      const video = getVideo();
      if (video) {
        video.playbackRate = YTFP.utils.cycleSpeedPreset(video.playbackRate);
      }
    });

    speedWrap.append(speedSlider, speedLabel);

    // --- Громкость 0–300% (Web Audio) ----------------------------------------
    const boostWrap = pipDocument.createElement("label");
    boostWrap.className = "ytfp-boost";
    YTFP.tooltips.attach(boostWrap, t("boostTooltip", "Volume: 0–100% quieter, above 100% boost"));

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
      paintSlider(boostSlider);
    });

    // Громкость поменяли мимо ползунка (колесо мыши) — подтянуть его и подпись.
    function refreshBoost() {
      const percent = YTFP.audioBoost.getBoostPercent();
      boostSlider.value = String(percent);
      boostLabel.textContent = `${percent}%`;
      paintSlider(boostSlider);
    }

    boostWrap.append(createIcon(pipDocument, "volume"), boostSlider, boostLabel);
    // Стартовая заливка дорожек: дальше их красят refresh-функции.
    paintSlider(speedSlider);
    paintSlider(boostSlider);

    // --- Ночной режим ---------------------------------------------------------
    // Клик по Луне циклом убавляет синий канал: off → warm → deep → off.
    pipDocument.body.appendChild(YTFP.nightMode.createFilters(pipDocument));

    let nightLevel = YTFP.nightMode.normalize(YTFP.settings.get().nightMode);

    const nightButton = createButton(
      pipDocument,
      createIcon(pipDocument, "sleep"),
      t("nightTooltip", "Night mode: cuts blue light (click to change strength)"),
      () => {
        nightLevel = YTFP.nightMode.next(nightLevel);
        applyNightLevel();
        // Запоминаем между сессиями.
        chrome.storage.sync.set({ nightMode: nightLevel }).catch(() => {});
      }
    );
    nightButton.classList.add("ytfp-btn--night");

    function applyNightLevel() {
      YTFP.nightMode.applyTo(pipDocument, nightLevel);
      nightButton.classList.toggle("ytfp-btn--active", nightLevel !== "off");
      nightButton.setAttribute("aria-pressed", String(nightLevel !== "off"));
      const nightState = nightLevel === "deep"
        ? t("nightStateDeep", "Deep")
        : nightLevel === "warm"
          ? t("nightStateWarm", "Warm")
          : t("nightStateOff", "Off");
      const nightLabel = `${t("toolNight", "Night mode")}: ${nightState}`;
      nightButton.setAttribute("aria-label", nightLabel);
      nightButton.setAttribute("data-ytfp-tip", nightLabel);
      // Заливка кнопки показывает силу режима — отдельной подписи не нужно.
      nightButton.dataset.night = nightLevel;
    }

    applyNightLevel();

    const sleep = YTFP.pipSleep.build(pipDocument);
    const sleepWrap = sleep.element;
    const captions = YTFP.pipCaptions.build(pipDocument);
    const sizes = YTFP.windowSize.build(pipDocument, getVideo);
    const history = isShorts && YTFP.pipHistory
      ? YTFP.pipHistory.build(pipDocument)
      : null;
    const menu = YTFP.pipMenu.build(pipDocument, [
      ...(!isShorts ? [["ab", "toolAb", "A–B repeat", abButton], ["loop", "toolLoop", "Repeat video", loopButton],
      ["autoplay", "toolAutoplay", "Autoplay", autoplayButton]] : []),
      ["copy", "toolCopy", "Copy link", copyButton], ["night", "toolNight", "Night mode", nightButton],
      ["sleep", "toolSleep", "Sleep timer", sleepWrap], ["comments", "toolComments", "Comments / chat", chatToggle],
      ["profile", "profileSave", "Remember for this channel", YTFP.channelProfiles.build(pipDocument).element],
      ["captions", "toolCaptions", "Captions", captions.element], ["size", "toolSize", "Window size", sizes],
      ...(history ? [["history", "shortsHistory", "History", history.element, false]] : [])
    ]);
    const search = isShorts ? YTFP.pipSearch.build(pipDocument) : null;

    // --- Сборка панели --------------------------------------------------------
    // Две строки: сверху воспроизведение по центру, снизу всё остальное —
    // ползунок и кнопки слева, кнопки и ползунок справа. Раньше строка была
    // одна и переносилась сама, когда не влезала: место переноса зависело от
    // ширины окна, и play уезжал из центра.
    function makeRow(className, ...children) {
      const row = pipDocument.createElement("div");
      row.className = `ytfp-row ${className}`.trim();
      row.append(...children);
      return row;
    }

    function makeGroup(...children) {
      const group = pipDocument.createElement("div");
      group.className = "ytfp-group";
      group.append(...children);
      return group;
    }

    /**
     * Строка воспроизведения: кнопки по центру, справа — эфир. Слева от них
     * пустая распорка той же доли ширины: без неё кнопка эфира сдвигала бы
     * play из центра, а на обычном видео (кнопка скрыта) ряд прыгал бы.
     */
    function makeNavRow(playbackRow) {
      const spacer = pipDocument.createElement("div");
      spacer.className = "ytfp-nav-side";
      const liveSlot = pipDocument.createElement("div");
      liveSlot.className = "ytfp-nav-side ytfp-nav-side--end";
      liveSlot.appendChild(liveButton);
      return makeRow("ytfp-row--nav", spacer, playbackRow, liveSlot);
    }

    const directSpeed = YTFP.surfaceControls.speed(pipDocument, getVideo);
    YTFP.surfaceControls.install(pipDocument);
    // Keep the precise slider; the labelled disclosure offers direct presets.
    speedLabel.replaceWith(directSpeed.element);
    if (isShorts) {
      YTFP.tooltips.attach(boostWrap, t('volumeShort','Volume'));
      bar.append(
        makeNavRow(navRow || playButton),
        makeRow('ytfp-row--shorts-volume', boostWrap),
        makeRow('ytfp-row--shorts-tools', directSpeed.element, shortsAutoButton, search.element, menu.element),
        menu.pins
      );
    } else {
      bar.append(
        makeNavRow(navRow || playButton),
        makeRow("ytfp-row--main", makeGroup(boostWrap), makeGroup(speedWrap, menu.element)),
        menu.pins
      );
    }

    function applySettings(settings) {
      bar.classList.toggle("ytfp-bottom--compact", isShorts || settings.compactMode);
      pipDocument.documentElement.style.setProperty("--ytfp-cap-user", String(settings.panelScale / 100));
      speedStep = settings.speedStep;
      speedRange = YTFP.utils.speedSliderRange(YTFP.SPEED_MIN, YTFP.SPEED_MAX, speedStep);
      speedSlider.min = String(speedRange.min); speedSlider.max = String(speedRange.max); speedSlider.step = String(speedStep);
      boostSlider.max = String(settings.volumeBoostMax);
      isAutoplayOn = settings.autoplayNext; isShortsAutoOn = settings.shortsAutoNext;
      autoplayButton.classList.toggle("ytfp-btn--active", isAutoplayOn);
      autoplayButton.setAttribute("aria-pressed", String(isAutoplayOn));
      shortsAutoButton.classList.toggle("ytfp-btn--active", isShortsAutoOn);
      shortsAutoButton.setAttribute("aria-pressed", String(isShortsAutoOn));
      nightLevel = settings.nightMode; applyNightLevel();
      refreshSpeedControls(); refreshBoost();
    }
    YTFP.settings.onChange(applySettings);
    YTFP.audioBoost.onChange(refreshBoost);
    applySettings(YTFP.settings.get());

    // Слушатели на <video>: время (для A-B), скорость, пауза (для иконки).
    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("timeupdate", refreshLiveState);
      video.addEventListener("ratechange", refreshSpeedControls);
      video.addEventListener("play", refreshPlayIcon);
      video.addEventListener("pause", refreshPlayIcon);
      video.addEventListener("volumechange", refreshBoost);
      video.addEventListener("loadedmetadata", resetAb);
    }
    refreshSpeedControls();
    refreshPlayIcon();
    refreshLiveState();

    // Горячие клавиши внутри PiP-окна: фокус там, страница их не слышит.
    const hotkeys = YTFP.playbackHotkeys.attach(pipDocument,{getVideo,isShorts,onPrev,onNext,refreshBoost});

    function cleanup() {
      directSpeed.cleanup();
      // Тот же элемент, на который вешали, — не результат нового getVideo().
      if (video) {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("timeupdate", refreshLiveState);
        video.removeEventListener("ratechange", refreshSpeedControls);
        video.removeEventListener("play", refreshPlayIcon);
        video.removeEventListener("pause", refreshPlayIcon);
        video.removeEventListener("volumechange", refreshBoost);
        video.removeEventListener("loadedmetadata", resetAb);
      }
      hotkeys.cleanup();
      sleep.cleanup(); captions.cleanup(); menu.cleanup(); search?.cleanup(); history?.cleanup();
      YTFP.settings.offChange(applySettings);
      YTFP.audioBoost.offChange(refreshBoost);
    }

    return { element: bar, cleanup, refreshBoost };
  }

  return { buildBar };
})();
