"use strict";

// Единственное описание настроек расширения: значения по умолчанию и правила
// приведения того, что лежит в chrome.storage, к пригодному виду.
//
// Файл общий для трёх контекстов, у которых нет ничего другого общего:
// content-скрипты подключают его первым в манифесте, страница настроек и
// popup — тегом <script> перед своим кодом. Раньше каждый держал свою копию
// дефолтов и нормализаторов, и они успевали разъехаться: страница настроек
// записывала в хранилище одно значение, а окно читало из него другое.
//
// Зависимостей нет намеренно — это самый нижний слой, его подключают до
// constants.js и utils.js.

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

YTFP.DEFAULT_SETTINGS = {
  autoPip: false,       // авто-вынос при уходе со вкладки
  speedStep: 0.25,      // шаг ползунка скорости
  volumeBoostMax: 300,  // потолок усиления громкости, %
  compactMode: true,
  // Масштаб капсульных панелей (в окне и на странице), % от базового
  // размера: 100 — компактно, 200 — потолок. Дефолт крупный: попадать в
  // кнопки проще, чем читать мелкие. На тач-экранах к нему добавляется
  // собственный множитель (см. --ytfp-pp-touch в page-panel.js).
  panelScale: 135,
  // Панель поверх обычного плеера YouTube (громкость, скорость, ±30).
  pagePanel: true,        // прятать панель, показывать при наведении
  sponsorSkip: true,        // сегменты SponsorBlock на таймлайне + кнопка пропуска
  sponsorAutoSkip: true,    // автопропуск сегментов без кнопки
  // Какие категории SponsorBlock запрашивать и пропускать.
  sponsorCategories: ["sponsor", "selfpromo", "interaction"],
  nightMode: "off",         // ночной режим (подавление синего): off | warm | deep
  // Непрозрачность подложки панели чата/комментариев в PiP-окне, %.
  // 0 — фона нет совсем, 100 — сплошной; текст сообщений не трогаем.
  chatPanelOpacity: 50,
  shortsAutoNext: true,     // шортсы: автопереход к следующему по окончании
  autoplayNext: true,       // видео: автопереход к следующему по окончании
  // "document" — окно с панелью настроек (Chrome рисует рамку с origin),
  // "native"   — чистое видео без рамки (нативный PiP, без панели).
  windowMode: "document"
};

YTFP.settingsSchema = (() => {
  // До версии 1.18 размер панелей хранился пресетом "large" | "small".
  // Ключ больше не пишем, но читаем: у кого он остался в хранилище, тот
  // получает свой прежний размер в процентах.
  const LEGACY_PANEL_SIZE_KEY = "panelSize";

  const PANEL_SCALE_MIN = 100;
  const PANEL_SCALE_MAX = 200;
  const CHAT_OPACITY_MIN = 0;
  const CHAT_OPACITY_MAX = 100;

  /**
   * «Значения нет»: не число и не строка, либо строка из одних пробелов.
   * Отдельной проверкой, потому что Number(null), Number("") и Number("  ")
   * дают 0, и пустая настройка молча превращалась бы в ноль — самый тихий
   * масштаб и полностью прозрачную панель.
   */
  function isBlank(value) {
    if (typeof value === "string") {
      return value.trim() === "";
    }
    return typeof value !== "number";
  }

  /** Целое число из value в диапазоне [min, max]; мусор -> fallback. */
  function normalizePercent(value, min, max, fallback) {
    if (isBlank(value)) {
      return fallback;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  /** Масштаб панели из настроек в целые проценты [100, 200]. Мусор -> 135. */
  function normalizePanelScale(value) {
    return normalizePercent(
      value,
      PANEL_SCALE_MIN,
      PANEL_SCALE_MAX,
      YTFP.DEFAULT_SETTINGS.panelScale
    );
  }

  /**
   * Приводит настройку chatPanelOpacity к целому проценту [0, 100].
   * Значение вне диапазона считаем мусором, а не зажимаем: в отличие от
   * масштаба, у прозрачности оба края — рабочие значения, и «зажать до 0»
   * означало бы спрятать панель по ошибке в хранилище.
   */
  function normalizeChatOpacity(value) {
    const fallback = YTFP.DEFAULT_SETTINGS.chatPanelOpacity;
    if (isBlank(value)) {
      return fallback;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < CHAT_OPACITY_MIN || number > CHAT_OPACITY_MAX) {
      return fallback;
    }
    return Math.round(number);
  }

  /**
   * Старая настройка panelSize ("large" | "small") в проценты — для тех, у
   * кого в хранилище лежит ещё она. Компактный был ровно 100%.
   */
  function panelScaleFromLegacySize(size) {
    return size === "small" ? PANEL_SCALE_MIN : YTFP.DEFAULT_SETTINGS.panelScale;
  }

  /**
   * Масштаб панели: своё значение, иначе перевод старого пресета.
   * storedScale === null | undefined означает «ключа в хранилище нет» — так
   * помечают запрос и settings.js, и страница настроек (обе просят
   * panelScale с null вместо значения по умолчанию, иначе не отличить
   * «не задано» от «задано как дефолт»).
   */
  function resolvePanelScale(storedScale, legacySize) {
    return storedScale === null || storedScale === undefined
      ? panelScaleFromLegacySize(legacySize)
      : normalizePanelScale(storedScale);
  }

  return {
    LEGACY_PANEL_SIZE_KEY,
    PANEL_SCALE_MIN,
    PANEL_SCALE_MAX,
    normalizePanelScale,
    normalizeChatOpacity,
    panelScaleFromLegacySize,
    resolvePanelScale
  };
})();

// Экспорт для юнит-тестов (в браузере module не определён — блок не выполняется).
if (typeof module !== "undefined" && module.exports) {
  module.exports = YTFP;
}
