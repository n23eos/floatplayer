"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Ночной режим: во сколько раз давим каждый канал (R, G, B).
// Честное масштабирование каналов, как у f.lux: картинка теплеет,
// но не мутнеет, как от sepia().
// Модуль общий для двух документов — страницы YouTube и PiP-окна:
// в каждом свой набор <filter>, но матрицы и уровни одни и те же.
YTFP.nightMode = (() => {
  const LEVELS = ["off", "warm", "deep"];
  const MATRICES = {
    warm: [1, 0.93, 0.72],
    deep: [1, 0.82, 0.5]
  };

  /** Значение из storage может оказаться мусором (правка руками, старая версия). */
  function normalize(level) {
    return LEVELS.includes(level) ? level : "off";
  }

  /** Следующий уровень по кругу: off → warm → deep → off. */
  function next(level) {
    const index = LEVELS.indexOf(normalize(level));
    return LEVELS[(index + 1) % LEVELS.length];
  }

  /**
   * Скрытый <svg> с фильтрами ночного режима для указанного документа.
   * Строим через createElementNS: на странице YouTube включены Trusted Types,
   * innerHTML там может быть запрещён.
   */
  function createFilters(doc) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "ytfp-night-defs");
    svg.setAttribute("aria-hidden", "true");
    for (const [level, [red, green, blue]] of Object.entries(MATRICES)) {
      const filter = doc.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", `ytfp-night-${level}`);
      // Явный sRGB: по умолчанию SVG-фильтры считаются в линейном
      // пространстве, и картинка заметно светлеет.
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const matrix = doc.createElementNS(SVG_NS, "feColorMatrix");
      matrix.setAttribute("type", "matrix");
      matrix.setAttribute("values", [
        red, 0, 0, 0, 0,
        0, green, 0, 0, 0,
        0, 0, blue, 0, 0,
        0, 0, 0, 1, 0
      ].join(" "));
      filter.appendChild(matrix);
      svg.appendChild(filter);
    }
    return svg;
  }

  /**
   * Вешает класс уровня на <body> документа. Фильтр применяется классом,
   * а не инлайном на <video>: тело PiP-окна умирает вместе с окном, поэтому
   * видео возвращается на страницу чистым и снимать фильтр вручную не нужно.
   */
  function applyTo(doc, level) {
    const current = normalize(level);
    for (const candidate of LEVELS) {
      doc.body.classList.toggle(
        `ytfp-night--${candidate}`,
        candidate !== "off" && candidate === current
      );
    }
  }

  return { LEVELS, MATRICES, normalize, next, createFilters, applyTo };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.nightMode;
}
