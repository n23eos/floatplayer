"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Автопропуск рекламы (работает и на странице, и в мини-окне):
// 1) как только появляется родная кнопка «Пропустить» — жмём её;
// 2) непропускаемый ролик перематываем к концу — YouTube сам его завершает.
// Управляется настройкой autoSkipAds.
YTFP.adSkip = (() => {
  const CHECK_INTERVAL_MS = 500;

  /** Корень плеера, где бы он ни был: на странице или в PiP-окне. */
  function getPlayerRoot() {
    return YTFP.pip.getMovedPlayer() || document.querySelector(YTFP.SELECTORS.playerRoot);
  }

  function tick() {
    if (!YTFP.settings.get().autoSkipAds) {
      return;
    }
    const playerRoot = getPlayerRoot();
    if (!playerRoot || !playerRoot.classList.contains(YTFP.SELECTORS.adShowingClass)) {
      return;
    }

    // Кнопка «Пропустить рекламу» появилась — жмём.
    const skipButton = playerRoot.querySelector(YTFP.SELECTORS.skipAdButtons);
    if (skipButton) {
      skipButton.click();
      return;
    }

    // Кнопки нет (непропускаемая реклама) — мотаем ролик к концу.
    const video = playerRoot.querySelector("video.html5-main-video");
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
    }
  }

  function start() {
    setInterval(tick, CHECK_INTERVAL_MS);
  }

  return { start };
})();

YTFP.adSkip.start();
