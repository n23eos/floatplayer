"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Точка входа: кнопка в панели плеера, реакция на SPA-навигацию YouTube,
// горячие клавиши из service worker, опциональный авто-PiP.
(() => {
  const BUTTON_CLASS = "ytfp-open-button";

  // Контур экрана с вырезом + мини-окно поверх, нарисовано в сетке 24x24 —
  // как у родных иконок нового плеера YouTube.
  const ICON_PATH_24 =
    "M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7v-2H4V6h16v5h2V5a1 1 0 0 0-1-1z" +
    "M13 13h9a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z";

  /**
   * SVG иконки подстраиваем под соседей: копируем width/height/viewBox
   * с иконки шестерёнки, чтобы кнопка выглядела нативно и в новом UI
   * (svg 24x24), и в старом (svg 100% с viewBox 36x36).
   * Строим через createElementNS: YouTube включает Trusted Types,
   * innerHTML на странице может быть запрещён.
   */
  function buildIconSvg(settingsButton) {
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

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICON_PATH_24);
    path.setAttribute("fill", "white");

    // В сетке 36x36 (старый UI) центрируем рисунок 24x24 смещением на 6.
    if (viewBox.includes("36")) {
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("transform", "translate(6,6)");
      group.appendChild(path);
      svg.appendChild(group);
    } else {
      svg.appendChild(path);
    }
    return svg;
  }

  function buildButton(settingsButton) {
    // Комбинация клавиш в подсказке — своя для каждой ОС.
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const shortcut = isMac ? "⌥P" : "Alt+P";
    const action = chrome.i18n.getMessage("btnTooltip") || "Поверх всех окон";
    const tooltip = `YouTube FloatPlayer — ${action} (${shortcut})`;

    const button = document.createElement("button");
    button.className = `ytp-button ${BUTTON_CLASS}`;
    button.title = tooltip;
    button.setAttribute("aria-label", tooltip);
    // Атрибуты нативного тултипа нового плеера (если он его подхватит).
    button.setAttribute("data-tooltip-title", tooltip);
    // Центрируем иконку внутри кнопки независимо от версии UI плеера.
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.verticalAlign = "top";
    button.appendChild(buildIconSvg(settingsButton));
    // Глушим всплытие: иначе YouTube видит mousedown на плеере, плеер
    // уезжает в PiP-окно до mouseup, и «удержание» включает скорость 2x.
    button.addEventListener("mousedown", (event) => event.stopPropagation());
    button.addEventListener("touchstart", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      YTFP.pip.toggle();
    });
    return button;
  }

  /**
   * Вставляет кнопку особняком — самой левой в правой группе контролов,
   * до всех кнопок YouTube (шестерёнка нужна только как образец
   * размеров иконки).
   */
  function ensureButton() {
    if (YTFP.playerApi.isShortsPage()) {
      ensureShortsButton();
      return;
    }
    if (!YTFP.playerApi.isWatchPage()) {
      return;
    }
    const rightControls = document.querySelector(YTFP.SELECTORS.rightControls);
    if (!rightControls || rightControls.querySelector(`.${BUTTON_CLASS}`)) {
      return;
    }
    const settingsButton = rightControls.querySelector(".ytp-settings-button");
    const button = buildButton(settingsButton);
    // Небольшой зазор, чтобы кнопка читалась как отдельная от группы YouTube.
    button.style.marginRight = "8px";
    rightControls.prepend(button);
  }

  /**
   * На страницах шортсов кнопка живёт в колонке действий активного шортса,
   * над кнопкой «лайк». Колонка своя у каждого шортса — при прокрутке
   * убираем кнопки из неактивных и ставим в активную (страж-интервал).
   */
  function ensureShortsButton() {
    const activeActions = document.querySelector(
      "ytd-reel-video-renderer[is-active] #actions"
    );

    // Убираем кнопки, оставшиеся в неактивных шортсах.
    for (const stale of document.querySelectorAll(`.${BUTTON_CLASS}--shorts`)) {
      if (!activeActions || !activeActions.contains(stale)) {
        stale.remove();
      }
    }

    const styleShortsButton = (button) => {
      button.classList.add(`${BUTTON_CLASS}--shorts`);
      Object.assign(button.style, {
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        background: "rgba(0, 0, 0, 0.55)",
        cursor: "pointer",
        border: "0",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "8px"
      });
      return button;
    };

    if (activeActions) {
      if (activeActions.querySelector(`.${BUTTON_CLASS}`)) {
        return;
      }
      // Над лайком: лайк — первый элемент колонки действий.
      activeActions.prepend(styleShortsButton(buildButton(null)));
      return;
    }

    // Фолбэк (разметка шортсов изменилась): плавающая кнопка в углу плеера.
    const shortsRoot = document.querySelector(YTFP.SELECTORS.shortsPlayerRoot);
    if (!shortsRoot || shortsRoot.querySelector(`.${BUTTON_CLASS}`)) {
      return;
    }
    const button = styleShortsButton(buildButton(null));
    Object.assign(button.style, {
      position: "absolute",
      top: "8px",
      left: "8px",
      zIndex: "1000"
    });
    shortsRoot.appendChild(button);
  }

  // Контролы плеера рендерятся асинхронно после навигации — несколько попыток,
  // плюс редкий страховочный таймер: YouTube может пересоздать панель в любой
  // момент (смена видео, театральный режим), и кнопку нужно вернуть.
  function ensureButtonWithRetries() {
    const RETRY_DELAYS_MS = [0, 500, 1500, 3000];
    RETRY_DELAYS_MS.forEach((delay) => setTimeout(ensureButton, delay));
  }

  const GUARD_INTERVAL_MS = 2000;
  setInterval(ensureButton, GUARD_INTERVAL_MS);

  function onNavigateFinish() {
    ensureButtonWithRetries();
    // Ушли со страницы с плеером (watch или shorts) — окно закрываем.
    // Переходы между шортсами и видео из рекомендаций окно переживает.
    if (!YTFP.playerApi.isPlayerPage() && YTFP.pip.isOpen()) {
      YTFP.pip.close();
    }
  }

  // Горячие клавиши приходят сообщениями из service worker.
  chrome.runtime.onMessage.addListener((message) => {
    switch (message && message.command) {
      case "toggle-pip":
        YTFP.pip.toggle();
        break;
      case "play-pause":
        YTFP.playerApi.togglePlayPause();
        break;
      case "seek-back":
        YTFP.playerApi.seekBy(-YTFP.SEEK_STEP_SECONDS);
        break;
      case "seek-forward":
        YTFP.playerApi.seekBy(YTFP.SEEK_STEP_SECONDS);
        break;
      default:
        break;
    }
  });

  // Авто-PiP: Chrome сам зовёт этот обработчик при уходе со вкладки,
  // если пользователь включил опцию (Media Session API, Chrome 120+).
  function syncAutoPip() {
    try {
      navigator.mediaSession.setActionHandler(
        "enterpictureinpicture",
        YTFP.settings.get().autoPip ? () => YTFP.pip.open() : null
      );
    } catch (error) {
      // Старый Chrome без поддержки действия — просто игнорируем.
    }
  }

  async function init() {
    await YTFP.settings.load();
    syncAutoPip();
    YTFP.settings.onChange(syncAutoPip);

    // YouTube — SPA: полная загрузка одна, дальше только yt-navigate-finish.
    document.addEventListener("yt-navigate-finish", onNavigateFinish);
    ensureButtonWithRetries();
  }

  init();
})();
