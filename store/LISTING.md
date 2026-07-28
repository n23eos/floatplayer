# Материалы для Chrome Web Store

## Название
YouTube FloatPlayer

## Краткое описание (до 132 символов)

**RU:** Видео YouTube поверх всех окон: свой мини-плеер, A-B повтор, скорость, громкость до 300%, таймер сна, рекомендации.

**EN:** YouTube video always on top: mini-player with A-B loop, speed control, volume up to 300%, sleep timer, recommendations.

## Подробное описание

**RU:**

Кнопка в панели плеера YouTube выносит видео в окно поверх всех окон
(Document Picture-in-Picture) — работайте в других программах, не теряя видео.

Внутри мини-окна:
• Панель управления сверху (появляется при наведении): пауза, A-B повтор
  фрагмента, промотка вперёд, ползунок скорости 0.25x–3x, громкость 0–300%,
  таймер сна, возврат на страницу.
• Тонкая красная полоска прогресса снизу — клик и перетаскивание для перемотки.
• Стрелка справа открывает колонку рекомендаций — переключайте видео, не
  выходя из мини-окна.
• Спонсорские вставки подсвечиваются на таймлайне (данные сообщества
  SponsorBlock), кнопка «Пропустить интеграцию» перепрыгивает вставку.
• Окно можно таскать за любое место; размер подгоняется под пропорции видео.
• Горячие клавиши: Alt+P — открыть/закрыть, Alt+K — пауза, Alt+J/L — ±5 сек.
• Режим «чистое видео» — нативный PiP без рамки, для минималистов.

Видео не прерывается: переносится сам плеер YouTube, аккаунт, история и
качество сохраняются. Расширение не блокирует и не пропускает рекламу YouTube.

**EN:**

A button in the YouTube player pops the video out into an always-on-top
window (Document Picture-in-Picture) so you can keep watching while you work.

Inside the mini-window:
• Top control panel (appears on hover): play/pause, A-B loop, skip ahead,
  0.25x–3x speed slider, 0–300% volume, sleep timer, return to page.
• Thin red progress strip at the bottom — click or drag to seek.
• An arrow on the right opens a recommendations column — switch videos
  without leaving the window.
• Sponsor segments are highlighted on the timeline (community SponsorBlock
  data) with a one-click "Skip sponsor segment" button.
• Drag the window from anywhere; it snaps to the video's aspect ratio.
• Hotkeys: Alt+P toggle, Alt+K pause, Alt+J/L ±5s.
• "Clean video" mode — frameless native PiP for minimalists.

Playback never restarts: the actual YouTube player is moved, so your
account, history and quality are preserved. The extension does not block
or skip YouTube ads.

## Категория
Производительность (Productivity) или Развлечения (Entertainment) — рекомендую Productivity.

## Язык
Русский + English (в пакете обе локали).

## Privacy
- Privacy policy URL: https://github.com/n23eos/youtube_float_player/blob/master/PRIVACY.md
- Single purpose: «Показ видео YouTube в окне поверх всех окон с элементами управления воспроизведением».

### Ответы формы Data Usage
- Собирает ли расширение данные пользователя? — По сути нет. Единственная
  передача: **ID просматриваемого видео** уходит на sponsor.ajay.app для
  получения границ спонсорских вставок (функция отключается в настройках).
  В форме отметить: «Website content» (ID видео со страницы) → передаётся
  третьей стороне ТОЛЬКО для основной функции; не продаётся; не используется
  для кредитоспособности/рекламы.
- Аналитики, трекеров, аккаунтов — нет.

### Обоснования разрешений (Permission justification)
- `storage` — сохранение пользовательских настроек (режим окна, скорость,
  громкость, таймер) и ширины окна.
- Host `*://*.youtube.com/*` — вставка кнопки в панель плеера, перенос плеера
  в PiP-окно, управление воспроизведением на страницах YouTube.
- Host `https://sponsor.ajay.app/*` — запрос границ спонсорских сегментов
  (SponsorBlock) по ID видео для подсветки и пропуска вставок.

## Скриншоты (сделать вручную, 1280×800 или 640×400)
1. Страница YouTube + мини-окно поверх другого приложения.
2. Мини-окно крупно: верхняя панель раскрыта (A-B, скорость, громкость, таймер).
3. Красная полоска прогресса + зелёный сегмент SponsorBlock + кнопка «Пропустить интеграцию».
4. Открытая колонка рекомендаций.
5. Страница настроек.

## Чеклист публикации
1. Аккаунт разработчика: https://chrome.google.com/webstore/devconsole ($5 разово).
   Рекомендации Google для издателей: 2FA на аккаунте, для команды —
   издательская группа (support.google.com/chrome/a/answer/9639925).
2. `npm run build` → загрузить `dist/youtube-floatplayer-<версия>.zip`.
3. Заполнить листинг из этого файла (описания, категория, язык).
4. Privacy: вставить URL policy, single purpose, ответы Data Usage,
   обоснования разрешений — всё выше.
5. Скриншоты по списку.
6. Отправить на ревью (обычно 1–3 дня).
