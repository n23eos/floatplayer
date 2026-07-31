"use strict";

// Общее пространство имён расширения в изолированном мире content-скриптов.
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Все селекторы YouTube собраны в одном месте: если YouTube поменяет разметку,
// правим только этот файл.
YTFP.SELECTORS = {
  playerRoot: "#movie_player",
  shortsPlayerRoot: "#shorts-player",
  shortsNextButton: "#navigation-button-down button",
  video: "#movie_player video.html5-main-video",
  rightControls: "#movie_player .ytp-right-controls",
  settingsButton: "#movie_player .ytp-settings-button",
  // Относительный, от корня плеера: плеер переезжает в PiP-окно, и путь от
  // document там уже не работает.
  //
  // Сам значок .ytp-live-badge лежит в разметке всегда, и на обычном видео
  // тоже — видимым его делает класс ytp-live на предке, правилом самого
  // YouTube: `.ytp-chrome-controls .ytp-live .ytp-live-badge { display:
  // inline-block }`. Поэтому спрашиваем про предка, а не про значок.
  //
  // Именно класс, а не вычисленный display: в PiP-окне вся панель контролов
  // скрыта нашим же CSS, и любая проверка видимости там всегда сказала бы
  // «не эфир».
  liveBadge: ".ytp-live .ytp-live-badge",
  // Запасные источники ID текущего видео, когда его нет в адресе
  // (например, канальные страницы вида /@канал/live).
  canonicalLink: 'link[rel="canonical"]',
  watchFlexy: "ytd-watch-flexy[video-id]",
  // Кнопка «нравится» на самой странице: плеер уезжает в PiP-окно, а она
  // остаётся в разметке страницы, поэтому нажимаем именно её.
  //
  // Порядок важен: сначала активный шортс (в ленте одновременно живёт
  // несколько шортсов, лайкнуть нужно видимый), потом обычная страница
  // просмотра, в конце — разметка старого UI как запасной вариант.
  likeButtons: [
    "ytd-reel-video-renderer[is-active] like-button-view-model button",
    "reel-action-bar-view-model like-button-view-model button",
    "ytd-watch-metadata like-button-view-model button",
    "#top-level-buttons-computed like-button-view-model button",
    "segmented-like-dislike-button-view-model like-button-view-model button",
    "#top-level-buttons-computed ytd-toggle-button-renderer:first-of-type button"
  ],
  // «Не нравится» — та же логика. На шортсах этой кнопки в разметке может
  // не быть вовсе; тогда в окне она просто не показывается.
  dislikeButtons: [
    "ytd-reel-video-renderer[is-active] dislike-button-view-model button",
    "reel-action-bar-view-model dislike-button-view-model button",
    "ytd-watch-metadata dislike-button-view-model button",
    "#top-level-buttons-computed dislike-button-view-model button",
    "segmented-like-dislike-button-view-model dislike-button-view-model button",
    "#top-level-buttons-computed ytd-toggle-button-renderer:nth-of-type(2) button"
  ]
};

YTFP.DEFAULT_SETTINGS = {
  autoPip: false,       // авто-вынос при уходе со вкладки
  speedStep: 0.25,      // шаг ползунка скорости
  volumeBoostMax: 300,  // потолок усиления громкости, %
  compactMode: true,        // прятать панель, показывать при наведении
  skipStepSeconds: 30,      // шаг кнопки промотки интеграций, сек
  sponsorSkip: true,        // сегменты SponsorBlock на таймлайне + кнопка пропуска
  sponsorAutoSkip: false,   // автопропуск сегментов без кнопки (opt-in)
  // Какие категории SponsorBlock запрашивать и пропускать.
  sponsorCategories: ["sponsor", "selfpromo", "interaction"],
  nightMode: "off",         // ночной режим (подавление синего): off | warm | deep
  shortsAutoNext: true,     // шортсы: автопереход к следующему по окончании
  autoplayNext: true,       // видео: автопереход к следующему по окончании
  // "document" — окно с панелью настроек (Chrome рисует рамку с origin),
  // "native"   — чистое видео без рамки (нативный PiP, без панели).
  windowMode: "document"
};

YTFP.SPEED_MIN = 0.25;
YTFP.SPEED_MAX = 3;

// Размер PiP-окна по умолчанию (потом запоминаем выбранный пользователем).
YTFP.DEFAULT_PIP_SIZE = { width: 480, height: 320 };

YTFP.SEEK_STEP_SECONDS = 10;
