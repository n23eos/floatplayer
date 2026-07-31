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

  /**
   * Границы ползунка скорости, выровненные по шагу.
   *
   * У <input type="range"> допустимые значения считаются от min: при min
   * 0.25 и шаге 0.1 сетка идёт 0.25, 0.35 … 1.05, и ровной единицы в ней
   * нет — браузер молча подменяет 1x на 1.05x. Двигаем границы внутрь к
   * ближайшим кратным шага, чтобы сетка совпала с той, по которой ходят
   * хоткеи (nextSpeed округляет к кратным шага), а 1x всегда был достижим.
   */
  function speedSliderRange(min, max, step) {
    if (!Number.isFinite(step) || step <= 0) {
      return { min, max };
    }
    // toFixed: 3 * 0.1 в двоичной арифметике даёт 0.30000000000000004.
    const round = (value) => Number(value.toFixed(4));
    return {
      min: round(Math.ceil(min / step) * step),
      max: round(Math.floor(max / step) * step)
    };
  }

  /**
   * Нормализует сырые пары [start, end] (сек) из API SponsorBlock:
   * отбрасывает мусор, сортирует, склеивает пересекающиеся сегменты.
   * Возвращает [{ start, end }].
   */
  function normalizeSegments(rawPairs) {
    const MERGE_GAP_SECONDS = 0.5;
    const valid = (rawPairs || [])
      .filter(
        (pair) =>
          Array.isArray(pair) &&
          Number.isFinite(pair[0]) &&
          Number.isFinite(pair[1]) &&
          pair[1] > pair[0] &&
          pair[0] >= 0
      )
      .map((pair) => ({ start: pair[0], end: pair[1] }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const segment of valid) {
      const last = merged[merged.length - 1];
      if (last && segment.start <= last.end + MERGE_GAP_SECONDS) {
        // Пересечение или стык — расширяем предыдущий (новым объектом).
        merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, segment.end) };
      } else {
        merged.push(segment);
      }
    }
    return merged;
  }

  /**
   * Если время попадает внутрь сегмента — возвращает его конец, иначе null.
   * Небольшой отступ от конца, чтобы не зациклиться на границе.
   */
  function segmentEndAt(time, segments) {
    const END_MARGIN_SECONDS = 0.1;
    for (const segment of segments) {
      if (time >= segment.start && time < segment.end - END_MARGIN_SECONDS) {
        return segment.end;
      }
    }
    return null;
  }

  /**
   * Время для хоткея-цифры (как у YouTube): 0 — начало, 5 — середина, 9 — 90%.
   * Некорректная длительность или цифра вне 0–9 -> null.
   */
  function digitSeekTime(duration, digit) {
    if (!Number.isFinite(duration) || duration <= 0) {
      return null;
    }
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
      return null;
    }
    return (duration * digit) / 10;
  }

  /**
   * Разбирает подпись времени YouTube в секунды: "0:00" -> 0, "1:05" -> 65,
   * "1:02:03" -> 3723. Мусор или отрицательные части -> null.
   */
  function parseTimeLabel(label) {
    if (typeof label !== "string") {
      return null;
    }
    const parts = label.trim().split(":");
    if (parts.length < 2 || parts.length > 3) {
      return null;
    }
    let seconds = 0;
    for (const part of parts) {
      if (!/^\d+$/.test(part.trim())) {
        return null;
      }
      seconds = seconds * 60 + Number(part);
    }
    return seconds;
  }

  /**
   * Доли начала глав из ширин секций нативного таймлайна YouTube
   * (.ytp-chapters-container: у каждой главы своя секция).
   * [300, 100, 100] -> [0, 0.6, 0.8]. Меньше двух глав или мусор -> [].
   */
  function chapterFractionsFromWidths(widths) {
    const valid = (widths || []).filter((w) => Number.isFinite(w) && w > 0);
    if (valid.length < 2) {
      return []; // одна секция — глав нет, насечки не нужны
    }
    const total = valid.reduce((sum, w) => sum + w, 0);
    const fractions = [];
    let acc = 0;
    for (const width of valid) {
      fractions.push(acc / total);
      acc += width;
    }
    return fractions;
  }

  /**
   * Название видео из заголовка вкладки YouTube: срезает счётчик уведомлений
   * в начале и " - YouTube" в конце. "(3) Кино - YouTube" -> "Кино".
   * Не watch-страница или мусор -> строка как есть (без счётчика).
   */
  function videoTitleFromPageTitle(pageTitle) {
    if (typeof pageTitle !== "string") {
      return "";
    }
    const SUFFIX = " - YouTube";
    const withoutCounter = pageTitle.replace(/^\(\d+\)\s*/, "").trim();
    return withoutCounter.endsWith(SUFFIX)
      ? withoutCounter.slice(0, -SUFFIX.length)
      : withoutCounter;
  }

  /**
   * На сколько секунд отстаём от края прямого эфира. Отрицательную разницу
   * гасим в 0: край растёт между замерами, и currentTime может его обогнать.
   * Некорректные значения -> null.
   */
  function behindLiveSeconds(liveEdge, currentTime) {
    if (!Number.isFinite(liveEdge) || !Number.isFinite(currentTime)) {
      return null;
    }
    return Math.max(0, liveEdge - currentTime);
  }

  /**
   * Доля позиции внутри окна [start, end] — для полоски прогресса.
   * У обычного видео окно начинается в нуле, у DVR-стрима — нет.
   * Вырожденное окно или мусор -> null.
   */
  function windowFraction(time, start, end) {
    if (!Number.isFinite(time) || !Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }
    const width = end - start;
    if (width <= 0) {
      return null;
    }
    return clamp((time - start) / width, 0, 1);
  }

  return {
    clamp, formatTime, abLoopTarget, nextSpeed, speedSliderRange,
    normalizeSegments, segmentEndAt,
    digitSeekTime, chapterFractionsFromWidths, parseTimeLabel,
    videoTitleFromPageTitle, behindLiveSeconds, windowFraction
  };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.utils;
}
