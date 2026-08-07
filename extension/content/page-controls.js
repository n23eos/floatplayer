"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Кнопка ночного режима в родной панели плеера YouTube. Та же функция есть
// в панели PiP-окна (pip-controls.js), но пользоваться ею хочется и без
// выноса видео в окно.
//
// Уровень живёт на уровне модуля, а не внутри кнопки: YouTube пересоздаёт
// панель контролов при смене видео и при переключении режимов, и
// inject-button.js вставляет кнопку заново.
//
// Таймера сна здесь нет намеренно: у YouTube есть свой, дублировать нечего.
// В PiP-окне он остаётся — родных контролов там не видно.
YTFP.pageControls = (() => {
  // Локализация с фолбэком: расширение работает и без записи в messages.json.
  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  const NIGHT_BUTTON_CLASS = "ytfp-night-button";
  const STYLES_ID = "ytfp-player-controls-styles";

  // Сетка 24x24, как у иконок панели YouTube.
  const ICON_MOON = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";

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
      .ytfp-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: top;
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

  /**
   * Готовит общее состояние ночного режима: стили, SVG-фильтры, подписка на
   * настройки. Дёргают все места, где живёт кнопка Луны (панель плеера
   * YouTube и наша панель поверх видео) — повторные вызовы бесплатны.
   */
  function ensureNightReady() {
    injectStyles();
    ensureNightFilters();
    if (!isNightSynced) {
      isNightSynced = true;
      nightLevel = YTFP.nightMode.normalize(YTFP.settings.get().nightMode);
      // Переключили уровень в PiP-окне — кнопка на странице должна показывать
      // актуальное значение, когда видео вернётся.
      YTFP.settings.onChange(syncNightFromSettings);
    }
  }

  /** Следующий уровень по кругу + подсветка всех кнопок Луны на странице. */
  function cycleNight() {
    nightLevel = YTFP.nightMode.next(nightLevel);
    applyNightLevel();
    // Запоминаем между сессиями (тот же ключ, что и в PiP-панели).
    chrome.storage.sync.set({ nightMode: nightLevel }).catch(() => {});
  }

  function buildNightButton(settingsButton) {
    ensureNightReady();
    const button = createButton({
      className: NIGHT_BUTTON_CLASS,
      icon: createIcon(settingsButton, [ICON_MOON]),
      title: t("nightTooltip", "Night mode: cuts blue light (click to change strength)"),
      onClick: cycleNight
    });
    applyNightLevel();
    return button;
  }

  return {
    createIcon,
    buildNightButton,
    ensureNightReady,
    cycleNight,
    // Панель поверх видео добавляет свою кнопку Луны с этим классом — общий
    // applyNightLevel подхватывает её при каждом переключении уровня.
    NIGHT_BUTTON_CLASS,
    refreshNightButtons: applyNightLevel
  };
})();
