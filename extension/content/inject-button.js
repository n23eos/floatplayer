"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Точка входа: кнопка в панели плеера, реакция на SPA-навигацию YouTube,
// горячие клавиши из service worker, опциональный авто-PiP.
(() => {
  const BUTTON_CLASS = "ytfp-open-button";

  // Тот же рисунок, что на иконке расширения (треугольник play + мини-окно
  // поверх него), но в цвете панели плеера, а не на красной плашке.
  // Сетка 24x24; окно рисуется контуром через fill-rule="evenodd".
  const ICON_PLAY_PATH = "M4 4.2 15 10.4 4 16.6z";
  const ICON_WINDOW_PATH =
    // внешний прямоугольник со скруглением
    "M13.6 12.6h7.9a1.5 1.5 0 0 1 1.5 1.5v5.4a1.5 1.5 0 0 1-1.5 1.5h-7.9" +
    "a1.5 1.5 0 0 1-1.5-1.5v-5.4a1.5 1.5 0 0 1 1.5-1.5z" +
    // внутренний — вырез, чтобы получился контур окна
    "M13.9 14.5v4.6h7.3v-4.6z";

  /**
   * SVG иконки подстраиваем под соседей: размеры берём с иконки шестерёнки,
   * чтобы кнопка выглядела нативно и в новом UI, и в старом. Общий строитель
   * живёт в page-controls.js — им же нарисованы Луна и таймер сна.
   */
  function buildIconSvg(settingsButton) {
    return YTFP.pageControls.createIcon(settingsButton, [
      ICON_PLAY_PATH,
      { d: ICON_WINDOW_PATH, fillRule: "evenodd" }
    ]);
  }

  function buildButton(settingsButton) {
    // Комбинация клавиш в подсказке — своя для каждой ОС.
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const shortcut = isMac ? "⌥P" : "Alt+P";
    const action = chrome.i18n.getMessage("btnTooltip") || "Always on top";
    const tooltip = `FloatPlayer — ${action} (${shortcut})`;

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
    // Тот же цвет, что у остальных кнопок панели YouTube.
    button.style.color = "#fff";
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
   * Вставляет кнопки особняком — самыми левыми в правой группе контролов,
   * до всех кнопок YouTube (шестерёнка нужна только как образец
   * размеров иконки). Порядок: ночной режим, таймер сна, основная кнопка.
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
    // prepend в обратном порядке: каждая следующая встаёт левее предыдущей.
    rightControls.prepend(button);
    rightControls.prepend(YTFP.pageControls.buildSleepButton(settingsButton));
    rightControls.prepend(YTFP.pageControls.buildNightButton(settingsButton));
    maybeShowOnboarding(button);
  }

  // --- Онбординг: один раз после установки подсвечиваем кнопку --------------

  const ONBOARDING_DURATION_MS = 12000;
  let onboardingShown = false; // страховка от повторов внутри одной страницы

  function injectOnboardingStyles() {
    if (document.getElementById("ytfp-onboarding-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "ytfp-onboarding-styles";
    style.textContent = `
      @keyframes ytfp-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(255, 45, 45, 0.65); }
        70%  { box-shadow: 0 0 0 12px rgba(255, 45, 45, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 45, 45, 0); }
      }
      .ytfp-onboarding {
        border-radius: 50% !important;
        animation: ytfp-pulse 1.6s ease-out 6;
      }
      .ytfp-onboarding-hint {
        position: absolute;
        bottom: 100%;
        margin-bottom: 10px;
        transform: translateX(-50%);
        z-index: 1000;
        padding: 7px 11px;
        border-radius: 8px;
        background: #cc0000;
        color: #fff;
        font-family: "Roboto", Arial, sans-serif;
        font-size: 12px;
        line-height: 1.3;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .ytfp-onboarding-hint::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border: 5px solid transparent;
        border-top-color: #cc0000;
      }
      .ytfp-onboarding-hint--visible { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  /** Подсказка над кнопкой; исчезает по клику или по таймауту. */
  function showOnboardingHint(button) {
    injectOnboardingStyles();
    button.classList.add("ytfp-onboarding");

    const hint = document.createElement("div");
    hint.className = "ytfp-onboarding-hint";
    hint.textContent = chrome.i18n.getMessage("onboardingHint") || "Pop the video out — try it";
    // Кнопка внутри панели контролов; ей нужен positioned-родитель.
    if (getComputedStyle(button).position === "static") {
      button.style.position = "relative";
    }
    button.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add("ytfp-onboarding-hint--visible"));

    const finish = () => {
      clearTimeout(hideTimer);
      button.classList.remove("ytfp-onboarding");
      hint.remove();
      button.removeEventListener("click", finish);
    };
    const hideTimer = setTimeout(finish, ONBOARDING_DURATION_MS);
    button.addEventListener("click", finish);
  }

  async function maybeShowOnboarding(button) {
    if (onboardingShown) {
      return;
    }
    try {
      const { onboardingPending } = await chrome.storage.local.get("onboardingPending");
      if (!onboardingPending) {
        return;
      }
      onboardingShown = true;
      // Снимаем флаг сразу: подсказка показывается ровно один раз на установку,
      // даже если открыто несколько вкладок YouTube.
      await chrome.storage.local.remove("onboardingPending");
      showOnboardingHint(button);
    } catch (error) {
      // Контекст расширения пропал (обновление без перезагрузки вкладки).
    }
  }

  /**
   * На страницах шортсов кнопка живёт в колонке действий активного шортса,
   * над кнопкой «лайк». Колонка своя у каждого шортса — при прокрутке
   * убираем кнопки из неактивных и ставим в активную (страж-интервал).
   */
  function ensureShortsButton() {
    // Новый UI шортсов: одна колонка действий reel-action-bar-view-model,
    // лайк — её первый элемент. Старый UI: #actions активного шортса.
    const activeActions =
      document.querySelector("reel-action-bar-view-model") ||
      document.querySelector("ytd-reel-video-renderer[is-active] #actions");

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
      const shortsButton = styleShortsButton(buildButton(null));
      activeActions.prepend(shortsButton);
      maybeShowOnboarding(shortsButton);
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
