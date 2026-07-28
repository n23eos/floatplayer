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
  settingsButton: "#movie_player .ytp-settings-button"
};

YTFP.DEFAULT_SETTINGS = {
  autoPip: false,       // авто-вынос при уходе со вкладки
  speedStep: 0.25,      // шаг ползунка скорости
  volumeBoostMax: 300,  // потолок усиления громкости, %
  compactMode: true,        // прятать панель, показывать при наведении
  skipStepSeconds: 30,      // шаг кнопки промотки интеграций, сек
  sponsorSkip: true,        // сегменты SponsorBlock на таймлайне + кнопка пропуска
  shortsAutoNext: true,     // шортсы: автопереход к следующему по окончании
  // "document" — окно с панелью настроек (Chrome рисует рамку с origin),
  // "native"   — чистое видео без рамки (нативный PiP, без панели).
  windowMode: "document"
};

YTFP.SPEED_MIN = 0.25;
YTFP.SPEED_MAX = 3;

// Размер PiP-окна по умолчанию (потом запоминаем выбранный пользователем).
YTFP.DEFAULT_PIP_SIZE = { width: 480, height: 320 };

YTFP.SEEK_STEP_SECONDS = 5;
