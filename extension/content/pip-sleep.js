"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.pipSleep = (() => {
  function build(doc) {
    const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    const win = doc.defaultView;
    const root = doc.createElement("div"); root.className = "ytfp-sleep";
    const button = doc.createElement("button"); button.type = "button";
    button.className = "ytfp-btn ytfp-sleep-toggle";
    button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-haspopup", "dialog");
    const icon = YTFP.ui.icon(doc, "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3h2v4.6l3.2 1.9-1 1.7-4.2-2.5z", 16);
    const countdown = doc.createElement("span"); countdown.className = "ytfp-sleep-countdown";
    button.append(icon, countdown); root.append(button);

    // Keep the popup outside the pinned row, whose overflow can clip controls.
    const panel = doc.createElement("div"); panel.className = "ytfp-sleep-panel";
    panel.dataset.ytfpToolPopover = "sleep"; panel.hidden = true; panel.setAttribute("role", "dialog");
    const title = t("toolSleep", "Sleep timer"); panel.setAttribute("aria-label", title);
    const header = doc.createElement("div"); header.className = "ytfp-tool-popover-head";
    const heading = doc.createElement("span"); heading.textContent = title;
    const done = doc.createElement("button"); done.type = "button"; done.className = "ytfp-btn";
    done.textContent = "×"; done.setAttribute("aria-label", t("menuDone", "Done")); header.append(heading, done);
    const select = doc.createElement("select"); select.className = "ytfp-select";
    select.setAttribute("aria-label", title);
    for (const [value, label] of [["0", t("sleepOff", "off")], ...[15,30,45,60,90].map(n => [String(n), n + " " + t("sleepMinutes", "min")]), ["end", t("sleepEnd", "End of video")], ["custom", t("sleepCustom", "custom…")]]) {
      const option = doc.createElement("option"); option.value = value; option.textContent = label; select.append(option);
    }
    const activeOption = doc.createElement("option"); activeOption.value = "active";
    activeOption.textContent = t("sleepRunning", "Running"); activeOption.hidden = true; select.append(activeOption);
    const custom = doc.createElement("form"); custom.className = "ytfp-sleep-custom"; custom.hidden = true;
    const input = doc.createElement("input"); input.type = "number"; input.min = "1"; input.max = "720";
    input.step = "1"; input.required = true; input.value = "30";
    input.className = "ytfp-sleep-input"; input.setAttribute("aria-label", t("sleepMinutes", "Minutes"));
    const start = doc.createElement("button"); start.type = "submit"; start.className = "ytfp-btn";
    start.textContent = t("sleepStart", "Start"); custom.append(input, start);
    const actions = doc.createElement("div"); actions.className = "ytfp-sleep-actions";
    const extend = doc.createElement("button"); extend.type = "button"; extend.className = "ytfp-btn";
    extend.textContent = "+10 " + t("sleepMinutes", "min");
    extend.setAttribute("aria-label", t("sleepExtend", "Add 10 minutes"));
    const stop = doc.createElement("button"); stop.type = "button"; stop.className = "ytfp-btn";
    stop.textContent = t("sleepCancel", "Cancel timer");
    actions.append(extend, stop); panel.append(header, select, custom, actions); doc.body.append(panel);

    let peek = null, sleeping = false, consumeClick = false;
    function position() {
      if (panel.hidden) return;
      const rect = button.getBoundingClientRect();
      const width = win.innerWidth || doc.documentElement.clientWidth;
      const height = win.innerHeight || doc.documentElement.clientHeight;
      panel.style.left = Math.max(8, Math.min(rect.right - panel.offsetWidth, width - panel.offsetWidth - 8)) + "px";
      const above = rect.top - panel.offsetHeight - 8;
      panel.style.top = Math.max(8, Math.min(above >= 8 ? above : rect.bottom + 8, height - panel.offsetHeight - 8)) + "px";
    }
    function close(restoreFocus = false) {
      const focusedInside = panel.contains(doc.activeElement);
      panel.hidden = true; button.setAttribute("aria-expanded", "false");
      if (restoreFocus && button.isConnected && !button.closest('[hidden]') && !doc.body.classList.contains('ytfp-ui-hidden')) {
        button.focus({ preventScroll: true });
      } else if (focusedInside) doc.activeElement.blur();
    }
    function refresh(state) {
      const active = state.mode !== "off";
      if (sleeping !== active) {
        sleeping = active; doc.body.classList.toggle("ytfp-sleeping", active);
        if (!active) { clearTimeout(peek); doc.body.classList.remove("ytfp-peek"); }
      }
      const text = state.mode === "time" ? YTFP.utils.formatTime(state.remaining)
        : state.mode === "end" ? t("sleepEndShort", "End") : t("sleepOff", "off");
      if (countdown.textContent !== text) countdown.textContent = text;
      button.classList.toggle("ytfp-btn--active", active); button.dataset.active = String(active);
      const label = title + ": " + (state.mode === "end" ? t("sleepEnd", "End of video") : text);
      button.setAttribute("aria-label", label); button.title = label;
      // Do not interrupt a custom duration while the active timer ticks.
      if (custom.hidden) select.value = state.mode === "time" ? "active" : state.mode === "end" ? "end" : "0";
      activeOption.hidden = state.mode !== "time";
      select.querySelector('[value="end"]').disabled = YTFP.playerApi.isLive();
      actions.hidden = !active; extend.hidden = state.mode !== "time";
    }
    button.onclick = () => {
      if (!panel.hidden) { close(true); return; }
      custom.hidden = true; refresh(YTFP.sleepTimer.get());
      panel.hidden = false; button.setAttribute("aria-expanded", "true");
      position(); select.focus({ preventScroll: true });
    };
    done.onclick = () => close(true);
    select.onchange = () => {
      if (select.value === "active") return;
      custom.hidden = select.value !== "custom";
      if (!custom.hidden) { position(); input.focus({ preventScroll: true }); input.select(); return; }
      if (select.value === "0") YTFP.sleepTimer.stop();
      else YTFP.sleepTimer.start(select.value === "end" ? "end" : Number(select.value));
      close(true);
    };
    custom.onsubmit = event => {
      event.preventDefault();
      if (!input.validity.valid) { input.reportValidity(); return; }
      custom.hidden = true; YTFP.sleepTimer.start(Number(input.value)); close(true);
    };
    extend.onclick = () => { YTFP.sleepTimer.extend(); close(true); };
    stop.onclick = () => { custom.hidden = true; YTFP.sleepTimer.stop(); close(true); };
    function keydown(event) {
      if (panel.hidden || event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation(); close(true);
    }
    function outside(event) {
      const isOutside = !root.contains(event.target) && !panel.contains(event.target);
      if (event.type === "pointerdown") consumeClick = !panel.hidden && isOutside;
      if ((!panel.hidden && isOutside) || (event.type === "click" && consumeClick)) {
        close(); event.preventDefault(); event.stopImmediatePropagation();
        if (event.type === "click") consumeClick = false;
      }
    }
    const reveal = () => {
      if (!sleeping) return;
      doc.body.classList.add("ytfp-peek"); clearTimeout(peek);
      peek = setTimeout(() => doc.body.classList.remove("ytfp-peek"), 3000);
    };
    const moved = () => close();
    doc.addEventListener("ytfp-dismiss-tool-popovers", moved);
    doc.addEventListener("mousemove", reveal); doc.addEventListener("focusin", reveal);
    doc.addEventListener("keydown", keydown, true); root.addEventListener("ytfp-tool-moved", moved);
    win.addEventListener("pointerdown", outside, true); win.addEventListener("click", outside, true);
    win.addEventListener("resize", position);
    YTFP.sleepTimer.onChange(refresh); refresh(YTFP.sleepTimer.get());
    return { element: root, cleanup() {
      YTFP.sleepTimer.offChange(refresh); clearTimeout(peek); panel.remove();
      doc.body.classList.remove("ytfp-sleeping", "ytfp-peek");
      doc.removeEventListener("mousemove", reveal); doc.removeEventListener("focusin", reveal);
      doc.removeEventListener("keydown", keydown, true); root.removeEventListener("ytfp-tool-moved", moved);
      doc.removeEventListener("ytfp-dismiss-tool-popovers", moved);
      win.removeEventListener("pointerdown", outside, true); win.removeEventListener("click", outside, true);
      win.removeEventListener("resize", position);
    } };
  }
  return { build };
})();
