/* Сборка разметки мини-окна для скриншотов.
   Классы и порядок элементов повторяют то, что строит extension/content:
   стили при этом берутся из настоящего pip.css, поэтому кадр не может
   разойтись с продуктом по оформлению. */

const ICONS = {
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  skip: "M4 6v12l8.5-6L4 6zm9 0v12l8.5-6L13 6z",
  loop: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  autoplay: "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14v10zM10 9.5v5l4-2.5-4-2.5z",
  next: "M6 18l8.5-6L6 6v12zM16 6h2v12h-2z",
  prev: "M6 6h2v12H6zM18 18l-8.5-6L18 6v12z"
};

function icon(name, size) {
  const px = size || 14;
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="currentColor"><path d="${ICONS[name]}"/></svg>`;
}

/** Верхняя колонка: панель управления и плашка названия под ней. */
function topStack(options) {
  const o = options || {};
  return `<div class="ytfp-top">${bar(o)}${titlePlate(o)}</div>`;
}

function titlePlate(options) {
  const o = options || {};
  // Аватар канала в продукте — картинка с YouTube; здесь цветной кружок.
  return `<div class="ytfp-title">
    <span class="ytfp-title-avatar" style="background:linear-gradient(135deg,#c2506b,#5a3b8c)"></span>
    <span class="ytfp-title-text">${o.videoTitle || ""}</span>
  </div>`;
}

/**
 * Панель. Флаги: narrow — вертикальное окно шортсов, sleep/countdown —
 * запущенный таймер сна, night — включённый ночной режим.
 */
function bar(options) {
  const o = options || {};
  const L = window.L;
  const cls = `ytfp-bar${o.narrow ? " ytfp-bar--narrow" : ""}`;

  const play = `<button class="ytfp-btn">${icon("pause")}</button>`;
  const ab = `<button class="ytfp-btn">A-B</button>`;
  const loop = `<button class="ytfp-btn">${icon("loop")}</button>`;
  const autoplay = `<button class="ytfp-btn ytfp-btn--active">${icon("autoplay")}</button>`;
  const skip = `<button class="ytfp-btn">${icon("skip")}<span>30</span></button>`;

  const speedValue = o.speed || "1";
  const speed = `<label class="ytfp-speed">
    <input type="range" min="0.25" max="3" step="0.25" value="${speedValue}">
    <span class="ytfp-speed-label">${speedValue}x</span>
  </label>`;

  const boostValue = o.boost || 150;
  const boost = `<label class="ytfp-boost">${icon("volume")}
    <input type="range" min="0" max="300" step="10" value="${boostValue}">
    <span>${boostValue}%</span>
  </label>`;

  const nightLevel = o.night || "off";
  const nightActive = nightLevel === "off" ? "" : " ytfp-btn--active";
  const night = `<button class="ytfp-btn ytfp-btn--night${nightActive}" data-night="${nightLevel}">${icon("moon")}</button>`;

  const sleepLabel = o.sleep ? `${o.sleep} ${L.sleepMinutes}` : L.sleepOff;
  const sleep = `<label class="ytfp-sleep">
    <select class="ytfp-select"><option>${sleepLabel}</option></select>
    <span class="ytfp-sleep-countdown">${o.countdown || ""}</span>
  </label>`;

  const back = `<button class="ytfp-btn ytfp-btn--return">${icon("back")}</button>`;

  // В узком окне шортсов A-B, промотка, loop и автозапуск не помещаются —
  // pip-controls их там и не строит.
  const middle = o.narrow ? "" : ab + loop + autoplay + skip;
  return `<div class="${cls}">${play}${middle}${speed}${boost}${night}${sleep}${back}</div>`;
}

/** Нижний ряд: −30, назад, пауза, вперёд, +30. */
function nav() {
  return `<div class="ytfp-nav">
    <button class="ytfp-nav-btn ytfp-nav-btn--text">−30</button>
    <button class="ytfp-nav-btn">${icon("prev", 20)}</button>
    <button class="ytfp-nav-btn ytfp-nav-btn--main">${icon("pause", 26)}</button>
    <button class="ytfp-nav-btn">${icon("next", 20)}</button>
    <button class="ytfp-nav-btn ytfp-nav-btn--text">+30</button>
  </div>`;
}

/**
 * Полоска прогресса. pos — процент просмотра, seg — [начало, ширина]
 * сегмента SponsorBlock, chapters — позиции насечек глав в процентах.
 */
function progress(options) {
  const o = options || {};
  const segments = (o.seg ? [o.seg] : [])
    .map(([left, width]) => `<div class="ytfp-progress-seg" style="left:${left}%;width:${width}%"></div>`)
    .join("");
  const chapters = (o.chapters || [18, 37, 61, 84])
    .map((left) => `<div class="ytfp-chapter-tick" style="left:${left}%"></div>`)
    .join("");
  return `<div class="ytfp-progress-wrap">
    <div class="ytfp-progress">
      <div class="ytfp-progress-fill" style="width:${o.pos}%"></div>
      <div class="ytfp-progress-segments">${segments}</div>
      <div class="ytfp-progress-chapters">${chapters}</div>
    </div>
  </div>`;
}

/** Кнопка «пропустить спонсорскую вставку» внутри плеера. */
function sbSkip(label) {
  return `<button class="shot-sbskip">${label}</button>`;
}
