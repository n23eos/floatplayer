"use strict";

// Локализация страницы: английский текст зашит в HTML как базовый,
// chrome.i18n подменяет строки для текущей локали браузера.
function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) {
      el.textContent = message;
    }
  }
  // Единица «сек/s» в вариантах шага промотки.
  const secUnit = chrome.i18n.getMessage("optSec");
  if (secUnit) {
    for (const option of document.querySelectorAll("#skipStepSeconds option")) {
      option.textContent = `${option.value} ${secUnit}`;
    }
  }
  const title = chrome.i18n.getMessage("optTitle");
  if (title) {
    document.title = title;
  }
}
applyI18n();

// Страница настроек: читает/пишет chrome.storage.sync.
// Дефолты дублируем из content/constants.js (options-страница живёт отдельно).
const DEFAULT_SETTINGS = {
  autoPip: false,
  speedStep: 0.25,
  volumeBoostMax: 300,
  compactMode: true,
  skipStepSeconds: 30,
  sponsorSkip: true,
  sponsorAutoSkip: false,
  sponsorCategories: ["sponsor", "selfpromo", "interaction"],
  shortsAutoNext: true,
  windowMode: "document",
  audioPreset: "off"
};

const elements = {
  autoPip: document.getElementById("autoPip"),
  windowMode: document.getElementById("windowMode"),
  sponsorSkip: document.getElementById("sponsorSkip"),
  sponsorAutoSkip: document.getElementById("sponsorAutoSkip"),
  shortsAutoNext: document.getElementById("shortsAutoNext"),
  compactMode: document.getElementById("compactMode"),
  speedStep: document.getElementById("speedStep"),
  skipStepSeconds: document.getElementById("skipStepSeconds"),
  volumeBoostMax: document.getElementById("volumeBoostMax"),
  status: document.getElementById("status")
};

function getCategoryCheckboxes() {
  return Array.from(document.querySelectorAll(".sb-category"));
}

async function loadIntoForm() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  elements.autoPip.checked = Boolean(settings.autoPip);
  elements.windowMode.value = String(settings.windowMode);
  elements.sponsorSkip.checked = Boolean(settings.sponsorSkip);
  elements.sponsorAutoSkip.checked = Boolean(settings.sponsorAutoSkip);
  const categories = Array.isArray(settings.sponsorCategories)
    ? settings.sponsorCategories
    : DEFAULT_SETTINGS.sponsorCategories;
  for (const checkbox of getCategoryCheckboxes()) {
    checkbox.checked = categories.includes(checkbox.value);
  }
  elements.shortsAutoNext.checked = Boolean(settings.shortsAutoNext);
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
    sponsorAutoSkip: elements.sponsorAutoSkip.checked,
    sponsorCategories: getCategoryCheckboxes()
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value),
    shortsAutoNext: elements.shortsAutoNext.checked,
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

for (const key of ["autoPip", "windowMode", "sponsorSkip", "sponsorAutoSkip", "shortsAutoNext", "compactMode", "speedStep", "skipStepSeconds", "volumeBoostMax"]) {
  // Защита от рассинхрона HTML и этого списка: пропускаем отсутствующие.
  if (elements[key]) {
    elements[key].addEventListener("change", save);
  }
}
for (const checkbox of getCategoryCheckboxes()) {
  checkbox.addEventListener("change", save);
}

loadIntoForm();
