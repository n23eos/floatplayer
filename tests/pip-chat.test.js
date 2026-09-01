import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// pip-chat.js — обычный браузерный скрипт с CJS-экспортом для тестов.
const require = createRequire(import.meta.url);
const pipChat = require("../extension/content/pip-chat.js");

describe("normalizeOpacity", () => {
  test("keeps a valid percent", () => {
    expect(pipChat.normalizeOpacity(0)).toBe(0);
    expect(pipChat.normalizeOpacity(35)).toBe(35);
    expect(pipChat.normalizeOpacity(100)).toBe(100);
  });

  test("accepts numeric strings from the form", () => {
    expect(pipChat.normalizeOpacity("70")).toBe(70);
  });

  test("rounds fractional values", () => {
    expect(pipChat.normalizeOpacity(49.6)).toBe(50);
  });

  test("falls back to 50 for out-of-range values", () => {
    expect(pipChat.normalizeOpacity(-10)).toBe(50);
    expect(pipChat.normalizeOpacity(150)).toBe(50);
  });

  test("falls back to 50 for garbage", () => {
    expect(pipChat.normalizeOpacity(undefined)).toBe(50);
    expect(pipChat.normalizeOpacity(null)).toBe(50);
    expect(pipChat.normalizeOpacity("dark")).toBe(50);
    expect(pipChat.normalizeOpacity(NaN)).toBe(50);
  });

  test("treats a blank string as unset, not as zero", () => {
    // Number("") и Number("  ") дают 0 — без явной проверки панель стала бы
    // полностью прозрачной вместо возврата к дефолту.
    expect(pipChat.normalizeOpacity("")).toBe(50);
    expect(pipChat.normalizeOpacity("   ")).toBe(50);
  });
});
