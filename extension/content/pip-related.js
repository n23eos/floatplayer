"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Колонка рекомендаций внутри PiP-окна: стрелка у правого края открывает
// панель со списком видео из сайдбара страницы (#secondary). Клик по видео
// переключает его прямо в мини-окне (SPA-навигация страницы, плеер остаётся).
YTFP.pipRelated = (() => {
  const MAX_ITEMS = 20;

  // Очередь просмотра: живёт в памяти страницы (переживает переоткрытие окна,
  // сбрасывается при перезагрузке вкладки). [{ videoId, title, thumbnailUrl }]
  let queue = [];

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  /** Находит на странице ссылку на видео и кликает её (SPA-переход, окно живёт). */
  function navigateToVideoId(videoId) {
    const anchor = document.querySelector(`a[href*="/watch?v=${CSS.escape(videoId)}"]`);
    if (anchor) {
      anchor.click();
      return true;
    }
    return false;
  }

  /** Переход к первому видео очереди по окончании текущего. */
  function playNextFromQueue() {
    while (queue.length > 0) {
      const next = queue[0];
      if (navigateToVideoId(next.videoId)) {
        queue = queue.slice(1);
        return true;
      }
      // Ссылки на странице нет (сайдбар перерисовался) — выбрасываем элемент,
      // полная навигация закрыла бы PiP-окно.
      console.warn("[YTFP] Queue item link not found on page:", next.videoId);
      queue = queue.slice(1);
    }
    return false;
  }

  /**
   * Собирает рекомендации из DOM страницы. Возвращает
   * [{ title, thumbnailUrl, anchor }] — anchor кликаем для перехода.
   */
  function collectRecommendations() {
    const secondary = document.querySelector("#secondary");
    if (!secondary) {
      return [];
    }
    const seenHrefs = new Set();
    const items = [];
    const anchors = secondary.querySelectorAll('a[href*="/watch?v="]');
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href").split("&")[0];
      if (seenHrefs.has(href)) {
        continue;
      }
      // Контейнер одной рекомендации (старый и новый UI).
      const container = anchor.closest(
        "ytd-compact-video-renderer, yt-lockup-view-model, ytd-item-section-renderer > *"
      );
      if (!container) {
        continue;
      }
      const titleEl = container.querySelector(
        '#video-title, [class*="title"] span, h3'
      );
      const title = (titleEl ? titleEl.textContent : anchor.textContent).trim();
      if (!title) {
        continue;
      }
      // Обложку строим по ID видео: сайдбар страницы грузит картинки лениво,
      // и у видео ниже экрана src ещё пустой. i.ytimg.com отдаёт превью всегда.
      const videoId = new URLSearchParams(href.split("?")[1] || "").get("v");
      seenHrefs.add(href);
      items.push({
        title,
        videoId,
        thumbnailUrl: videoId
          ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`
          : null,
        anchor
      });
      if (items.length >= MAX_ITEMS) {
        break;
      }
    }
    return items;
  }

  function build(pipDocument, { getVideo } = {}) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-related-root";

    // Стрелка у правого края.
    const toggle = pipDocument.createElement("button");
    toggle.className = "ytfp-related-toggle";
    toggle.title = chrome.i18n.getMessage("relatedTooltip") || "Recommendations";
    toggle.textContent = "‹";

    const panel = pipDocument.createElement("div");
    panel.className = "ytfp-related-panel";

    // Секция очереди — над списком рекомендаций, видна только когда не пуста.
    const queueSection = pipDocument.createElement("div");
    queueSection.className = "ytfp-queue";
    const queueHeader = pipDocument.createElement("div");
    queueHeader.className = "ytfp-queue-header";
    queueHeader.textContent = t("queueTitle", "Queue");
    const queueList = pipDocument.createElement("div");
    queueList.className = "ytfp-related-list";
    queueSection.append(queueHeader, queueList);

    const list = pipDocument.createElement("div");
    list.className = "ytfp-related-list";
    panel.append(queueSection, list);

    let isOpen = false;

    function renderQueue() {
      queueList.replaceChildren();
      queueSection.style.display = queue.length > 0 ? "" : "none";
      queue.forEach((item, index) => {
        const row = pipDocument.createElement("div");
        row.className = "ytfp-related-item ytfp-queue-item";

        if (item.thumbnailUrl) {
          const thumb = pipDocument.createElement("img");
          thumb.className = "ytfp-related-thumb";
          thumb.src = item.thumbnailUrl;
          thumb.alt = "";
          row.appendChild(thumb);
        }
        const title = pipDocument.createElement("span");
        title.className = "ytfp-related-title";
        title.textContent = item.title;
        row.appendChild(title);

        const removeButton = pipDocument.createElement("button");
        removeButton.className = "ytfp-queue-remove";
        removeButton.title = t("queueRemove", "Remove from queue");
        removeButton.textContent = "×";
        removeButton.addEventListener("click", () => {
          queue = queue.filter((_, i) => i !== index);
          renderQueue();
        });
        row.appendChild(removeButton);
        queueList.appendChild(row);
      });
    }

    function renderList() {
      list.replaceChildren();
      const items = collectRecommendations();
      if (items.length === 0) {
        const empty = pipDocument.createElement("div");
        empty.className = "ytfp-related-empty";
        empty.textContent =
          chrome.i18n.getMessage("relatedEmpty") || "No recommendations found";
        list.appendChild(empty);
        return;
      }
      for (const item of items) {
        const row = pipDocument.createElement("button");
        row.className = "ytfp-related-item";

        if (item.thumbnailUrl) {
          const thumb = pipDocument.createElement("img");
          thumb.className = "ytfp-related-thumb";
          thumb.src = item.thumbnailUrl;
          thumb.alt = "";
          row.appendChild(thumb);
        }
        const title = pipDocument.createElement("span");
        title.className = "ytfp-related-title";
        title.textContent = item.title;
        row.appendChild(title);

        row.addEventListener("click", () => {
          // SPA-переход на странице: плеер остаётся в мини-окне,
          // видео переключается.
          item.anchor.click();
          setOpen(false);
          // Список обновится к следующему открытию (страница перерисуется).
        });

        // «+» — добавить в очередь, не переключая текущее видео.
        if (item.videoId) {
          const addButton = pipDocument.createElement("button");
          addButton.className = "ytfp-queue-add";
          addButton.title = t("queueAdd", "Add to queue");
          addButton.textContent = "+";
          addButton.addEventListener("click", (event) => {
            event.stopPropagation(); // не переключать видео кликом по строке
            if (!queue.some((queued) => queued.videoId === item.videoId)) {
              queue = [...queue, {
                videoId: item.videoId,
                title: item.title,
                thumbnailUrl: item.thumbnailUrl
              }];
            }
            renderQueue();
          });
          row.appendChild(addButton);
        }
        list.appendChild(row);
      }
    }

    function setOpen(open) {
      isOpen = open;
      panel.classList.toggle("ytfp-related-panel--open", open);
      toggle.classList.toggle("ytfp-related-toggle--open", open);
      toggle.textContent = open ? "›" : "‹";
      if (open) {
        renderQueue();
        renderList();
      }
    }

    toggle.addEventListener("click", () => setOpen(!isOpen));
    root.append(toggle, panel);
    renderQueue(); // скрыть пустую секцию очереди до первого открытия панели

    // Автопереход к следующему видео очереди по окончании текущего.
    // При video.loop = true событие ended не приходит — loop приоритетнее.
    const video = getVideo ? getVideo() : null;
    function onEnded() {
      if (playNextFromQueue()) {
        renderQueue();
      }
    }
    if (video) {
      video.addEventListener("ended", onEnded);
    }

    function cleanup() {
      // Остальные слушатели живут на элементах панели — уйдут вместе с окном.
      if (video) {
        video.removeEventListener("ended", onEnded);
      }
    }

    return { element: root, cleanup };
  }

  return { build };
})();
