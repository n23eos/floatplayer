"use strict";

// Мостик в основном мире страницы (world: "MAIN" в манифесте).
//
// Переход на произвольный шортс без перезагрузки страницы возможен только
// через внутренний роутер YouTube: ytd-app.fire("yt-navigate", {endpoint}).
// Синтетический клик по <a href="/shorts/…"> даёт полную перезагрузку —
// она закрыла бы PiP-окно вместе с вынесенным туда плеером.
//
// Контент-скрипты расширения живут в изолированном мире и методов страницы
// не видят, поэтому здесь минимальный посредник: изолированный мир шлёт
// postMessage с id ролика, а этот скрипт зовёт роутер.
//
// Безопасность: принимаем только сообщения самого окна, id проверяем по
// строгому шаблону и endpoint собираем сами — произвольные данные из
// сообщения на страницу не проходят.
(() => {
  const MESSAGE_TYPE = "ytfp-shorts-navigate";
  const PLAYER_READY_REQUEST = "ytfp-player-ready";
  const PLAYER_READY_RESPONSE = "ytfp-player-ready-result";
  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) {
      return;
    }
    const data = event.data;
    if (!data) {
      return;
    }
    const videoId = data.videoId;
    if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) {
      return;
    }
    if (data.type === PLAYER_READY_REQUEST) {
      if (typeof data.requestId !== "string" || !REQUEST_ID_PATTERN.test(data.requestId)) {
        return;
      }
      const player = document.querySelector("#movie_player");
      const video = player?.querySelector("video");
      let currentVideoId = "";
      try {
        currentVideoId = player?.getVideoData?.().video_id || "";
      } catch (_) {
        currentVideoId = "";
      }
      const targetPage = location.pathname === "/watch" &&
        new URLSearchParams(location.search).get("v") === videoId;
      window.postMessage({
        type: PLAYER_READY_RESPONSE,
        requestId: data.requestId,
        videoId,
        ready: Boolean(targetPage && currentVideoId === videoId && video && video.readyState >= 1)
      }, location.origin);
      return;
    }
    if (![MESSAGE_TYPE, "ytfp-watch-navigate"].includes(data.type)) {
      return;
    }
    const app = document.querySelector("ytd-app");
    if (!app || typeof app.fire !== "function") {
      return;
    }
    if (data.type === "ytfp-watch-navigate") {
      app.fire("yt-navigate", { endpoint: {
        commandMetadata: { webCommandMetadata: { url: `/watch?v=${videoId}`, webPageType: "WEB_PAGE_TYPE_WATCH", rootVe: 3832 } },
        watchEndpoint: { videoId }
      } });
      return;
    }
    app.fire("yt-navigate", {
      endpoint: {
        commandMetadata: {
          webCommandMetadata: {
            url: `/shorts/${videoId}`,
            webPageType: "WEB_PAGE_TYPE_SHORTS",
            rootVe: 37414
          }
        },
        reelWatchEndpoint: { videoId }
      }
    });
  });
})();
