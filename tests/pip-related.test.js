import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// pip-related.js — обычный браузерный скрипт с CJS-экспортом для тестов.
const require = createRequire(import.meta.url);
const pipRelated = require("../extension/content/pip-related.js");

// Баг: на стриме перемотка к краю эфира (кнопка LIVE) выбивала ложный
// ended, и автопереход уводил зрителя на другое видео.
describe("shouldAutoAdvanceOnEnded", () => {
  test("advances on a regular video", () => {
    expect(pipRelated.shouldAutoAdvanceOnEnded(false)).toBe(true);
  });

  test("never advances on a live stream", () => {
    expect(pipRelated.shouldAutoAdvanceOnEnded(true)).toBe(false);
  });
});
