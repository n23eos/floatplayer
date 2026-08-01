"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Проигрывание шортсов по ключевому слову.
//
// Слово → fetch выдачи поиска YouTube с фильтром «шортсы» (та же вкладка,
// тот же origin — новых разрешений не нужно) → список id → навигация по
// списку через внутренний роутер YouTube (см. yt-navigate-bridge.js).
// Пока режим активен, кнопки вперёд/назад и автопереход ходят по этому
// списку, а не по алгоритмической ленте.
YTFP.shortsSearch = (() => {
  // Магический sp-параметр фильтра «Shorts» из выдачи самого YouTube.
  // Если YouTube его сменит, выдача придёт без фильтра — не страшно:
  // разбор ниже всё равно берёт только ссылки вида /shorts/<id>.
  const SHORTS_FILTER_PARAM = "EgZzaG9ydHPyBgQKAjIA";
  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  /**
   * Достаёт id шортсов из HTML выдачи. Чистая функция — под vitest.
   *
   * Два пути, результат объединяется без дублей:
   * 1) ytInitialData → reelWatchEndpoint.videoId — даёт порядок выдачи;
   * 2) прямые ссылки /shorts/<id> в HTML — запасной, переживает смену
   *    структуры данных.
   */
  function extractShortsIds(html) {
    const ids = [];
    const seen = new Set();
    const push = (id) => {
      if (VIDEO_ID_PATTERN.test(id) && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    };

    const dataMatch = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    if (dataMatch) {
      try {
        const walk = (node) => {
          if (!node || typeof node !== "object") {
            return;
          }
          if (node.reelWatchEndpoint && typeof node.reelWatchEndpoint.videoId === "string") {
            push(node.reelWatchEndpoint.videoId);
          }
          for (const key of Object.keys(node)) {
            walk(node[key]);
          }
        };
        walk(JSON.parse(dataMatch[1]));
      } catch {
        // Ломаный или усечённый JSON — остаётся путь по ссылкам.
      }
    }

    for (const link of html.matchAll(/\/shorts\/([A-Za-z0-9_-]{11})/g)) {
      push(link[1]);
    }
    return ids;
  }

  // Активный список: { ids, index }. null — режим поиска выключен.
  let playlist = null;

  function navigateTo(videoId) {
    // Ловит мостик в основном мире (yt-navigate-bridge.js).
    window.postMessage({ type: "ytfp-shorts-navigate", videoId }, window.location.origin);
  }

  /**
   * Ищет шортсы по слову и, если нашлись, переходит к первому.
   * Возвращает { ok, count }: ok=false — сбой сети, count=0 — пусто.
   */
  async function search(query) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return { ok: true, count: 0 };
    }
    let html;
    try {
      const response = await fetch(
        `/results?search_query=${encodeURIComponent(trimmed)}&sp=${SHORTS_FILTER_PARAM}`,
        { credentials: "same-origin" }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      html = await response.text();
    } catch (error) {
      console.warn("[YTFP] Shorts search failed:", error);
      return { ok: false, count: 0 };
    }
    const ids = extractShortsIds(html);
    if (ids.length === 0) {
      return { ok: true, count: 0 };
    }
    playlist = { ids, index: 0 };
    navigateTo(ids[0]);
    return { ok: true, count: ids.length };
  }

  function isActive() {
    return playlist !== null;
  }

  /** Выход из режима: дальше навигация снова по обычной ленте. */
  function stop() {
    playlist = null;
  }

  /**
   * Шаг по списку. Возвращает true, если режим активен (шаг обработан,
   * к ленте обращаться не надо) — даже у края списка, где идти некуда.
   */
  function step(direction) {
    if (!playlist) {
      return false;
    }
    const nextIndex = playlist.index + direction;
    if (nextIndex >= 0 && nextIndex < playlist.ids.length) {
      playlist.index = nextIndex;
      navigateTo(playlist.ids[nextIndex]);
    }
    return true;
  }

  const api = {
    search,
    isActive,
    stop,
    next: () => step(1),
    prev: () => step(-1),
    extractShortsIds
  };
  return api;
})();

// CJS-экспорт для vitest (как в utils.js): в браузере ветка не выполняется.
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP.shortsSearch;
}
