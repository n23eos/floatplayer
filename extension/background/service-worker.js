"use strict";

// Форма обратной связи при удалении расширения: Chrome открывает этот URL
// сразу после деинсталляции (штатный механизм setUninstallURL).
// Когда будет Google Form — просто замени адрес на forms.gle/...
const UNINSTALL_FEEDBACK_URL =
  "https://github.com/n23eos/floatplayer/issues/new" +
  "?labels=feedback&title=Uninstall%20feedback" +
  "&body=What%20made%20you%20uninstall%20FloatPlayer%3F%20%2F%20%D0%9F%D0%BE%D1%87%D0%B5%D0%BC%D1%83%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B8%D0%BB%D0%B8%20%D1%80%D0%B0%D1%81%D1%88%D0%B8%D1%80%D0%B5%D0%BD%D0%B8%D0%B5%3F";

chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL).catch((error) => {
  console.warn("[YTFP] setUninstallURL failed:", error);
});

// Горячие клавиши (chrome.commands) работают при фокусе в любом окне Chrome.
// Ищем подходящую вкладку YouTube и пересылаем команду её content-скрипту.

async function findTargetTab() {
  // Приоритет: активная вкладка последнего окна в фокусе ->
  // вкладка со звуком -> любая активная -> первая попавшаяся.
  const [focusedActive] = await chrome.tabs.query({
    url: "*://www.youtube.com/*",
    active: true,
    lastFocusedWindow: true
  });
  if (focusedActive) {
    return focusedActive;
  }
  const youtubeTabs = await chrome.tabs.query({ url: "*://www.youtube.com/*" });
  if (youtubeTabs.length === 0) {
    return null;
  }
  return (
    youtubeTabs.find((tab) => tab.audible) ||
    youtubeTabs.find((tab) => tab.active) ||
    youtubeTabs[0]
  );
}

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tab = await findTargetTab();
    if (!tab || !tab.id) {
      return;
    }
    await chrome.tabs.sendMessage(tab.id, { command });
  } catch (error) {
    // Вкладка без content-скрипта (например, только что открыта) — не критично.
    console.warn("[YTFP] Command dispatch failed:", error);
  }
});
