"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Оценки видео в левом нижнем углу мини-окна — «нравится» и «не нравится»,
// зеркально кнопке чата справа. Своего состояния не держат: нажимают
// настоящие кнопки на странице YouTube и подсвечиваются по их aria-pressed,
// поэтому оценка, поставленная во вкладке, видна в окне и наоборот.
YTFP.pipReactions = (() => {
  // Пока окно открыто, видео может смениться (очередь, рекомендации, шортсы),
  // а оценку могли поставить и на самой вкладке — сверяемся по таймеру.
  const SYNC_INTERVAL_MS = 1000;

  // Палец вниз — тот же рисунок, повёрнутый на 180°, как и у самого YouTube.
  // Один контур на две иконки: они не могут разъехаться по толщине и форме.
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

  const REACTIONS = [
    {
      name: "like",
      selectors: "likeButtons",
      flip: false,
      idleKey: "likeTooltip",
      idleText: "Like this video",
      activeKey: "likedTooltip",
      activeText: "Liked — click to undo"
    },
    {
      name: "dislike",
      selectors: "dislikeButtons",
      flip: true,
      idleKey: "dislikeTooltip",
      idleText: "Dislike this video",
      activeKey: "dislikedTooltip",
      activeText: "Disliked — click to undo"
    }
  ];

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  function createIcon(doc, name, flip) {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    if (flip) {
      path.setAttribute("transform", "rotate(180 12 12)");
    }
    svg.appendChild(path);
    return svg;
  }

  /** Кнопка оценки на странице или null, если разметка не найдена. */
  function findPageButton(selectorsKey) {
    for (const selector of YTFP.SELECTORS[selectorsKey]) {
      const button = document.querySelector(selector);
      if (button) {
        return button;
      }
    }
    return null;
  }

  /** Одна кнопка. Возвращает { element, sync }. */
  function createReaction(pipDocument, config) {
    const button = pipDocument.createElement("button");
    button.className = `ytfp-reaction ytfp-reaction--${config.name}`;

    let active = false;

    function render(nextActive) {
      active = nextActive;
      button.classList.toggle("ytfp-reaction--on", active);
      button.replaceChildren(
        createIcon(pipDocument, active ? "filled" : "outline", config.flip)
      );
      YTFP.tooltips.attach(
        button,
        active
          ? t(config.activeKey, config.activeText)
          : t(config.idleKey, config.idleText)
      );
    }

    function sync() {
      const pageButton = findPageButton(config.selectors);
      // Пары на странице нет — прячем: у шортсов, например, кнопки «не
      // нравится» в разметке может не быть вовсе.
      button.hidden = pageButton === null;
      const nextActive =
        pageButton !== null && pageButton.getAttribute("aria-pressed") === "true";
      if (nextActive !== active) {
        render(nextActive);
      }
    }

    button.addEventListener("click", () => {
      const pageButton = findPageButton(config.selectors);
      if (!pageButton) {
        return;
      }
      pageButton.click();
      // Рисуем ожидаемое состояние сразу, не дожидаясь тика: иначе кнопка
      // «залипала» бы почти на секунду. Если YouTube клик не принял (например,
      // пользователь не вошёл в аккаунт), ближайшая сверка вернёт всё назад.
      render(!active);
    });

    render(false);
    return { element: button, sync };
  }

  /** Возвращает { element, cleanup }. */
  function build(pipDocument) {
    const root = pipDocument.createElement("div");
    root.className = "ytfp-reactions";

    const reactions = REACTIONS.map((config) => createReaction(pipDocument, config));
    root.append(...reactions.map((reaction) => reaction.element));

    function sync() {
      for (const reaction of reactions) {
        reaction.sync();
      }
    }

    sync();
    const ticker = setInterval(sync, SYNC_INTERVAL_MS);

    function cleanup() {
      clearInterval(ticker);
    }

    return { element: root, cleanup };
  }

  return { build };
})();
