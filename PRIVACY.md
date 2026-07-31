# Privacy Policy — FloatPlayer (Picture in Picture for YouTube)

_Last updated: 2026-07-31_

## English

FloatPlayer is a browser extension that shows a YouTube video in an
always-on-top window with playback controls.

**Data we collect: none.** The extension has no analytics, no trackers, no
accounts and no servers of its own. Nothing reaches the developer, and nothing
is ever sold or shared.

**Data stored locally:**
- Your settings (window style, speed step, volume ceiling, sleep timer,
  night mode, SponsorBlock options, Shorts auto-advance, panel behaviour) are
  stored in Chrome's `storage.sync` and stay within your browser / Google
  profile sync. We have no access to them.
- The last mini-window width is stored in `storage.local`, separately for
  landscape videos and vertical Shorts, together with a one-time flag that
  remembers whether the first-run hint has already been shown.

**Network requests:**
- If the "Sponsor segments (SponsorBlock)" feature is enabled (it is by
  default and can be turned off in the extension options), the extension
  sends the **ID of the YouTube video you are watching** to the community
  API `sponsor.ajay.app` to fetch sponsor-segment timestamps. No cookies,
  account data or personal identifiers are sent with the request.
  SponsorBlock's own privacy policy: https://sponsor.ajay.app/privacy
- If you open the **comments column** in the mini-window, the extension asks
  YouTube for them the same way the page itself does: a request to
  `www.youtube.com/youtubei/v1/next` from the YouTube tab, carrying the
  YouTube session you are already signed in to and your interface language.
  This goes to YouTube and nowhere else; the developer receives nothing.
- If you open the **live chat** for a stream, it is loaded as a normal
  `www.youtube.com/live_chat` page inside the window — again YouTube's own
  page under your existing session.
- Video thumbnails in the recommendations panel are loaded from YouTube's
  standard image host (`i.ytimg.com`), the same way YouTube itself loads
  them.

**Links to Google Forms:** the settings page has a "Report a bug" link, and
Chrome opens a short feedback form after you uninstall the extension. Both are
ordinary Google Forms pages. Nothing is pre-filled, attached or submitted on
your behalf — opening one is a normal website visit, covered by Google's own
privacy policy, and you can simply close the tab.

**Permissions used:**
- `storage` — saving your settings;
- access to `youtube.com` — adding the button to the player, moving the
  player into the mini-window, controlling playback, and loading comments
  and live chat when you ask for them;
- access to `sponsor.ajay.app` — fetching sponsor-segment timestamps
  (only when the feature is enabled).

**Contact:** https://x.com/Raincoat_talk or GitHub issues at
https://github.com/n23eos/floatplayer

## Русский

FloatPlayer — расширение браузера, показывающее видео YouTube в окне
поверх всех окон с элементами управления.

**Сбор данных: отсутствует.** В расширении нет аналитики, трекеров, аккаунтов
и собственных серверов. До разработчика ничего не доходит, данные никому не
передаются и не продаются.

**Локальное хранение:**
- Настройки (стиль окна, шаг скорости, потолок громкости, таймер сна, ночной
  режим, параметры SponsorBlock, автопереход шортсов, поведение панели)
  хранятся в `storage.sync` Chrome — внутри вашего браузера и синхронизации
  профиля Google. У нас доступа к ним нет.
- Последняя ширина мини-окна хранится в `storage.local` — отдельно для
  горизонтальных видео и вертикальных шортсов, вместе с одноразовой отметкой
  о том, что подсказка после установки уже показана.

**Сетевые запросы:**
- Если включена функция «Спонсорские вставки (SponsorBlock)» (включена по
  умолчанию, отключается в настройках), расширение отправляет **ID
  просматриваемого видео** на API сообщества `sponsor.ajay.app`, чтобы получить
  границы спонсорских вставок. Cookies, данные аккаунта и персональные
  идентификаторы не отправляются. Политика SponsorBlock:
  https://sponsor.ajay.app/privacy
- Если вы открываете **колонку комментариев** в мини-окне, расширение
  запрашивает их у YouTube так же, как это делает сама страница: запрос на
  `www.youtube.com/youtubei/v1/next` со вкладки YouTube, с той сессией
  YouTube, под которой вы уже вошли, и с языком интерфейса. Запрос уходит
  только к YouTube; разработчик не получает ничего.
- Если вы открываете **чат прямого эфира**, внутрь окна загружается обычная
  страница `www.youtube.com/live_chat` — снова сам YouTube под вашей
  существующей сессией.
- Обложки в панели рекомендаций загружаются со стандартного хоста картинок
  YouTube (`i.ytimg.com`) — так же, как их грузит сам YouTube.

**Ссылки на Google Формы:** на странице настроек есть ссылка «Сообщить об
ошибке», а после удаления расширения Chrome открывает короткую форму обратной
связи. Это обычные страницы Google Форм. Ничего не подставляется, не
прикрепляется и не отправляется за вас — открытие такой ссылки равнозначно
обычному заходу на сайт и подчиняется политике конфиденциальности Google;
вкладку можно просто закрыть.

**Разрешения:**
- `storage` — сохранение настроек;
- доступ к `youtube.com` — кнопка в плеере, перенос плеера в мини-окно,
  управление воспроизведением, а также загрузка комментариев и чата эфира,
  когда вы их открываете;
- доступ к `sponsor.ajay.app` — получение границ спонсорских вставок
  (только при включённой функции).

**Контакт:** https://x.com/Raincoat_talk или issues на
https://github.com/n23eos/floatplayer
