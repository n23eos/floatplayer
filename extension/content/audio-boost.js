"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Усиление громкости выше 100% через Web Audio API (GainNode).
// Граф создаётся лениво при первом использовании и живёт до конца страницы:
// createMediaElementSource нельзя "отцепить" от <video>.
YTFP.audioBoost = (() => {
  let context = null;
  let gainNode = null;
  let connectedVideo = null;

  function ensureGraph(video) {
    if (connectedVideo === video && gainNode) {
      return true;
    }
    if (connectedVideo && connectedVideo !== video) {
      // Другой <video> подключить нельзя — источник привязан навсегда.
      // На YouTube элемент один и переживает навигацию, так что это не проблема.
      return false;
    }
    try {
      context = new AudioContext();
      const source = context.createMediaElementSource(video);
      gainNode = context.createGain();
      source.connect(gainNode);
      gainNode.connect(context.destination);
      connectedVideo = video;
      return true;
    } catch (error) {
      console.warn("[YTFP] Audio boost unavailable:", error);
      context = null;
      gainNode = null;
      return false;
    }
  }

  /**
   * Устанавливает усиление в процентах (100 = без усиления).
   * Возвращает true при успехе.
   */
  function setBoostPercent(video, percent) {
    if (!video) {
      return false;
    }
    const max = YTFP.settings.get().volumeBoostMax;
    const clamped = YTFP.utils.clamp(percent, 100, max);
    if (clamped === 100 && !gainNode) {
      // Усиление не требуется и граф ещё не создан — не трогаем аудио-путь.
      return true;
    }
    if (!ensureGraph(video)) {
      return false;
    }
    // AudioContext стартует в suspended до жеста пользователя — возобновляем.
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
    gainNode.gain.value = clamped / 100;
    return true;
  }

  function getBoostPercent() {
    return gainNode ? Math.round(gainNode.gain.value * 100) : 100;
  }

  return { setBoostPercent, getBoostPercent };
})();
