"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.pipCaptions = (() => {
  function build(doc) {
    const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    const root = doc.createElement("div"); root.className = "ytfp-caption-controls";
    const toggle = doc.createElement("button"); toggle.className = "ytfp-btn"; toggle.textContent = "CC";
    toggle.setAttribute("aria-label", t("captionsToggle", "Toggle captions"));
    const language = doc.createElement("select"); language.className = "ytfp-select";
    language.setAttribute("aria-label", t("captionsLanguage", "Caption language"));
    const size = doc.createElement("select"); size.className = "ytfp-select";
    size.setAttribute("aria-label", t("captionsSize", "Caption size"));
    for (const n of [75,100,125,150,200]) { const option = doc.createElement("option"); option.value = String(n); option.textContent = `${n}%`; size.append(option); }
    const background = doc.createElement("label");
    const check = doc.createElement("input"); check.type = "checkbox";
    background.append(check, t("captionsBackground", "Background"));
    const status = doc.createElement("span"); status.setAttribute("role", "status");
    root.append(toggle, language, size, background, status);
    let requestId = "", timeout = null, refreshTimer = null, disposed = false;
    function request(action = "read") {
      if (disposed) return;
      clearTimeout(timeout); requestId = crypto.randomUUID();
      window.postMessage({ type: "ytfp-captions", requestId, action, language: language.value }, location.origin);
      timeout = setTimeout(() => { toggle.disabled = true; language.disabled = true; status.textContent = t("captionsUnavailable", "Captions unavailable for this video"); }, 1500);
    }
    function receive(event) {
      if (event.source !== window || event.origin !== location.origin || event.data?.type !== "ytfp-captions-result" || event.data.requestId !== requestId) return;
      clearTimeout(timeout);
      const result = event.data.result;
      if (!result || !Array.isArray(result.tracks)) return;
      toggle.disabled = !result.available;
      toggle.setAttribute("aria-pressed", String(Boolean(result.enabled)));
      toggle.classList.toggle("ytfp-btn--active", Boolean(result.enabled));
      status.textContent = result.available ? "" : t("captionsUnavailable", "Captions unavailable for this video");
      language.replaceChildren();
      for (const track of result.tracks.slice(0,100)) {
        if (typeof track.code !== "string" || typeof track.name !== "string") continue;
        const option = doc.createElement("option"); option.value = track.code; option.textContent = track.name; language.append(option);
      }
      language.value = result.selected || ""; language.disabled = !language.options.length;
      language.hidden = !language.options.length;
    }
    const save = values => chrome.storage.sync.set(values).catch(() => { status.textContent = t("optSaveError", "Couldn't save. Try again."); });
    function change(action) {
      request(action);
      // Caption tracks can load asynchronously after CC is enabled.
      clearTimeout(refreshTimer); refreshTimer = setTimeout(() => request(), 500);
    }
    toggle.onclick = () => change("toggle"); language.onchange = () => change("language");
    size.onchange = () => save({ captionSize: Number(size.value) });
    check.onchange = () => save({ captionBackground: check.checked });
    const style = doc.createElement("style"); doc.head.append(style);
    function apply(settings) {
      size.value = String(settings.captionSize); check.checked = settings.captionBackground;
      style.textContent = `.ytp-caption-segment { font-size: ${16 * settings.captionSize / 100}px !important; background-color: ${settings.captionBackground ? "rgba(0,0,0,.75)" : "transparent"} !important; }`;
    }
    const onNavigate = () => request();
    window.addEventListener("message", receive); document.addEventListener("yt-navigate-finish", onNavigate);
    root.addEventListener("pointerenter", onNavigate);
    YTFP.settings.onChange(apply); apply(YTFP.settings.get()); request();
    return { element: root, cleanup() {
      disposed = true; clearTimeout(timeout); clearTimeout(refreshTimer); style.remove();
      window.removeEventListener("message", receive); document.removeEventListener("yt-navigate-finish", onNavigate);
      YTFP.settings.offChange(apply);
    } };
  }
  return { build };
})();
