import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// night-mode.js — обычный браузерный скрипт с CJS-экспортом для тестов.
const require = createRequire(import.meta.url);
const nightMode = require("../extension/content/night-mode.js");

describe("normalize", () => {
  test("keeps a known level", () => {
    expect(nightMode.normalize("warm")).toBe("warm");
  });

  test("falls back to off for an unknown value", () => {
    expect(nightMode.normalize("ultra")).toBe("off");
  });

  test("falls back to off for missing value", () => {
    expect(nightMode.normalize(undefined)).toBe("off");
  });
});

describe("next", () => {
  test("cycles off → warm → deep → off", () => {
    expect(nightMode.next("off")).toBe("warm");
    expect(nightMode.next("warm")).toBe("deep");
    expect(nightMode.next("deep")).toBe("off");
  });

  test("treats garbage as off", () => {
    expect(nightMode.next("ultra")).toBe("warm");
  });
});
