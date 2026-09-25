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

// Only Chrome supplies update versions; no package downloads or external URLs.
(() => {
  const UPDATE_KEY = "availableUpdateVersion";
  let notifiedVersion = null;
  let checking = null;
  let installing = false;
  const validVersion = value => typeof value === "string" && /^\d+(?:\.\d+){0,3}$/.test(value);
  function newer(candidate, current) {
    if (!validVersion(candidate) || !validVersion(current)) return false;
    const a = candidate.split(".").map(Number), b = current.split(".").map(Number);
    for (let i = 0; i < 4; i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return false;
  }
  async function remember(version) {
    if (!newer(version, chrome.runtime.getManifest().version)) return;
    if (!notifiedVersion || newer(version, notifiedVersion)) notifiedVersion = version;
    try { await chrome.storage.local.set({ [UPDATE_KEY]: notifiedVersion }); } catch (_) { /* Keep the in-memory notification. */ }
  }
  chrome.runtime.onUpdateAvailable?.addListener(details => { remember(details.version); });

  async function state() {
    const currentVersion = chrome.runtime.getManifest().version;
    const self = await chrome.management.getSelf();
    if (self.installType === "development") return { status: "unpacked", currentVersion };
    let stored;
    try { stored = (await chrome.storage.local.get(UPDATE_KEY))[UPDATE_KEY]; } catch (error) {
      if (!notifiedVersion) throw error;
    }
    let version = newer(stored, currentVersion) ? stored : null;
    if (newer(notifiedVersion, currentVersion) && (!version || newer(notifiedVersion, version))) version = notifiedVersion;
    return newer(version, currentVersion)
      ? { status: "update_available", currentVersion, version }
      : { status: "idle", currentVersion };
  }

  async function check() {
    const before = await state();
    if (["unpacked", "update_available"].includes(before.status)) return before;
    const result = await chrome.runtime.requestUpdateCheck();
    if (result.status === "update_available") await remember(result.version);
    const after = await state();
    if (after.status === "update_available") return after;
    if (!["no_update", "throttled"].includes(result.status)) throw new Error("Invalid update response");
    return { ...after, status: result.status };
  }

  function askState(tabId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Tab state timeout")), 2500);
      chrome.tabs.sendMessage(tabId, { command: "get-state" }).then(result => {
        clearTimeout(timer);
        if (typeof result?.pipOpen !== "boolean") reject(new Error("Unknown tab state"));
        else resolve(result);
      }, error => { clearTimeout(timer); reject(error); });
    });
  }

  async function install() {
    const current = await state();
    if (current.status !== "update_available") return current;
    const tabs = await chrome.tabs.query({ url: "*://www.youtube.com/*" });
    let states;
    try { states = await Promise.all(tabs.map(tab => askState(tab.id))); }
    // A disconnected content script can leave an orphaned player open.
    // Missing receivers are unknown too; ask the user to reload/close that tab.
    catch { return { ...current, status: "tabs_unavailable" }; }
    if (states.some(tab => tab.pipOpen)) return { ...current, status: "close_player" };
    return { ...current, status: "installing" };
  }

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    const action = message?.command;
    if (!["update-state", "check-update", "install-update"].includes(action)) return;
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("popup/popup.html") || sender.tab) return;
    if (installing) { reply({ status: "installing" }); return; }
    let operation;
    if (action === "check-update") {
      if (!checking) checking = check().finally(() => { checking = null; });
      operation = checking;
    } else if (action === "install-update") {
      installing = true;
      operation = install();
    } else operation = state();
    operation.then(result => {
      if (action === "install-update" && result.status !== "installing") installing = false;
      if (action === "install-update" && result.status === "installing") chrome.runtime.reload();
      reply(result);
    }).catch(() => {
      if (action === "install-update") installing = false;
      reply({ status: "error" });
    });
    return true;
  });
})();
