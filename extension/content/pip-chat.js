"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Боковая панель PiP-окна: колонка у правого края поверх видео, включается
// круглой кнопкой в нижнем правом углу. Содержимое зависит от видео —
// на прямом эфире чат трансляции, на обычном видео комментарии
// (их рисует pip-comments.js).
//
// Родной iframe#chatframe страницы переносить нельзя по двум причинам:
// у него нет атрибута src (YouTube ставит адрес программно, с токеном
// continuation), а перенос iframe между документами по спеке перезагружает
// его. Поэтому строим свой на попап-адресе чата — документ PiP-окна имеет
// origin youtube.com, и эта страница там открывается без ограничений.
YTFP.pipChat = (() => {
  // Как часто сверяем, не сменилось ли видео и не кончился ли эфир.
  const SYNC_INTERVAL_MS = 1000;

  // Одиночное облачко — чат, двойное — комментарии.
  const CHAT_ICON = "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z";
  const COMMENTS_ICON =
    "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z" +
    "M17 12V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z";

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

  function createIcon(doc, pathData) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
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

    const panel = pipDocument.createElement("div");
    panel.className = "ytfp-chat-panel";

    const frame = pipDocument.createElement("iframe");
    frame.className = "ytfp-chat-frame";
    frame.title = t("chatTooltip", "Live chat");

    const comments = YTFP.pipComments.create(pipDocument);

    panel.append(frame, comments.element);
    // Кнопку в корень не кладём: её забирает нижняя капсула
    // (pip-controller), а корень остаётся выдвижной колонкой у края.
    root.append(panel);

    let isOpen = false;
    // "chat" на эфире, "comments" на обычном видео. null — режим ещё не
    // выбран: первый refresh() всегда считается сменой и всё расставляет.
    let mode = null;
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

    /** Переносит настройку прозрачности в CSS-переменную окна. */
    function applyPanelOpacity(settings) {
      const percent = YTFP.settingsSchema.normalizeChatOpacity(
        settings.chatPanelOpacity
      );
      pipDocument.documentElement.style.setProperty(
        "--ytfp-chat-bg-alpha",
        String(percent / 100)
      );
    }

    applyPanelOpacity(YTFP.settings.get());
    // Живое обновление со страницы настроек, без переоткрытия окна.
    YTFP.settings.onChange(applyPanelOpacity);

    function syncFrame() {
      const videoId = YTFP.playerApi.getVideoId();
      if (!videoId || videoId === loadedVideoId) {
        return;
      }
      loadedVideoId = videoId;
      frame.src = chatUrl(videoId);
    }

    /** Подтягивает содержимое текущего режима под видео, которое играет. */
    function syncContent() {
      if (mode === "chat") {
        syncFrame();
        return;
      }
      comments.load(YTFP.playerApi.getVideoId());
    }

    function setOpen(open) {
      isOpen = open;
      panel.classList.toggle("ytfp-chat-panel--open", open);
      toggle.classList.toggle("ytfp-chat-toggle--open", open);
      // Панель рекомендаций живёт в том же углу. Пока панель открыта, прячем
      // её классом на <body> — CSS вместо обращения к чужому модулю.
      pipDocument.body.classList.toggle("ytfp-chat-open", open);
      if (open) {
        syncContent();
      }
    }

    toggle.addEventListener("click", () => setOpen(!isOpen));

    /** Переключает панель между чатом и комментариями. */
    function setMode(nextMode) {
      mode = nextMode;
      const isChat = mode === "chat";
      const title = isChat ? t("chatTooltip", "Live chat") : t("commentsTooltip", "Comments");
      YTFP.tooltips.attach(toggle, title);
      toggle.replaceChildren(createIcon(pipDocument, isChat ? CHAT_ICON : COMMENTS_ICON));
      frame.hidden = !isChat;
      comments.element.hidden = isChat;
      // Чат на паузе не нужен: пустой src снимает соединение и звук
      // уведомлений, а вернувшись на эфир, syncFrame() загрузит его заново.
      if (!isChat && loadedVideoId !== null) {
        loadedVideoId = null;
        frame.removeAttribute("src");
      }
    }

    // Видео в окне меняется без перезагрузки (очередь, рекомендации,
    // «вперёд»), поэтому периодически сверяемся с текущим.
    function refresh() {
      const nextMode = YTFP.playerApi.isLive() ? "chat" : "comments";
      if (nextMode !== mode) {
        setMode(nextMode);
      }
      if (isOpen) {
        syncContent();
      }
    }

    refresh();
    const ticker = setInterval(refresh, SYNC_INTERVAL_MS);

    function cleanup() {
      clearInterval(ticker);
      YTFP.settings.offChange(applyPanelOpacity);
      frame.removeEventListener("load", makeFrameTransparent);
      comments.cleanup();
      // Класс живёт на теле окна: окно умрёт вместе с ним, но при возврате
      // плеера на страницу состояние должно быть чистым.
      pipDocument.body.classList.remove("ytfp-chat-open");
    }

    // element — колонка у края, toggle — кнопка для нижней капсулы.
    return { element: root, toggle, cleanup };
  }

  return { build };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.pipChat;
}
