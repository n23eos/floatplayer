# Материалы для Chrome Web Store

Актуально для версии 1.12.x.

## Название
FloatPlayer — Picture in Picture for YouTube

## Краткое описание (до 132 символов)

**RU:** YouTube поверх всех окон: скорость, громкость до 300%, A-B повтор, ночной режим, комментарии и чат прямо в мини-окне.

**EN:** YouTube always on top: speed, volume to 300%, A-B loop, night mode, comments and live chat right inside the mini-window.

## Подробное описание

Единственный источник — файлы `store/descriptions/<язык>.txt`. Раньше тексты
дублировались ещё и здесь, и копии разошлись с оригиналом; теперь в консоль
вставляется содержимое файла нужного языка как есть.

- английский: `store/descriptions/en.txt`
- остальные 13 языков: файл с тем же кодом языка рядом

Правится только `en.txt`, остальные приводятся к нему переводом. Скрипты
`scripts/make-descriptions*.py` относятся к прежнему поколению текстов и больше
не используются.

## Категория
Производительность (Productivity).

## Язык
14 локалей в пакете (см. таблицу «Локализация» ниже). Основной язык
листинга — English.

## Сайт
- Лендинг: https://n23eos.github.io/floatplayer-site/

## Privacy
- Privacy policy URL: https://n23eos.github.io/floatplayer-site/privacy.html
- Single purpose: «Показ видео YouTube в окне поверх всех окон с элементами управления воспроизведением».

### Ответы формы Data Usage
- Персональные данные не собираются; аналитики и трекеров нет.
- Единственная передача третьей стороне: **ID просматриваемого видео** уходит
  на sponsor.ajay.app (SponsorBlock) для получения границ спонсорских вставок;
  функция отключается в настройках. В форме: «Website content» (ID видео)
  → передаётся третьей стороне только для основной функции; не продаётся;
  не используется для рекламы/кредитоспособности.
- Остальные запросы идут к самому YouTube со вкладки YouTube и под уже
  открытой сессией пользователя: комментарии (`youtubei/v1/next`), страница
  чата эфира (`live_chat`) и обложки рекомендаций (`i.ytimg.com`). Данные при
  этом не покидают YouTube и до разработчика не доходят, отдельной категории
  в форме им не соответствует.

### Обоснования разрешений (Permission justification)
- `storage` — сохранение настроек (режим окна, скорость, громкость, таймер,
  автопереход шортсов) и ширины окна по ориентации.
- Host `*://*.youtube.com/*` — вставка кнопок в плеер, перенос плеера в
  PiP-окно, управление воспроизведением на страницах YouTube, а также загрузка
  комментариев и чата эфира в боковую колонку окна.
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

> All JavaScript and CSS are bundled inside the extension package. Network
> requests only fetch data, never code: sponsor timestamps from
> sponsor.ajay.app, and — when the user opens the comments column — comment
> JSON from YouTube's own endpoint on the page the extension already runs on.
> Both responses are parsed as data and never evaluated or injected as code.

### Использование данных

- Категория: **Web history** — расширение передаёт ID просматриваемого видео
  стороннему API SponsorBlock (только при включённой функции). Пояснение:

> The extension has no servers and stores nothing remotely. When the optional
> sponsor-segment feature is enabled, the ID of the video being watched is sent
> to the community API sponsor.ajay.app to look up sponsor timestamps. It is not
> collected, stored or profiled by the developer, and the feature can be
> disabled in the options. Comments and live chat are fetched from YouTube
> itself, from the YouTube tab and under the session the user is already signed
> in to, so nothing about the user leaves YouTube for us or anyone else.

- Три обязательные галочки-подтверждения — отметить все, они верны:
  данные не продаются третьим лицам; не используются для целей, не связанных с
  основной функцией; не используются для оценки кредитоспособности.

### Контактный адрес издателя

Страница **Настройки → Контактная информация**: указать email и подтвердить его
по ссылке из письма. Без подтверждения публикация блокируется.

## Локализация — 14 языков полностью

Интерфейс расширения (`extension/_locales/`), описание листинга
(`store/descriptions/`, структура: catch-блок → топ-фичи → подробности) и скриншоты (`store/assets/screenshots/`) готовы для
всех четырнадцати языков. Ничего не наследуется от английского.

| Язык в консоли | Код | Описание | Скриншоты |
|---|---|---|---|
| English (основной) | en | `en.txt` | `screenshots/en/` |
| Русский | ru | `ru.txt` | `screenshots/ru/` |
| Español | es | `es.txt` | `screenshots/es/` |
| Português (Brasil) | pt_BR | `pt_BR.txt` | `screenshots/pt_BR/` |
| Deutsch | de | `de.txt` | `screenshots/de/` |
| 日本語 | ja | `ja.txt` | `screenshots/ja/` |
| Français | fr | `fr.txt` | `screenshots/fr/` |
| Bahasa Indonesia | id | `id.txt` | `screenshots/id/` |
| Türkçe | tr | `tr.txt` | `screenshots/tr/` |
| हिन्दी | hi | `hi.txt` | `screenshots/hi/` |
| 한국어 | ko | `ko.txt` | `screenshots/ko/` |
| Italiano | it | `it.txt` | `screenshots/it/` |
| Polski | pl | `pl.txt` | `screenshots/pl/` |
| Українська | uk | `uk.txt` | `screenshots/uk/` |

Порядок в консоли: выбрать язык на вкладке Store listing → вставить подробное и
краткое описание из соответствующих файлов → загрузить пять скриншотов из папки
того же языка. Английский заполняется первым как основной.

Пересборка кадров: `python3 scripts/make-screenshots.py store/assets/screenshots`
(можно с перечнем языков: `... store/assets/screenshots en ru`). Подписи к
кадрам лежат в `scripts/shots/captions.json`, вёрстка сцены — в
`scripts/shots/base.css` и `scripts/shots/parts.js`. Сам интерфейс окна на
кадрах берётся из настоящего `extension/pip/pip.css`, поэтому кадры не могут
разойтись с продуктом по оформлению.

## Скриншоты (локализованные, 1280×800, 24-битный PNG без альфа-канала)

Лимит 5 на язык, у нас ровно 5 в каждом из 14 наборов. На локализованных кадрах
интерфейс окна тоже на нужном языке. Пересобрать все наборы:
`python3 scripts/make-screenshots.py store/assets/screenshots`.

| № | файл | Кадр |
|---|---|---|
| 1 | `01.png` | окно поверх рабочего приложения |
| 2 | `02.png` | панель управления с выносками |
| 3 | `03.png` | зелёный сегмент SponsorBlock + кнопка пропуска |
| 4 | `04.png` | открытая колонка рекомендаций |
| 5 | `05.png` | вертикальное окно шортса |

Кадры собраны на настоящих стилях расширения (`pip/pip.css`) и его классах;
вместо чужого видео нейтральный градиент.

Значок магазина: `store/assets/store-icon-128.png` (он же `extension/icons/icon128.png`
в ZIP) — 128×128 PNG с альфа-каналом, рисунок ровно 96×96 по центру, по 16 px
прозрачных полей. Пересобрать все размеры: `python3 scripts/make-icons.py`.

Промо-графика собирается тем же способом, что и кадры, — из настоящих стилей
мини-окна: `python3 scripts/make-promo.py`. Копии кладутся сразу и в
`store/assets/`, и в `docs/assets/` для лендинга.

- малый тайл 440×280 — `store/assets/promo-tile-440x280.png`;
- большое рекламное изображение (marquee) 1400×560 — `store/assets/marquee-1400x560.png`
  (24-битный PNG без альфа-канала) и `marquee-1400x560.jpg`.

Кадр со страницей настроек для лендинга — `python3 scripts/make-options-shot.py`
(рендерит настоящую `extension/options` в тёмной теме).

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

## Краткое описание

Отдельного поля краткого описания в консоли нет — сводка в поиске берётся из
`description` манифеста, то есть из ключа `extDesc` в `_locales/<язык>/messages.json`.
Файлы `*-short.txt` удалены как лишняя сущность.
