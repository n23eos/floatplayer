"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Кнопка «нравится» в левом нижнем углу мини-окна — зеркально кнопке чата
// справа. Своего состояния не держит: нажимает настоящую кнопку на странице
// YouTube и подсвечивается по её aria-pressed, поэтому лайк, поставленный
// во вкладке, виден в окне и наоборот.
YTFP.pipLike = (() => {
  // Пока окно открыто, видео может смениться (очередь, рекомендации, шортсы),
  // а лайкнуть могли и на самой вкладке — сверяемся с ней по таймеру.
  const SYNC_INTERVAL_MS = 1000;

  const ICONS = {
    outline:
      "M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2" +
      "c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1" +
      " 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2" +
      "l-3 7H9V9zM1 9h4v12H1z",
    filled:
      "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32" +
      "c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10" +
      "c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
  };

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function createIcon(doc, name) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  /** Кнопка лайка на странице или null, если разметка не найдена. */
  function findPageButton() {
    for (const selector of YTFP.SELECTORS.likeButtons) {
      const button = document.querySelector(selector);
      if (button) {
        return button;
      }
    }
    return null;
  }

  function isLiked(pageButton) {
    return pageButton !== null && pageButton.getAttribute("aria-pressed") === "true";
  }

  /** Возвращает { element, cleanup }. */
  function build(pipDocument) {
    const toggle = pipDocument.createElement("button");
    toggle.className = "ytfp-like-toggle";

    let liked = false;

    function render(nextLiked) {
      liked = nextLiked;
      toggle.classList.toggle("ytfp-like-toggle--on", liked);
      toggle.replaceChildren(createIcon(pipDocument, liked ? "filled" : "outline"));
      YTFP.tooltips.attach(
        toggle,
        liked ? t("likedTooltip", "Liked — click to undo") : t("likeTooltip", "Like this video")
      );
    }

    function sync() {
      const pageButton = findPageButton();
      // Разметки нет (страница ещё строится) — кнопку прячем, чтобы не
      // предлагать действие, которого сейчас не выполнить.
      toggle.hidden = pageButton === null;
      const nextLiked = isLiked(pageButton);
      if (nextLiked !== liked) {
        render(nextLiked);
      }
    }

    toggle.addEventListener("click", () => {
      const pageButton = findPageButton();
      if (!pageButton) {
        return;
      }
      pageButton.click();
      // Рисуем ожидаемое состояние сразу, не дожидаясь тика: без этого
      // кнопка «залипала» бы почти на секунду. Если YouTube не принял клик
      // (например, пользователь не вошёл в аккаунт), следующая сверка со
      // страницей вернёт подсветку обратно.
      render(!liked);
    });

    render(false);
    sync();
    const ticker = setInterval(sync, SYNC_INTERVAL_MS);

    function cleanup() {
      clearInterval(ticker);
    }

    return { element: toggle, cleanup };
  }

  return { build };
})();
