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

## Privacy
- Privacy policy URL: https://github.com/n23eos/floatplayer/blob/master/PRIVACY.md
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

## Скриншоты (сделать вручную, 1280×800 или 640×400)
1. Мини-окно поверх другого приложения, идёт видео.
2. Мини-окно с раскрытой верхней панелью (A-B, скорость, громкость, таймер).
3. Красная полоска + зелёный сегмент SponsorBlock + кнопка «Пропустить интеграцию».
4. Открытая колонка рекомендаций.
5. Вертикальное окно шортса с кнопками навигации.
6. Страница настроек.

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
