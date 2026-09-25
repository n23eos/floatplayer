"use strict";

// Страница приветствия. Открывается один раз после установки и после
// заметных обновлений (?mode=update меняет только заголовок).

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const message = chrome.i18n.getMessage(el.dataset.i18n);
    if (message) {
      el.textContent = message;
    }
  }
  const title = chrome.i18n.getMessage("welcomeTitle");
  if (title) {
    document.title = title;
  }
}
applyI18n();
document.documentElement.lang = chrome.i18n.getUILanguage?.() || "en";

const manifest = chrome.runtime.getManifest();
document.getElementById("version").textContent = `v${manifest.version}`;

// Режим обновления: та же страница, другой заголовок.
if (new URLSearchParams(location.search).get("mode") === "update") {
  const heading = chrome.i18n.getMessage("welcomeUpdatedHeading");
  const sub = chrome.i18n.getMessage("welcomeUpdatedSub");
  document.getElementById("heroTitle").textContent = heading || "FloatPlayer updated";
  document.getElementById("heroSub").textContent =
    sub || "A quick reminder of what it can do.";
}

// --- Горячие клавиши -------------------------------------------------------

/**
 * Комбинации берём у Chrome, а не из манифеста: пользователь мог их
 * переназначить, и на macOS они пишутся другими символами.
 */
async function renderShortcuts() {
  const list = document.getElementById("keys");
  let commands = [];
  try {
    commands = await chrome.commands.getAll();
  } catch (error) {
    return; // список недоступен — блок просто останется пустым
  }
  for (const command of commands) {
    if (!command.shortcut) {
      continue; // клавиша не назначена (например, глобальная пауза)
    }
    const key = document.createElement("dt");
    const kbd = document.createElement("kbd");
    kbd.textContent = command.shortcut;
    key.appendChild(kbd);

    const description = document.createElement("dd");
    description.textContent = command.description || command.name;

    list.append(key, description);
  }
}

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

renderShortcuts();

// Demo state is intentionally local to this page, never saved in chrome.storage.
const guideNames = { drag: 'Drag', speed: 'Speed', volume: 'Volume', full: 'Full', simple: 'Simple', more: 'More' };
let demoMode = 'full';
const guideMessage = key => chrome.i18n.getMessage(key) || document.querySelector(`[data-i18n="${key}"]`)?.textContent || '';
for (const control of document.querySelectorAll('[data-i18n-label]')) {
  const label = chrome.i18n.getMessage(control.dataset.i18nLabel);
  if (label) control.setAttribute('aria-label', label);
}
function renderDemoMode(repeated = false) {
  for (const button of document.querySelectorAll('[data-guide][aria-pressed]')) {
    button.setAttribute('aria-pressed', String(button.dataset.guide === demoMode));
  }
  for (const example of document.querySelectorAll('[data-example]')) {
    example.classList.toggle('is-selected', example.dataset.example === demoMode);
  }
  const prefix = chrome.i18n.getMessage(repeated ? 'welcomeDemoOpened' : 'welcomeDemoSelected') ||
    (repeated ? 'The bottom button would open:' : 'Selected in this example:');
  document.getElementById('modeFeedback').textContent = `${prefix} ${guideMessage(`welcome${guideNames[demoMode]}Name`)}`;
}
for (const button of document.querySelectorAll('[data-guide]')) {
  button.addEventListener('click', () => {
    const control = button.dataset.guide;
    document.getElementById('guideFeedback').textContent = guideMessage(`welcome${guideNames[control]}Help`);
    if (control === 'full' || control === 'simple') {
      demoMode = control;
      renderDemoMode();
    }
  });
}
document.getElementById('guideFeedback').textContent = guideMessage('welcomeFullHelp');
document.getElementById('repeatMode').addEventListener('click', () => renderDemoMode(true));
renderDemoMode();
