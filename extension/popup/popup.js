"use strict";

// Всплывающее окно по клику на иконку: состояние текущей вкладки,
// кнопка выноса видео и три самых частых переключателя.

const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) {
      el.textContent = message;
    }
  }
}
applyI18n();

const elements = {
  stateDot: document.getElementById("stateDot"),
  stateText: document.getElementById("stateText"),
  primary: document.getElementById("primary"),
  primaryText: document.getElementById("primaryText"),
  shortcut: document.getElementById("shortcut"),
  autoPip: document.getElementById("autoPip"),
  compactMode: document.getElementById("compactMode"),
  sponsorSkip: document.getElementById("sponsorSkip"),
  openOptions: document.getElementById("openOptions")
};

// Content-скрипт живёт только на www.youtube.com (см. manifest).
const YOUTUBE_URL = /^https?:\/\/www\.youtube\.com\//;

// Быстрые тумблеры popup: подмножество настроек страницы options.
const QUICK_SETTINGS = {
  autoPip: false,
  compactMode: true,
  sponsorSkip: true
};

let activeTabId = null;

// --- Состояние вкладки -----------------------------------------------------

/** Одна точка правды для строки состояния и главной кнопки. */
function renderState({ dot, text, action, enabled }) {
  elements.stateDot.className = `state-dot${dot ? ` state-dot--${dot}` : ""}`;
  elements.stateText.textContent = text;
  elements.primaryText.textContent = action;
  elements.primary.disabled = !enabled;
}

/**
 * Спрашивает content-скрипт о текущем состоянии. Ответа может не быть:
 * вкладка открыта до установки расширения и скрипт в неё не внедрён.
 */
async function askContentScript(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { command: "get-state" });
  } catch (error) {
    return null;
  }
}

async function refreshState() {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (error) {
    // Расширение обновилось, пока попап открывался: контекст недействителен.
    // Без этой ветки кнопка навсегда осталась бы серой с надписью «Проверяю…».
    console.warn("[YTFP] Failed to read the active tab:", error);
    renderState({
      dot: null,
      text: t("popupStateReload", "Reload the tab to activate"),
      action: t("popupOpen", "Pop out the video"),
      enabled: false
    });
    return;
  }
  if (!tab || !tab.id || !tab.url || !YOUTUBE_URL.test(tab.url)) {
    renderState({
      dot: null,
      text: t("popupStateNoTab", "Open a video on YouTube"),
      action: t("popupOpen", "Pop out the video"),
      enabled: false
    });
    return;
  }
  activeTabId = tab.id;

  const state = await askContentScript(tab.id);
  if (!state) {
    // Скрипта нет — помогает перезагрузка вкладки, о ней и пишем.
    renderState({
      dot: null,
      text: t("popupStateReload", "Reload the tab to activate"),
      action: t("popupOpen", "Pop out the video"),
      enabled: false
    });
    return;
  }
  if (state.pipOpen) {
    renderState({
      dot: "live",
      text: t("popupStatePlaying", "Playing in the mini-window"),
      action: t("popupReturn", "Bring the video back"),
      enabled: true
    });
    return;
  }
  if (state.playerPage) {
    renderState({
      dot: "ready",
      text: t("popupStateReady", "Ready to pop out"),
      action: t("popupOpen", "Pop out the video"),
      enabled: true
    });
    return;
  }
  renderState({
    dot: null,
    text: t("popupStateNoVideo", "Open a video on YouTube"),
    action: t("popupOpen", "Pop out the video"),
    enabled: false
  });
}

elements.primary.addEventListener("click", async () => {
  if (activeTabId === null) {
    return;
  }
  try {
    await chrome.tabs.sendMessage(activeTabId, { command: "toggle-pip" });
  } catch (error) {
    // Вкладка успела закрыться — окно popup всё равно пора убирать.
  }
  window.close();
});

// --- Горячая клавиша под кнопкой -------------------------------------------

async function showShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const toggle = commands.find((command) => command.name === "toggle-pip");
    if (toggle && toggle.shortcut) {
      elements.shortcut.textContent = toggle.shortcut;
    }
  } catch (error) {
    // Список команд недоступен — строка просто останется пустой.
  }
}

// --- Быстрые тумблеры ------------------------------------------------------

async function loadQuickSettings() {
  let settings;
  try {
    settings = await chrome.storage.sync.get(QUICK_SETTINGS);
  } catch (error) {
    // Прочитать не смогли — тумблеры не трогаем и запись запрещаем: иначе
    // они показали бы «выключено» для всего и первым же кликом это записали.
    console.warn("[YTFP] Failed to read settings:", error);
    for (const key of Object.keys(QUICK_SETTINGS)) {
      elements[key].disabled = true;
    }
    return;
  }
  for (const key of Object.keys(QUICK_SETTINGS)) {
    elements[key].checked = Boolean(settings[key]);
  }
}

for (const key of Object.keys(QUICK_SETTINGS)) {
  elements[key].addEventListener("change", () => {
    const value = elements[key].checked;
    chrome.storage.sync.set({ [key]: value }).catch((error) => {
      // Не сохранилось (квота записей, переполнение sync) — возвращаем
      // тумблер назад, чтобы он не показывал несуществующую настройку.
      console.warn("[YTFP] Failed to save a setting:", error);
      elements[key].checked = !value;
    });
  });
}

elements.openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

refreshState();
showShortcut();
loadQuickSettings();
