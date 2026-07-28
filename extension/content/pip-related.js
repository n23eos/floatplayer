"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Колонка рекомендаций внутри PiP-окна: стрелка у правого края открывает
// панель со списком видео из сайдбара страницы (#secondary). Клик по видео
// переключает его прямо в мини-окне (SPA-навигация страницы, плеер остаётся).
YTFP.pipRelated = (() => {
  const MAX_ITEMS = 20;

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

  function build(pipDocument) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-related-root";

    // Стрелка у правого края.
    const toggle = pipDocument.createElement("button");
    toggle.className = "ytfp-related-toggle";
    toggle.title = chrome.i18n.getMessage("relatedTooltip") || "Recommendations";
    toggle.textContent = "‹";

    const panel = pipDocument.createElement("div");
    panel.className = "ytfp-related-panel";

    const list = pipDocument.createElement("div");
    list.className = "ytfp-related-list";
    panel.appendChild(list);

    let isOpen = false;

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
        list.appendChild(row);
      }
    }

    function setOpen(open) {
      isOpen = open;
      panel.classList.toggle("ytfp-related-panel--open", open);
      toggle.classList.toggle("ytfp-related-toggle--open", open);
      toggle.textContent = open ? "›" : "‹";
      if (open) {
        renderList();
      }
    }

    toggle.addEventListener("click", () => setOpen(!isOpen));
    root.append(toggle, panel);

    function cleanup() {
      // Слушатели живут на элементах панели — уйдут вместе с окном.
    }

    return { element: root, cleanup };
  }

  return { build };
})();
