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
  const title = chrome.i18n.getMessage("optTitle");
  if (title) {
    document.title = title;
  }
}
applyI18n();

// Версию берём из манифеста, чтобы она не разъезжалась с релизом.
document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

// Страница настроек: читает/пишет chrome.storage.sync.
// Дефолты и нормализаторы — из общего shared/settings-schema.js, он же
// подключён к content-скриптам: страница и окно обязаны понимать хранилище
// одинаково, иначе форма запишет одно, а плеер прочитает другое.
const { DEFAULT_SETTINGS, settingsSchema } = YTFP;
const {
  LEGACY_PANEL_SIZE_KEY,
  normalizeChatOpacity,
  normalizePanelScale,
  resolvePanelScale
} = settingsSchema;

const elements = {
  autoPip: document.getElementById("autoPip"),
  windowMode: document.getElementById("windowMode"),
  sponsorSkip: document.getElementById("sponsorSkip"),
  sponsorAutoSkip: document.getElementById("sponsorAutoSkip"),
  shortsAutoNext: document.getElementById("shortsAutoNext"),
  compactMode: document.getElementById("compactMode"),
  panelScale: document.getElementById("panelScale"),
  panelScaleValue: document.getElementById("panelScaleValue"),
  pagePanel: document.getElementById("pagePanel"),
  speedStep: document.getElementById("speedStep"),
  volumeBoostMax: document.getElementById("volumeBoostMax"),
  chatPanelOpacity: document.getElementById("chatPanelOpacity"),
  chatPanelOpacityValue: document.getElementById("chatPanelOpacityValue"),
  status: document.getElementById("status")
};

/** Подпись «NN%» рядом с ползунком прозрачности. */
function refreshChatOpacityLabel() {
  elements.chatPanelOpacityValue.textContent = `${elements.chatPanelOpacity.value}%`;
}

/** Подпись «NN%» рядом с ползунком масштаба панелей. */
function refreshPanelScaleLabel() {
  elements.panelScaleValue.textContent = `${elements.panelScale.value}%`;
}

function getCategoryCheckboxes() {
  return Array.from(document.querySelectorAll(".sb-category"));
}

/**
 * Строки с data-requires гасим, когда настройка-родитель выключена:
 * видно, что они есть, но сейчас ни на что не влияют.
 */
function refreshDependentRows() {
  for (const row of document.querySelectorAll("[data-requires]")) {
    const parent = elements[row.dataset.requires];
    row.classList.toggle("row--muted", Boolean(parent) && !parent.checked);
  }
}

/**
 * Значение в <select> — только если такой вариант в списке есть. Иначе
 * DOM молча выставит value="", и ближайшее сохранение записало бы
 * Number("") === 0: шаг скорости 0 ломает и ползунок, и хоткеи.
 * Значение не из списка попадает в хранилище из сборки с другим набором
 * вариантов (синхронизация между версиями) или правкой руками.
 */
function setSelectValue(select, value, fallback) {
  const wanted = String(value);
  const isKnown = Array.from(select.options).some((option) => option.value === wanted);
  select.value = isKnown ? wanted : String(fallback);
}

// Форма готова к сохранению только после успешного чтения настроек:
// пока её не заполнили, DOM показывает значения по умолчанию из HTML,
// и запись отсюда затёрла бы реальные настройки пользователя.
let isFormReady = false;
// Счётчик сохранений: ответ чтения, начатого до сохранения, устарел —
// иначе форма скакнула бы обратно на старое значение.
let saveCount = 0;

async function loadIntoForm() {
  const startedAt = saveCount;
  let settings;
  try {
    // panelScale и старый panelSize запрашиваем с null вместо значения по
    // умолчанию: иначе не отличить «не задано» от «задано как дефолт», а
    // от этого зависит, брать ли масштаб из старой настройки.
    settings = await chrome.storage.sync.get({
      ...DEFAULT_SETTINGS,
      panelScale: null,
      [LEGACY_PANEL_SIZE_KEY]: null
    });
  } catch (error) {
    console.warn("[YTFP] Failed to read settings:", error);
    isFormReady = false;
    showToast(
      chrome.i18n.getMessage("optLoadError") ||
        "Couldn't load your settings. Reload the page.",
      "error"
    );
    return;
  }
  if (startedAt !== saveCount) {
    return; // пока читали, форму уже сохранили — ответ протух
  }
  elements.autoPip.checked = Boolean(settings.autoPip);
  setSelectValue(elements.windowMode, settings.windowMode, DEFAULT_SETTINGS.windowMode);
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
  elements.panelScale.value = String(
    resolvePanelScale(settings.panelScale, settings[LEGACY_PANEL_SIZE_KEY])
  );
  refreshPanelScaleLabel();
  elements.pagePanel.checked = Boolean(settings.pagePanel);
  setSelectValue(elements.speedStep, settings.speedStep, DEFAULT_SETTINGS.speedStep);
  setSelectValue(
    elements.volumeBoostMax,
    settings.volumeBoostMax,
    DEFAULT_SETTINGS.volumeBoostMax
  );
  elements.chatPanelOpacity.value = String(normalizeChatOpacity(settings.chatPanelOpacity));
  refreshChatOpacityLabel();
  refreshDependentRows();
  isFormReady = true;
}

// --- Плашка «Сохранено» ----------------------------------------------------

const TOAST_VISIBLE_MS = 1600;
const TOAST_FADE_MS = 200; // должно совпадать с --anim в options.css
let hideTimer = null;
let removeTimer = null;

// Текст плашки живёт в отдельном <span> рядом с галочкой: пишем в него,
// а не в саму плашку, иначе иконка была бы затёрта.
const toastText = elements.status.querySelector("span");
// Локализованное «Сохранено» из разметки — им же плашка и остаётся по
// умолчанию, отдельного ключа не нужно.
const SAVED_TEXT = toastText ? toastText.textContent : "Saved";

function showToast(text, kind) {
  clearTimeout(hideTimer);
  clearTimeout(removeTimer);
  if (toastText) {
    toastText.textContent = text;
  }
  elements.status.classList.toggle("toast--error", kind === "error");
  elements.status.hidden = false;
  // Браузер должен «увидеть» скрытое состояние до класса, иначе перехода не
  // будет. Принудительный пересчёт вместо requestAnimationFrame: в неактивной
  // вкладке кадры не рисуются, и плашка так и осталась бы прозрачной.
  void elements.status.offsetWidth;
  elements.status.classList.add("toast--visible");

  hideTimer = setTimeout(() => {
    elements.status.classList.remove("toast--visible");
    removeTimer = setTimeout(() => {
      elements.status.hidden = true;
    }, TOAST_FADE_MS);
  }, TOAST_VISIBLE_MS);
}

async function save() {
  // Форму ещё не заполнили из хранилища — в DOM значения по умолчанию из
  // HTML, и запись отсюда стёрла бы настройки пользователя.
  if (!isFormReady) {
    return;
  }
  saveCount += 1;
  try {
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
      panelScale: normalizePanelScale(elements.panelScale.value),
      pagePanel: elements.pagePanel.checked,
      speedStep: Number(elements.speedStep.value),
      volumeBoostMax: Number(elements.volumeBoostMax.value),
      chatPanelOpacity: normalizeChatOpacity(elements.chatPanelOpacity.value)
    });
  } catch (error) {
    // Квота записей в минуту, переполнение sync, отвалившийся контекст —
    // молча промолчать нельзя: тумблер стоит в новом положении, а
    // сохранения не произошло.
    console.warn("[YTFP] Failed to save settings:", error);
    showToast(
      chrome.i18n.getMessage("optSaveError") || "Couldn't save. Try again.",
      "error"
    );
    return;
  }
  refreshDependentRows();
  showToast(SAVED_TEXT, "ok");
}

// Ползунок: подпись обновляем на каждое движение, сохраняем по "change" —
// иначе каждое движение било бы в квоту записей chrome.storage.sync.
if (elements.chatPanelOpacity) {
  elements.chatPanelOpacity.addEventListener("input", refreshChatOpacityLabel);
}
if (elements.panelScale) {
  elements.panelScale.addEventListener("input", refreshPanelScaleLabel);
}

for (const key of ["autoPip", "windowMode", "sponsorSkip", "sponsorAutoSkip", "shortsAutoNext", "compactMode", "panelScale", "pagePanel", "speedStep", "volumeBoostMax", "chatPanelOpacity"]) {
  // Защита от рассинхрона HTML и этого списка: пропускаем отсутствующие.
  if (elements[key]) {
    elements[key].addEventListener("change", save);
  }
}
for (const checkbox of getCategoryCheckboxes()) {
  checkbox.addEventListener("change", save);
}

// Настройки могут поменяться из popup — форма не должна показывать старое.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    loadIntoForm();
  }
});

loadIntoForm();
