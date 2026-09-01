import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// settings.js — браузерный скрипт: читает chrome.storage и вешает слушателя
// прямо при загрузке. Подсовываем мок до require и грузим модули в том же
// порядке, что и manifest.
let storedValues = {};

globalThis.chrome = {
  storage: {
    sync: {
      // Настоящий chrome.storage.sync.get(defaults) подставляет значение из
      // defaults для каждого отсутствующего ключа — повторяем это.
      get: vi.fn(async (defaults) => {
        const result = {};
        for (const [key, fallback] of Object.entries(defaults)) {
          result[key] = key in storedValues ? storedValues[key] : fallback;
        }
        return result;
      })
    },
    onChanged: { addListener: vi.fn() }
  }
};

require("../extension/content/constants.js");
require("../extension/content/utils.js");
require("../extension/content/settings.js");
const settings = globalThis.YTFP.settings;

describe("panelScale migration from the old panelSize setting", () => {
  beforeEach(() => {
    storedValues = {};
  });

  test("uses the default scale for a fresh install", async () => {
    const loaded = await settings.load();
    expect(loaded.panelScale).toBe(135);
  });

  test("converts the old compact preset to 100%", async () => {
    storedValues = { panelSize: "small" };
    const loaded = await settings.load();
    expect(loaded.panelScale).toBe(100);
  });

  test("converts the old large preset to the default scale", async () => {
    storedValues = { panelSize: "large" };
    const loaded = await settings.load();
    expect(loaded.panelScale).toBe(135);
  });

  test("prefers an explicit panelScale over the old preset", async () => {
    storedValues = { panelSize: "small", panelScale: 180 };
    const loaded = await settings.load();
    expect(loaded.panelScale).toBe(180);
  });

  test("normalizes an out-of-range stored scale", async () => {
    storedValues = { panelScale: 999 };
    const loaded = await settings.load();
    expect(loaded.panelScale).toBe(200);
  });

  test("does not leak the legacy key into the settings cache", async () => {
    storedValues = { panelSize: "small" };
    const loaded = await settings.load();
    expect(loaded).not.toHaveProperty("panelSize");
  });
});
