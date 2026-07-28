# Материалы для Chrome Web Store

Актуально для версии 1.3.x.

## Название
FloatPlayer — Picture in Picture for YouTube

## Краткое описание (до 132 символов)

**RU:** YouTube поверх всех окон: мини-плеер без лишнего, шортсы с автопереходом, A-B повтор, скорость, громкость до 300%.

**EN:** YouTube always on top: clean mini-player, shorts with auto-next, A-B loop, speed control, volume boost up to 300%.

## Подробное описание (EN, 5317 символов из 16 000)

Готово к вставке в поле Detailed description. Факты сверены с кодом: скорость
0.25–3x, потолок громкости 300%, до 20 рекомендаций, таймер сна до 12 часов,
Chrome 116+.

```
FloatPlayer keeps YouTube on top of everything else. One click on the button in
the player — or Alt+P — and the video jumps into a small always-on-top window
with its own controls. Write code, answer emails, edit a spreadsheet: the video
stays visible above every other app and every other window.

This is a real Document Picture-in-Picture window, not a popup. It never falls
behind the window you are working in.


THE VIDEO NEVER RESTARTS

Most "PiP" extensions open a second player with the raw video file: you lose
your place, your settings and your captions.

FloatPlayer moves the actual YouTube player into the window. Same stream, same
timestamp, the quality you already had, same captions, same playlist position,
same watch history. Close the window and the player slides back into the page
exactly where it was — nothing reloads, nothing buffers again.

Ads are not blocked and not skipped: the extension plays by YouTube's rules.


WHAT NATIVE PICTURE-IN-PICTURE CANNOT DO

Chrome's built-in PiP gives you a play button and nothing else. FloatPlayer adds
what is actually missing:

- seeking — click or drag the progress strip, ±10 s click zones on the video
  itself, ±30 s buttons under it
- playback speed from 0.25x to 3x on a slider
- volume from 0 to 300% — from silence up to three times louder than YouTube's
  own maximum, for quietly recorded videos
- A-B loop for practising a phrase, a riff or a dance move
- a sleep timer that actually pauses the video, up to 12 hours
- prev/next video and up to 20 recommendations in a slide-out column,
  so you never go back to the tab
- Shorts support, which native PiP refuses to handle at all
- a genuinely clean window with no YouTube interface inside

Everything hides until you move the mouse, so most of the time you see only the
video. While an ad plays, a separate white strip shows how much of it is left
and the red one freezes at your real position. While the sleep timer counts
down, every panel stays hidden even under the cursor — the way it should be when
you are falling asleep.


SPONSOR SEGMENTS, MARKED AND SKIPPABLE

To be clear: YouTube's own ads are never touched. This is about sponsor reads
baked into the video itself.

Segments reported by the SponsorBlock community are painted green on the
progress strip, so you see an ad read coming, and a "Skip sponsor segment"
button takes you past it in one click. Only the video ID is sent to
sponsor.ajay.app — nothing about you, nothing about your browsing — and the
whole feature can be switched off.


SHORTS, PROPERLY SUPPORTED

A dedicated button above Like opens a short in a vertical window shaped for
9:16 — no black bars, no cropping. When a short ends the next one starts on its
own, and the bottom arrows scroll the feed straight from the window. You can run
Shorts in the corner of the screen like a television, without touching the
browser.


THE WINDOW BEHAVES THE WAY YOU EXPECT

Drag it from anywhere: press and hold on the video and move — the buttons stay
clickable, so dragging never triggers a control by accident. It opens at the
video's exact aspect ratio, snaps back to it after you resize by hand, and
rebuilds itself for videos with different proportions, remembering horizontal
videos and vertical Shorts separately.

Video only, guaranteed: the YouTube interface inside the window is removed by a
whitelist that allows the video, the captions and the loading spinner and
nothing else. Shopping overlays, info cards, end screens and any overlay YouTube
invents in the future simply cannot appear.

Want even less? "Clean video" mode uses native PiP with no Chrome strip at all.
And optional Auto-PiP (Chrome 120+) pops the video out by itself when you switch
tabs.


SHORTCUTS AND SETTINGS

From any Chrome window: Alt+P opens or closes the window (⌥P on Mac), Alt+K
pauses, Alt+J and Alt+L step 5 seconds. Inside the window: Space or K pauses,
arrows step 5 seconds, M mutes. All reassignable at chrome://extensions/shortcuts.

The options page covers window style, Auto-PiP, SponsorBlock, skip step, Shorts
auto-advance, compact panels, speed step, volume ceiling and interface language
(English by default, Russian for Russian-language browsers). Changes apply
immediately.


PRIVACY

No accounts, no sign-in, no tracking, no analytics, no ads. Nothing is collected
and nothing is sent anywhere, apart from the video ID for SponsorBlock — and
only while you leave that feature on. Permissions are the bare minimum: storage
for your settings, and access to youtube.com plus sponsor.ajay.app.


HONEST LIMITATIONS

Better to know before installing than to be disappointed after:

- Requires Chrome 116 or newer; older versions fall back to native PiP.
- The thin Chrome strip with the site address cannot be removed — it is an
  anti-phishing requirement for every Document PiP window. It hides on its own
  when the cursor moves away, and "clean video" mode has no strip at all.
- Transparency and click-through are not available in the Chrome API.
- One PiP window per browser, and its position cannot be set programmatically —
  both are browser limits, not ours.
- Seeking does not work during YouTube ads: the main video is not loaded at that
  moment, so there is nothing to seek through.
```

## Подробное описание (RU, 5295 символов из 16 000)

Вставлять при переключении языка листинга на русский. Совпадает по структуре и
фактам с английской версией.

```
FloatPlayer держит YouTube поверх всего остального. Один клик по кнопке в
плеере — или Alt+P — и видео переезжает в маленькое окно поверх всех окон со
своими элементами управления. Пишите код, разбирайте почту, правьте таблицу:
видео остаётся на виду поверх любого приложения и любого окна.

Это настоящее окно Document Picture-in-Picture, а не popup. Оно никогда не
проваливается за то окно, в котором вы работаете.


ВИДЕО НЕ НАЧИНАЕТСЯ ЗАНОВО

Большинство «PiP»-расширений открывают второй плеер с сырым видеофайлом: вы
теряете место, на котором остановились, свои настройки и субтитры.

FloatPlayer переносит в окно сам плеер YouTube. Тот же поток, та же секунда,
то качество, которое уже было, те же субтитры, то же место в плейлисте, та же
история просмотра. Закрываете окно — плеер возвращается на страницу ровно туда,
где стоял. Ничего не перезагружается и не буферизуется заново.

Реклама не блокируется и не пропускается: расширение играет по правилам YouTube.


ЧЕГО НЕ УМЕЕТ ВСТРОЕННЫЙ PICTURE-IN-PICTURE

Штатный PiP в Chrome даёт кнопку паузы и больше ничего. FloatPlayer добавляет
то, чего действительно не хватает:

- перемотка — клик и перетаскивание по полоске прогресса, зоны ±10 сек на самом
  видео, кнопки ±30 сек под ним
- скорость от 0.25x до 3x ползунком
- громкость от 0 до 300% — от тишины до втрое громче максимума самого YouTube,
  для тихо записанных роликов
- A-B повтор, чтобы отработать фразу, рифф или движение
- таймер сна, который действительно ставит видео на паузу, до 12 часов
- переход к предыдущему и следующему видео и до 20 рекомендаций
  в выдвижной колонке — на вкладку возвращаться не нужно
- поддержка шортсов, за которые штатный PiP вообще не берётся
- по-настоящему чистое окно без интерфейса YouTube внутри

Всё прячется, пока не двинете мышью, так что почти всё время вы видите только
видео. Пока идёт реклама, отдельная белая полоска показывает, сколько её
осталось, а красная замирает на вашей настоящей позиции. Пока идёт таймер сна,
панели скрыты даже под курсором — как и должно быть, когда вы засыпаете.


СПОНСОРСКИЕ ВСТАВКИ ВИДНО, И ИХ МОЖНО ПРОПУСТИТЬ

Сразу оговорка: рекламу самого YouTube расширение не трогает. Речь про
спонсорские вставки, вшитые в видео автором.

Сегменты, размеченные сообществом SponsorBlock, подсвечиваются зелёным на
полоске прогресса — вставку видно заранее, — а кнопка «Пропустить интеграцию»
перепрыгивает её одним кликом. На sponsor.ajay.app уходит только ID видео,
ничего о вас и ничего о вашем просмотре, и всю функцию можно выключить.


ШОРТСЫ — ПОЛНОЦЕННО

Отдельная кнопка над «лайком» открывает шортс в вертикальном окне под 9:16 —
без чёрных полей и без обрезки. Ролик закончился — сам включается следующий,
нижние стрелки листают ленту прямо из окна, а панель переключается на
компактный вид под узкое окно. Ленту шортсов можно держать в углу экрана как
телевизор, не трогая браузер.


ОКНО ВЕДЁТ СЕБЯ ТАК, КАК ВЫ ОЖИДАЕТЕ

Тащите его за любое место: зажали мышь на видео и повели — кнопки при этом
остаются кликабельными, так что перетаскивание не срабатывает случайно.
Окно открывается точно в пропорциях видео, возвращается к ним после ручного
растягивания и перестраивается под ролики с другими пропорциями, запоминая
размер отдельно для горизонтальных видео и вертикальных шортсов.

Только видео, гарантированно: интерфейс YouTube внутри окна убран «белым
списком», который пропускает видео, субтитры и индикатор загрузки — и больше
ничего. Плашки товаров, подсказки, конечные заставки и любые оверлеи, которые
YouTube придумает в будущем, просто не могут появиться.

Хочется ещё меньше? Режим «чистое видео» использует штатный PiP вообще без
полоски Chrome. А необязательный авто-PiP (Chrome 120+) выносит видео сам,
когда вы переключаете вкладку.


ГОРЯЧИЕ КЛАВИШИ И НАСТРОЙКИ

Из любого окна Chrome: Alt+P открывает и закрывает окно (⌥P на Mac), Alt+K
ставит паузу, Alt+J и Alt+L мотают на 5 секунд. Внутри окна: пробел или K —
пауза, стрелки — 5 секунд, M — звук. Всё переназначается на странице
chrome://extensions/shortcuts.

На странице настроек: стиль окна, авто-PiP, SponsorBlock, шаг промотки,
автопереход шортсов, компактные панели, шаг скорости, потолок громкости и язык
интерфейса (английский по умолчанию, русский для русскоязычных браузеров).
Изменения применяются сразу.


КОНФИДЕНЦИАЛЬНОСТЬ

Ни аккаунтов, ни входа, ни слежки, ни аналитики, ни рекламы. Ничего не
собирается и никуда не отправляется, кроме ID видео для SponsorBlock — и только
пока эта функция включена. Разрешений минимум: storage для ваших настроек
и доступ к youtube.com и sponsor.ajay.app.


ЧЕСТНЫЕ ОГРАНИЧЕНИЯ

Лучше знать до установки, чем разочароваться после:

- Нужен Chrome 116 или новее; на старых версиях будет штатный PiP.
- Тонкую полоску Chrome с адресом сайта убрать нельзя — это антифишинговое
  требование для любого окна Document Picture-in-Picture. Она сама скрывается,
  когда курсор уходит, а в режиме «чистое видео» её нет совсем.
- Прозрачность и клик сквозь окно в Chrome API недоступны.
- Одно PiP-окно на браузер, и позицию окна нельзя задать программно — это
  ограничения браузера, а не наши.
- Во время рекламы YouTube перемотка не работает: основное видео в этот момент
  не загружено, мотать физически нечего.
```

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

## Локализация — 14 языков полностью

Интерфейс расширения (`extension/_locales/`), описание листинга
(`store/descriptions/`) и скриншоты (`store/assets/screenshots/`) готовы для
всех четырнадцати языков. Ничего не наследуется от английского.

| Язык в консоли | Код | Описание | Краткое | Скриншоты |
|---|---|---|---|---|
| English (основной) | en | `en.txt` | `en-short.txt` | `screenshots/en/` |
| Русский | ru | `ru.txt` | `ru-short.txt` | `screenshots/ru/` |
| Español | es | `es.txt` | `es-short.txt` | `screenshots/es/` |
| Português (Brasil) | pt_BR | `pt_BR.txt` | `pt_BR-short.txt` | `screenshots/pt_BR/` |
| Deutsch | de | `de.txt` | `de-short.txt` | `screenshots/de/` |
| 日本語 | ja | `ja.txt` | `ja-short.txt` | `screenshots/ja/` |
| Français | fr | `fr.txt` | `fr-short.txt` | `screenshots/fr/` |
| Bahasa Indonesia | id | `id.txt` | `id-short.txt` | `screenshots/id/` |
| Türkçe | tr | `tr.txt` | `tr-short.txt` | `screenshots/tr/` |
| हिन्दी | hi | `hi.txt` | `hi-short.txt` | `screenshots/hi/` |
| 한국어 | ko | `ko.txt` | `ko-short.txt` | `screenshots/ko/` |
| Italiano | it | `it.txt` | `it-short.txt` | `screenshots/it/` |
| Polski | pl | `pl.txt` | `pl-short.txt` | `screenshots/pl/` |
| Українська | uk | `uk.txt` | `uk-short.txt` | `screenshots/uk/` |

Порядок в консоли: выбрать язык на вкладке Store listing → вставить подробное и
краткое описание из соответствующих файлов → загрузить пять скриншотов из папки
того же языка. Английский заполняется первым как основной.

Пересборка: `python3 scripts/make-descriptions.py` и
`scripts/make-descriptions-2.py` для текстов,
`python3 scripts/make-screenshots.py store/assets/screenshots` для кадров.

## Скриншоты (локализованные, 1280×800, 24-битный PNG без альфа-канала)

Лимит 5 на язык, у нас ровно 5 в каждом из 8 наборов. На локализованных кадрах
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

Промо-графика:
- малый тайл 440×280 — `store/assets/promo-tile-440x280.png`;
- большое рекламное изображение (marquee) 1400×560 — `store/assets/marquee-1400x560.png`
  (24-битный PNG без альфа-канала) и `marquee-1400x560.jpg`.

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
