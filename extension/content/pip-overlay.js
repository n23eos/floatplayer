"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Заглушка на странице вместо уехавшего в PiP-окно плеера: тёмная плашка
// «Играет в мини-окне» с кнопкой возврата. Вынесена из pip-controller,
// чтобы тот не разрастался; логики окна здесь нет.
YTFP.pipOverlay = (() => {
  const STYLES_ID = "ytfp-page-styles";

  function injectStyles() {
    if (document.getElementById(STYLES_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      .ytfp-page-overlay {
        position: absolute; inset: 0; z-index: 100;
        display: flex; align-items: center; justify-content: center;
        background: #0f0f0f; color: #fff; min-height: 200px;
        font-family: "Roboto", Arial, sans-serif; font-size: 15px;
      }
      .ytfp-page-overlay-inner { text-align: center; display: grid; gap: 12px; }
      .ytfp-page-overlay-icon { font-size: 40px; opacity: 0.6; }
      .ytfp-page-overlay-return {
        cursor: pointer; border: 0; border-radius: 18px; padding: 8px 18px;
        background: #f1f1f1; color: #0f0f0f; font-size: 14px; font-weight: 500;
      }
      .ytfp-page-overlay-return:hover { background: #d9d9d9; }
    `;
    document.head.appendChild(style);
  }

  /** Строит заглушку в parent; onReturn — обработчик кнопки возврата. */
  function build(parent, onReturn) {
    injectStyles();
    // Заглушка позиционируется absolute — родитель обязан быть positioned.
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    // Строим DOM без innerHTML: YouTube включает Trusted Types.
    const overlay = document.createElement("div");
    overlay.className = "ytfp-page-overlay";

    const inner = document.createElement("div");
    inner.className = "ytfp-page-overlay-inner";

    const icon = document.createElement("div");
    icon.className = "ytfp-page-overlay-icon";
    icon.textContent = "▶";

    const message = document.createElement("div");
    message.textContent = chrome.i18n.getMessage("overlayPlaying") || "Playing in the floating window";

    const returnButton = document.createElement("button");
    returnButton.className = "ytfp-page-overlay-return";
    returnButton.textContent = chrome.i18n.getMessage("overlayReturn") || "Bring it back";
    returnButton.addEventListener("click", onReturn);

    inner.append(icon, message, returnButton);
    overlay.appendChild(inner);
    parent.appendChild(overlay);
    return overlay;
  }

  return { build };
})();
