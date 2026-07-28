"use strict";

// Форма обратной связи при удалении расширения: Chrome открывает этот URL
// сразу после деинсталляции (штатный механизм setUninstallURL).
const UNINSTALL_FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfLpTIVpvVuU3riMkE5ljv9rYw5tGW0Bxol1_jtUWnAu1Enmw/viewform";

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
    // Глобальная (вне Chrome) пауза — тот же обработчик, что и Alt+K.
    const normalized = command === "global-play-pause" ? "play-pause" : command;
    await chrome.tabs.sendMessage(tab.id, { command: normalized });
  } catch (error) {
    // Вкладка без content-скрипта (например, только что открыта) — не критично.
    console.warn("[YTFP] Command dispatch failed:", error);
  }
});
