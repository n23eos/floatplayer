"use strict";

// Общее пространство имён расширения в изолированном мире content-скриптов.
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Все селекторы YouTube собраны в одном месте: если YouTube поменяет разметку,
// правим только этот файл.
YTFP.SELECTORS = {
  playerRoot: "#movie_player",
  video: "#movie_player video.html5-main-video",
  rightControls: "#movie_player .ytp-right-controls",
  settingsButton: "#movie_player .ytp-settings-button",
  // Класс на #movie_player, пока крутится реклама.
  adShowingClass: "ad-showing",
  // Варианты кнопки «Пропустить рекламу» в разных версиях плеера.
  skipAdButtons: ".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern"
};

YTFP.DEFAULT_SETTINGS = {
  autoPip: false,       // авто-вынос при уходе со вкладки
  speedStep: 0.25,      // шаг ползунка скорости
  volumeBoostMax: 300,  // потолок усиления громкости, %
  compactMode: true,    // прятать панель, показывать при наведении
  autoSkipAds: true     // автопропуск рекламы (жмёт «Пропустить», мотает к концу)
};

YTFP.SPEED_MIN = 0.25;
YTFP.SPEED_MAX = 3;

// Размер PiP-окна по умолчанию (потом запоминаем выбранный пользователем).
YTFP.DEFAULT_PIP_SIZE = { width: 480, height: 320 };

YTFP.SEEK_STEP_SECONDS = 5;
