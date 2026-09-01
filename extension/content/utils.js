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

  // Насколько отступаем от края эфира, возвращаясь в онлайн. Ровно в край
  // прыгать нельзя: этих секунд ещё нет ни в буфере, ни на сервере, плеер
  // после такой перемотки ждёт сегмент, которого не будет, и встаёт совсем.
  // Пять секунд меньше допуска isAtLiveEdge, поэтому кнопка всё равно
  // загорается «LIVE».
  const LIVE_RESUME_BACKOFF_SECONDS = 5;

  /**
   * Куда перематывать по кнопке «в эфир»: чуть позади края DVR-окна
   * [start, end]. Окно короче отступа — прыгаем в его начало.
   * Вырожденное окно или мусор -> null.
   */
  function liveResumeTarget(start, end) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }
    return Math.max(start, end - LIVE_RESUME_BACKOFF_SECONDS);
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

  // Пресеты для клика по метке скорости. Промежуточная скорость (например,
  // 1.25 с ползунка) уходит к следующему пресету сверху; выше последнего —
  // возврат к 1x.
  const SPEED_PRESETS = [1, 1.5, 2];

  /** Следующая скорость по кругу пресетов. Мусор на входе -> 1. */
  function cycleSpeedPreset(rate) {
    if (!Number.isFinite(rate)) {
      return SPEED_PRESETS[0];
    }
    const next = SPEED_PRESETS.find((preset) => preset > rate);
    return next === undefined ? SPEED_PRESETS[0] : next;
  }

  /**
   * Ссылка на видео с таймкодом текущего момента.
   * Шортс — ссылка на шортс (таймкоды там не работают), прямой эфир — без
   * ?t (у эфира время не адресуемо). Без id ссылки не бывает -> null.
   */
  function timecodeUrl(videoId, seconds, { isShorts, isLive } = {}) {
    if (!videoId) {
      return null;
    }
    if (isShorts) {
      return `https://www.youtube.com/shorts/${videoId}`;
    }
    const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const suffix = !isLive && wholeSeconds > 0 ? `?t=${wholeSeconds}` : "";
    return `https://youtu.be/${videoId}${suffix}`;
  }

  // Масштаб капсульных панелей в процентах: 100% — прежний компактный
  // размер, 135% — прежний крупный (и дефолт), 200% — потолок для тач-экранов.
  const PANEL_SCALE_MIN = 100;
  const PANEL_SCALE_MAX = 200;
  const PANEL_SCALE_DEFAULT = 135;

  /** Масштаб панели из настроек в целые проценты [100, 200]. Мусор -> 135. */
  function normalizePanelScale(value) {
    // Отдельной проверкой: Number(null) и Number("") дают 0, а не NaN, и
    // пустая настройка молча превратилась бы в минимальный масштаб.
    const isEmpty =
      (typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value.trim() === "");
    if (isEmpty) {
      return PANEL_SCALE_DEFAULT;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return PANEL_SCALE_DEFAULT;
    }
    return clamp(Math.round(number), PANEL_SCALE_MIN, PANEL_SCALE_MAX);
  }

  /**
   * Старая настройка panelSize ("large" | "small") в проценты — для тех, у
   * кого в хранилище лежит ещё она. Компактный был ровно 100%.
   */
  function panelScaleFromLegacySize(size) {
    return size === "small" ? PANEL_SCALE_MIN : PANEL_SCALE_DEFAULT;
  }

  /**
   * Какую долю дорожки ползунка, %, занимает пройденная часть. Нужна там,
   * где дорожку рисуем сами: у самодельной accent-color заливку не даёт.
   * Вырожденный или нечисловой диапазон -> 0.
   */
  function sliderFillPercent(value, min, max) {
    const from = Number(min);
    const span = Number(max) - from;
    if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(from)) {
      return 0;
    }
    return clamp((Number(value) - from) / span, 0, 1) * 100;
  }

  // Просвет между нашей панелью и верхним краем контролов YouTube (там
  // таймлайн) при масштабе 100%, и насколько он растёт на каждую единицу
  // масштаба. Числа подобраны так, чтобы 100% и 135% дали прежние 14 и 34.
  const PANEL_GAP_BASE_PX = 14;
  const PANEL_GAP_PER_SCALE_PX = 57;

  /** Отступ панели над контролами YouTube, px, для масштаба в процентах. */
  function panelGapAboveControls(scalePercent) {
    const multiplier = normalizePanelScale(scalePercent) / 100;
    return Math.round(PANEL_GAP_BASE_PX + (multiplier - 1) * PANEL_GAP_PER_SCALE_PX);
  }

  // Клавиши, которые PiP-окно обрабатывает само. Всё остальное (f, c, i)
  // уходит к YouTube без изменений.
  const HOTKEYS = new Set([
    " ", "k", "m", "<", ">",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"
  ]);

  // Раскладка меняет event.key, но не event.code: физическая клавиша «k» на
  // кириллице приходит как «л», а верхний ряд AZERTY — как «&é"'(». Поэтому
  // непонятный key разбираем по коду клавиши, как это делает и сам YouTube.
  const CODE_TO_KEY = { KeyK: "k", KeyM: "m" };
  const SHIFTED_CODE_TO_KEY = { Comma: "<", Period: ">" };
  const DIGIT_KEY_PATTERN = /^[0-9]$/;
  const DIGIT_CODE_PATTERN = /^Digit[0-9]$/;

  /**
   * Какое действие окна назначено нажатию: канонический символ клавиши
   * (" ", "k", "m", "<", ">", стрелка или цифра) либо null, если клавиша не
   * наша. Принимает { key, code, shiftKey } — событие целиком не нужно.
   */
  function hotkeyFromEvent({ key, code, shiftKey } = {}) {
    if (HOTKEYS.has(key) || DIGIT_KEY_PATTERN.test(key)) {
      return key;
    }
    // Дальше — только запасной путь по физической клавише.
    if (shiftKey) {
      // Цифру с шифтом не трогаем: Shift+1 — это «!», а не прыжок на 10%.
      return SHIFTED_CODE_TO_KEY[code] || null;
    }
    if (DIGIT_CODE_PATTERN.test(code)) {
      return code.slice("Digit".length);
    }
    return CODE_TO_KEY[code] || null;
  }

  return {
    clamp, formatTime, abLoopTarget, nextSpeed, speedSliderRange,
    normalizeSegments, segmentEndAt,
    digitSeekTime, chapterFractionsFromWidths, parseTimeLabel,
    videoTitleFromPageTitle, behindLiveSeconds, liveResumeTarget, windowFraction,
    cycleSpeedPreset, timecodeUrl, sliderFillPercent, hotkeyFromEvent,
    normalizePanelScale, panelScaleFromLegacySize, panelGapAboveControls,
    PANEL_SCALE_MIN, PANEL_SCALE_MAX, PANEL_SCALE_DEFAULT
  };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.utils;
}
