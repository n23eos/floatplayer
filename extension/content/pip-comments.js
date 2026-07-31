"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Комментарии к обычному видео в боковой панели PiP-окна. Живут там же, где
// чат трансляции: на эфире панель показывает чат, на обычном видео — этот
// список (переключает pip-chat.js).
//
// Почему свой список, а не готовая разметка YouTube:
// - popout-адреса для комментариев не существует, фреймить watch-страницу
//   нельзя — внутри фрейма заводится второй плеер и играет параллельно;
// - перенести ytd-comments со страницы можно (adoptNode работает), но
//   дозагрузку следующих порций дёргает код YouTube своим
//   IntersectionObserver в документе страницы, а звать методы Polymer из
//   изолированного мира content-скрипта нельзя — список замер бы на том,
//   что успело загрузиться.
//
// Поэтому берём данные из того же innertube API, которым пользуется сама
// страница, и рисуем список сами. Только чтение: отправка, лайки и ветки
// ответов остаются на странице.
YTFP.pipComments = (() => {
  const NEXT_ENDPOINT = "https://www.youtube.com/youtubei/v1/next";
  // За сколько пикселей до низа списка просим следующую порцию.
  const LOAD_MORE_MARGIN_PX = 300;

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  // --- Слой API -------------------------------------------------------------

  // Ключ и версия клиента лежат в тексте <script> страницы. Это обычный
  // текстовый узел, поэтому изолированный мир его читает без всяких трюков
  // (в отличие от переменной ytcfg, которая живёт в мире страницы).
  let clientConfig = null;

  function readClientConfig() {
    if (clientConfig) {
      return clientConfig;
    }
    for (const script of document.querySelectorAll("script")) {
      const text = script.textContent;
      if (!text || !text.includes("INNERTUBE_API_KEY")) {
        continue;
      }
      const key = text.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      const version = text.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
      if (key && version) {
        clientConfig = { key: key[1], version: version[1] };
        return clientConfig;
      }
    }
    return null;
  }

  async function callNext(payload, signal) {
    const config = readClientConfig();
    if (!config) {
      throw new Error("innertube config not found on the page");
    }
    const response = await fetch(`${NEXT_ENDPOINT}?key=${config.key}&prettyPrint=false`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: config.version,
            hl: chrome.i18n.getUILanguage().split("-")[0]
          }
        },
        ...payload
      })
    });
    if (!response.ok) {
      throw new Error(`innertube next failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Токен секции комментариев лежит глубоко в ответе и на разной глубине для
   * разных раскладок страницы, поэтому обходим дерево, а не идём по пути.
   */
  function findCommentToken(root) {
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== "object") {
        continue;
      }
      if (node.sectionIdentifier === "comment-item-section") {
        const item = (node.contents || []).find((entry) => entry.continuationItemRenderer);
        const token = item &&
          item.continuationItemRenderer.continuationEndpoint &&
          item.continuationItemRenderer.continuationEndpoint.continuationCommand;
        if (token) {
          return token.token;
        }
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === "object") {
          stack.push(value);
        }
      }
    }
    return null;
  }

  function collectItems(body) {
    return (body.onResponseReceivedEndpoints || []).flatMap((endpoint) => {
      const command = endpoint.reloadContinuationItemsCommand ||
        endpoint.appendContinuationItemsAction;
      return (command && command.continuationItems) || [];
    });
  }

  /**
   * Порядок берём из continuationItems, а содержимое — из мутаций по ключу:
   * commentViewModel.commentKey совпадает с entityKey мутации. Полагаться на
   * совпадение порядка двух списков нельзя.
   */
  function parsePage(body) {
    const items = collectItems(body);
    const mutations = ((body.frameworkUpdates || {}).entityBatchUpdate || {}).mutations || [];
    const payloadByKey = new Map();
    for (const mutation of mutations) {
      const payload = mutation.payload && mutation.payload.commentEntityPayload;
      if (payload && payload.key) {
        payloadByKey.set(payload.key, payload);
      }
    }

    const comments = [];
    let nextToken = null;
    for (const item of items) {
      if (item.continuationItemRenderer) {
        const command = item.continuationItemRenderer.continuationEndpoint &&
          item.continuationItemRenderer.continuationEndpoint.continuationCommand;
        nextToken = command ? command.token : null;
        continue;
      }
      const view = item.commentThreadRenderer &&
        item.commentThreadRenderer.commentViewModel &&
        item.commentThreadRenderer.commentViewModel.commentViewModel;
      const payload = view && payloadByKey.get(view.commentKey);
      if (!payload) {
        continue;
      }
      const author = payload.author || {};
      const properties = payload.properties || {};
      const toolbar = payload.toolbar || {};
      comments.push({
        author: author.displayName || "",
        avatar: author.avatarThumbnailUrl || "",
        isCreator: Boolean(author.isCreator),
        text: (properties.content && properties.content.content) || "",
        published: properties.publishedTime || "",
        likes: toolbar.likeCountNotliked || "",
        replies: toolbar.replyCount || "",
        pinned: Boolean(view.pinnedText)
      });
    }
    return { comments, nextToken };
  }

  // --- Панель ---------------------------------------------------------------

  function create(pipDocument) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-comments";

    const list = pipDocument.createElement("div");
    list.className = "ytfp-comments-list";

    const status = pipDocument.createElement("div");
    status.className = "ytfp-comments-status";
    root.append(list, status);

    // Поколение: пока летит запрос, видео в окне могло смениться. Ответ
    // старого поколения выбрасываем, иначе списки двух видео перемешаются.
    let generation = 0;
    let currentVideoId = null;
    let nextToken = null;
    let isLoading = false;
    let controller = null;

    function setStatus(text) {
      status.textContent = text;
      status.hidden = !text;
    }

    function renderComment(comment) {
      const item = pipDocument.createElement("div");
      item.className = "ytfp-comment";

      const avatar = pipDocument.createElement("img");
      avatar.className = "ytfp-comment-avatar";
      // Пустой src не ставим: img c src="" делает лишний запрос к URL страницы.
      if (comment.avatar) {
        avatar.src = comment.avatar;
      }
      avatar.alt = "";
      avatar.loading = "lazy";

      const body = pipDocument.createElement("div");
      body.className = "ytfp-comment-body";

      const head = pipDocument.createElement("div");
      head.className = "ytfp-comment-head";
      const author = pipDocument.createElement("span");
      author.className = "ytfp-comment-author";
      if (comment.isCreator) {
        author.classList.add("ytfp-comment-author--creator");
      }
      author.textContent = comment.author;
      const published = pipDocument.createElement("span");
      published.className = "ytfp-comment-time";
      published.textContent = comment.published;
      head.append(author, published);

      const text = pipDocument.createElement("div");
      text.className = "ytfp-comment-text";
      text.textContent = comment.text;

      const meta = pipDocument.createElement("div");
      meta.className = "ytfp-comment-meta";
      const parts = [];
      if (comment.likes) {
        parts.push(`♥ ${comment.likes}`);
      }
      if (comment.replies && comment.replies !== "0") {
        parts.push(`↩ ${comment.replies}`);
      }
      meta.textContent = parts.join("   ");

      body.append(head, text, meta);
      if (comment.pinned) {
        item.classList.add("ytfp-comment--pinned");
      }
      item.append(avatar, body);
      return item;
    }

    async function loadPage(token, expectedGeneration) {
      isLoading = true;
      controller = new AbortController();
      try {
        const body = await callNext(
          token ? { continuation: token } : { videoId: currentVideoId },
          controller.signal
        );
        if (expectedGeneration !== generation) {
          return; // видео сменилось, ответ уже не про него
        }
        if (!token) {
          // Первый вызов был про видео целиком — из него достаём токен
          // секции комментариев и сразу просим первую порцию.
          const sectionToken = findCommentToken(body);
          if (!sectionToken) {
            setStatus(t("commentsEmpty", "No comments"));
            return;
          }
          isLoading = false;
          await loadPage(sectionToken, expectedGeneration);
          return;
        }
        const page = parsePage(body);
        if (expectedGeneration !== generation) {
          return;
        }
        nextToken = page.nextToken;
        for (const comment of page.comments) {
          list.appendChild(renderComment(comment));
        }
        if (list.childElementCount === 0) {
          setStatus(t("commentsEmpty", "No comments"));
        } else {
          setStatus("");
        }
      } catch (error) {
        if (error.name === "AbortError" || expectedGeneration !== generation) {
          return;
        }
        console.warn("[YTFP] Could not load comments:", error);
        setStatus(t("commentsError", "Could not load comments"));
      } finally {
        if (expectedGeneration === generation) {
          isLoading = false;
        }
      }
    }

    /** Показывает комментарии к videoId; повторный вызов с тем же ID молчит. */
    function load(videoId) {
      if (!videoId || videoId === currentVideoId) {
        return;
      }
      generation += 1;
      if (controller) {
        controller.abort();
      }
      currentVideoId = videoId;
      nextToken = null;
      isLoading = false;
      list.replaceChildren();
      list.scrollTop = 0;
      setStatus(t("commentsLoading", "Loading…"));
      loadPage(null, generation);
    }

    // Подгрузка по скроллу. Обычный слушатель, а не IntersectionObserver:
    // наблюдатель создаётся в мире страницы, а цель живёт в документе
    // PiP-окна, и срабатывания оттуда ждать не приходится.
    function onScroll() {
      if (isLoading || !nextToken) {
        return;
      }
      const restPx = list.scrollHeight - list.scrollTop - list.clientHeight;
      if (restPx <= LOAD_MORE_MARGIN_PX) {
        loadPage(nextToken, generation);
      }
    }

    list.addEventListener("scroll", onScroll);

    function cleanup() {
      list.removeEventListener("scroll", onScroll);
      generation += 1; // ответы в полёте больше никого не интересуют
      if (controller) {
        controller.abort();
      }
    }

    return { element: root, load, cleanup };
  }

  return { create };
})();
