"use strict";

// Горячие клавиши (chrome.commands) работают при фокусе в любом окне Chrome.
// Ищем подходящую вкладку YouTube и пересылаем команду её content-скрипту.

async function findTargetTab() {
  const youtubeTabs = await chrome.tabs.query({ url: "*://www.youtube.com/*" });
  if (youtubeTabs.length === 0) {
    return null;
  }
  // Приоритет: активная вкладка -> вкладка со звуком -> первая попавшаяся.
  return (
    youtubeTabs.find((tab) => tab.active) ||
    youtubeTabs.find((tab) => tab.audible) ||
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
