"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Интеграции, вшитые в само видео (спонсорские вставки): границы берём из
// краудсорсной базы SponsorBlock (sponsor.ajay.app), рисуем сегменты поверх
// родного таймлайна и показываем кнопку «перепрыгнуть» у конца вставки.
// Всё живёт внутри #movie_player, поэтому работает и на странице, и в PiP-окне.
YTFP.sponsorBlock = (() => {
  const API_URL = "https://sponsor.ajay.app/api/skipSegments";
  const CATEGORIES = ["sponsor", "selfpromo", "interaction"];
  const MARKER_COLOR = "rgba(0, 212, 0, 0.7)"; // зелёный SponsorBlock

  let segments = [];
  let loadedVideoId = null;
  let markerContainer = null;
  let skipButton = null;
  let attachedVideo = null;

  function isEnabled() {
    return YTFP.settings.get().sponsorSkip;
  }

  function getVideoIdFromUrl() {
    return new URLSearchParams(location.search).get("v");
  }

  function getPlayerRoot() {
    return YTFP.pip.getMovedPlayer() || document.querySelector(YTFP.SELECTORS.playerRoot);
  }

  async function fetchSegments(videoId) {
    try {
      const url =
        `${API_URL}?videoID=${encodeURIComponent(videoId)}` +
        `&categories=${encodeURIComponent(JSON.stringify(CATEGORIES))}`;
      // Таймаут: зависший API не должен вечно держать refresh().
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return []; // 404 — для видео нет размеченных сегментов
      }
      const data = await response.json();
      const rawPairs = Array.isArray(data) ? data.map((item) => item && item.segment) : [];
      return YTFP.utils.normalizeSegments(rawPairs);
    } catch (error) {
      console.warn("[YTFP] SponsorBlock fetch failed:", error);
      return [];
    }
  }

  // --- Маркеры на таймлайне --------------------------------------------------

  function removeMarkers() {
    if (markerContainer) {
      markerContainer.remove();
      markerContainer = null;
    }
  }

  function renderMarkers() {
    removeMarkers();
    if (!isEnabled() || segments.length === 0) {
      return;
    }
    const playerRoot = getPlayerRoot();
    const video = playerRoot && playerRoot.querySelector("video.html5-main-video");
    const progressBar = playerRoot && playerRoot.querySelector(".ytp-progress-bar");
    const duration = video && video.duration;
    if (!progressBar || !Number.isFinite(duration) || duration <= 0) {
      return; // длительность ещё неизвестна — перерисуем по durationchange
    }

    // Инлайновые стили: контейнер должен работать в обоих документах
    // (страница и PiP-окно) без отдельного CSS-файла.
    markerContainer = progressBar.ownerDocument.createElement("div");
    markerContainer.className = "ytfp-sb-markers";
    Object.assign(markerContainer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "30"
    });

    for (const segment of segments) {
      const marker = progressBar.ownerDocument.createElement("div");
      const leftPercent = (segment.start / duration) * 100;
      const widthPercent = ((segment.end - segment.start) / duration) * 100;
      Object.assign(marker.style, {
        position: "absolute",
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.3)}%`,
        top: "0",
        bottom: "0",
        background: MARKER_COLOR
      });
      markerContainer.appendChild(marker);
    }
    progressBar.appendChild(markerContainer);
  }

  // --- Кнопка «перепрыгнуть интеграцию» ---------------------------------------

  function removeSkipButton() {
    if (skipButton) {
      skipButton.remove();
      skipButton = null;
    }
  }

  function ensureSkipButton(playerRoot) {
    if (skipButton && skipButton.ownerDocument === playerRoot.ownerDocument) {
      return skipButton;
    }
    removeSkipButton();
    const label = chrome.i18n.getMessage("sbSkip") || "Пропустить интеграцию";
    skipButton = playerRoot.ownerDocument.createElement("button");
    skipButton.className = "ytfp-sb-skip";
    Object.assign(skipButton.style, {
      position: "absolute",
      bottom: "100px", // выше нашей нижней панели в PiP-окне
      transform: "translateX(-50%)",
      zIndex: "10001",
      display: "none",
      border: "0",
      borderRadius: "4px",
      padding: "8px 12px",
      background: "rgba(15, 15, 15, 0.9)",
      color: "#fff",
      fontFamily: '"Roboto", Arial, sans-serif',
      fontSize: "13px",
      cursor: "pointer",
      whiteSpace: "nowrap"
    });
    skipButton.dataset.label = label;
    skipButton.addEventListener("click", () => {
      const video = getPlayerRoot()?.querySelector("video.html5-main-video");
      const end = video && YTFP.utils.segmentEndAt(video.currentTime, segments);
      if (video && end !== null) {
        video.currentTime = end + 0.05;
      }
      hideSkipButton();
    });
    playerRoot.appendChild(skipButton);
    return skipButton;
  }

  function hideSkipButton() {
    if (skipButton) {
      skipButton.style.display = "none";
    }
  }

  function onTimeUpdate() {
    if (!isEnabled() || segments.length === 0) {
      hideSkipButton();
      return;
    }
    const playerRoot = getPlayerRoot();
    const video = playerRoot && playerRoot.querySelector("video.html5-main-video");
    if (!playerRoot || !video) {
      return;
    }
    // Во время настоящей рекламы YouTube текущее время — это время ролика,
    // а не видео: кнопку и логику не показываем.
    if (playerRoot.classList.contains("ad-showing")) {
      hideSkipButton();
      return;
    }
    const end = YTFP.utils.segmentEndAt(video.currentTime, segments);
    if (end === null) {
      hideSkipButton();
      return;
    }
    const button = ensureSkipButton(playerRoot);
    // Кнопка стоит над таймлайном там, где интеграция заканчивается.
    const duration = video.duration;
    const positionPercent = Number.isFinite(duration) && duration > 0
      ? YTFP.utils.clamp((end / duration) * 100, 8, 92)
      : 50;
    button.style.left = `${positionPercent}%`;
    button.textContent = `${button.dataset.label} → ${YTFP.utils.formatTime(end)}`;
    button.style.display = "block";
  }

  // --- Загрузка и привязка -----------------------------------------------------

  function attachVideoListeners(video) {
    if (attachedVideo === video) {
      return;
    }
    if (attachedVideo) {
      attachedVideo.removeEventListener("timeupdate", onTimeUpdate);
      attachedVideo.removeEventListener("durationchange", renderMarkers);
    }
    attachedVideo = video;
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("durationchange", renderMarkers);
    }
  }

  async function refresh() {
    const videoId = getVideoIdFromUrl();
    attachVideoListeners(YTFP.playerApi.getVideo());

    if (!videoId || !YTFP.playerApi.isWatchPage() || !isEnabled()) {
      segments = [];
      loadedVideoId = null;
      removeMarkers();
      hideSkipButton();
      return;
    }
    if (videoId === loadedVideoId) {
      renderMarkers(); // видео то же — просто перерисовать (например, после PiP)
      return;
    }
    loadedVideoId = videoId;
    segments = await fetchSegments(videoId);
    // Пока грузили — могли уйти на другое видео.
    if (loadedVideoId === videoId) {
      renderMarkers();
    }
  }

  function init() {
    document.addEventListener("yt-navigate-finish", () => {
      // Плеер и <video> могут пересоздаваться — небольшая задержка.
      setTimeout(refresh, 500);
      setTimeout(refresh, 2000);
    });
    YTFP.settings.onChange(refresh);
    setTimeout(refresh, 500);
  }

  /** Текущие сегменты (для красной полоски прогресса в PiP-окне). */
  function getSegments() {
    return segments;
  }

  return { init, refresh, getSegments };
})();

YTFP.sponsorBlock.init();
