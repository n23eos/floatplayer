import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Страховка от рассинхрона двух копий настроек: options-страница живёт
// отдельно от content-скриптов и дублирует дефолты у себя.
const require = createRequire(import.meta.url);
const YTFP = require("../extension/content/constants.js");

const dirname = path.dirname(fileURLToPath(import.meta.url));

// options.js нельзя импортировать целиком (он трогает DOM на верхнем
// уровне), поэтому вырезаем из исходника только литерал DEFAULT_SETTINGS.
function readOptionsDefaults() {
  const source = readFileSync(
    path.join(dirname, "../extension/options/options.js"),
    "utf8"
  );
  const match = source.match(/const DEFAULT_SETTINGS = (\{[\s\S]*?\n\});/);
  if (!match) {
    throw new Error("DEFAULT_SETTINGS literal not found in options.js");
  }
  return new Function(`return ${match[1]};`)();
}

describe("options.js DEFAULT_SETTINGS", () => {
  const optionsDefaults = readOptionsDefaults();

  test("is a subset of YTFP.DEFAULT_SETTINGS keys", () => {
    const contentKeys = Object.keys(YTFP.DEFAULT_SETTINGS);
    for (const key of Object.keys(optionsDefaults)) {
      expect(contentKeys, `unknown key "${key}" in options.js`).toContain(key);
    }
  });

  test("has the same default values as constants.js", () => {
    for (const [key, value] of Object.entries(optionsDefaults)) {
      expect(value, `default for "${key}" diverged`).toEqual(
        YTFP.DEFAULT_SETTINGS[key]
      );
    }
  });
});
