import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Пропущенный ключ в локали не ломает расширение — chrome.i18n просто вернёт
// пустую строку, и пользователь увидит английский текст из разметки или
// фолбэк из кода. Молча. Поэтому сверяем наборы ключей тестом: ровно так
// настройка «Размер панели» и уехала в релиз переведённой только на два языка.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.join(dirname, "../extension");
const localesDir = path.join(extensionDir, "_locales");

function readMessages(locale) {
  return JSON.parse(
    readFileSync(path.join(localesDir, locale, "messages.json"), "utf8")
  );
}

const locales = readdirSync(localesDir).filter((entry) =>
  statSync(path.join(localesDir, entry)).isDirectory()
);
const reference = readMessages("en");
const referenceKeys = Object.keys(reference).sort();

/** Все файлы расширения, кроме самих локалей и картинок. */
function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "_locales" || entry === "icons") {
        continue;
      }
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.(js|html|json)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Ключи, названные в коде литералом: getMessage("x"), локальная обёртка
 * t("x", "fallback"), data-i18n="x" в разметке и __MSG_x__ в манифесте.
 * Вызовы с переменной (t(config.idleKey)) сюда не попадают — их не проверить.
 */
function collectReferencedKeys() {
  const patterns = [
    /getMessage\("([A-Za-z0-9_]+)"/g,
    /\bt\("([A-Za-z0-9_]+)"/g,
    /data-i18n="([A-Za-z0-9_]+)"/g,
    /__MSG_([A-Za-z0-9_]+)__/g
  ];
  const keys = new Set();
  for (const file of collectSourceFiles(extensionDir)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        keys.add(match[1]);
      }
    }
  }
  return keys;
}

describe("locales", () => {
  test("ships more than just English", () => {
    expect(locales.length).toBeGreaterThan(1);
    expect(locales).toContain("en");
  });

  test.each(locales)("%s has exactly the keys of en", (locale) => {
    const keys = Object.keys(readMessages(locale)).sort();
    const missing = referenceKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !referenceKeys.includes(key));
    expect(missing, `keys missing in ${locale}`).toEqual([]);
    expect(extra, `keys in ${locale} that en does not have`).toEqual([]);
  });

  test.each(locales)("%s has no empty messages", (locale) => {
    const empty = Object.entries(readMessages(locale))
      .filter(([, entry]) => !entry.message || !entry.message.trim())
      .map(([key]) => key);
    expect(empty, `empty messages in ${locale}`).toEqual([]);
  });
});

describe("keys referenced from the code", () => {
  test("all exist in en", () => {
    const referenced = [...collectReferencedKeys()].sort();
    const unknown = referenced.filter((key) => !referenceKeys.includes(key));
    expect(unknown, "referenced but missing from en/messages.json").toEqual([]);
  });
});
