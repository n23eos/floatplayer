"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Чистые функции без DOM — их покрываем юнит-тестами.
YTFP.utils = (() => {
  /** Ограничивает число диапазоном [min, max]. */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** 125 -> "2:05", 3671 -> "1:01:11". Отрицательные и NaN -> "0:00". */
  function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
      return "0:00";
    }
    const whole = Math.floor(totalSeconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const seconds = whole % 60;
    const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    const ss = String(seconds).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  /**
   * Логика A-B повтора: если заданы обе точки и время вышло за B,
   * возвращает время, куда перемотать (A). Иначе null — мотать не нужно.
   */
  function abLoopTarget(currentTime, pointA, pointB) {
    if (pointA === null || pointB === null) {
      return null;
    }
    if (pointB <= pointA) {
      return null;
    }
    if (currentTime >= pointB || currentTime < pointA) {
      return pointA;
    }
    return null;
  }

  /**
   * Следующая скорость воспроизведения.
   * direction: +1 (быстрее) или -1 (медленнее). Результат в [min, max].
   */
  function nextSpeed(current, step, direction, min, max) {
    // Округляем до шага, чтобы не копились ошибки float (0.30000000004).
    const raw = current + step * direction;
    const snapped = Math.round(raw / step) * step;
    return clamp(Number(snapped.toFixed(2)), min, max);
  }

  return { clamp, formatTime, abLoopTarget, nextSpeed };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.utils;
}
