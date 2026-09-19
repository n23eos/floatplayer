"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.pipMenu = (() => {
  function build(doc, tools, { host = doc.body, pinKey = "pinnedTools" } = {}) {
    const element = doc.createElement("details"); element.className = "ytfp-more";
    const summary = doc.createElement("summary"); summary.className = "ytfp-btn";
    summary.textContent = "•••";
    summary.setAttribute("aria-label", chrome.i18n.getMessage("moreTools") || "More");
    summary.title = summary.getAttribute("aria-label");
    const panel = doc.createElement("div"); panel.className = "ytfp-more-panel ytfp-surface-menu ytfp-surface";
    const pins = doc.createElement("div"); pins.className = "ytfp-pinned-tools";
    const rows = [];
    const groups = [
      ["menuPlayback", "Playback", ["playback", "ab", "loop", "autoplay", "sleep"]],
      ["menuView", "Appearance", ["night", "captions", "size", "position"]],
      ["menuVideo", "Video", ["history", "comments", "copy", "profile"]]
    ];
    const grouped = new Set(groups.flatMap(group => group[2]));
    const ordered = groups.flatMap(([key, fallback, ids]) => {
      const entries = ids.flatMap(id => tools.filter(tool => tool[0] === id && tool[3]));
      return entries.length ? [{ heading: chrome.i18n.getMessage(key) || fallback }, ...entries] : [];
    }).concat(tools.filter(tool => !grouped.has(tool[0])));
    for (const tool of ordered) {
      if (tool.heading) {
        const heading = doc.createElement("h3"); heading.className = "ytfp-menu-group";
        heading.textContent = tool.heading; panel.append(heading); continue;
      }
      const [id, key, fallback, control, pinnable = true] = tool;
      if (!control) continue;
      const row = doc.createElement("div"); row.className = "ytfp-tool-row";
      if (["ab", "loop", "autoplay", "copy", "night", "sleep", "history", "position"].includes(id)) row.classList.add("ytfp-tool-row--compact");
      const title = doc.createElement("span"); title.className = "ytfp-tool-title";
      title.textContent = chrome.i18n.getMessage(key) || fallback;
      const slot = doc.createElement("div"); slot.className = "ytfp-tool-slot";
      const pin = doc.createElement("input"); pin.type = "checkbox";
      pin.setAttribute("aria-label", `${chrome.i18n.getMessage("pinTool") || "Pin"}: ${title.textContent}`);
      pin.title = pin.getAttribute("aria-label");
      pin.hidden = !pinnable;
      pin.onchange = async () => {
        const current = YTFP.settings.get()[pinKey].filter(item => item !== id);
        if (pin.checked) current.push(id);
        try { await chrome.storage.sync.set({ [pinKey]: current }); }
        catch { pin.checked = !pin.checked; }
      };
      slot.append(control); row.append(title, pin, slot); panel.append(row);
      rows.push({ id, control, slot, pin, pinnable });
    }
    const close = doc.createElement("button"); close.className = "ytfp-btn";
    close.textContent = chrome.i18n.getMessage("menuDone") || "Done";
    close.onclick = () => { element.open = false; summary.focus(); };
    const header = doc.createElement("div"); header.className = "ytfp-menu-head";
    const pinLabel = doc.createElement("span"); pinLabel.className = "ytfp-menu-pin-label";
    pinLabel.textContent = chrome.i18n.getMessage("menuPinColumn") || "Pin to panel";
    header.append(close, pinLabel); panel.prepend(header);
    panel.hidden = true;
    host.append(panel);
    element.append(summary);
    element.addEventListener("toggle", () => { panel.hidden = !element.open; });
    function apply(settings) {
      for (const row of rows) {
        const pinned = row.pinnable && settings[pinKey].includes(row.id);
        row.pin.checked = pinned;
        const parent = pinned ? pins : row.slot;
        if (row.control.parentElement !== parent) {
          parent.append(row.control);
          row.control.dispatchEvent(new doc.defaultView.Event("ytfp-tool-moved"));
        }
        row.slot.hidden = pinned;
      }
      pins.hidden = pins.childElementCount === 0;
    }
    function keydown(event) { if (event.key === "Escape" && element.open) { event.stopPropagation(); element.open = false; summary.focus(); } }
    let consumeClick = false;
    const win = doc.defaultView;
    function outside(event) {
      const isOutside = !element.contains(event.target) && !panel.contains(event.target) && !event.target.closest?.('[data-ytfp-tool-popover]');
      if (event.type === "pointerdown") consumeClick = element.open && isOutside;
      if ((element.open && isOutside) || (event.type === "click" && consumeClick)) {
        element.open = false;
        panel.hidden = true;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "click") consumeClick = false;
      }
    }
    doc.addEventListener("keydown", keydown);
    // Window capture precedes both our navigation and YouTube's player handlers.
    win.addEventListener("pointerdown", outside, true);
    win.addEventListener("click", outside, true);
    YTFP.settings.onChange(apply); apply(YTFP.settings.get());
    return { element, pins, cleanup() { YTFP.settings.offChange(apply); win.removeEventListener("pointerdown", outside, true); win.removeEventListener("click", outside, true); doc.removeEventListener("keydown", keydown); panel.remove(); } };
  }
  return { build };
})();
