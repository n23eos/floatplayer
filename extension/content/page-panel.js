"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Панель поверх обычного плеера YouTube — та же, что в мини-окне, но только
// то, чего у страницы нет под рукой: громкость (включая усиление выше 100%)
// и скорость ползунками, плюс воспроизведение и прыжки на 30 секунд.
// Всплывает при наведении на плеер, над родной панелью YouTube.
//
// Живёт внутри #movie_player, поэтому переживает театральный и полноэкранный
// режимы: плеер меняет размеры, панель едет вместе с ним.
YTFP.pagePanel = (() => {
  const PANEL_CLASS = "ytfp-page-panel";
  const STYLES_ID = "ytfp-page-panel-styles";
  const JUMP_SECONDS = 30;
  // Пока контролы не найдены (плеер ещё строится) — заведомо выше них.
  const FALLBACK_BOTTOM_PX = 76;
  // Насколько панель крупнее на устройствах с пальцем вместо мыши. Дубль
  // --ytfp-pp-coarse из стилей ниже: CSS растит саму панель, а JS считает
  // по тому же числу отступ над таймлайном.
  const COARSE_POINTER_SCALE = 1.15;

  // Запрос создаём один раз: sync() зовут по таймеру несколько раз в секунду,
  // а сам объект живой — .matches меняется вместе с устройством ввода.
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

  /** Основной ввод — палец, а не мышь. */
  function isCoarsePointer() {
    return coarsePointerQuery.matches;
  }

  /** Масштаб панели из настроек, %. Мусор из хранилища — дефолтные 135%. */
  function currentScale() {
    return YTFP.utils.normalizePanelScale(YTFP.settings.get().panelScale);
  }

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  // Значения — строка path или { d, fillRule } для контурных иконок.
  const ICONS = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
    speed: "M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.48 2.54l2.6 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-1.53C16.17 17.98 14.21 19 12 19z",
    moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    // Окно «чистое видео»: пустая рамка.
    windowClean: { d: "M3 5h18v14H3zM5 7h14v10H5z", fillRule: "evenodd" },
    // Окно «полный»: рамка с панелью-полосой внизу.
    windowFull: { d: "M3 5h18v14H3zM5 7h14v8H5z", fillRule: "evenodd" }
  };

  function createIcon(doc, name) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    const icon = ICONS[name];
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", typeof icon === "string" ? icon : icon.d);
    if (typeof icon !== "string" && icon.fillRule) {
      path.setAttribute("fill-rule", icon.fillRule);
    }
    svg.appendChild(path);
    return svg;
  }

  /** Отдаёт дорожке ползунка долю пройденного — по ней рисуется заливка. */
  function paintSlider(slider) {
    const percent = YTFP.utils.sliderFillPercent(slider.value, slider.min, slider.max);
    slider.style.setProperty("--ytfp-fill", `${percent}%`);
  }

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLES_ID;
    // Отступ снизу — выше родной панели YouTube, чтобы не спорить с ней за
    // клики и не перекрывать таймлайн.
    style.textContent = `
      /* Базы ниже — компактный размер (как было раньше), множитель тянет
         их все разом: кнопки, значки, подписи и ползунки.
         --ytfp-pp-scale приходит из настроек инлайн-стилем, --ytfp-pp-coarse
         добавляет запас на тач-экранах, а считаем всё по их произведению. */
      .${PANEL_CLASS} {
        --ytfp-pp-scale: 1.35;
        --ytfp-pp-coarse: 1;
        --ytfp-pp-k: calc(var(--ytfp-pp-scale) * var(--ytfp-pp-coarse));
        --ytfp-pp-btn: 34px;
        --ytfp-pp-icon: 16px;
        --ytfp-pp-font: 12px;
        --ytfp-pp-range: 72px;
        /* Ползунок: тонкая дорожка, но высокая зона касания вокруг неё. */
        --ytfp-pp-track: 3px;
        --ytfp-pp-thumb: 13px;
        --ytfp-pp-hit: 22px;
        position: absolute;
        left: 50%;
        bottom: ${FALLBACK_BOTTOM_PX}px;
        transform: translateX(-50%);
        z-index: 59;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        width: max-content;
        max-width: calc(100% - 24px);
        box-sizing: border-box;
        padding: calc(6px * var(--ytfp-pp-k)) calc(12px * var(--ytfp-pp-k));
        border-radius: 22px;
        background: rgba(10, 10, 10, 0.78);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #eee;
        font-family: "Roboto", Arial, sans-serif;
        font-size: calc(var(--ytfp-pp-font) * var(--ytfp-pp-k));
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease;
      }
      /* Тач-экран: пальцем целиться труднее, чем курсором, — добавляем запас
         поверх выбранного в настройках масштаба. */
      @media (pointer: coarse) {
        .${PANEL_CLASS} { --ytfp-pp-coarse: ${COARSE_POINTER_SCALE}; }
      }
      /* Всплывает вместе с родными контролами: YouTube снимает класс
         ytp-autohide, пока курсор на плеере. */
      #movie_player:not(.ytp-autohide) .${PANEL_CLASS} {
        opacity: 1;
        pointer-events: auto;
      }
      .${PANEL_CLASS}-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1 1 0;
        min-width: 0;
      }
      .${PANEL_CLASS}-group:first-child { justify-content: flex-start; }
      .${PANEL_CLASS}-group:last-child { justify-content: flex-end; }
      .${PANEL_CLASS}-center {
        display: flex;
        align-items: center;
        gap: 2px;
        flex: none;
      }
      .${PANEL_CLASS} button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: calc(var(--ytfp-pp-btn) * var(--ytfp-pp-k));
        height: calc(var(--ytfp-pp-btn) * var(--ytfp-pp-k));
        border: 0;
        border-radius: 50%;
        padding: 0 calc(8px * var(--ytfp-pp-k));
        background: transparent;
        color: #fff;
        font-family: inherit;
        font-size: calc(var(--ytfp-pp-font) * var(--ytfp-pp-k));
        cursor: pointer;
        transition: background 0.12s ease;
      }
      /* Значки в разметке с width/height 16 — CSS перебивает атрибуты. */
      .${PANEL_CLASS} svg {
        width: calc(var(--ytfp-pp-icon) * var(--ytfp-pp-k));
        height: calc(var(--ytfp-pp-icon) * var(--ytfp-pp-k));
      }
      .${PANEL_CLASS} button:hover { background: rgba(255, 255, 255, 0.16); }
      /* Ползунок рисуем сами: у нативного зона захвата — высота элемента, а
         она равна тонкой дорожке, и пальцем в неё не попасть. Своя разметка
         разводит их: дорожка тонкая, зона касания высокая, бегунок крупный.
         Заливку слева от бегунка (её давал accent-color) красит paintSlider. */
      .${PANEL_CLASS} input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: calc(var(--ytfp-pp-range) * var(--ytfp-pp-k));
        height: calc(var(--ytfp-pp-hit) * var(--ytfp-pp-k));
        margin: 0;
        background: transparent;
        cursor: pointer;
      }
      .${PANEL_CLASS} input[type="range"]::-webkit-slider-runnable-track {
        height: calc(var(--ytfp-pp-track) * var(--ytfp-pp-k));
        border-radius: 999px;
        background: linear-gradient(
          to right,
          #cc0000 var(--ytfp-fill, 0%),
          rgba(255, 255, 255, 0.3) var(--ytfp-fill, 0%)
        );
      }
      .${PANEL_CLASS} input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: calc(var(--ytfp-pp-thumb) * var(--ytfp-pp-k));
        height: calc(var(--ytfp-pp-thumb) * var(--ytfp-pp-k));
        border-radius: 50%;
        background: #cc0000;
        /* Бегунок по центру дорожки: половина разницы их высот. */
        margin-top: calc(
          (var(--ytfp-pp-track) - var(--ytfp-pp-thumb)) * var(--ytfp-pp-k) / 2
        );
      }
      .${PANEL_CLASS} span {
        min-width: calc(38px * var(--ytfp-pp-k));
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
    `;
    document.head.appendChild(style);
  }

  /** Собирает панель. Возвращает элемент; слушатели живут на нём же. */
  function buildPanel() {
    const panel = document.createElement("div");
    panel.className = PANEL_CLASS;
    // Клик по панели не должен доходить до плеера: YouTube ставит паузу
    // по клику в кадр, а «удержание» включает скорость 2x.
    for (const type of ["click", "dblclick", "mousedown", "pointerdown"]) {
      panel.addEventListener(type, (event) => event.stopPropagation());
    }

    // --- Крайняя левая: ночной режим -----------------------------------------
    // Тот же класс, что у Луны в панели плеера: общий applyNightLevel в
    // page-controls красит обе кнопки по текущему уровню.
    YTFP.pageControls.ensureNightReady();
    const nightButton = document.createElement("button");
    nightButton.className = YTFP.pageControls.NIGHT_BUTTON_CLASS;
    nightButton.title = t("nightTooltip", "Night mode: cuts blue light (click to change strength)");
    nightButton.appendChild(createIcon(document, "moon"));
    nightButton.addEventListener("click", () => YTFP.pageControls.cycleNight());

    // --- Слева: громкость 0–300% ---------------------------------------------
    const volumeGroup = document.createElement("div");
    volumeGroup.className = `${PANEL_CLASS}-group`;
    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = String(YTFP.settings.get().volumeBoostMax);
    volumeSlider.step = "10";
    volumeSlider.value = String(YTFP.audioBoost.getBoostPercent());
    volumeSlider.title = t("boostTooltip", "Volume: 0–100% quieter, above 100% boost");
    const volumeLabel = document.createElement("span");
    volumeLabel.textContent = `${volumeSlider.value}%`;
    volumeSlider.addEventListener("input", () => {
      const ok = YTFP.audioBoost.setBoostPercent(
        YTFP.playerApi.getVideo(),
        Number(volumeSlider.value)
      );
      volumeLabel.textContent = ok ? `${volumeSlider.value}%` : "n/a";
      paintSlider(volumeSlider);
    });
    volumeGroup.append(createIcon(document, "volume"), volumeSlider, volumeLabel);

    // --- Центр: −30, воспроизведение, +30 ------------------------------------
    const center = document.createElement("div");
    center.className = `${PANEL_CLASS}-center`;

    const makeJump = (label, delta, tooltip) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.title = tooltip;
      button.addEventListener("click", () => YTFP.playerApi.seekBy(delta));
      return button;
    };

    const playButton = document.createElement("button");
    playButton.title = t("playTooltip", "Play / pause");
    playButton.appendChild(createIcon(document, "pause"));
    playButton.addEventListener("click", () => YTFP.playerApi.togglePlayPause());

    center.append(
      makeJump(`−${JUMP_SECONDS}`, -JUMP_SECONDS, t("jumpBack", "Back 30 seconds")),
      playButton,
      makeJump(`+${JUMP_SECONDS}`, JUMP_SECONDS, t("jumpForward", "Forward 30 seconds"))
    );

    // --- Справа: скорость ------------------------------------------------------
    const speedGroup = document.createElement("div");
    speedGroup.className = `${PANEL_CLASS}-group`;
    const speedStep = YTFP.settings.get().speedStep;
    // Границы выравниваем по шагу — иначе ровной единицы в сетке не будет.
    const speedRange = YTFP.utils.speedSliderRange(YTFP.SPEED_MIN, YTFP.SPEED_MAX, speedStep);
    const speedSlider = document.createElement("input");
    speedSlider.type = "range";
    speedSlider.min = String(speedRange.min);
    speedSlider.max = String(speedRange.max);
    speedSlider.step = String(speedStep);
    speedSlider.value = "1";
    speedSlider.title = t("speedTooltip", "Playback speed");
    const speedLabel = document.createElement("span");
    speedLabel.textContent = "1x";
    speedLabel.title = t("speedCycleTooltip", "Speed presets: 1 → 1.5 → 2");
    speedSlider.addEventListener("input", () => {
      YTFP.playerApi.setSpeed(Number(speedSlider.value));
      paintSlider(speedSlider);
    });
    speedLabel.addEventListener("click", () => {
      const video = YTFP.playerApi.getVideo();
      const rate = video ? video.playbackRate : 1;
      YTFP.playerApi.setSpeed(YTFP.utils.cycleSpeedPreset(rate));
    });
    speedGroup.append(speedSlider, speedLabel, createIcon(document, "speed"));

    // --- Крайняя правая: открыть мини-окно в нужном стиле ---------------------
    // Клик запоминает стиль как дефолт (для Alt+P и главной кнопки) и сразу
    // открывает окно — с переопределением, не дожидаясь, пока настройка
    // доедет через chrome.storage.
    const makeModeButton = (iconName, mode, tooltip) => {
      const button = document.createElement("button");
      button.title = tooltip;
      button.appendChild(createIcon(document, iconName));
      button.addEventListener("click", () => {
        chrome.storage.sync.set({ windowMode: mode }).catch(() => {});
        YTFP.pip.open({ mode });
      });
      return button;
    };
    const modeGroup = document.createElement("div");
    modeGroup.className = `${PANEL_CLASS}-center`;
    modeGroup.append(
      makeModeButton(
        "windowClean",
        "native",
        t("panelModeClean", "Floating window: clean video (no frame)")
      ),
      makeModeButton(
        "windowFull",
        "document",
        t("panelModeFull", "Floating window: full (with control bar)")
      )
    );

    panel.append(nightButton, volumeGroup, center, speedGroup, modeGroup);

    // Стартовая заливка дорожек: sync() красит только при смене значения.
    paintSlider(volumeSlider);
    paintSlider(speedSlider);

    /**
     * Поднимаем панель над родными контролами YouTube. Высоту берём у самой
     * панели плеера, а не константой: в полноэкранном режиме она выше, и
     * фиксированный отступ закрывал бы таймлайн.
     */
    function placeAbovePlayerControls(playerRoot, scalePercent) {
      const chrome = playerRoot.querySelector(".ytp-chrome-bottom");
      if (!chrome) {
        return;
      }
      const playerRect = playerRoot.getBoundingClientRect();
      const chromeRect = chrome.getBoundingClientRect();
      if (!(chromeRect.height > 0) || !(playerRect.height > 0)) {
        return;
      }
      // Верхний край панели YouTube — это и есть таймлайн; над ним и встаём.
      // Чем крупнее панель, тем выше: она сама толще, и с прежним зазором
      // почти упиралась бы в таймлайн.
      const gap = YTFP.utils.panelGapAboveControls(scalePercent);
      const above = playerRect.bottom - chromeRect.top + gap;
      panel.style.bottom = `${Math.round(above)}px`;
    }

    /** Подписи и положение ползунков под текущее видео. */
    function sync() {
      // Масштаб читаем на каждом такте сторожевого таймера: изменение в
      // настройках видно сразу, без перезагрузки страницы. Пишем его только
      // при смене — иначе трогали бы стиль десять раз в секунду.
      const scale = currentScale();
      if (panel.dataset.scale !== String(scale)) {
        panel.dataset.scale = String(scale);
        panel.style.setProperty("--ytfp-pp-scale", String(scale / 100));
      }
      const playerRoot = panel.parentElement;
      if (playerRoot) {
        // Отступ считаем по тому же масштабу, что видит CSS: на тач-экране
        // панель крупнее, значит и подниматься должна выше.
        const shown = isCoarsePointer() ? scale * COARSE_POINTER_SCALE : scale;
        placeAbovePlayerControls(playerRoot, shown);
      }
      const video = YTFP.playerApi.getVideo();
      if (!video) {
        return;
      }
      playButton.replaceChildren(createIcon(document, video.paused ? "play" : "pause"));
      const rate = video.playbackRate;
      if (String(rate) !== speedSlider.value) {
        speedSlider.value = String(rate);
        paintSlider(speedSlider);
      }
      speedLabel.textContent = `${rate}x`;
      const percent = YTFP.audioBoost.getBoostPercent();
      if (String(percent) !== volumeSlider.value) {
        volumeSlider.value = String(percent);
        volumeLabel.textContent = `${percent}%`;
        paintSlider(volumeSlider);
      }
    }

    return { panel, sync };
  }

  let current = null; // { panel, sync } — панель текущего плеера

  /**
   * Ставит панель в плеер страницы (и возвращает её на место, если YouTube
   * пересоздал разметку). Зовётся из общего сторожевого таймера.
   */
  function ensurePanel() {
    if (!YTFP.settings.get().pagePanel) {
      if (current) {
        current.panel.remove();
        current = null;
      }
      return;
    }
    // В мини-окне плеер уезжает из страницы — панель там своя.
    if (!YTFP.playerApi.isWatchPage() || YTFP.pip.isOpen()) {
      return;
    }
    const playerRoot = document.querySelector(YTFP.SELECTORS.playerRoot);
    if (!playerRoot) {
      return;
    }
    if (current && playerRoot.contains(current.panel)) {
      current.sync();
      return;
    }
    injectStyles();
    current = buildPanel();
    playerRoot.appendChild(current.panel);
    // Подсветка Луны по сохранённому уровню — только после вставки в DOM:
    // refreshNightButtons ищет кнопки через document.querySelectorAll.
    YTFP.pageControls.refreshNightButtons();
    current.sync();
  }

  return { ensurePanel };
})();
