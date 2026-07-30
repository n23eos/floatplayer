"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Кнопки ночного режима и таймера сна в родной панели плеера YouTube.
// Те же функции есть в панели PiP-окна (pip-controls.js), но пользоваться
// ими хочется и без выноса видео в окно.
//
// Состояние (уровень ночного режима, дедлайн таймера) живёт на уровне модуля,
// а не внутри кнопки: YouTube пересоздаёт панель контролов при смене видео и
// при переключении режимов, inject-button.js вставляет кнопки заново —
// таймер должен пережить это, а не начинаться заново.
YTFP.pageControls = (() => {
  // Локализация с фолбэком: расширение работает и без записи в messages.json.
  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  const NIGHT_BUTTON_CLASS = "ytfp-night-button";
  const SLEEP_BUTTON_CLASS = "ytfp-sleep-button";
  const STYLES_ID = "ytfp-player-controls-styles";

  // Сетка 24x24, как у иконок панели YouTube.
  const ICON_MOON = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";
  const ICON_CLOCK =
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" +
    "M12.5 7H11v6l5.2 3.1.8-1.3-4.5-2.6z";

  /**
   * SVG-иконка в размерах соседей: копируем width/height/viewBox с иконки
   * шестерёнки, чтобы кнопка выглядела нативно и в новом UI (svg 24x24),
   * и в старом (svg 100% с viewBox 36x36).
   * Строим через createElementNS: YouTube включает Trusted Types,
   * innerHTML на странице может быть запрещён.
   *
   * paths — массив строк или объектов { d, fillRule }.
   */
  function createIcon(settingsButton, paths) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const reference = settingsButton ? settingsButton.querySelector("svg") : null;
    const viewBox = (reference && reference.getAttribute("viewBox")) || "0 0 24 24";
    const width = (reference && reference.getAttribute("width")) || "24";
    const height = (reference && reference.getAttribute("height")) || "24";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("fill", "none");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", viewBox);

    const nodes = paths.map((item) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", typeof item === "string" ? item : item.d);
      // Цвет наследуем от кнопки плеера — иконка живёт в расцветке панели.
      path.setAttribute("fill", "currentColor");
      if (typeof item !== "string" && item.fillRule) {
        path.setAttribute("fill-rule", item.fillRule);
      }
      return path;
    });

    // В сетке 36x36 (старый UI) центрируем рисунок 24x24 смещением на 6.
    if (viewBox.includes("36")) {
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("transform", "translate(6,6)");
      group.append(...nodes);
      svg.appendChild(group);
    } else {
      svg.append(...nodes);
    }
    return svg;
  }

  /** Кнопка в стиле панели плеера. */
  function createButton({ className, icon, title, onClick }) {
    const button = document.createElement("button");
    button.className = `ytp-button ytfp-page-btn ${className}`;
    button.title = title;
    button.setAttribute("aria-label", title);
    // Атрибут нативного тултипа нового плеера (если он его подхватит).
    button.setAttribute("data-tooltip-title", title);
    button.appendChild(icon);
    // Глушим всплытие: иначе YouTube видит mousedown на плеере и «удержание»
    // включает скорость 2x (та же беда была у основной кнопки).
    button.addEventListener("mousedown", (event) => event.stopPropagation());
    button.addEventListener("touchstart", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      /* width: auto — у .ytp-button ширина фиксированная (48px), а кнопке
         таймера нужно место под обратный отсчёт рядом с циферблатом. */
      .ytfp-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: top;
        width: auto;
        padding: 0 6px;
        color: #fff;
      }
      /* Контейнер с <filter>-определениями: нужен в DOM, но не в разметке. */
      .ytfp-night-defs {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
      }
      /* Красим только само видео. Субтитры и панель остаются как есть:
         белый текст поверх тёплой картинки читается лучше. */
      body.ytfp-night--warm video.html5-main-video {
        filter: url(#ytfp-night-warm);
      }
      body.ytfp-night--deep video.html5-main-video {
        filter: url(#ytfp-night-deep);
      }
      /* Цвет иконки повторяет силу эффекта — отдельной подписи не нужно.
         Заливку кнопки, как в PiP-панели, здесь не делаем: в панели YouTube
         прямоугольная плашка выглядела бы чужеродно. */
      .${NIGHT_BUTTON_CLASS}[data-night="warm"] {
        color: #ffb35c;
      }
      .${NIGHT_BUTTON_CLASS}[data-night="deep"] {
        color: #ff7a2f;
      }
      /* Обратный отсчёт рядом с циферблатом. */
      .ytfp-sleep-label {
        margin-left: 2px;
        font-family: "Roboto", Arial, sans-serif;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: #ff9d9d;
      }
      .${SLEEP_BUTTON_CLASS}--active {
        color: #ff9d9d;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Ночной режим ---------------------------------------------------------
  // Клик по Луне циклом убавляет синий канал: off → warm → deep → off.
  // Уровень пишем в тот же ключ настроек, что и панель PiP-окна, поэтому
  // состояние у страницы и у окна общее.

  let nightLevel = "off";
  let isNightSynced = false; // подписка на настройки нужна ровно одна

  function ensureNightFilters() {
    if (document.querySelector(".ytfp-night-defs")) {
      return;
    }
    document.body.appendChild(YTFP.nightMode.createFilters(document));
  }

  function applyNightLevel() {
    YTFP.nightMode.applyTo(document, nightLevel);
    for (const button of document.querySelectorAll(`.${NIGHT_BUTTON_CLASS}`)) {
      button.dataset.night = nightLevel;
      button.setAttribute("aria-pressed", String(nightLevel !== "off"));
    }
  }

  function syncNightFromSettings() {
    nightLevel = YTFP.nightMode.normalize(YTFP.settings.get().nightMode);
    applyNightLevel();
  }

  function buildNightButton(settingsButton) {
    injectStyles();
    ensureNightFilters();
    if (!isNightSynced) {
      isNightSynced = true;
      nightLevel = YTFP.nightMode.normalize(YTFP.settings.get().nightMode);
      // Переключили уровень в PiP-окне — кнопка на странице должна показывать
      // актуальное значение, когда видео вернётся.
      YTFP.settings.onChange(syncNightFromSettings);
    }

    const button = createButton({
      className: NIGHT_BUTTON_CLASS,
      icon: createIcon(settingsButton, [ICON_MOON]),
      title: t("nightTooltip", "Night mode: cuts blue light (click to change strength)"),
      onClick: () => {
        nightLevel = YTFP.nightMode.next(nightLevel);
        applyNightLevel();
        // Запоминаем между сессиями (тот же ключ, что и в PiP-панели).
        chrome.storage.sync.set({ nightMode: nightLevel }).catch(() => {});
      }
    });
    applyNightLevel();
    return button;
  }

  // --- Таймер сна -----------------------------------------------------------
  // В панели YouTube выпадающий список смотрелся бы чужеродно, поэтому здесь
  // кнопка-циклер: off → 15 → 30 → 45 → 60 → 90 → off. По истечении — пауза.

  const SLEEP_PRESETS_MIN = [15, 30, 45, 60, 90];
  let sleepPresetIndex = -1; // -1 — таймер выключен
  let sleepDeadline = null;  // timestamp окончания, ms
  let sleepTicker = null;    // interval обновления обратного отсчёта

  function sleepRemainingSeconds() {
    if (sleepDeadline === null) {
      return null;
    }
    return Math.max(0, Math.round((sleepDeadline - Date.now()) / 1000));
  }

  function refreshSleepButtons() {
    const remaining = sleepRemainingSeconds();
    const isRunning = remaining !== null;
    const title = isRunning
      ? `${t("sleepTooltip", "Sleep timer: pauses the video when it runs out")} — ${SLEEP_PRESETS_MIN[sleepPresetIndex]} ${t("sleepMinutes", "min")}`
      : `${t("sleepTooltip", "Sleep timer: pauses the video when it runs out")} — ${t("sleepOff", "off")}`;

    for (const button of document.querySelectorAll(`.${SLEEP_BUTTON_CLASS}`)) {
      button.classList.toggle(`${SLEEP_BUTTON_CLASS}--active`, isRunning);
      button.setAttribute("aria-pressed", String(isRunning));
      button.title = title;
      button.setAttribute("aria-label", title);
      const label = button.querySelector(".ytfp-sleep-label");
      if (label) {
        label.textContent = isRunning ? YTFP.utils.formatTime(remaining) : "";
      }
    }
  }

  function stopSleepTimer() {
    clearInterval(sleepTicker);
    sleepTicker = null;
    sleepDeadline = null;
    sleepPresetIndex = -1;
    refreshSleepButtons();
  }

  function tickSleepTimer() {
    const remaining = sleepRemainingSeconds();
    if (remaining === null || remaining <= 0) {
      const video = YTFP.playerApi.getVideo();
      if (video) {
        video.pause();
      }
      stopSleepTimer();
      return;
    }
    refreshSleepButtons();
  }

  function startSleepTimer(minutes) {
    clearInterval(sleepTicker);
    sleepDeadline = Date.now() + minutes * 60 * 1000;
    sleepTicker = setInterval(tickSleepTimer, 1000);
    refreshSleepButtons();
  }

  function cycleSleepTimer() {
    const nextIndex = sleepPresetIndex + 1;
    if (nextIndex >= SLEEP_PRESETS_MIN.length) {
      stopSleepTimer();
      return;
    }
    sleepPresetIndex = nextIndex;
    startSleepTimer(SLEEP_PRESETS_MIN[sleepPresetIndex]);
  }

  function buildSleepButton(settingsButton) {
    injectStyles();
    const button = createButton({
      className: SLEEP_BUTTON_CLASS,
      icon: createIcon(settingsButton, [ICON_CLOCK]),
      title: t("sleepTooltip", "Sleep timer: pauses the video when it runs out"),
      onClick: cycleSleepTimer
    });
    const label = document.createElement("span");
    label.className = "ytfp-sleep-label";
    button.appendChild(label);
    // Кнопку могли пересоздать посреди отсчёта — подтягиваем состояние модуля.
    refreshSleepButtons();
    return button;
  }

  return { createIcon, buildNightButton, buildSleepButton };
})();
