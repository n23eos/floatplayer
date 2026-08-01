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
  // На сколько держимся позади самого края эфира при перемотке.
  const LIVE_EDGE_BACKOFF_SECONDS = 1;

  function getSeekRange(video = getVideo()) {
    if (!video) {
      return null;
    }
    // Реклама — обычный конечный ролик, её окно всегда от нуля.
    const isLiveNow = !isAdShowing() && isLive();
    const hasSeekable = Boolean(video.seekable) && video.seekable.length > 0;

    // У прямого эфира границы берём только из seekable. Доверять duration
    // нельзя: у стрима она бывает конечной, но завышенной — полоска тогда
    // не доезжает до конца, отставание считается от несуществующего края,
    // а перемотка вправо уводит за буфер, где плеер встаёт насовсем.
    if (hasSeekable && (isLiveNow || !Number.isFinite(video.duration) || video.duration <= 0)) {
      const start = video.seekable.start(0);
      const rawEnd = video.seekable.end(video.seekable.length - 1);
      // Отступ от самого края: последние доли секунды ещё не догружены, и
      // перемотка ровно в конец подвешивает плеер.
      const end = isLiveNow ? rawEnd - LIVE_EDGE_BACKOFF_SECONDS : rawEnd;
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return { start, end };
      }
    }

    if (Number.isFinite(video.duration) && video.duration > 0) {
      return { start: 0, end: video.duration };
    }
    return null;
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

  // Насколько можно отстать от края и всё ещё считаться «в эфире».
  // Даже онлайн-плеер держится на несколько секунд позади seekable.end
  // (задержка вещания и недокачанные чанки), и жёсткий порог заставлял бы
  // кнопку LIVE мигать отставанием «−0:05», а полоску — не доезжать до
  // правого края. Сам YouTube показывает «В эфире» с таким же щедрым
  // допуском.
  const LIVE_EDGE_TOLERANCE_SECONDS = 20;

  /** В эфире ли текущая позиция (единая проверка для кнопки и полоски). */
  function isAtLiveEdge(video = getVideo()) {
    if (!video || !isLive()) {
      return false;
    }
    const behind = YTFP.utils.behindLiveSeconds(getLiveEdge(), video.currentTime);
    return behind === null || behind < LIVE_EDGE_TOLERANCE_SECONDS;
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
    isAdShowing, isLive, getLiveEdge, isAtLiveEdge, getSeekRange, getVideoId,
    seekBy, togglePlayPause, setSpeed
  };
})();
