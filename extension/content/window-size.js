"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.windowSize = (() => {
  function resize(pipWindow, video, preset) {
    if (!video || !video.videoWidth || !video.videoHeight) return false;
    const aspect = video.videoWidth / video.videoHeight;
    const widths = aspect < 1 ? { small: 280, medium: 360, large: 480 } : { small: 480, medium: 720, large: 960 };
    const width = widths[preset] || pipWindow.innerWidth;
    const maxHeight = Math.max(180, (pipWindow.screen?.availHeight || 1080) - 100);
    const height = Math.min(Math.round(width / aspect), maxHeight);
    try {
      pipWindow.resizeTo(Math.round(height * aspect) + pipWindow.outerWidth - pipWindow.innerWidth,
        height + pipWindow.outerHeight - pipWindow.innerHeight);
      return true;
    } catch { return false; }
  }
  function build(doc, getVideo) {
    const root = doc.createElement("div");
    root.className = "ytfp-size-controls";
    for (const [id, key, fallback] of [["small", "sizeSmall", "Small"], ["medium", "sizeMedium", "Medium"], ["large", "sizeLarge", "Large"], ["fit", "sizeFit", "Fit video"]]) {
      const button = doc.createElement("button");
      button.className = "ytfp-btn";
      button.textContent = chrome.i18n.getMessage(key) || fallback;
      button.onclick = () => {
        const ok = resize(doc.defaultView, getVideo(), id);
        status.textContent = ok ? "" : (chrome.i18n.getMessage("sizeUnavailable") || "Resize unavailable");
      };
      root.append(button);
    }
    const status = doc.createElement("span");
    status.setAttribute("role", "status"); root.append(status);
    return root;
  }
  return { build, resize };
})();
