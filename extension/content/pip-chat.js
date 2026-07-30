"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Чат прямого эфира внутри PiP-окна: колонка поверх видео у правого края,
// включается кнопкой в панели.
//
// Родной iframe#chatframe страницы переносить нельзя по двум причинам:
// у него нет атрибута src (YouTube ставит адрес программно, с токеном
// continuation), а перенос iframe между документами по спеке перезагружает
// его. Поэтому строим свой на попап-адресе чата — документ PiP-окна имеет
// origin youtube.com, и эта страница там открывается без ограничений.
YTFP.pipChat = (() => {
  // Как часто сверяем, не сменилось ли видео в окне и не кончился ли эфир.
  const SYNC_INTERVAL_MS = 3000;

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function chatUrl(videoId) {
    // dark_theme: окно чёрное, светлый чат резал бы глаза.
    return `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(videoId)}&dark_theme=true`;
  }

  /** Возвращает { element, cleanup, toggle, isOpen }. */
  function build(pipDocument) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-chat-root";

    const frame = pipDocument.createElement("iframe");
    frame.className = "ytfp-chat-frame";
    frame.title = t("chatTooltip", "Live chat");
    root.appendChild(frame);

    let isOpen = false;
    // Какой ID сейчас загружен во фрейме: повторная запись того же src
    // перезагрузила бы чат, и он моргал бы на каждом тике.
    let loadedVideoId = null;

    function syncFrame() {
      const videoId = YTFP.playerApi.getVideoId();
      if (!videoId || videoId === loadedVideoId) {
        return;
      }
      loadedVideoId = videoId;
      frame.src = chatUrl(videoId);
    }

    function setOpen(open) {
      isOpen = open;
      root.classList.toggle("ytfp-chat-root--open", open);
      // Панель рекомендаций живёт в том же углу. Пока чат открыт, прячем её
      // классом на <body> — CSS вместо обращения к чужому модулю.
      pipDocument.body.classList.toggle("ytfp-chat-open", open);
      if (open) {
        syncFrame();
      }
    }

    function toggle() {
      setOpen(!isOpen);
      return isOpen;
    }

    // Видео в окне меняется без перезагрузки (очередь, рекомендации,
    // «вперёд»), поэтому периодически сверяемся с текущим.
    const ticker = setInterval(() => {
      if (!isOpen) {
        return;
      }
      if (!YTFP.playerApi.isLive()) {
        setOpen(false); // ушли на обычное видео — чату нечего показывать
        return;
      }
      syncFrame();
    }, SYNC_INTERVAL_MS);

    function cleanup() {
      clearInterval(ticker);
      // Класс живёт на теле окна: окно умрёт вместе с ним, но при возврате
      // плеера на страницу состояние должно быть чистым.
      pipDocument.body.classList.remove("ytfp-chat-open");
    }

    return { element: root, cleanup, toggle, isOpen: () => isOpen };
  }

  return { build };
})();
