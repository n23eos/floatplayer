"use strict";

// Форма обратной связи при удалении расширения: Chrome открывает этот URL
// сразу после деинсталляции (штатный механизм setUninstallURL).
const UNINSTALL_FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfLpTIVpvVuU3riMkE5ljv9rYw5tGW0Bxol1_jtUWnAu1Enmw/viewform";

chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL).catch((error) => {
  console.warn("[YTFP] setUninstallURL failed:", error);
});

const WELCOME_PAGE = "welcome/welcome.html";

/** «1.11.1» → «1.11»: патчи считаем незаметными для пользователя. */
function minorVersion(version) {
  return String(version).split(".").slice(0, 2).join(".");
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Первый запуск: страница приветствия плюс флаг подсветки кнопки в плеере.
    // Флаг снимает content-скрипт после показа, поэтому подсказка не повторяется.
    chrome.storage.local.set({ onboardingPending: true }).catch(() => {});
    chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PAGE) }).catch(() => {});
    return;
  }
  if (details.reason !== "update" || !details.previousVersion) {
    return;
  }
  // Обновление показываем только при смене минорной версии: патч-релизы
  // не должны открывать вкладку каждый раз.
  const current = chrome.runtime.getManifest().version;
  if (minorVersion(details.previousVersion) === minorVersion(current)) {
    return;
  }
  chrome.tabs
    .create({ url: chrome.runtime.getURL(`${WELCOME_PAGE}?mode=update`) })
    .catch(() => {});
});

// Горячие клавиши (chrome.commands) работают при фокусе в любом окне Chrome.
// Ищем подходящую вкладку YouTube и пересылаем команду её content-скрипту.

async function findTargetTab() {
  const tabs = await chrome.tabs.query({ url: "*://www.youtube.com/*" });
  const states = await Promise.all(tabs.map(async tab => {
    try { return { tab, state: await chrome.tabs.sendMessage(tab.id, { command: "get-state" }) }; }
    catch { return { tab, state: null }; }
  }));
  const pip = states.find(item => item.state?.pipOpen);
  if (pip) return { ...pip.tab, playerState: pip.state };
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const ready = states.filter(item => item.state?.playerPage);
  const chosen = ready.find(item => item.tab.id === focused?.id) ||
    ready.find(item => item.tab.audible) || ready.find(item => item.tab.active) || ready[0];
  return chosen ? { ...chosen.tab, playerState: chosen.state } : null;
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.command === "get-tab-id" && sender.tab) {
    reply({ tabId: sender.tab.id });
  } else if (message?.command === "resolve-target" && !sender.tab) {
    findTargetTab().then(reply, () => reply(null));
    return true;
  }
});
// Очереди принадлежат вкладкам и не оставляют историю после их закрытия.
chrome.tabs.onRemoved.addListener(tabId => {
  chrome.storage.local.remove(`queue:${tabId}`).catch(() => {});
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tab = await findTargetTab();
    if (!tab || !tab.id) {
      return;
    }
    // Глобальная (вне Chrome) пауза — тот же обработчик, что и Alt+K.
    const normalized = command === "global-play-pause" ? "play-pause" : command;
    await chrome.tabs.sendMessage(tab.id, { command: normalized });
  } catch (error) {
    // Вкладка без content-скрипта (например, только что открыта) — не критично.
    console.warn("[YTFP] Command dispatch failed:", error);
  }
});
