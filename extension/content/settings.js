"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Настройки: chrome.storage.sync + локальный кэш, чтобы читать синхронно.
YTFP.settings = (() => {
  let cache = { ...YTFP.DEFAULT_SETTINGS };
  const listeners = new Set();

  async function load() {
    try {
      const stored = await chrome.storage.sync.get(YTFP.DEFAULT_SETTINGS);
      cache = { ...YTFP.DEFAULT_SETTINGS, ...stored };
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
