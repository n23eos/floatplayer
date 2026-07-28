"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Тонкая обёртка над DOM плеера YouTube.
// Работаем только через DOM-свойства <video> и клики по кнопкам плеера —
// JS-объекты страницы (ytplayer API) из изолированного мира недоступны.
YTFP.playerApi = (() => {
  function isShortsPage() {
    return location.pathname.startsWith("/shorts/");
  }

  /** Страница, где есть плеер, который можно вынести. */
  function isPlayerPage() {
    return isWatchPage() || isShortsPage();
  }

  function getPlayerRoot() {
    if (isShortsPage()) {
      return document.querySelector(YTFP.SELECTORS.shortsPlayerRoot);
    }
    return document.querySelector(YTFP.SELECTORS.playerRoot);
  }

  function getVideo() {
    // Ищем внутри переносимого плеера, где бы он сейчас ни был (страница или PiP-окно).
    const root = YTFP.pip && YTFP.pip.getMovedPlayer ? YTFP.pip.getMovedPlayer() : getPlayerRoot();
    if (root) {
      return root.querySelector("video.html5-main-video");
    }
    return document.querySelector(YTFP.SELECTORS.video);
  }

  function isWatchPage() {
    return location.pathname === "/watch";
  }

  /**
   * Идёт ли сейчас реклама YouTube. Во время рекламы currentTime принадлежит
   * рекламному ролику, поэтому любая перемотка означала бы пропуск рекламы —
   * расширение этого не делает.
   */
  function isAdShowing() {
    const video = getVideo();
    const playerRoot = video && video.closest("#movie_player, #shorts-player");
    return Boolean(playerRoot && playerRoot.classList.contains("ad-showing"));
  }

  function seekBy(deltaSeconds) {
    const video = getVideo();
    if (!video || !Number.isFinite(video.duration) || isAdShowing()) {
      return;
    }
    video.currentTime = YTFP.utils.clamp(
      video.currentTime + deltaSeconds,
      0,
      video.duration
    );
  }

  function togglePlayPause() {
    const video = getVideo();
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function setSpeed(rate) {
    const video = getVideo();
    if (video) {
      video.playbackRate = rate;
    }
  }

  return {
    getPlayerRoot, getVideo, isWatchPage, isShortsPage, isPlayerPage,
    isAdShowing, seekBy, togglePlayPause, setSpeed
  };
})();
