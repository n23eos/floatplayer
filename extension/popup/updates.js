"use strict";

// Independent from video controls: an update failure must not disable playback.
(() => {
  const button = document.getElementById("updateAction");
  const status = document.getElementById("updateStatus");
  const hint = document.getElementById("updateHint");
  document.getElementById("extensionVersion").textContent = `v${chrome.runtime.getManifest().version}`;
  let available = false, busy = false, revision = 0;
  const text = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
  const messages = {
    idle: ["updateIdle", "Chrome also checks for updates automatically."],
    no_update: ["updateNone", "No update is available."],
    throttled: ["updateThrottled", "Chrome limited update checks. Try again later."],
    error: ["updateError", "Could not check or install the update. Try again."],
    unpacked: ["updateUnpacked", "Local installation: replace the extension files, then reload it on the Extensions page."],
    close_player: ["updateClosePlayer", "Close the floating player, then try updating again."],
    tabs_unavailable: ["updateTabsUnavailable", "Reload or close unresponsive YouTube tabs, then try again."],
    installing: ["updateInstalling", "Applying update…"]
  };
  function render(result) {
    const value = result?.status || "error";
    available = ["update_available", "close_player", "tabs_unavailable"].includes(value);
    hint.hidden = !available;
    button.disabled = busy || ["unpacked", "installing"].includes(value);
    button.textContent = value === "installing"
      ? text("updateInstalling", "Applying update…")
      : available
      ? text("updateInstall", "Update now")
      : text("updateCheck", "Check for updates");
    if (value === "update_available") {
      status.textContent = `${text("updateAvailable", "Update available:")} ${result.version}`;
    } else status.textContent = text(...(messages[value] || messages.error));
  }
  async function run(command) {
    if (busy) return;
    busy = true;
    const token = ++revision;
    button.disabled = true;
    status.textContent = text(command === "install-update" ? "updateInstalling" : "updateChecking",
      command === "install-update" ? "Applying update…" : "Checking…");
    try {
      const result = await chrome.runtime.sendMessage({ command });
      if (token !== revision) return;
      busy = false; render(result);
    } catch {
      busy = false; render({ status: "error" });
    }
  }
  button.addEventListener("click", () => run(available ? "install-update" : "check-update"));
  const onStorage = (changes, area) => {
    if (area === "local" && changes.availableUpdateVersion && !busy) run("update-state");
  };
  chrome.storage.onChanged.addListener(onStorage);
  window.addEventListener("pagehide", () => chrome.storage.onChanged.removeListener?.(onStorage), { once: true });
  run("update-state");
})();
