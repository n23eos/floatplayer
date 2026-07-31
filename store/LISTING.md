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

Поле «Описание цели», лимит 1000 символов (сейчас 694).

> FloatPlayer has a single purpose: playing the YouTube video the user is already watching inside an always-on-top Picture-in-Picture window, with the controls such a window needs.
> 
> Everything it does serves that one video — play/pause and seeking, playback speed, volume, A-B and full-video loop, chapter marks, night mode, a sleep timer, live-stream controls, Shorts navigation, skipping in-video sponsor segments, and a side column showing that same video's comments, live chat and recommendations so the user does not have to switch back to the tab.
> 
> The extension runs only on youtube.com and does nothing outside YouTube playback. It has no accounts, no analytics and no servers of its own.

### Разрешение `storage`

Поле «Обоснование (storage)», лимит 1000 символов (сейчас 657).

> Stores the user's own preferences in storage.sync: mini-window style, auto-PiP, compact panel, speed slider step, volume ceiling, manual skip step, night-mode level, autoplay, Shorts auto-advance, and the SponsorBlock switches and categories.
> 
> In storage.local it keeps the last mini-window width — separately for landscape videos and vertical Shorts, so the window reopens at the size the user left it — and a one-time flag recording that the first-run hint has already been shown, so it is not repeated.
> 
> That is all: the choices the user made on the options page plus that window size. No browsing history, no personal data, and nothing is sent anywhere.

### Разрешения на доступ к хостам

Поле «Обоснование (Разрешение на доступ к хостам)», лимит 1000 (сейчас 910).

> *://*.youtube.com/* — the extension runs on YouTube watch and Shorts pages to add its button to the player, move the real player element into the Document Picture-in-Picture window and control playback inside that window. The same access reads the current video's title, chapters and recommendations, and — only when the user opens that column — loads the video's comments and a stream's live chat from YouTube's own endpoints, under the session the user is already signed in to on that page. This is the core function and cannot be done without access to YouTube pages.
> 
> https://sponsor.ajay.app/* — used by the optional "sponsor segments" feature: it requests community-labelled timestamps for the current video so in-video sponsor reads can be marked on the progress bar and skipped in one click. Only the video ID is sent, no cookies and no account data, and the feature can be switched off in the options.

### Использование удалённого кода

Выбрать **«Нет, я не использую удалённый код»**, поле обоснования оставить
пустым. Проверено по коду: ни `eval`, ни `new Function`, ни создания тегов
`<script>`, ни `chrome.scripting`, ни исполнения в MAIN-мире. Весь JS и CSS
лежат в пакете. Сетевые ответы (сегменты SponsorBlock, JSON комментариев)
разбираются как данные и никогда не исполняются. Внешние URL в HTML
расширения — только ссылки-переходы в `<a href>`.

### Передача данных — какие категории отмечать

Отметить **одну**: «История веб-поиска» (Web history).

Причина: единственное, что покидает устройство в сторону не-YouTube, — ID
просматриваемого видео, уходящий на sponsor.ajay.app при включённых
спонсорских вставках. Он сообщает стороннему серверу, какую страницу смотрит
пользователь, а это и есть определение категории.

Остальные категории не отмечать:

- «Информация, позволяющая идентифицировать личность», «Медицинская
  информация», «Финансовые и платёжные данные», «Данные для аутентификации»,
  «Личная коммуникация», «Данные о местоположении» — ничего подобного
  расширение не читает и не передаёт.
- «Действия пользователей» — клики и нажатия обрабатываются только для
  управления плеером, никуда не отправляются и нигде не сохраняются.
- «Содержимое сайтов» — название видео, главы, комментарии и рекомендации
  читаются и показываются локально, в окне на устройстве пользователя;
  разработчику и третьим лицам они не передаются. Запросы комментариев и чата
  идут к самому YouTube, со вкладки YouTube и под уже открытой сессией
  пользователя, поэтому новой передачи данных не создают.

Три обязательные галочки-подтверждения — отметить все, они верны: данные не
продаются третьим лицам; не используются для целей, не связанных с основной
функцией; не используются для оценки кредитоспособности.

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
