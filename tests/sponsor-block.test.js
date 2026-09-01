import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// sponsor-block.js — браузерный скрипт: при загрузке зовёт init(), который
// вешается на document и на настройки. Подсовываем минимальные заглушки того,
// чем модуль реально пользуется, и грузим модули в порядке манифеста.
globalThis.chrome = { i18n: { getMessage: () => "" } };
globalThis.location = { search: "" };
globalThis.document = {
  addEventListener: () => {},
  querySelector: () => null // корня плеера нет — маркеры не рисуются
};

let settings;
let isWatchPage = true;

require("../extension/content/constants.js");
require("../extension/content/utils.js");

globalThis.YTFP.settings = {
  get: () => settings,
  onChange: () => {}
};
globalThis.YTFP.playerApi = {
  getVideo: () => null,
  isWatchPage: () => isWatchPage
};
globalThis.YTFP.pip = { getMovedPlayer: () => null };

require("../extension/content/sponsor-block.js");
// Модуль публикует себя в общем пространстве имён, отдельного
// CJS-экспорта у него нет — берём оттуда.
const sponsorBlock = globalThis.YTFP.sponsorBlock;

/** Ответ API SponsorBlock: массив объектов с парой [start, end]. */
function apiResponse(pairs) {
  return {
    ok: true,
    json: async () => pairs.map((segment) => ({ segment }))
  };
}

function setVideo(id) {
  globalThis.location.search = `?v=${id}`;
}

beforeEach(async () => {
  settings = {
    sponsorSkip: true,
    sponsorAutoSkip: true,
    sponsorCategories: ["sponsor"]
  };
  isWatchPage = true;
  // Сброс внутреннего кэша модуля: уводим его на страницу без видео.
  globalThis.location.search = "";
  globalThis.fetch = vi.fn(async () => apiResponse([]));
  await sponsorBlock.refresh();
});

describe("refresh", () => {
  test("keeps the segments the API returned for the current video", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();
    expect(sponsorBlock.getSegments()).toEqual([{ start: 0, end: 30 }]);
  });

  test("drops the previous video's segments before the new request resolves", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();

    // Ровно тот случай, из-за которого автопропуск срабатывал не там: пока
    // ответ для нового ролика в пути, он уже играет с нуля секунды.
    setVideo("bbbbbbbbbbb");
    globalThis.fetch = vi.fn(async () => apiResponse([[100, 130]]));
    const pending = sponsorBlock.refresh();
    expect(sponsorBlock.getSegments()).toEqual([]);
    await pending;
    expect(sponsorBlock.getSegments()).toEqual([{ start: 100, end: 130 }]);
  });

  test("does not request the same video twice", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();
    await sponsorBlock.refresh();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("requests again when the categories change", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();
    settings = { ...settings, sponsorCategories: ["sponsor", "selfpromo"] };
    await sponsorBlock.refresh();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("retries after a network failure instead of caching the empty result", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    await sponsorBlock.refresh();
    expect(sponsorBlock.getSegments()).toEqual([]);

    // init() планирует вторую попытку через 2 секунды после навигации —
    // сбой первой не должен запирать видео до следующего перехода.
    globalThis.fetch = vi.fn(async () => apiResponse([[10, 20]]));
    await sponsorBlock.refresh();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(sponsorBlock.getSegments()).toEqual([{ start: 10, end: 20 }]);
  });

  test("caches an empty answer: a video with no segments is not re-requested", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    await sponsorBlock.refresh();
    await sponsorBlock.refresh();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(sponsorBlock.getSegments()).toEqual([]);
  });

  test("clears the segments when the feature is switched off", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();
    settings = { ...settings, sponsorSkip: false };
    await sponsorBlock.refresh();
    expect(sponsorBlock.getSegments()).toEqual([]);
  });

  test("clears the segments when leaving the watch page", async () => {
    setVideo("aaaaaaaaaaa");
    globalThis.fetch = vi.fn(async () => apiResponse([[0, 30]]));
    await sponsorBlock.refresh();
    isWatchPage = false;
    await sponsorBlock.refresh();
    expect(sponsorBlock.getSegments()).toEqual([]);
  });
});
