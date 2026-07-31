"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Подсказки для органов управления мини-окна.
// Системный title здесь не годится: он появляется через секунду с лишним,
// рисуется в стиле ОС и на маленьком окне перекрывает половину видео.
// Своя подсказка живёт в документе PiP-окна и выглядит как остальная панель.
YTFP.tooltips = (() => {
  const ATTRIBUTE = "data-ytfp-tip";
  const SHOW_DELAY_MS = 350;
  const EDGE_GAP_PX = 8; // отступ от края окна и от самого элемента

  let tipElement = null;
  let showTimer = null;

  /** Ставит подсказку у элемента вместо системного title. */
  function attach(element, text) {
    if (!text) {
      return element;
    }
    element.setAttribute(ATTRIBUTE, text);
    // Скринридеру нужен доступный текст: у иконочных кнопок его больше взять
    // неоткуда. Перезаписываем всегда — у кнопки чата подпись меняется на
    // «Комментарии» и обратно, и старая осталась бы висеть.
    element.setAttribute("aria-label", text);
    element.removeAttribute("title");
    return element;
  }

  /**
   * Место подсказки выбираем по свободному месту: панель прижата к верху
   * окна, нижние кнопки — к низу, и одно фиксированное направление всегда
   * упиралось бы в край.
   */
  function position(target) {
    const doc = tipElement.ownerDocument;
    const view = doc.defaultView;
    const anchor = target.getBoundingClientRect();
    const tip = tipElement.getBoundingClientRect();

    const below = anchor.bottom + EDGE_GAP_PX;
    const above = anchor.top - tip.height - EDGE_GAP_PX;
    const fitsBelow = below + tip.height + EDGE_GAP_PX <= view.innerHeight;
    tipElement.style.top = `${fitsBelow ? below : Math.max(EDGE_GAP_PX, above)}px`;

    // По горизонтали центрируем, но не даём вылезти за края окна.
    const centered = anchor.left + anchor.width / 2 - tip.width / 2;
    const maxLeft = view.innerWidth - tip.width - EDGE_GAP_PX;
    tipElement.style.left = `${Math.max(EDGE_GAP_PX, Math.min(centered, maxLeft))}px`;
  }

  function show(target) {
    tipElement.textContent = target.getAttribute(ATTRIBUTE);
    // Узел всегда в потоке (прячет его opacity, а не display), поэтому размер
    // известен до показа и подсказка не «прыгает» на место после появления.
    position(target);
    tipElement.classList.add("ytfp-tip--visible");
  }

  function hide() {
    clearTimeout(showTimer);
    showTimer = null;
    if (tipElement) {
      tipElement.classList.remove("ytfp-tip--visible");
    }
  }

  function onPointerOver(event) {
    const target = event.target.closest && event.target.closest(`[${ATTRIBUTE}]`);
    if (!target || !tipElement) {
      return;
    }
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(target), SHOW_DELAY_MS);
  }

  function onPointerOut(event) {
    const target = event.target.closest && event.target.closest(`[${ATTRIBUTE}]`);
    // relatedTarget внутри того же элемента — курсор всего лишь перешёл
    // с иконки на подпись, подсказку не убираем.
    if (target && event.relatedTarget && target.contains(event.relatedTarget)) {
      return;
    }
    hide();
  }

  /** Создаёт единственный узел подсказки в документе PiP-окна. */
  function install(pipDocument) {
    tipElement = pipDocument.createElement("div");
    tipElement.className = "ytfp-tip";
    pipDocument.body.appendChild(tipElement);

    pipDocument.addEventListener("pointerover", onPointerOver, true);
    pipDocument.addEventListener("pointerout", onPointerOut, true);
    // Нажатие и уход курсора из окна гасят подсказку сразу, без задержки.
    pipDocument.addEventListener("pointerdown", hide, true);
    pipDocument.addEventListener("pointerleave", hide, true);

    // Окно закрылось — таймер показа не должен пережить документ.
    pipDocument.defaultView.addEventListener("pagehide", () => {
      clearTimeout(showTimer);
      showTimer = null;
      tipElement = null;
    });
  }

  return { install, attach };
})();
