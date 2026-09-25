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
    const root = YTFP.pip?.getMovedPlayer?.() || getPlayerRoot();
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
  function isAdShowing(video = getVideo()) {
    const playerRoot = video && video.closest("#movie_player, #shorts-player");
    return Boolean(playerRoot && playerRoot.classList.contains("ad-showing"));
  }

  function getLiveBadge(video = getVideo()) {
    const playerRoot = video && video.closest("#movie_player, #shorts-player");
    return playerRoot && playerRoot.querySelector(YTFP.SELECTORS.liveBadge);
  }

  /**
   * Прямой эфир: у стрима внутри плеера есть значок «В эфире», у обычного
   * видео его нет. Ищем от корня плеера — он мог уехать в PiP-окно.
   */
  function isLive(video = getVideo()) {
    return Boolean(getLiveBadge(video));
  }

  /**
   * Куда вообще можно перемотать: { start, end } или null.
   * Обычное видео использует диапазон от нуля до длительности. У прямого
   * эфира duration и seekable.end могут включать фиктивное будущее, поэтому
   * DVR-окно читаем из родной шкалы YouTube и проверяем её координаты.
   * Во время рекламы длительность конечна (это длительность ролика), поэтому
   * реклама попадает в первую ветку — как было до появления стримов.
   *
   * video можно передать явно: у полосок и панели свой getVideo(), и брать
   * элемент дважды разными путями — лишний риск разъехаться.
   */
  const LIVE_PROGRESS_TOLERANCE_SECONDS = 30;
  const LIVEHEAD_CLASS = "ytp-live-badge-is-livehead";

  function numberAttribute(element, name) {
    const value = element && element.getAttribute(name);
    if (value === null || value.trim() === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function hasPlayingLiveHead(video) {
    const badge = getLiveBadge(video);
    return Boolean(
      badge &&
      badge.classList.contains(LIVEHEAD_CLASS) &&
      !video.paused &&
      !video.seeking
    );
  }

  function getNativeLiveRange(video) {
    const playerRoot = video && video.closest("#movie_player, #shorts-player");
    const progress = playerRoot && playerRoot.querySelector(YTFP.SELECTORS.liveProgress);
    const start = numberAttribute(progress, "aria-valuemin");
    const nativeEnd = numberAttribute(progress, "aria-valuemax");
    const nativeNow = numberAttribute(progress, "aria-valuenow");
    const atPlayingHead = hasPlayingLiveHead(video);
    if (
      start === null ||
      nativeEnd === null ||
      nativeNow === null ||
      !Number.isFinite(video.currentTime) ||
      nativeEnd <= start ||
      nativeNow < start ||
      nativeEnd < nativeNow ||
      Math.abs(nativeNow - video.currentTime) > LIVE_PROGRESS_TOLERANCE_SECONDS ||
      (!atPlayingHead && nativeEnd < video.currentTime)
    ) {
      return null;
    }
    // aria обновляется реже media time. У подтверждённого livehead не даём
    // устаревшему max поставить правый край позади текущей позиции.
    const end = atPlayingHead
      ? Math.max(nativeEnd, video.currentTime)
      : nativeEnd;
    return end > start ? { start, end } : null;
  }

  function getSeekRange(video = getVideo()) {
    if (!video) {
      return null;
    }
    // Реклама — обычный конечный ролик, её окно всегда от нуля.
    const isLiveNow = !isAdShowing(video) && isLive(video);
    if (isLiveNow) {
      // Неизвестное состояние лучше недостоверного live range: raw
      // duration/seekable уже подтверждённо могут вести на минуты вперёд.
      return getNativeLiveRange(video);
    }
    const hasSeekable = Boolean(video.seekable) && video.seekable.length > 0;

    if (hasSeekable && (!Number.isFinite(video.duration) || video.duration <= 0)) {
      const start = video.seekable.start(0);
      const end = video.seekable.end(video.seekable.length - 1);
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
    if (isShortsPage()) return location.pathname.split("/")[2] || null;
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
  function getLiveEdge(video = getVideo()) {
    const bounds = getSeekRange(video);
    return bounds ? bounds.end : null;
  }

  /** В эфире ли текущая позиция (единая проверка для кнопки и полоски). */
  function isAtLiveEdge(video = getVideo()) {
    if (!video || isAdShowing(video) || !isLive(video)) {
      return false;
    }
    return hasPlayingLiveHead(video);
  }

  /**
   * Возврат в прямой эфир. Перематываем не в сам край, а чуть позади него
   * (liveResumeTarget): прыжок вплотную к краю подвешивал плеер — он ждал
   * сегмент, которого на сервере ещё нет, и картинка вставала до
   * перезагрузки страницы. Если стояли на паузе — снимаем её, иначе
   * «вернуться в эфир» оставляло бы замерший кадр.
   * Не эфир или нет буфера -> false.
   */
  function seekToLive(video = getVideo()) {
    if (!video || isAdShowing(video) || !isLive(video)) {
      return false;
    }
    const badge = getLiveBadge(video);
    if (badge && typeof badge.click === "function") {
      badge.click();
      if (video.paused) {
        YTFP.sleepTimer?.resume();
        video.play().catch(() => {});
      }
      return true;
    }
    const bounds = getSeekRange(video);
    if (!bounds) {
      return false;
    }
    const target = YTFP.utils.liveResumeTarget(bounds.start, bounds.end);
    if (target === null) {
      return false;
    }
    video.currentTime = target;
    if (video.paused) {
      YTFP.sleepTimer?.resume();
      video.play().catch(() => {});
    }
    watchLiveStall(video, target);
    return true;
  }

  // Через сколько проверяем, что после возврата в эфир картинка пошла, и на
  // сколько отходим назад, если не пошла.
  const LIVE_STALL_CHECK_MS = 2000;
  const LIVE_STALL_EXTRA_BACKOFF_SECONDS = 10;

  /**
   * Подстраховка на случай, если сегмента у края всё-таки не оказалось:
   * позиция не сдвинулась — уходим ещё дальше в буфер, где данные точно
   * есть. Одна попытка: дальше это уже не край эфира, а проблемы со связью.
   */
  function watchLiveStall(video, target) {
    setTimeout(() => {
      // Пауза — осознанное действие пользователя, не зависание.
      if (video.paused || video.currentTime > target + 0.5) {
        return;
      }
      const bounds = getSeekRange(video);
      if (!bounds) {
        return;
      }
      video.currentTime = Math.max(
        bounds.start,
        target - LIVE_STALL_EXTRA_BACKOFF_SECONDS
      );
    }, LIVE_STALL_CHECK_MS);
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
      YTFP.sleepTimer?.resume();
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
    seekBy, seekToLive, togglePlayPause, setSpeed
  };
})();
