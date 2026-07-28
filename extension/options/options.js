"use strict";

// Страница настроек: читает/пишет chrome.storage.sync.
// Дефолты дублируем из content/constants.js (options-страница живёт отдельно).
const DEFAULT_SETTINGS = {
  autoPip: false,
  speedStep: 0.25,
  volumeBoostMax: 300,
  compactMode: true,
  skipStepSeconds: 30,
  sponsorSkip: true,
  windowMode: "document"
};

const elements = {
  autoPip: document.getElementById("autoPip"),
  windowMode: document.getElementById("windowMode"),
  sponsorSkip: document.getElementById("sponsorSkip"),
  compactMode: document.getElementById("compactMode"),
  speedStep: document.getElementById("speedStep"),
  skipStepSeconds: document.getElementById("skipStepSeconds"),
  volumeBoostMax: document.getElementById("volumeBoostMax"),
  status: document.getElementById("status")
};

async function loadIntoForm() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  elements.autoPip.checked = Boolean(settings.autoPip);
  elements.windowMode.value = String(settings.windowMode);
  elements.sponsorSkip.checked = Boolean(settings.sponsorSkip);
  elements.compactMode.checked = Boolean(settings.compactMode);
  elements.speedStep.value = String(settings.speedStep);
  elements.skipStepSeconds.value = String(settings.skipStepSeconds);
  elements.volumeBoostMax.value = String(settings.volumeBoostMax);
}

let statusTimer = null;

async function save() {
  await chrome.storage.sync.set({
    autoPip: elements.autoPip.checked,
    windowMode: elements.windowMode.value,
    sponsorSkip: elements.sponsorSkip.checked,
    compactMode: elements.compactMode.checked,
    speedStep: Number(elements.speedStep.value),
    skipStepSeconds: Number(elements.skipStepSeconds.value),
    volumeBoostMax: Number(elements.volumeBoostMax.value)
  });
  elements.status.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    elements.status.hidden = true;
  }, 1500);
}

for (const key of ["autoPip", "windowMode", "sponsorSkip", "compactMode", "speedStep", "skipStepSeconds", "volumeBoostMax"]) {
  elements[key].addEventListener("change", save);
}

loadIntoForm();
