# Материалы для Chrome Web Store

Актуально для версии 1.3.x.

## Название
FloatPlayer — Picture in Picture for YouTube

## Краткое описание (до 132 символов)

**RU:** YouTube поверх всех окон: чистый мини-плеер без лишнего, шортсы с автопереходом, A-B повтор, скорость, громкость до 300%.

**EN:** YouTube always on top: clean mini-player, shorts with auto-next, A-B loop, speed control, volume boost up to 300%.

## Подробное описание

**RU:**

Кнопка в плеере YouTube выносит видео в окно поверх всех окон
(Document Picture-in-Picture). В окне — только само видео и элементы
управления: весь остальной интерфейс YouTube (карточки, товары, заставки,
описания) скрыт.

Обычные видео:
• Панель сверху (при наведении): пауза, A-B повтор фрагмента, промотка
  вперёд, скорость 0.25x–3x, громкость 0–300%, таймер сна, копирование
  ссылки, возврат на страницу.
• Внизу по центру: назад / стоп / вперёд (следующее видео).
• Тонкая красная полоска прогресса: клик и перетаскивание — перемотка.
  Во время рекламы над ней отдельная белая полоска рекламы.
• Клик по видео — пауза; на паузе в центре кликабельный значок ▶.
• Стрелка справа — колонка рекомендаций: переключение видео прямо в окне.
• Спонсорские вставки подсвечены зелёным (данные SponsorBlock), кнопка
  «Пропустить интеграцию» перепрыгивает вставку.

Шортсы:
• Кнопка над «лайком» выносит шортс в вертикальное мини-окно.
• Кнопки предыдущий/следующий шортс; автопереход по окончании ролика.
• Компактная панель управления под узкое окно.

Общее:
• Окно таскается за любое место и держит пропорции видео (letterbox +
  автоподгонка размера, раздельная память ширины для видео и шортсов).
• Горячие клавиши: Alt+P — открыть/закрыть, Alt+K — пауза, Alt+J/L — ±5 сек.
• Хоткеи внутри окна: пробел/K, стрелки, M.
• Режим «чистое видео» — нативный PiP без рамки.
• Опциональный авто-PiP при уходе со вкладки (Chrome 120+).

Видео не прерывается: переносится сам плеер YouTube — аккаунт, история и
качество сохраняются. Расширение не блокирует и не пропускает рекламу YouTube.

**EN:**

A button in the YouTube player pops the video out into an always-on-top
window (Document Picture-in-Picture). The window shows only the video and
playback controls — the rest of YouTube's UI (cards, shopping overlays,
endscreens, descriptions) is hidden.

Regular videos:
• Top panel (on hover): play/pause, A-B loop, skip ahead, 0.25x–3x speed,
  0–300% volume, sleep timer, copy link, return to page.
• Bottom center: previous / stop / next video buttons.
• Thin red progress strip: click or drag to seek; a separate white strip
  shows ad progress during ads.
• Click the video to pause; a clickable ▶ badge appears while paused.
• An arrow on the right opens a recommendations column — switch videos
  without leaving the window.
• Sponsor segments are highlighted in green (SponsorBlock data) with a
  one-click "Skip sponsor segment" button.

Shorts:
• A button above the Like button pops the short into a vertical window.
• Previous/next shorts buttons; auto-advance when a short ends.
• Compact control panel sized for the narrow window.

General:
• Drag the window from anywhere; it keeps the video's aspect ratio
  (letterboxing + size snapping, separate width memory per orientation).
• Hotkeys: Alt+P toggle, Alt+K pause, Alt+J/L ±5s; space/K, arrows and M
  inside the window.
• "Clean video" mode — frameless native PiP.
• Optional auto-PiP when leaving the tab (Chrome 120+).

Playback never restarts: the actual YouTube player is moved, so your
account, history and quality are preserved. The extension does not block
or skip YouTube ads.

## Категория
Производительность (Productivity).

## Язык
Русский + English (обе локали в пакете).

## Сайт
- Лендинг: https://n23eos.github.io/floatplayer-site/

## Privacy
- Privacy policy URL: https://n23eos.github.io/floatplayer-site/privacy.html
- Single purpose: «Показ видео YouTube в окне поверх всех окон с элементами управления воспроизведением».

### Ответы формы Data Usage
- Персональные данные не собираются; аналитики и трекеров нет.
- Единственная передача: **ID просматриваемого видео** уходит на
  sponsor.ajay.app (SponsorBlock) для получения границ спонсорских вставок;
  функция отключается в настройках. В форме: «Website content» (ID видео)
  → передаётся третьей стороне только для основной функции; не продаётся;
  не используется для рекламы/кредитоспособности.

### Обоснования разрешений (Permission justification)
- `storage` — сохранение настроек (режим окна, скорость, громкость, таймер,
  автопереход шортсов) и ширины окна по ориентации.
- `clipboardWrite` — кнопка «Скопировать ссылку на видео»: запись в буфер
  только по явному клику пользователя.
- Host `*://*.youtube.com/*` — вставка кнопок в плеер, перенос плеера в
  PiP-окно, управление воспроизведением на страницах YouTube.
- Host `https://sponsor.ajay.app/*` — запрос границ спонсорских сегментов
  по ID видео (подсветка и пропуск вставок).

## Вкладка «Меры по обеспечению конфиденциальности» — готовые ответы

Копировать как есть. Обоснования лучше на английском: ревьюеры международные.

### Описание цели (Single purpose)

> FloatPlayer has a single purpose: showing the YouTube video the user is
> currently watching in an always-on-top Picture-in-Picture window with playback
> controls. Every feature — play/pause, seeking, playback speed, volume, A-B
> loop, sleep timer, sponsor-segment skipping and Shorts navigation — controls
> the playback of that one video. The extension does nothing outside YouTube
> playback.

### Разрешение `storage`

> Stores the user's own preferences (mini-window style, speed slider step,
> volume ceiling, sleep-timer choice, Shorts auto-advance, panel behaviour) and
> the last mini-window width, so the extension behaves consistently across
> sessions and browser restarts. Only these preferences are stored. No browsing
> history, no personal data, and nothing is sent anywhere.

### Разрешение `clipboardWrite`

> Used only by the "Copy video link" button in the mini-window control panel.
> When the user clicks that button, the URL of the video currently playing is
> written to the clipboard, so the user can share it without returning to the
> YouTube tab. Nothing is written without an explicit click, and the extension
> never reads the clipboard.

### Разрешения на доступ к хостам

> `*://*.youtube.com/*` — the extension must run on YouTube watch and Shorts
> pages to add its button to the player, move the player element into the
> Document Picture-in-Picture window and control playback inside that window.
> This is the core function and cannot be done without access to YouTube pages.
>
> `https://sponsor.ajay.app/*` — used by the optional "sponsor segments"
> feature: the extension requests community-labelled sponsor-segment timestamps
> for the current video so they can be marked on the progress bar and skipped
> with one click. Only the video ID is sent, no cookies or account data, and the
> feature can be switched off in the extension options.

### Использование удалённого кода

Выбрать **«Нет, я не использую удалённый код»**. Если попросят пояснение:

> All JavaScript and CSS are bundled inside the extension package. The only
> network request fetches JSON timestamps from sponsor.ajay.app; that response
> is parsed as data and never evaluated or injected as code.

### Использование данных

- Категория: **Web history** — расширение передаёт ID просматриваемого видео
  стороннему API SponsorBlock (только при включённой функции). Пояснение:

> The extension has no servers and stores nothing remotely. When the optional
> sponsor-segment feature is enabled, the ID of the video being watched is sent
> to the community API sponsor.ajay.app to look up sponsor timestamps. It is not
> collected, stored or profiled by the developer, and the feature can be
> disabled in the options.

- Три обязательные галочки-подтверждения — отметить все, они верны:
  данные не продаются третьим лицам; не используются для целей, не связанных с
  основной функцией; не используются для оценки кредитоспособности.

### Контактный адрес издателя

Страница **Настройки → Контактная информация**: указать email и подтвердить его
по ссылке из письма. Без подтверждения публикация блокируется.

## Скриншоты (локализованные, 1280×800, 24-битный PNG без альфа-канала)

В консоли скриншоты загружаются отдельно для каждого языка листинга: англоязычным
пользователям покажут набор `en`, русскоязычным — `ru`. Лимит — 5 на язык, у нас ровно 5.
На русских кадрах интерфейс окна тоже русский («выкл», «Пропустить интеграцию»).

| № | `store/assets/screenshots/en/` и `/ru/` | Кадр |
|---|---|---|
| 1 | `01.png` | окно поверх рабочего приложения |
| 2 | `02.png` | панель управления с выносками |
| 3 | `03.png` | зелёный сегмент SponsorBlock + кнопка пропуска |
| 4 | `04.png` | открытая колонка рекомендаций |
| 5 | `05.png` | вертикальное окно шортса |

Кадры собраны на настоящих стилях расширения (`pip/pip.css`) и его классах —
интерфейс соответствует продукту; вместо чужого видео нейтральный градиент.
Пересобрать: `python3 <scratchpad>/shots/gen.py store/assets/screenshots`.

Значок магазина: `store/assets/store-icon-128.png` (он же `extension/icons/icon128.png`
в ZIP) — 128×128 PNG с альфа-каналом, рисунок ровно 96×96 по центру, по 16 px
прозрачных полей. Пересобрать все размеры: `python3 scripts/make-icons.py`.

Промо-графика:
- малый тайл 440×280 — `store/assets/promo-tile-440x280.png`;
- большое рекламное изображение (marquee) 1400×560 — `store/assets/marquee-1400x560.png`
  (24-битный PNG без альфа-канала) и `marquee-1400x560.jpg` (грузить любой из двух).

## Чеклист публикации
1. Аккаунт разработчика: https://chrome.google.com/webstore/devconsole
   ($5 разово). Включить 2FA; для команды — издательская группа
   (support.google.com/chrome/a/answer/9639925).
2. `npm run build` → загрузить `dist/floatplayer-<версия>.zip`.
3. Заполнить листинг из этого файла (описания, категория, язык).
4. Privacy: URL policy, single purpose, ответы Data Usage, обоснования
   разрешений — всё выше.
5. Скриншоты по списку.
6. Отправить на ревью (обычно 1–3 дня).
