"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Мелкие удобства мини-окна, вынесенные из pip-controls (лимит размера файла):
// громкость колесом мыши поверх видео и кнопка «скопировать ссылку с
// таймкодом». Панель окна получает кнопку готовой — тем же способом, что
// chatToggle и navRow.
YTFP.pipExtras = (() => {
  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  // Сетка 24x24, fill: currentColor — как у иконок панели окна.
  const ICONS = {
    link:
      "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4" +
      "v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 " +
      "3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
    check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    cross: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
  };

  function createIcon(doc, name) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  // --- Громкость колесом мыши ------------------------------------------------

  // Шаг совпадает со стрелками вверх/вниз в окне: один тракт — одна логика.
  const WHEEL_STEP_PERCENT = 10;
  const TOAST_HIDE_DELAY_MS = 700;

  /**
   * Колесо поверх видео меняет громкость (audio-boost, 0–300%) и показывает
   * тост «N%». Возвращает { cleanup }.
   * onChange(percent) — синхронизация ползунка громкости в панели.
   */
  function attachWheelVolume(pipDocument, { getVideo, onChange }) {
    const toast = pipDocument.createElement("div");
    toast.className = "ytfp-wheel-volume";
    pipDocument.body.appendChild(toast);
    let hideTimer = null;

    function showToast(percent) {
      toast.textContent = `${percent}%`;
      toast.classList.add("ytfp-wheel-volume--visible");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        toast.classList.remove("ytfp-wheel-volume--visible");
      }, TOAST_HIDE_DELAY_MS);
    }

    function onWheel(event) {
      // Ctrl+колесо — зум-жест трекпада, не громкость.
      if (event.ctrlKey || event.deltaY === 0) {
        return;
      }
      // Скроллируемые панели (чат, рекомендации) и органы управления
      // оставляем колесу как есть.
      if (
        event.target &&
        event.target.closest &&
        event.target.closest(".ytfp-chat-panel, .ytfp-related-panel, input, select")
      ) {
        return;
      }
      const delta = event.deltaY < 0 ? WHEEL_STEP_PERCENT : -WHEEL_STEP_PERCENT;
      const ok = YTFP.audioBoost.setBoostPercent(
        getVideo(),
        YTFP.audioBoost.getBoostPercent() + delta
      );
      if (!ok) {
        return;
      }
      event.preventDefault();
      const applied = YTFP.audioBoost.getBoostPercent();
      showToast(applied);
      if (onChange) {
        onChange(applied);
      }
    }

    // passive: false — нам нужен preventDefault, чтобы жест не ушёл странице.
    pipDocument.addEventListener("wheel", onWheel, { passive: false });

    function cleanup() {
      clearTimeout(hideTimer);
      pipDocument.removeEventListener("wheel", onWheel);
    }

    return { cleanup };
  }

  // --- Кнопка «скопировать ссылку с таймкодом» -------------------------------

  const COPY_FEEDBACK_MS = 1000;

  /** Кнопка для панели окна: копирует youtu.be-ссылку на текущий момент. */
  function buildCopyLinkButton(pipDocument, { getVideo, isShorts }) {
    const button = pipDocument.createElement("button");
    button.className = "ytfp-btn";
    YTFP.tooltips.attach(button, t("copyLinkTooltip", "Copy link at current time"));
    button.appendChild(createIcon(pipDocument, "link"));

    let feedbackTimer = null;
    function flashFeedback(iconName) {
      button.replaceChildren(createIcon(pipDocument, iconName));
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        button.replaceChildren(createIcon(pipDocument, "link"));
      }, COPY_FEEDBACK_MS);
    }

    button.addEventListener("click", () => {
      const video = getVideo();
      const url = YTFP.utils.timecodeUrl(
        YTFP.playerApi.getVideoId(),
        video ? video.currentTime : 0,
        { isShorts, isLive: YTFP.playerApi.isLive() }
      );
      if (!url) {
        flashFeedback("cross");
        return;
      }
      // Клипборд окна PiP: same-origin, есть активация от клика.
      const clipboard = pipDocument.defaultView.navigator.clipboard;
      clipboard.writeText(url).then(
        () => flashFeedback("check"),
        () => flashFeedback("cross")
      );
    });

    return button;
  }

  return { attachWheelVolume, buildCopyLinkButton };
})();
