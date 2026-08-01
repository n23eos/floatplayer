/* Сборка разметки мини-окна для скриншотов.
   Классы и порядок элементов повторяют то, что строят модули
   extension/content/pip-*.js, а стили берутся из настоящего
   extension/pip/pip.css — кадр не может разойтись с продуктом.

   Скрипт исполняется внутри документа мини-окна (см. window.css):
   размеры окна там настоящие, поэтому медиазапросы pip.css срабатывают
   ровно так же, как в жизни. */

// Пути один в один из pip-controls.js, pip-nav.js, pip-chat.js, pip-reactions.js.
const ICONS = {
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  loop: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
  sleep: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  autoplay: "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14v10zM10 9.5v5l4-2.5-4-2.5z",
  shortsAutoNext:
    "M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" +
    "m0 12H5V7h14v10zM8 10h8l-4 5z",
  search:
    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3" +
    "S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99" +
    "L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5" +
    " 11.99 14 9.5 14z",
  next: "M6 18l8.5-6L6 6v12zM16 6h2v12h-2z",
  prev: "M6 6h2v12H6zM18 18l-8.5-6L18 6v12z",
  comments:
    "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z" +
    "M17 12V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
  thumb:
    "M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2" +
    "c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1" +
    " 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2" +
    "l-3 7H9V9zM1 9h4v12H1z"
};

function icon(name, size, flip) {
  const px = size || 14;
  const transform = flip ? ' transform="rotate(180 12 12)"' : "";
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="currentColor"><path d="${ICONS[name]}"${transform}/></svg>`;
}

/** Верхний стек: сейчас в нём только плашка с названием и каналом. */
function titleBar(options) {
  const o = options || {};
  // Аватар канала в продукте — картинка с YouTube; здесь цветной кружок.
  return `<div class="ytfp-top">
    <div class="ytfp-title">
      <span class="ytfp-title-avatar" style="background:linear-gradient(135deg,#c2506b,#5a3b8c)"></span>
      <span class="ytfp-title-text">${o.videoTitle || ""}</span>
    </div>
  </div>`;
}

/** Оценки видео: свой блок у левого края (в шортсах они уезжают в капсулу). */
function reactions() {
  return `<div class="ytfp-reactions">
    <button class="ytfp-reaction ytfp-reaction--like">${icon("thumb", 16)}</button>
    <button class="ytfp-reaction ytfp-reaction--dislike">${icon("thumb", 16, true)}</button>
  </div>`;
}

// --- Части нижней панели ----------------------------------------------------

function group(...children) {
  return `<div class="ytfp-group">${children.join("")}</div>`;
}

function boost(value) {
  const percent = value === undefined ? 150 : value;
  return `<label class="ytfp-boost">${icon("volume")}
    <input type="range" min="0" max="300" step="10" value="${percent}">
    <span>${percent}%</span>
  </label>`;
}

function speed(value) {
  const rate = value || "1";
  return `<label class="ytfp-speed">
    <input type="range" min="0.25" max="3" step="0.25" value="${rate}">
    <span class="ytfp-speed-label">${rate}x</span>
  </label>`;
}

function night(level) {
  const value = level || "off";
  const active = value === "off" ? "" : " ytfp-btn--active";
  return `<button class="ytfp-btn ytfp-btn--night${active}" data-night="${value}">${icon("sleep")}</button>`;
}

function sleep(options) {
  const o = options || {};
  const label = o.minutes ? `${o.minutes} ${window.L.sleepMinutes}` : window.L.sleepOff;
  return `<label class="ytfp-sleep">
    <select class="ytfp-select"><option>${label}</option></select>
    <span class="ytfp-sleep-countdown">${o.countdown || ""}</span>
  </label>`;
}

/** Ряд воспроизведения. В шортсах ±30 не строятся: ролик короче прыжка. */
function navRow(options) {
  const o = options || {};
  const jump = o.shorts
    ? ["", ""]
    : ['<button class="ytfp-nav-btn ytfp-nav-btn--text">−30</button>',
       '<button class="ytfp-nav-btn ytfp-nav-btn--text">+30</button>'];
  return `<div class="ytfp-nav">${jump[0]}
    <button class="ytfp-nav-btn">${icon("prev", 20)}</button>
    <button class="ytfp-nav-btn ytfp-nav-btn--main">${icon("pause", 26)}</button>
    <button class="ytfp-nav-btn">${icon("next", 20)}</button>
  ${jump[1]}</div>`;
}

/** Блок редких значков. На обычном видео пуст и схлопывается по :has. */
function statusRow() {
  return '<div class="ytfp-row ytfp-row--status"><button class="ytfp-btn ytfp-btn--live" hidden></button></div>';
}

/**
 * Нижняя панель обычного видео: ползунки по краям, воспроизведение в центре.
 * Флаги: speed/boost/night/sleep — состояние соответствующих органов.
 */
function bottomBar(options) {
  const o = options || {};
  const chatToggle = `<button class="ytfp-chat-toggle">${icon("comments", 16)}</button>`;
  return `<div class="ytfp-bottom">${statusRow()}
    <div class="ytfp-row ytfp-row--main">
      ${group(boost(o.boost), '<button class="ytfp-btn">A-B</button>',
              `<button class="ytfp-btn">${icon("loop")}</button>`,
              `<button class="ytfp-btn ytfp-btn--active">${icon("autoplay")}</button>`)}
      ${navRow()}
      ${group(night(o.night), sleep(o.sleep), chatToggle, speed(o.speed))}
    </div>
  </div>`;
}

/**
 * Нижняя панель шортса: узкая, без A-B, ±30 и ползунка скорости,
 * с капсулой над ней (нравится, автопереход, поиск по слову).
 * search: { query } — открытое поле поиска; active — лупа горит красным.
 */
function shortsBottomBar(options) {
  const o = options || {};
  const searchActive = o.searchActive ? " ytfp-btn--active" : "";
  const searchField = o.query === undefined
    ? '<div class="ytfp-shorts-search" hidden><input type="text"></div>'
    : `<div class="ytfp-shorts-search"><input type="text" value="${o.query}"></div>`;
  const autoActive = o.autoNext === false ? "" : " ytfp-btn--active";
  return `<div class="ytfp-bottom ytfp-bottom--narrow">
    <div class="ytfp-shorts-bar">
      <button class="ytfp-reaction ytfp-reaction--like">${icon("thumb", 16)}</button>
      <button class="ytfp-btn${autoActive}">${icon("shortsAutoNext")}</button>
      <button class="ytfp-btn${searchActive}">${icon("search")}</button>
      ${searchField}
    </div>
    ${statusRow()}
    <div class="ytfp-row ytfp-row--main">
      ${group(boost(o.boost))}
      ${navRow({ shorts: true })}
      ${group(night(o.night), sleep(o.sleep))}
    </div>
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

/**
 * Выдвинутая колонка справа: очередь сверху, рекомендации ниже.
 * titles — подписи карточек, первые две уходят в очередь.
 */
function relatedPanel(titles) {
  const grads = [
    "#3b4a63,#22293a", "#5a3b52,#2c2030", "#3d5a4a,#1f2e26",
    "#5a4f3b,#302a20", "#42375a,#241f30", "#5a3b3b,#2e2020",
    "#37505a,#1f2a30", "#4a3b5a,#26202e"
  ];
  const card = (index, extra) => `<div class="ytfp-related-item ${extra}">
    <div class="ytfp-related-thumb" style="background:linear-gradient(135deg, ${grads[index % grads.length]})"></div>
    <span class="ytfp-related-title">${titles[index]}</span>
  </div>`;
  const queued = [0, 1].map((i) => card(i, "ytfp-queue-item")).join("");
  const rest = [2, 3, 4, 5, 6, 7].map((i) => card(i, "")).join("");
  return `<div class="ytfp-related-root">
    <button class="ytfp-related-toggle ytfp-related-toggle--open">›</button>
    <div class="ytfp-related-panel ytfp-related-panel--open">
      <div class="ytfp-queue">
        <div class="ytfp-queue-header">${window.L.queueTitle}</div>
        <div class="ytfp-related-list">${queued}</div>
      </div>
      <div class="ytfp-related-list">${rest}</div>
    </div>
  </div>`;
}

/** Собирает документ мини-окна: кадр видео плюс переданные части. */
function render(parts) {
  document.body.insertAdjacentHTML("beforeend", '<div class="videoish"></div>' + parts.join(""));
}
