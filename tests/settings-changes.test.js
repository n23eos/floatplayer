import { describe, test, expect, beforeEach, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Тот же приём, что в settings-migration.test.js: мок chrome до require,
// плюс перехват слушателя storage.onChanged — его и проверяем.
let storedValues = {};
let onChangedListener = null;

globalThis.chrome = {
  storage: {
    sync: {
      get: vi.fn(async (defaults) => {
        const result = {};
        for (const [key, fallback] of Object.entries(defaults)) {
          result[key] = key in storedValues ? storedValues[key] : fallback;
        }
        return result;
      })
    },
    onChanged: {
      addListener: vi.fn((listener) => {
        onChangedListener = listener;
      })
    }
  }
};

require("../extension/content/constants.js");
require("../extension/content/utils.js");
require("../extension/content/settings.js");
const settings = globalThis.YTFP.settings;
const DEFAULTS = globalThis.YTFP.DEFAULT_SETTINGS;

describe("settings cache on storage.onChanged", () => {
  beforeEach(async () => {
    storedValues = {};
    await settings.load();
  });

  test("applies a new value from the sync area", () => {
    onChangedListener({ sponsorSkip: { newValue: false } }, "sync");
    expect(settings.get().sponsorSkip).toBe(false);
  });

  test("ignores changes in other storage areas", () => {
    onChangedListener({ sponsorSkip: { newValue: false } }, "local");
    expect(settings.get().sponsorSkip).toBe(DEFAULTS.sponsorSkip);
  });

  test("falls back to the default when a key is removed", () => {
    onChangedListener({ sponsorSkip: { oldValue: true } }, "sync");
    expect(settings.get().sponsorSkip).toBe(DEFAULTS.sponsorSkip);
  });

  test("restores every default when storage is cleared", () => {
    onChangedListener(
      {
        sponsorSkip: { oldValue: false },
        compactMode: { oldValue: false },
        sponsorCategories: { oldValue: [] }
      },
      "sync"
    );
    expect(settings.get()).toEqual(DEFAULTS);
  });
});
