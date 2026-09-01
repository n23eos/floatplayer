import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Страница настроек живёт отдельно от content-скриптов и не может их
// подключить, поэтому нормализаторы там продублированы. Дефолты уже
// сверяются в settings-defaults.test.js — здесь сверяем сами функции:
// разъехавшаяся копия молча запишет в хранилище не то значение, которое
// потом прочитает окно.
const require = createRequire(import.meta.url);
require("../extension/content/constants.js");
const utils = require("../extension/content/utils.js");
const pipChat = require("../extension/content/pip-chat.js");

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * options.js нельзя импортировать целиком (он трогает DOM на верхнем уровне),
 * поэтому вырезаем из исходника нужные объявления и исполняем их отдельно —
 * тот же приём, что в settings-defaults.test.js.
 */
function readOptionsNormalizers() {
  const source = readFileSync(
    path.join(dirname, "../extension/options/options.js"),
    "utf8"
  );
  const parts = [
    /const DEFAULT_SETTINGS = \{[\s\S]*?\n\};/,
    /const PANEL_SCALE_MIN = \d+;/,
    /const PANEL_SCALE_MAX = \d+;/,
    /function normalizeChatOpacity\(value\) \{[\s\S]*?\n\}/,
    /function normalizePanelScale\(value\) \{[\s\S]*?\n\}/
  ].map((pattern) => {
    const match = source.match(pattern);
    if (!match) {
      throw new Error(`declaration not found in options.js: ${pattern}`);
    }
    return match[0];
  });
  return new Function(
    `${parts.join("\n")}\nreturn { normalizeChatOpacity, normalizePanelScale };`
  )();
}

const optionsNormalizers = readOptionsNormalizers();

// Один список входов на обе пары: валидные значения, границы, дробные,
// вне диапазона и мусор из хранилища.
const INPUTS = [
  0, 1, 35, 49.6, 50, 99, 100, 135, 150, 199.4, 200, 201, 999, -10,
  "0", "70", "135", "200", "", "  ", "dark",
  NaN, Infinity, -Infinity, null, undefined, true, {}, []
];

/** Читаемая подпись входа для сообщения об ошибке. */
function label(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

describe("options.js normalizers match the content-script copies", () => {
  test("normalizeChatOpacity behaves like pipChat.normalizeOpacity", () => {
    for (const input of INPUTS) {
      expect(
        optionsNormalizers.normalizeChatOpacity(input),
        `chat opacity diverged for ${label(input)}`
      ).toBe(pipChat.normalizeOpacity(input));
    }
  });

  test("normalizePanelScale behaves like utils.normalizePanelScale", () => {
    for (const input of INPUTS) {
      expect(
        optionsNormalizers.normalizePanelScale(input),
        `panel scale diverged for ${label(input)}`
      ).toBe(utils.normalizePanelScale(input));
    }
  });

  test("the panel scale bounds are the same on both sides", () => {
    expect(optionsNormalizers.normalizePanelScale(-1)).toBe(utils.PANEL_SCALE_MIN);
    expect(optionsNormalizers.normalizePanelScale(9999)).toBe(utils.PANEL_SCALE_MAX);
  });
});
