"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// История Shorts уже хранится в localRecords. Этот модуль только показывает
// записи в действующем меню PiP и возвращает к ролику через shortsRuntime.
YTFP.pipHistory = (() => {
  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function build(doc, { host = doc.body, onOpen, onClose } = {}) {
    const trigger = doc.createElement("button");
    trigger.type = "button";
    trigger.className = "ytfp-btn ytfp-history-trigger";
    trigger.textContent = t("historyOpen", "Open history");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");

    const panel = doc.createElement("div");
    panel.id = "ytfp-history-panel";
    panel.className = "ytfp-history-panel ytfp-surface";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("historyDialogLabel", "Shorts history"));
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("data-ytfp-tool-popover", "");
    panel.setAttribute("data-ytfp-menu-owner", "history");
    panel.hidden = true;
    trigger.setAttribute("aria-controls", panel.id);

    const header = doc.createElement("div");
    header.className = "ytfp-history-header";
    const title = doc.createElement("strong");
    title.textContent = t("historyDialogLabel", "Shorts history");
    const closeButton = doc.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ytfp-btn ytfp-history-close";
    closeButton.textContent = "x";
    closeButton.setAttribute("aria-label", t("historyClose", "Close history"));
    header.append(title, closeButton);

    const status = doc.createElement("div");
    status.className = "ytfp-history-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const list = doc.createElement("div");
    list.className = "ytfp-history-list";
    panel.append(header, status, list);
    host.append(panel);

    let disposed = false;
    let generation = 0;

    function setStatus(message, retry) {
      status.replaceChildren();
      if (message) {
        const text = doc.createElement("span");
        text.textContent = message;
        status.append(text);
      }
      if (retry) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "ytfp-btn ytfp-history-retry";
        button.textContent = t("historyRetry", "Retry");
        button.addEventListener("click", retry);
        status.append(button);
      }
    }

    function close({ restoreFocus = false } = {}) {
      if (panel.hidden) return;
      const focusedInside = panel.contains(doc.activeElement);
      generation += 1;
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && trigger.isConnected && !trigger.closest('[hidden]') && !doc.body.classList.contains('ytfp-ui-hidden')) trigger.focus({ preventScroll: true });
      else if (focusedInside) doc.activeElement.blur();
      onClose?.();
    }

    async function visit(item, button) {
      const ticket = ++generation;
      button.disabled = true;
      setStatus(t("historyOpening", "Opening video..."));
      try {
        const opened = await YTFP.shortsRuntime.revisit(item.id);
        if (disposed || ticket !== generation) return;
        if (opened) {
          close();
          return;
        }
        setStatus(
          t("shortsNavigationError", "Could not switch video. Try again."),
          () => visit(item, button)
        );
      } catch {
        if (!disposed && ticket === generation) {
          setStatus(
            t("shortsNavigationError", "Could not switch video. Try again."),
            () => visit(item, button)
          );
        }
      } finally {
        if (!disposed && ticket === generation) button.disabled = false;
      }
    }

    async function render() {
      const ticket = ++generation;
      list.replaceChildren();
      setStatus(t("historyLoading", "Loading history..."));
      try {
        const items = YTFP.settings.get().shortsHistory
          ? await YTFP.localRecords.visits()
          : [];
        if (disposed || ticket !== generation || panel.hidden) return;
        setStatus("");
        if (!items.length) {
          setStatus(t("historyEmpty", "History is empty or disabled"));
          return;
        }
        for (const item of items) {
          const button = doc.createElement("button");
          button.type = "button";
          button.className = "ytfp-history-item";
          const time = new Date(item.at).toLocaleTimeString(
            chrome.i18n.getUILanguage(),
            { hour: "2-digit", minute: "2-digit" }
          );
          button.textContent = `${item.title || item.id} · ${time}`;
          button.addEventListener("click", () => visit(item, button));
          list.append(button);
        }
      } catch {
        if (!disposed && ticket === generation && !panel.hidden) {
          setStatus(
            t("historyLoadError", "Could not load local data"),
            render
          );
        }
      }
    }

    function open() {
      if (disposed || !panel.hidden) return;
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      onOpen?.();
      render();
      closeButton.focus({ preventScroll: true });
    }

    function toggle() {
      if (panel.hidden) open();
      else close({ restoreFocus: true });
    }

    function onPointerDown(event) {
      const target = event.target;
      const isNode = target instanceof win.Node;
      if (!panel.hidden && (!isNode || (!panel.contains(target) && !trigger.contains(target)))) {
        close();
      }
    }

    function onKeyDown(event) {
      if (event.key !== "Escape" || panel.hidden) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close({ restoreFocus: true });
    }

    trigger.addEventListener("click", toggle);
    closeButton.addEventListener("click", () => close({ restoreFocus: true }));
    const win = doc.defaultView;
    win.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);
    const dismiss = () => close();
    doc.addEventListener("ytfp-dismiss-tool-popovers", dismiss);

    function cleanup() {
      disposed = true;
      generation += 1;
      trigger.removeEventListener("click", toggle);
      win.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("ytfp-dismiss-tool-popovers", dismiss);
      panel.remove();
    }

    return { element: trigger, panel, open, close, cleanup };
  }

  return { build };
})();
