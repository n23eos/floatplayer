import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// shorts-search.js — обычный браузерный скрипт с CJS-экспортом для тестов.
const require = createRequire(import.meta.url);
const { extractShortsIds } = require("../extension/content/shorts-search.js");

/** Обёртка выдачи: ytInitialData в том виде, в каком его отдаёт YouTube. */
function pageWithData(data, extraHtml = "") {
  return `<html><script>var ytInitialData = ${JSON.stringify(data)};</script>${extraHtml}</html>`;
}

describe("extractShortsIds", () => {
  test("finds ids in nested reelWatchEndpoint objects in order", () => {
    // Arrange
    const html = pageWithData({
      contents: {
        items: [
          { renderer: { reelWatchEndpoint: { videoId: "AAAAAAAAAAA" } } },
          { renderer: { reelWatchEndpoint: { videoId: "BBBBBBBBBBB" } } }
        ]
      }
    });

    // Act
    const ids = extractShortsIds(html);

    // Assert
    expect(ids).toEqual(["AAAAAAAAAAA", "BBBBBBBBBBB"]);
  });

  test("falls back to /shorts/ links when ytInitialData is missing", () => {
    // Arrange
    const html = '<a href="/shorts/CCCCCCCCCCC">x</a><a href="/shorts/DDDDDDDDDDD">y</a>';

    // Act
    const ids = extractShortsIds(html);

    // Assert
    expect(ids).toEqual(["CCCCCCCCCCC", "DDDDDDDDDDD"]);
  });

  test("merges both sources without duplicates", () => {
    // Arrange
    const html = pageWithData(
      { reelWatchEndpoint: { videoId: "AAAAAAAAAAA" } },
      '<a href="/shorts/AAAAAAAAAAA"></a><a href="/shorts/EEEEEEEEEEE"></a>'
    );

    // Act
    const ids = extractShortsIds(html);

    // Assert
    expect(ids).toEqual(["AAAAAAAAAAA", "EEEEEEEEEEE"]);
  });

  test("survives broken ytInitialData JSON via the link fallback", () => {
    // Arrange: JSON обрезан посередине — как при усечённом ответе.
    const html =
      'var ytInitialData = {"contents": {"broken";</script>' +
      '<a href="/shorts/FFFFFFFFFFF"></a>';

    // Act
    const ids = extractShortsIds(html);

    // Assert
    expect(ids).toEqual(["FFFFFFFFFFF"]);
  });

  test("ignores malformed video ids", () => {
    // Arrange: короткий id и id с недопустимым символом не проходят шаблон.
    const html = pageWithData({
      a: { reelWatchEndpoint: { videoId: "short" } },
      b: { reelWatchEndpoint: { videoId: "GGGGGGGGGGG" } }
    });

    // Act
    const ids = extractShortsIds(html);

    // Assert
    expect(ids).toEqual(["GGGGGGGGGGG"]);
  });

  test("returns empty array when nothing matches", () => {
    expect(extractShortsIds("<html><body>no shorts here</body></html>")).toEqual([]);
  });
});
