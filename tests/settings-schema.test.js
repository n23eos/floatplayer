import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// shared/settings-schema.js — единственное описание настроек. Раньше дефолты
// и нормализаторы жили в трёх копиях (content, options, popup), и копии
// расходились; здесь проверяем сам общий модуль.
const require = createRequire(import.meta.url);
const YTFP = require("../extension/shared/settings-schema.js");
const schema = YTFP.settingsSchema;
const DEFAULTS = YTFP.DEFAULT_SETTINGS;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.join(dirname, "../extension");

describe("normalizePanelScale", () => {
  test("keeps a value inside the range", () => {
    expect(schema.normalizePanelScale(100)).toBe(100);
    expect(schema.normalizePanelScale(135)).toBe(135);
    expect(schema.normalizePanelScale(200)).toBe(200);
  });

  test("accepts numeric strings from the form", () => {
    expect(schema.normalizePanelScale("150")).toBe(150);
  });

  test("clamps to the bounds", () => {
    expect(schema.normalizePanelScale(40)).toBe(schema.PANEL_SCALE_MIN);
    expect(schema.normalizePanelScale(500)).toBe(schema.PANEL_SCALE_MAX);
  });

  test("rounds fractional values", () => {
    expect(schema.normalizePanelScale(137.4)).toBe(137);
  });

  test("falls back to the default for garbage", () => {
    for (const value of [NaN, null, undefined, "large", "", "   ", Infinity, {}, []]) {
      expect(schema.normalizePanelScale(value)).toBe(DEFAULTS.panelScale);
    }
  });
});

describe("normalizeChatOpacity", () => {
  test("keeps a valid percent, both edges included", () => {
    expect(schema.normalizeChatOpacity(0)).toBe(0);
    expect(schema.normalizeChatOpacity(35)).toBe(35);
    expect(schema.normalizeChatOpacity(100)).toBe(100);
  });

  test("accepts numeric strings from the form", () => {
    expect(schema.normalizeChatOpacity("70")).toBe(70);
  });

  test("rounds fractional values", () => {
    expect(schema.normalizeChatOpacity(49.6)).toBe(50);
  });

  test("treats out-of-range as garbage rather than clamping", () => {
    // В отличие от масштаба, у прозрачности рабочие оба края: зажать -10 в 0
    // означало бы спрятать панель из-за мусора в хранилище.
    expect(schema.normalizeChatOpacity(-10)).toBe(DEFAULTS.chatPanelOpacity);
    expect(schema.normalizeChatOpacity(150)).toBe(DEFAULTS.chatPanelOpacity);
  });

  test("falls back to the default for garbage", () => {
    for (const value of [NaN, null, undefined, "dark", "", "   ", Infinity, {}, []]) {
      expect(schema.normalizeChatOpacity(value)).toBe(DEFAULTS.chatPanelOpacity);
    }
  });
});

describe("resolvePanelScale", () => {
  test("prefers an explicit scale over the legacy preset", () => {
    expect(schema.resolvePanelScale(180, "small")).toBe(180);
  });

  test("normalizes the explicit scale", () => {
    expect(schema.resolvePanelScale(999, null)).toBe(schema.PANEL_SCALE_MAX);
  });

  test("converts the old compact preset when the scale is unset", () => {
    expect(schema.resolvePanelScale(null, "small")).toBe(schema.PANEL_SCALE_MIN);
    expect(schema.resolvePanelScale(undefined, "small")).toBe(schema.PANEL_SCALE_MIN);
  });

  test("converts the old large preset and anything unknown to the default", () => {
    expect(schema.resolvePanelScale(null, "large")).toBe(DEFAULTS.panelScale);
    expect(schema.resolvePanelScale(null, undefined)).toBe(DEFAULTS.panelScale);
    expect(schema.resolvePanelScale(null, "huge")).toBe(DEFAULTS.panelScale);
  });

  test("treats an explicit zero as a value, not as unset", () => {
    // 0 — «ложное» число: проверка на «не задано» обязана быть на null, а не
    // на истинность, иначе ноль уехал бы в ветку старого пресета.
    expect(schema.resolvePanelScale(0, "large")).toBe(schema.PANEL_SCALE_MIN);
  });
});

describe("the schema is the only copy", () => {
  /** Все .js расширения, кроме самого общего модуля. */
  function collectScripts(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== "_locales" && entry !== "icons") {
          files.push(...collectScripts(full));
        }
        continue;
      }
      if (entry.endsWith(".js") && full !== path.join(extensionDir, "shared", "settings-schema.js")) {
        files.push(full);
      }
    }
    return files;
  }

  test("no other file declares its own defaults or normalizers", () => {
    const forbidden = [
      /(?:const|let|var)\s+DEFAULT_SETTINGS\s*=\s*\{/,
      /function\s+normalizePanelScale\s*\(/,
      /function\s+normalizeChatOpacity\s*\(/,
      /function\s+normalizeOpacity\s*\(/,
      /function\s+resolvePanelScale\s*\(/,
      /function\s+panelScaleFromLegacySize\s*\(/
    ];
    const offenders = [];
    for (const file of collectScripts(extensionDir)) {
      const source = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        if (pattern.test(source)) {
          offenders.push(`${path.relative(extensionDir, file)}: ${pattern}`);
        }
      }
    }
    expect(offenders, "a second copy of the settings schema appeared").toEqual([]);
  });

  test("every page that reads settings loads the shared module first", () => {
    for (const page of ["options/options.html", "popup/popup.html"]) {
      const html = readFileSync(path.join(extensionDir, page), "utf8");
      // Именно теги <script>, а не любое упоминание имени: в разметке оба
      // файла названы ещё и в комментариях.
      const sources = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
      const own = path.basename(page).replace(".html", ".js");
      expect(sources, `${page} does not load the shared schema`).toContain(
        "../shared/settings-schema.js"
      );
      expect(
        sources.indexOf("../shared/settings-schema.js"),
        `${page} loads the shared schema after ${own}`
      ).toBeLessThan(sources.indexOf(own));
    }
  });

  test("the manifest loads the shared module before the content scripts", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(extensionDir, "manifest.json"), "utf8")
    );
    const [main] = manifest.content_scripts;
    expect(main.js[0]).toBe("shared/settings-schema.js");
  });
});
