# Privacy Policy — YouTube FloatPlayer

_Last updated: 2026-07-28_

## English

YouTube FloatPlayer is a browser extension that shows a YouTube video in an
always-on-top window with playback controls.

**Data we collect: none.** The extension has no analytics, no trackers, no
accounts, and never sells or shares any data.

**Data stored locally:**
- Your settings (window mode, speed step, volume limit, sleep timer options,
  panel behavior) are stored in Chrome's `storage.sync` and stay within your
  browser / Google profile sync. We have no access to them.
- The last window width is stored locally the same way.

**Network requests:**
- If the "Sponsor segments (SponsorBlock)" feature is enabled (it is by
  default and can be turned off in the extension options), the extension
  sends the **ID of the YouTube video you are watching** to the community
  API `sponsor.ajay.app` to fetch sponsor-segment timestamps. No cookies,
  account data, or personal identifiers are sent with the request.
  SponsorBlock's own privacy policy: https://sponsor.ajay.app/privacy
- Video thumbnails in the recommendations panel are loaded from YouTube's
  standard image host (`i.ytimg.com`), the same way YouTube itself loads
  them.

**Clipboard:** the "Copy video link" button writes the video URL to your
clipboard only when you click it; nothing is read from the clipboard.

**Permissions used:**
- `storage` — saving your settings;
- `clipboardWrite` — the copy-link button described above;
- access to `youtube.com` — adding the button to the player and controlling
  playback;
- access to `sponsor.ajay.app` — fetching sponsor-segment timestamps
  (only when the feature is enabled).

**Contact:** https://x.com/Raincoat_talk or GitHub issues at
https://github.com/n23eos/youtube_float_player

## Русский

YouTube FloatPlayer — расширение браузера, показывающее видео YouTube в окне
поверх всех окон с элементами управления.

**Сбор данных: отсутствует.** В расширении нет аналитики, трекеров и
аккаунтов; данные никому не передаются и не продаются.

**Локальное хранение:**
- Настройки (режим окна, шаг скорости, потолок громкости, таймер сна,
  поведение панели) хранятся в `storage.sync` Chrome — внутри вашего браузера
  и синхронизации профиля Google. У нас доступа к ним нет.
- Так же хранится последняя ширина окна.

**Сетевые запросы:**
- Если включена функция «Интеграции на таймлайне (SponsorBlock)» (включена по
  умолчанию, отключается в настройках), расширение отправляет **ID
  просматриваемого видео** на API сообщества `sponsor.ajay.app`, чтобы получить
  границы спонсорских вставок. Cookies, данные аккаунта и персональные
  идентификаторы не отправляются. Политика SponsorBlock:
  https://sponsor.ajay.app/privacy
- Обложки в панели рекомендаций загружаются со стандартного хоста картинок
  YouTube (`i.ytimg.com`) — так же, как их грузит сам YouTube.

**Буфер обмена:** кнопка «Скопировать ссылку» записывает адрес видео в буфер
только по вашему клику; чтение из буфера не выполняется.

**Разрешения:**
- `storage` — сохранение настроек;
- `clipboardWrite` — кнопка копирования ссылки (см. выше);
- доступ к `youtube.com` — кнопка в плеере и управление воспроизведением;
- доступ к `sponsor.ajay.app` — получение границ спонсорских вставок
  (только при включённой функции).

**Контакт:** https://x.com/Raincoat_talk или issues на
https://github.com/n23eos/youtube_float_player
