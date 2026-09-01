"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Усиление громкости выше 100% через Web Audio API.
// Граф: source -> gain -> выход. В нейтральном состоянии (100%) граф не
// создаётся вовсе — аудио-путь YouTube не трогаем.
// Граф создаётся лениво при первом использовании и живёт до конца страницы:
// createMediaElementSource нельзя "отцепить" от <video> и нельзя создать
// второй раз для того же элемента. Поэтому контекст живёт в мире страницы,
// даже когда <video> перенесён в PiP-окно, — Chrome сохраняет маршрутизацию
// звука (один процесс/агент-кластер); при сбое setBoostPercent вернёт false
// и UI покажет «н/д».
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
      // Контекст мог успеть создаться до сбоя (падает обычно
      // createMediaElementSource). Без close() каждая новая попытка
      // оставляла бы ещё один живой AudioContext, а их число на документ
      // ограничено — дальше не создавался бы уже ни один.
      if (context) {
        context.close().catch(() => {});
      }
      context = null;
      gainNode = null;
      return false;
    }
  }

  function resumeContext() {
    // AudioContext стартует в suspended до жеста пользователя — возобновляем.
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  /**
   * Устанавливает громкость в процентах: 0 — тишина, 100 — как у YouTube,
   * выше 100 — усиление (до volumeBoostMax). Возвращает true при успехе.
   */
  function setBoostPercent(video, percent) {
    if (!video) {
      return false;
    }
    const max = YTFP.settings.get().volumeBoostMax;
    const clamped = YTFP.utils.clamp(percent, 0, max);
    if (clamped === 100 && !gainNode) {
      // Значение нейтральное и граф ещё не создан — не трогаем аудио-путь.
      return true;
    }
    if (!ensureGraph(video)) {
      return false;
    }
    resumeContext();
    gainNode.gain.value = clamped / 100;
    return true;
  }

  function getBoostPercent() {
    return gainNode ? Math.round(gainNode.gain.value * 100) : 100;
  }

  return { setBoostPercent, getBoostPercent };
})();
