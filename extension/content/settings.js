"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Настройки: chrome.storage.sync + локальный кэш, чтобы читать синхронно.
YTFP.settings = (() => {
  let cache = { ...YTFP.DEFAULT_SETTINGS };
  const listeners = new Set();

  // До версии 1.18 размер панелей хранился пресетом "large" | "small".
  // Ключ больше не пишем, но читаем: у кого он остался в хранилище, тот
  // получает свой прежний размер в процентах.
  const LEGACY_PANEL_SIZE_KEY = "panelSize";

  /** Масштаб панели: своё значение, иначе перевод старого пресета. */
  function resolvePanelScale(storedScale, legacySize) {
    // null здесь означает «ключа в хранилище нет» — так помечен запрос ниже.
    return storedScale === null
      ? YTFP.utils.panelScaleFromLegacySize(legacySize)
      : YTFP.utils.normalizePanelScale(storedScale);
  }

  async function load() {
    try {
      // panelScale и старый ключ запрашиваем с null вместо значения по
      // умолчанию: иначе не отличить «не задано» от «задано как дефолт».
      const stored = await chrome.storage.sync.get({
        ...YTFP.DEFAULT_SETTINGS,
        panelScale: null,
        [LEGACY_PANEL_SIZE_KEY]: null
      });
      const { [LEGACY_PANEL_SIZE_KEY]: legacySize, ...known } = stored;
      cache = {
        ...YTFP.DEFAULT_SETTINGS,
        ...known,
        panelScale: resolvePanelScale(known.panelScale, legacySize)
      };
    } catch (error) {
      console.warn("[YTFP] Failed to load settings, using defaults:", error);
    }
    return cache;
  }

  function get() {
    return cache;
  }

  /** Подписка на изменения настроек (например, со страницы options). */
  function onChange(callback) {
    listeners.add(callback);
  }

  /**
   * Отписка. Нужна только колбэкам с временем жизни короче content-скрипта
   * (например, привязанным к PiP-окну); остальные могут не отписываться.
   */
  function offChange(callback) {
    listeners.delete(callback);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") {
      return;
    }
    const updated = { ...cache };
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in YTFP.DEFAULT_SETTINGS) {
        updated[key] = newValue;
      }
    }
    cache = updated;
    // Каждый колбэк в своём try: упавший слушатель одного модуля не должен
    // лишать обновления остальные.
    for (const callback of listeners) {
      try {
        callback(cache);
      } catch (error) {
        console.warn("[YTFP] Settings listener failed:", error);
      }
    }
  });

  return { load, get, onChange, offChange };
})();
