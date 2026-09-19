"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.pipSearch = (() => {
  function build(doc) {
    const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    const element = doc.createElement("div"); element.className = "ytfp-search-controls";
    const button = doc.createElement("button"); button.className = "ytfp-btn"; button.textContent = t("shortsSearchButton", "Search");
    const form = doc.createElement("form"); form.hidden = true;
    const input = doc.createElement("input"); input.type = "search"; input.placeholder = t("shortsSearchPlaceholder", "Search shorts…");
    input.setAttribute("aria-label", input.placeholder);
    const submit = doc.createElement("button"); submit.className = "ytfp-btn"; submit.textContent = "↵"; submit.type = "submit";
    submit.setAttribute("aria-label", t("searchSubmit", "Search"));
    const cancel = doc.createElement("button"); cancel.className = "ytfp-btn"; cancel.textContent = "×"; cancel.type = "button";
    cancel.setAttribute("aria-label", t("searchCancel", "Cancel search"));
    const status = doc.createElement("span"); status.setAttribute("role", "status");
    form.append(input, submit, cancel); element.append(button, form, status);
    let generation = 0, disposed = false;
    function close({ restoreFocus = true } = {}) { generation++; YTFP.shortsSearch.stop(); form.hidden = true; input.value = ""; status.textContent = ""; button.classList.remove("ytfp-btn--active"); if (restoreFocus && button.isConnected) button.focus(); }
    button.onclick = () => { if (!form.hidden || YTFP.shortsSearch.isActive()) close(); else { form.hidden = false; input.focus(); } };
    cancel.onclick = close;
    form.onkeydown = event => { event.stopPropagation(); if (event.key === "Escape") close(); };
    form.onsubmit = async event => {
      event.preventDefault();
      const current = ++generation;
      status.textContent = t("searchLoading", "Searching…");
      const result = await YTFP.shortsSearch.search(input.value);
      if (disposed || current !== generation || result.cancelled) return;
      if (result.count) { form.hidden = true; button.classList.add("ytfp-btn--active"); update(YTFP.shortsSearch.getState()); }
      else status.textContent = result.ok ? t("searchEmpty", "No shorts found") : t("searchError", "Search failed. Try again.");
    };
    function update(state) { if (state.count) status.textContent = `${state.index} / ${state.count}`; }
    YTFP.shortsSearch.onChange(update);
    return { element, cleanup() { disposed = true; generation++; YTFP.shortsSearch.stop(); YTFP.shortsSearch.offChange(update); } };
  }
  return { build };
})();
