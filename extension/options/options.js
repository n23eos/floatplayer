"use strict";

// Страница настроек: читает/пишет chrome.storage.sync.
// Дефолты дублируем из content/constants.js (options-страница живёт отдельно).
const DEFAULT_SETTINGS = {
  autoPip: false,
  speedStep: 0.25,
  volumeBoostMax: 300,
  compactMode: true,
  autoSkipAds: true
};

const elements = {
  autoPip: document.getElementById("autoPip"),
  autoSkipAds: document.getElementById("autoSkipAds"),
  compactMode: document.getElementById("compactMode"),
  speedStep: document.getElementById("speedStep"),
  volumeBoostMax: document.getElementById("volumeBoostMax"),
  status: document.getElementById("status")
};

async function loadIntoForm() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  elements.autoPip.checked = Boolean(settings.autoPip);
  elements.autoSkipAds.checked = Boolean(settings.autoSkipAds);
  elements.compactMode.checked = Boolean(settings.compactMode);
  elements.speedStep.value = String(settings.speedStep);
  elements.volumeBoostMax.value = String(settings.volumeBoostMax);
}

let statusTimer = null;

async function save() {
  await chrome.storage.sync.set({
    autoPip: elements.autoPip.checked,
    autoSkipAds: elements.autoSkipAds.checked,
    compactMode: elements.compactMode.checked,
    speedStep: Number(elements.speedStep.value),
    volumeBoostMax: Number(elements.volumeBoostMax.value)
  });
  elements.status.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    elements.status.hidden = true;
  }, 1500);
}

for (const key of ["autoPip", "autoSkipAds", "compactMode", "speedStep", "volumeBoostMax"]) {
  elements[key].addEventListener("change", save);
}

loadIntoForm();
