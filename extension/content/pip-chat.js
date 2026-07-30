"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Чат прямого эфира внутри PiP-окна: колонка у правого края поверх видео,
// включается круглой кнопкой в нижнем правом углу.
//
// Родной iframe#chatframe страницы переносить нельзя по двум причинам:
// у него нет атрибута src (YouTube ставит адрес программно, с токеном
// continuation), а перенос iframe между документами по спеке перезагружает
// его. Поэтому строим свой на попап-адресе чата — документ PiP-окна имеет
// origin youtube.com, и эта страница там открывается без ограничений.
YTFP.pipChat = (() => {
  // Как часто сверяем, не сменилось ли видео и не кончился ли эфир.
  const SYNC_INTERVAL_MS = 1000;

  const CHAT_ICON = "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z";

  const TRANSPARENT_STYLE_ID = "ytfp-chat-transparent";
  // Страница чата рисует свой непрозрачный фон, поэтому одной прозрачности
  // контейнера мало — гасим фон и внутри фрейма. Текст сообщений остаётся
  // полностью непрозрачным: гасим фон, а не opacity всей панели.
  const TRANSPARENT_CSS = `
    html, body,
    yt-live-chat-app,
    yt-live-chat-renderer,
    yt-live-chat-item-list-renderer,
    #chat,
    #contents,
    #items,
    #item-scroller,
    #item-offset {
      background: transparent !important;
    }
  `;

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function createIcon(doc) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", CHAT_ICON);
    svg.appendChild(path);
    return svg;
  }

  function chatUrl(videoId) {
    // dark_theme: светлый чат поверх видео читался бы хуже тёмного.
    return `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(videoId)}&dark_theme=true`;
  }

  /** Возвращает { element, cleanup }. */
  function build(pipDocument) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-chat-root";

    const toggle = pipDocument.createElement("button");
    toggle.className = "ytfp-chat-toggle";
    toggle.title = t("chatTooltip", "Live chat");
    toggle.appendChild(createIcon(pipDocument));
    toggle.hidden = true; // покажем, когда подтвердим живой эфир

    const panel = pipDocument.createElement("div");
    panel.className = "ytfp-chat-panel";

    const frame = pipDocument.createElement("iframe");
    frame.className = "ytfp-chat-frame";
    frame.title = t("chatTooltip", "Live chat");
    panel.appendChild(frame);
    root.append(toggle, panel);

    let isOpen = false;
    // Какой ID сейчас загружен во фрейме: повторная запись того же src
    // перезагрузила бы чат, и он моргал бы на каждом тике.
    let loadedVideoId = null;

    /** Гасит фон внутри страницы чата. Фрейм свой, origin тот же. */
    function makeFrameTransparent() {
      let frameDocument = null;
      try {
        frameDocument = frame.contentDocument;
      } catch (error) {
        // Чужой origin — например, YouTube увёл фрейм на consent-страницу.
        console.warn("[YTFP] Chat frame is not same-origin, keeping it opaque:", error);
        return;
      }
      if (!frameDocument || !frameDocument.head) {
        return;
      }
      if (frameDocument.getElementById(TRANSPARENT_STYLE_ID)) {
        return;
      }
      const style = frameDocument.createElement("style");
      style.id = TRANSPARENT_STYLE_ID;
      style.textContent = TRANSPARENT_CSS;
      frameDocument.head.appendChild(style);
    }

    // Каждая загрузка — новый документ, стиль надо вносить заново.
    frame.addEventListener("load", makeFrameTransparent);

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
      panel.classList.toggle("ytfp-chat-panel--open", open);
      toggle.classList.toggle("ytfp-chat-toggle--open", open);
      // Панель рекомендаций живёт в том же углу. Пока чат открыт, прячем её
      // классом на <body> — CSS вместо обращения к чужому модулю.
      pipDocument.body.classList.toggle("ytfp-chat-open", open);
      if (open) {
        syncFrame();
      }
    }

    toggle.addEventListener("click", () => setOpen(!isOpen));

    // Видео в окне меняется без перезагрузки (очередь, рекомендации,
    // «вперёд»), поэтому периодически сверяемся с текущим.
    function refresh() {
      const isLive = YTFP.playerApi.isLive();
      toggle.hidden = !isLive;
      if (!isLive) {
        if (isOpen) {
          setOpen(false); // ушли на обычное видео — чату нечего показывать
        }
        return;
      }
      if (isOpen) {
        syncFrame();
      }
    }

    refresh();
    const ticker = setInterval(refresh, SYNC_INTERVAL_MS);

    function cleanup() {
      clearInterval(ticker);
      frame.removeEventListener("load", makeFrameTransparent);
      // Класс живёт на теле окна: окно умрёт вместе с ним, но при возврате
      // плеера на страницу состояние должно быть чистым.
      pipDocument.body.classList.remove("ytfp-chat-open");
    }

    return { element: root, cleanup };
  }

  return { build };
})();
