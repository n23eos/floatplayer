"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Колонка рекомендаций внутри PiP-окна: стрелка у правого края открывает
// панель со списком видео из сайдбара страницы (#secondary). Клик по видео
// переключает его прямо в мини-окне (SPA-навигация страницы, плеер остаётся).
YTFP.pipRelated = (() => {
  const MAX_ITEMS = 20;

  function t(key, fallback) { return chrome.i18n.getMessage(key) || fallback; }
  function navigateToVideoId(id) { return YTFP.navigation.go(id); }

  /**
   * Реагировать ли на событие ended автопереходом (очередь или следующее
   * видео). На прямом эфире — нет: у части стримов duration конечная и
   * «кривая», и перемотка к краю эфира (кнопка LIVE) выбивает ложный
   * ended — автопереход уводил бы зрителя с эфира на другое видео.
   */
  function shouldAutoAdvanceOnEnded(isLive) {
    return !isLive;
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

  function build(pipDocument, { getVideo, onQueueEmptyEnded } = {}) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-related-root";

    // Стрелка у правого края.
    const toggle = pipDocument.createElement("button");
    toggle.className = "ytfp-related-toggle";
    YTFP.tooltips.attach(toggle, chrome.i18n.getMessage("relatedTooltip") || "Recommendations");
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
      if (!isOpen) return;
      queueList.replaceChildren();
      const { items: queue, error, busy } = YTFP.watchQueue.get();
      queueSection.style.display = queue.length > 0 || error ? "" : "none";
      queueHeader.textContent = error ? t("queueError", "Queue could not be saved or opened. Retry.") : t("queueTitle", "Queue");
      if (error) {
        const retrySave = pipDocument.createElement("button"); retrySave.className = "ytfp-btn";
        retrySave.textContent = t("queueRetry", "Retry saving"); retrySave.onclick = () => YTFP.watchQueue.retry();
        queueList.append(retrySave);
      }
      if (queue.length) {
        const retry = pipDocument.createElement("button");
        retry.className = "ytfp-btn";
        retry.textContent = t("queuePlayNext", "Play next");
        retry.disabled = busy;
        retry.onclick = () => { YTFP.sleepTimer.resume(); YTFP.watchQueue.playNext(); };
        queueList.appendChild(retry);
      }
      queue.forEach((item, index) => {
        const row = pipDocument.createElement("div");
        row.className = "ytfp-related-item ytfp-queue-item";

        const thumbnailUrl = `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`;
        if (thumbnailUrl) {
          const thumb = pipDocument.createElement("img");
          thumb.className = "ytfp-related-thumb";
          thumb.src = thumbnailUrl;
          thumb.alt = "";
          row.appendChild(thumb);
        }
        const title = pipDocument.createElement("span");
        title.className = "ytfp-related-title";
        title.textContent = item.title;
        row.appendChild(title);

        const removeButton = pipDocument.createElement("button");
        removeButton.className = "ytfp-queue-remove";
        YTFP.tooltips.attach(removeButton, t("queueRemove", "Remove from queue"));
        removeButton.textContent = "×";
        removeButton.addEventListener("click", () => {
          YTFP.watchQueue.remove(item.videoId);
        });
        removeButton.disabled = busy;
        for (const [direction, label] of [[-1, "↑"], [1, "↓"]]) {
          const move = pipDocument.createElement("button");
          move.className = "ytfp-btn";
          move.textContent = label;
          const moveLabel = direction < 0
            ? t("queueMoveUp", "Move up")
            : t("queueMoveDown", "Move down");
          YTFP.tooltips.attach(move, `${moveLabel}: ${item.title}`);
          move.disabled = busy || (direction < 0 ? index === 0 : index === queue.length - 1);
          move.onclick = () => YTFP.watchQueue.move(item.videoId, direction);
          row.appendChild(move);
        }
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
        const row = pipDocument.createElement("div");
        row.className = "ytfp-related-item";

        const openButton = pipDocument.createElement("button");
        openButton.className = "ytfp-related-open";
        openButton.type = "button";
        if (item.thumbnailUrl) {
          const thumb = pipDocument.createElement("img");
          thumb.className = "ytfp-related-thumb";
          thumb.src = item.thumbnailUrl;
          thumb.alt = "";
          openButton.appendChild(thumb);
        }
        const title = pipDocument.createElement("span");
        title.className = "ytfp-related-title";
        title.textContent = item.title;
        openButton.appendChild(title);
        row.appendChild(openButton);

        openButton.addEventListener("click", async () => {
          if (openButton.disabled || disposed) return;
          openButton.disabled = true;
          YTFP.sleepTimer.resume();
          try {
            const opened = await navigateToVideoId(item.videoId);
            if (disposed) return;
            if (opened) setOpen(false);
            else {
              openButton.title = t("queueError", "Video could not be opened. Retry.");
            }
          } finally {
            openButton.disabled = false;
          }
        });

        // «+» — добавить в очередь, не переключая текущее видео.
        if (item.videoId) {
          const addButton = pipDocument.createElement("button");
          addButton.className = "ytfp-queue-add";
          YTFP.tooltips.attach(addButton, t("queueAdd", "Add to queue"));
          addButton.textContent = "+";
          addButton.addEventListener("click", (event) => {
            event.stopPropagation(); // не переключать видео кликом по строке
            YTFP.watchQueue.add(item);
          });
          row.appendChild(addButton);
          const nextButton = pipDocument.createElement("button");
          nextButton.className = "ytfp-queue-add";
          nextButton.textContent = "↥";
          YTFP.tooltips.attach(nextButton, t("queueFirst", "Add as next"));
          nextButton.onclick = () => YTFP.watchQueue.add(item, true);
          row.appendChild(nextButton);
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
    let disposed = false;
    async function onEnded() {
      if (YTFP.sleepTimer.blocksAdvance()) return;
      if (!shouldAutoAdvanceOnEnded(YTFP.playerApi.isLive())) {
        return;
      }
      if (await YTFP.watchQueue.playNext()) {
        renderQueue();
        return;
      }
      if (disposed || YTFP.sleepTimer.blocksAdvance()) return;
      // Очередь пуста — решение за вызывающим (автовоспроизведение YouTube).
      if (onQueueEmptyEnded) {
        onQueueEmptyEnded();
      }
    }
    if (video) {
      video.addEventListener("ended", onEnded);
    }

    YTFP.watchQueue.onChange(renderQueue);
    function cleanup() {
      disposed = true;
      YTFP.watchQueue.offChange(renderQueue);
      // Остальные слушатели живут на элементах панели — уйдут вместе с окном.
      if (video) {
        video.removeEventListener("ended", onEnded);
      }
    }

    return { element: root, cleanup };
  }

  return { build, shouldAutoAdvanceOnEnded };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.pipRelated;
}
