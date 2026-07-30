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

  /**
   * Прямой эфир: у стрима внутри плеера есть значок «В эфире», у обычного
   * видео его нет. Ищем от корня плеера — он мог уехать в PiP-окно.
   */
  function isLive() {
    const video = getVideo();
    const playerRoot = video && video.closest("#movie_player, #shorts-player");
    return Boolean(playerRoot && playerRoot.querySelector(YTFP.SELECTORS.liveBadge));
  }

  /**
   * Куда вообще можно перемотать: { start, end } или null.
   * Обычное видео — от нуля до длительности. Прямой эфир — длительность не
   * конечна, и границы берём из seekable: это DVR-буфер, он начинается не в
   * нуле и едет вперёд вместе с эфиром.
   * Во время рекламы длительность конечна (это длительность ролика), поэтому
   * реклама попадает в первую ветку — как было до появления стримов.
   *
   * video можно передать явно: у полосок и панели свой getVideo(), и брать
   * элемент дважды разными путями — лишний риск разъехаться.
   */
  function getSeekRange(video = getVideo()) {
    if (!video) {
      return null;
    }
    if (Number.isFinite(video.duration) && video.duration > 0) {
      return { start: 0, end: video.duration };
    }
    if (!video.seekable || video.seekable.length === 0) {
      return null;
    }
    const start = video.seekable.start(0);
    const end = video.seekable.end(video.seekable.length - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }
    return { start, end };
  }

  // ID видео — ровно 11 символов из алфавита YouTube.
  const VIDEO_ID_PATTERN = /[?&]v=([\w-]{11})/;

  /**
   * ID текущего видео или null. Слоями, потому что единственного надёжного
   * источника нет: на /watch ID лежит в адресе, а на канальных страницах
   * вида /@канал/live — нет, и адрес приходится обходить.
   */
  function getVideoId() {
    const fromUrl = new URLSearchParams(location.search).get("v");
    if (fromUrl) {
      return fromUrl;
    }
    // Канонический адрес до загрузки страницы бывает мусорным
    // (".../@канал/undefined") — поэтому не доверяем, а сверяем с шаблоном.
    const canonical = document.querySelector(YTFP.SELECTORS.canonicalLink);
    const matched = canonical && canonical.href.match(VIDEO_ID_PATTERN);
    if (matched) {
      return matched[1];
    }
    const flexy = document.querySelector(YTFP.SELECTORS.watchFlexy);
    return (flexy && flexy.getAttribute("video-id")) || null;
  }

  /** Край прямого эфира — дальняя граница окна. Буфер не набран -> null. */
  function getLiveEdge() {
    const bounds = getSeekRange();
    return bounds ? bounds.end : null;
  }

  function seekBy(deltaSeconds) {
    const video = getVideo();
    if (!video || isAdShowing()) {
      return;
    }
    const bounds = getSeekRange(video);
    if (!bounds) {
      return;
    }
    video.currentTime = YTFP.utils.clamp(
      video.currentTime + deltaSeconds,
      bounds.start,
      bounds.end
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
    isAdShowing, isLive, getLiveEdge, getSeekRange, getVideoId,
    seekBy, togglePlayPause, setSpeed
  };
})();
