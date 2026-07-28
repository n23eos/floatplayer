"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Тонкая обёртка над DOM плеера YouTube.
// Работаем только через DOM-свойства <video> и клики по кнопкам плеера —
// JS-объекты страницы (ytplayer API) из изолированного мира недоступны.
YTFP.playerApi = (() => {
  function getPlayerRoot() {
    return document.querySelector(YTFP.SELECTORS.playerRoot);
  }

  function getVideo() {
    // Ищем внутри переносимого плеера, где бы он сейчас ни был (страница или PiP-окно).
    const root = YTFP.pip && YTFP.pip.getMovedPlayer ? YTFP.pip.getMovedPlayer() : null;
    if (root) {
      return root.querySelector("video.html5-main-video");
    }
    return document.querySelector(YTFP.SELECTORS.video);
  }

  function isWatchPage() {
    return location.pathname === "/watch";
  }

  function seekBy(deltaSeconds) {
    const video = getVideo();
    if (!video || !Number.isFinite(video.duration)) {
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

  return { getPlayerRoot, getVideo, isWatchPage, seekBy, togglePlayPause, setSpeed };
})();
