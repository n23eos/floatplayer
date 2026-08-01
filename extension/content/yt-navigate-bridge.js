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
  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== MESSAGE_TYPE) {
      return;
    }
    const videoId = data.videoId;
    if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) {
      return;
    }
    const app = document.querySelector("ytd-app");
    if (!app || typeof app.fire !== "function") {
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
