"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Ядро расширения: перенос всего #movie_player в Document PiP-окно и обратно.
// Переносим целый плеер (не голый <video>), поэтому родные контролы YouTube,
// субтитры и главы продолжают работать внутри PiP-окна.
YTFP.pip = (() => {
  // Состояние открытого PiP-окна; null — окно закрыто.
  let state = null;

  // Открытие в процессе: между requestWindow и заполнением state есть
  // await'ы, и повторный вызов open() (двойной Alt+P) успел бы открыть
  // второе окно и увести плеер из первого.
  let isOpening = false;

  function isOpen() {
    return state !== null || document.pictureInPictureElement !== null;
  }

  /** Нативный видео-PiP: без рамки Chrome, но и без нашей панели. */
  async function openNative() {
    const video = YTFP.playerApi.getVideo();
    if (!video) {
      return false;
    }
    try {
      await video.requestPictureInPicture();
      return true;
    } catch (error) {
      console.warn("[YTFP] Native PiP failed:", error);
      return false;
    }
  }

  /** Плеер, который сейчас перенесён в PiP-окно (для player-api). */
  function getMovedPlayer() {
    return state ? state.playerEl : null;
  }

  // Название видео берём из заголовка страницы, а не из разметки плеера:
  // YouTube держит <title> актуальным при SPA-навигации, а плеер к этому
  // моменту уже уехал в PiP-окно.
  function getPageVideoTitle() {
    return YTFP.utils.videoTitleFromPageTitle(document.title);
  }

  // Блоки страницы, где лежит аватарка канала: для обычного видео и для
  // шортсов. Ищем по контейнеру, а не по классам самой картинки: имена
  // классов YouTube меняет часто, а блок автора живёт на месте.
  const CHANNEL_AVATAR_SCOPES = [
    "ytd-watch-metadata #owner",
    "#owner",
    "ytd-reel-video-renderer[is-active] reel-channel-bar-view-model",
    "ytd-reel-video-renderer[is-active]",
    "ytd-reel-player-header-renderer"
  ];

  /** Аватарка канала со страницы или "" — плеер уже мог уехать в окно. */
  function getChannelAvatarUrl() {
    for (const scope of CHANNEL_AVATAR_SCOPES) {
      const root = document.querySelector(scope);
      if (!root) {
        continue;
      }
      // Аватарки лежат на отдельном хосте — по нему и отличаем их от
      // превью и прочих картинок внутри блока.
      const image =
        root.querySelector('img[src*="yt3."]') || root.querySelector("img[src]");
      if (image && image.src) {
        return image.src;
      }
    }
    return "";
  }

  // Критический минимум стилей на случай, если pip.css не удалось получить
  // (например, расширение обновили, а вкладку не перезагрузили — старый
  // content-script теряет доступ к файлам расширения). Гарантирует чёрный
  // фон и «только видео» даже без основного файла стилей.
  const FALLBACK_CSS = `
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    #movie_player, #shorts-player { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; background: #000 !important; }
    #movie_player video.html5-main-video, #shorts-player video.html5-main-video { width: 100% !important; height: 100% !important; left: 0 !important; top: 0 !important; object-fit: contain !important; }
    #movie_player > :not(.html5-video-container):not(.ytp-caption-window-container):not(.ytp-spinner):not(.ytfp-sb-skip),
    #shorts-player > :not(.html5-video-container):not(.ytp-caption-window-container):not(.ytp-spinner):not(.ytfp-sb-skip) { display: none !important; }
    .ytfp-top { position: absolute; left: 8px; right: 8px; top: 8px; z-index: 10000; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; pointer-events: none; }
    .ytfp-bar { width: 100%; box-sizing: border-box; pointer-events: auto; }
    .ytfp-title { display: flex; align-items: center; gap: 8px; max-width: 100%; padding: 5px 12px 5px 5px; border-radius: 10px; background: rgba(10, 10, 10, 0.78); color: #eee; font: 12px "Roboto", Arial, sans-serif; pointer-events: none; }
    .ytfp-title-avatar { width: 22px; height: 22px; border-radius: 50%; flex: none; }
    .ytfp-title-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ytfp-title--compact { opacity: 0; }
    body:hover .ytfp-title--compact { opacity: 1; }
  `;

  // Стили тянем один раз при старте скрипта, пока контекст расширения
  // гарантированно жив, и дальше используем кэш.
  const pipCssPromise = fetch(chrome.runtime.getURL("pip/pip.css"))
    .then((response) => (response.ok ? response.text() : ""))
    .catch((error) => {
      console.warn("[YTFP] Failed to load pip.css:", error);
      return "";
    });

  async function loadPipCss() {
    const cssText = await pipCssPromise;
    return cssText || FALLBACK_CSS;
  }

  /** Вертикальное видео (шортс) и горизонтальное помнят ширину раздельно. */
  function widthStorageKey(isPortrait) {
    return isPortrait ? "pipWidthPortrait" : "pipWidth";
  }

  function isPortraitVideo(video) {
    return Boolean(video && video.videoHeight > video.videoWidth);
  }

  /**
   * Размер окна: ширину берём сохранённую для этой ориентации (или дефолт),
   * высоту считаем из пропорций текущего видео — окно открывается без полос.
   */
  async function getInitialSize(video) {
    const portrait = isPortraitVideo(video);
    let width = portrait ? 320 : YTFP.DEFAULT_PIP_SIZE.width;
    try {
      const key = widthStorageKey(portrait);
      const stored = await chrome.storage.local.get(key);
      if (stored[key] > 0) {
        width = stored[key];
      }
    } catch (error) {
      console.warn("[YTFP] Failed to read saved size:", error);
    }
    const hasDimensions = video && video.videoWidth > 0 && video.videoHeight > 0;
    const aspect = hasDimensions
      ? video.videoWidth / video.videoHeight
      : portrait ? 9 / 16 : 16 / 9;
    return { width, height: Math.round(width / aspect) };
  }

  function saveSize(pipWindow, video) {
    if (!(pipWindow.innerWidth > 0)) {
      return;
    }
    chrome.storage.local
      .set({ [widthStorageKey(isPortraitVideo(video))]: pipWindow.innerWidth })
      .catch(() => {});
  }

  /** Заглушка на странице вместо уехавшего плеера. */
  function buildOverlay(parent) {
    // Заглушка позиционируется absolute — родитель обязан быть positioned.
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    // Строим DOM без innerHTML: YouTube включает Trusted Types.
    const overlay = document.createElement("div");
    overlay.className = "ytfp-page-overlay";

    const inner = document.createElement("div");
    inner.className = "ytfp-page-overlay-inner";

    const icon = document.createElement("div");
    icon.className = "ytfp-page-overlay-icon";
    icon.textContent = "▶";

    const message = document.createElement("div");
    message.textContent = chrome.i18n.getMessage("overlayPlaying") || "Playing in the floating window";

    const returnButton = document.createElement("button");
    returnButton.className = "ytfp-page-overlay-return";
    returnButton.textContent = chrome.i18n.getMessage("overlayReturn") || "Bring it back";
    returnButton.addEventListener("click", close);

    inner.append(icon, message, returnButton);
    overlay.appendChild(inner);
    parent.appendChild(overlay);
    return overlay;
  }

  function injectOverlayStyles() {
    if (document.getElementById("ytfp-page-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "ytfp-page-styles";
    style.textContent = `
      .ytfp-page-overlay {
        position: absolute; inset: 0; z-index: 100;
        display: flex; align-items: center; justify-content: center;
        background: #0f0f0f; color: #fff; min-height: 200px;
        font-family: "Roboto", Arial, sans-serif; font-size: 15px;
      }
      .ytfp-page-overlay-inner { text-align: center; display: grid; gap: 12px; }
      .ytfp-page-overlay-icon { font-size: 40px; opacity: 0.6; }
      .ytfp-page-overlay-return {
        cursor: pointer; border: 0; border-radius: 18px; padding: 8px 18px;
        background: #f1f1f1; color: #0f0f0f; font-size: 14px; font-weight: 500;
      }
      .ytfp-page-overlay-return:hover { background: #d9d9d9; }
    `;
    document.head.appendChild(style);
  }

  // Переход к следующему/предыдущему видео — хоткеями страницы (Shift+N / Shift+P).
  // Кликать .ytp-next-button / .ytp-prev-button нельзя: это <a href="/watch?v=...">,
  // и вместе с плеером они уезжают в документ PiP-окна. SPA-роутер YouTube слушает
  // клики только в документе страницы, поэтому сработало бы дефолтное поведение
  // якоря: PiP-окно ушло бы на watch-страницу и закрылось, вернув плеер обратно.
  const NEXT_VIDEO_HOTKEY = { key: "N", code: "KeyN", keyCode: 78 };
  const PREV_VIDEO_HOTKEY = { key: "P", code: "KeyP", keyCode: 80 };

  // Сколько ждём родное автовоспроизведение YouTube, прежде чем перейти самим.
  const AUTOPLAY_FALLBACK_DELAY_MS = 1200;

  function pressPageHotkey({ key, code, keyCode }) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        code,
        keyCode,
        which: keyCode,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  }

  /** Открыть PiP. Возвращает true при успехе. */
  async function open() {
    if (isOpen()) {
      return true;
    }
    if (isOpening) {
      return false; // уже открываем (двойной Alt+P) — второе окно не нужно
    }
    isOpening = true;
    try {
      return await openDocumentPip();
    } finally {
      isOpening = false;
    }
  }

  async function openDocumentPip() {
    const playerEl = YTFP.playerApi.getPlayerRoot();
    if (!playerEl || !YTFP.playerApi.isPlayerPage()) {
      return false;
    }
    const isShorts = YTFP.playerApi.isShortsPage();

    // Режим «чистое видео»: нативный PiP без рамки Chrome и без панели.
    // Тот же путь — фолбэк для Chrome без Document PiP API.
    if (YTFP.settings.get().windowMode === "native" || !("documentPictureInPicture" in window)) {
      return openNative();
    }

    const size = await getInitialSize(YTFP.playerApi.getVideo());
    let pipWindow;
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow(size);
    } catch (error) {
      // Чаще всего: вызов без жеста пользователя.
      console.warn("[YTFP] requestWindow failed:", error);
      return false;
    }

    // Единственный await между открытием окна и переносом плеера. Пока он
    // шёл, пользователь мог окно закрыть — переносить плеер в мёртвый
    // документ нельзя: он пропал бы со страницы насовсем.
    const cssText = await loadPipCss();
    if (pipWindow.closed) {
      return false;
    }

    const parent = playerEl.parentElement;
    // Маркер позиции, чтобы вернуть плеер ровно на своё место.
    const placeholder = document.createElement("div");
    placeholder.hidden = true;
    parent.insertBefore(placeholder, playerEl);

    // Стили PiP-окна.
    const style = pipWindow.document.createElement("style");
    style.textContent = cssText;
    pipWindow.document.head.appendChild(style);
    // Название видео. В системную полоску окна Chrome пишет только origin
    // (youtube.com) и document.title там не показывает, поэтому рисуем
    // надпись сами — плашкой под основной панелью: кружок канала и текст.
    const titleBar = pipWindow.document.createElement("div");
    titleBar.className = "ytfp-title";
    // Компактный режим — тот же, что у панели: название всплывает вместе
    // с ней при наведении, а без курсора в окне видно только видео.
    if (YTFP.settings.get().compactMode) {
      titleBar.classList.add("ytfp-title--compact");
    }

    const avatar = pipWindow.document.createElement("img");
    avatar.className = "ytfp-title-avatar";
    avatar.alt = "";
    const titleText = pipWindow.document.createElement("span");
    titleText.className = "ytfp-title-text";
    titleBar.append(avatar, titleText);

    // Какому видео принадлежит показанная сейчас аватарка. На шортсах ID из
    // адреса не достать, поэтому запасной ключ — сам путь: он там меняется
    // при переходе к следующему ролику.
    let avatarVideoKey = null;

    const applyTitle = () => {
      const title = getPageVideoTitle();
      // document.title — для переключателя окон ОС, наша строка — для глаз.
      if (pipWindow.document.title !== title) {
        pipWindow.document.title = title;
      }
      if (titleText.textContent !== title) {
        titleText.textContent = title;
      }
      // Видео сменилось — старую аватарку убираем сразу, не дожидаясь новой.
      // Иначе, пока разметка страницы перерисовывается, в плашке висел бы
      // кружок предыдущего канала, а это хуже, чем пустое место.
      const videoKey = YTFP.playerApi.getVideoId() || location.pathname;
      if (videoKey !== avatarVideoKey) {
        avatarVideoKey = videoKey;
        avatar.removeAttribute("src");
      }
      const avatarUrl = getChannelAvatarUrl();
      if (avatarUrl && avatar.src !== avatarUrl) {
        avatar.src = avatarUrl;
      }
      // Канал не нашёлся — показываем одно название, без пустого кружка.
      avatar.hidden = !avatar.src;
    };
    applyTitle();

    // Заголовок страницы YouTube меняет сразу, а блок автора перерисовывает
    // позже — правок <head> к этому моменту уже не бывает, и одной только
    // подпиской ниже аватарка осталась бы от прошлого видео. Поэтому ещё и
    // периодическая сверка, как у чата и оценок.
    const TITLE_SYNC_INTERVAL_MS = 1000;
    const titleTicker = setInterval(applyTitle, TITLE_SYNC_INTERVAL_MS);

    // Видео меняется без перезагрузки (очередь, рекомендации, «вперёд»),
    // поэтому следим за заголовком страницы и обновляем надпись.
    // Наблюдаем <head>, а не сам <title>: при SPA-навигации YouTube иногда
    // заменяет элемент целиком, и слушатель на старом элементе умирает.
    // YouTube правит <head> часто (стили, meta), а нас интересует только
    // заголовок — поэтому сверяемся с текущим значением перед записью.
    const titleObserver = new MutationObserver(() => {
      if (!state || pipWindow.closed) {
        return;
      }
      applyTitle();
    });
    titleObserver.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true
    });

    // Скорость до переноса: защита от YouTube-фичи «удержание = 2x»,
    // которая могла сработать из-за потерянного mouseup при переносе.
    const video = playerEl.querySelector("video.html5-main-video");
    const rateBeforeMove = video ? video.playbackRate : 1;

    // Переносим плеер целиком.
    pipWindow.document.body.appendChild(playerEl);

    if (video) {
      video.playbackRate = rateBeforeMove;
      // YouTube может включить 2x с задержкой — контрольный сброс.
      setTimeout(() => {
        if (state && video.playbackRate !== rateBeforeMove) {
          video.playbackRate = rateBeforeMove;
        }
      }, 700);
    }

    // Глушим нажатия по зоне плеера для скриптов YouTube: их фича
    // «удержание мыши = 2x» ломается в PiP-окне (mouseup теряется из-за
    // перетаскивания окна) и скорость залипает. Наши элементы работают —
    // они слушают click, который синтезируется независимо от propagation.
    const blockPlayerPress = (event) => {
      if (!event.target || !event.target.closest) {
        return;
      }
      // Наши элементы внутри плеера (кнопка пропуска интеграции) должны
      // получать клики как обычно.
      if (event.target.closest(".ytfp-sb-skip")) {
        return;
      }
      if (event.target.closest("#movie_player, #shorts-player")) {
        event.stopPropagation();
      }
    };
    // click и dblclick тоже глушим: иначе YouTube сам ставит паузу по клику,
    // и вместе с нашим обработчиком получается двойное переключение
    // (пауза и тут же снятие). Наш обработчик клика в pip-nav работает в
    // capture-фазе на том же document и срабатывает до остановки.
    for (const type of ["pointerdown", "mousedown", "touchstart", "click", "dblclick"]) {
      pipWindow.document.addEventListener(type, blockPlayerPress, true);
    }

    injectOverlayStyles();
    const overlay = buildOverlay(parent);

    // Подсказки для всех органов управления окна: один общий узел, который
    // модули ниже наполняют через YTFP.tooltips.attach().
    YTFP.tooltips.install(pipWindow.document);

    const getMovedVideo = () => playerEl.querySelector("video.html5-main-video");

    // Чат прямого эфира. У шортсов эфиров не бывает — там панель не строим.
    const chat = isShorts ? null : YTFP.pipChat.build(pipWindow.document);

    // Оценки — крупными полупрозрачными значками у левого края, под
    // названием. В общую панель они не входят: там им пришлось бы делить
    // размер с остальными кнопками, а это самое частое действие в окне.
    const reactions = YTFP.pipReactions.build(pipWindow.document);

    // Сверху — только подпись: что играет и чей канал.
    const topStack = pipWindow.document.createElement("div");
    topStack.className = "ytfp-top";
    topStack.append(titleBar);
    pipWindow.document.body.appendChild(topStack);
    // Оценки — в левом нижнем углу, на одной линии с панелью.
    pipWindow.document.body.appendChild(reactions.element);
    if (chat) {
      // Сама выдвижная колонка чата/комментариев — у правого края окна;
      // её кнопка уезжает в нижнюю панель.
      pipWindow.document.body.appendChild(chat.element);
    }

    // Красная полоска прогресса внизу (родные контролы YouTube скрыты в CSS).
    const progress = YTFP.pipProgress.build(pipWindow.document, { getVideo: getMovedVideo });
    pipWindow.document.body.appendChild(progress.element);

    // Стрелка справа: колонка рекомендаций. В шортсах не нужна —
    // там навигация по ленте кнопками назад/вперёд.
    const related = isShorts
      ? { cleanup: () => {} }
      : YTFP.pipRelated.build(pipWindow.document, {
          getVideo: getMovedVideo,
          // Очередь пуста, видео кончилось — идём к следующему видео YouTube.
          // Обёртка-стрелка обязательна: goNext объявлен ниже, но её тело
          // исполняется уже после, когда объявление отработало.
          onQueueEmptyEnded: () => {
            if (!YTFP.settings.get().autoplayNext) {
              return;
            }
            // У YouTube есть своё автовоспроизведение, и в части случаев оно
            // работает даже из PiP-окна. Если перейти сразу, получится двойной
            // переход через видео. Поэтому ждём и переходим только если ролик
            // всё ещё стоит в конце.
            setTimeout(() => {
              const endedVideo = getMovedVideo();
              if (state && endedVideo && endedVideo.ended) {
                goNext();
              }
            }, AUTOPLAY_FALLBACK_DELAY_MS);
          }
        });
    if (related.element) {
      pipWindow.document.body.appendChild(related.element);
    }

    // Нижний блок: назад / стоп / вперёд + пауза по клику в центр видео.
    const goPrev = isShorts
      ? () => {
          const button = document.querySelector("#navigation-button-up button");
          if (button) {
            button.click();
          }
        }
      : () => {
          // Кнопку читаем только как признак «предыдущее видео есть»,
          // сам переход делает хоткей страницы (см. pressPageHotkey).
          const button = playerEl.querySelector(".ytp-prev-button");
          const video = getMovedVideo();
          if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
            pressPageHotkey(PREV_VIDEO_HOTKEY);
          } else if (video) {
            video.currentTime = 0; // предыдущего нет — начинаем сначала
          }
        };
    const goNext = isShorts
      ? () => {
          const button = document.querySelector(YTFP.SELECTORS.shortsNextButton);
          if (button) {
            button.click();
          }
        }
      : () => {
          // Кнопка — только признак «следующее видео есть».
          if (playerEl.querySelector(".ytp-next-button")) {
            pressPageHotkey(NEXT_VIDEO_HOTKEY);
          }
        };
    const nav = YTFP.pipNav.build(pipWindow.document, {
      getVideo: getMovedVideo,
      onPrev: goPrev,
      onNext: goNext
    });
    // Слой поверх кадра: значок паузы по центру и подпись перемотки.
    pipWindow.document.body.appendChild(nav.element);

    // Единственная панель окна — внизу. Ряд воспроизведения и кнопку боковой
    // колонки строят соседние модули, поэтому панель собирается последней,
    // когда обе части готовы.
    const controls = YTFP.pipControls.buildBar(pipWindow.document, {
      getVideo: getMovedVideo,
      isShorts,
      navRow: nav.row,
      chatToggle: chat ? chat.toggle : null
    });
    pipWindow.document.body.appendChild(controls.element);

    state = { pipWindow, playerEl, placeholder, overlay, controls, progress, related, nav, chat, reactions, titleObserver, titleTicker, resizeTimer: null };

    // Пользователь закрыл окно (крестик или наш close()) — возвращаем плеер.
    pipWindow.addEventListener("pagehide", restore);

    // Запоминаем размер окна (с дебаунсом). Таймер живёт в state,
    // чтобы restore() мог его погасить — иначе отложенный saveSize
    // прочитает размеры уже закрытого окна (нули) и затрёт сохранённые.
    // Подгонка окна под пропорции видео: после ресайза высоту снапим к
    // аспекту, чтобы не оставалось пустых технических полей вокруг видео.
    // resizeTo в Document PiP работает не всегда (нужна активация
    // пользователя) — тогда просто молча пропускаем.
    const ASPECT_SNAP_TOLERANCE_PX = 8;
    // Последняя попытка снапа: если Chrome зажал размер (минимум окна),
    // повторять тот же resizeTo бессмысленно — каждый вызов рождает новый
    // resize и цикл дёргал бы окно каждые 300 мс без конца.
    let lastSnapAttempt = null;
    const snapToVideoAspect = () => {
      if (!state || pipWindow.closed) {
        return;
      }
      const video = getMovedVideo();
      if (!video || !(video.videoWidth > 0) || !(video.videoHeight > 0)) {
        return;
      }
      const aspect = video.videoWidth / video.videoHeight;
      const frameWidth = pipWindow.outerWidth - pipWindow.innerWidth;
      const frameHeight = pipWindow.outerHeight - pipWindow.innerHeight;
      const targetInnerHeight = Math.round(pipWindow.innerWidth / aspect);
      if (Math.abs(targetInnerHeight - pipWindow.innerHeight) <= ASPECT_SNAP_TOLERANCE_PX) {
        lastSnapAttempt = null;
        return;
      }
      const attempt = `${pipWindow.innerWidth}x${targetInnerHeight}`;
      if (attempt === lastSnapAttempt) {
        return; // тот же целевой размер уже не удался — не зацикливаемся
      }
      lastSnapAttempt = attempt;
      try {
        pipWindow.resizeTo(
          pipWindow.innerWidth + frameWidth,
          targetInnerHeight + frameHeight
        );
      } catch (error) {
        // Нет активации пользователя — Chrome не разрешил, не страшно.
      }
    };

    // Гарантия «только видео»: плеер внутри окна всегда рисуется строго
    // в пропорциях видео и по центру (letterbox), какую бы форму окну ни
    // придали. Панели плеера («О видео» и т.п.) за пределы видео не вылезают.
    const layoutPlayer = () => {
      const video = getMovedVideo();
      const aspect =
        video && video.videoWidth > 0 && video.videoHeight > 0
          ? video.videoWidth / video.videoHeight
          : 16 / 9;
      const windowWidth = pipWindow.innerWidth;
      const windowHeight = pipWindow.innerHeight;
      let width = windowWidth;
      let height = Math.round(windowWidth / aspect);
      if (height > windowHeight) {
        height = windowHeight;
        width = Math.round(windowHeight * aspect);
      }
      const left = Math.round((windowWidth - width) / 2);
      const top = Math.round((windowHeight - height) / 2);
      // Инлайновые !important перебивают и наши стили, и стили YouTube.
      const style = playerEl.style;
      style.setProperty("position", "absolute", "important");
      style.setProperty("width", `${width}px`, "important");
      style.setProperty("height", `${height}px`, "important");
      style.setProperty("left", `${left}px`, "important");
      style.setProperty("top", `${top}px`, "important");
    };

    const scheduleSaveSize = () => {
      clearTimeout(state && state.resizeTimer);
      if (!state) {
        return;
      }
      state.resizeTimer = setTimeout(() => {
        if (!pipWindow.closed) {
          snapToVideoAspect();
          saveSize(pipWindow, getMovedVideo());
        }
      }, 300);
    };
    pipWindow.addEventListener("resize", () => {
      layoutPlayer();
      scheduleSaveSize();
      // Пинаем страницу: плеер YouTube пересчитывает размеры по resize.
      window.dispatchEvent(new Event("resize"));
    });

    // Смена видео в окне (рекомендации, плейлист, следующий шортс) —
    // новые пропорции: перекладываем плеер и подгоняем окно.
    const movedVideo = getMovedVideo();
    const onAspectChange = () => {
      layoutPlayer();
      snapToVideoAspect();
    };
    if (movedVideo) {
      movedVideo.addEventListener("loadedmetadata", onAspectChange);
      state.aspectVideo = movedVideo;
      state.onAspectChange = onAspectChange;
    }

    // Шортсы: автопереход к следующему по окончании ролика.
    if (isShorts && movedVideo) {
      let lastAutoNextAt = 0;
      const AUTO_NEXT_THROTTLE_MS = 1500;
      const onShortsTime = () => {
        if (!YTFP.settings.get().shortsAutoNext) {
          return;
        }
        // Шортсы зациклены по умолчанию — снимаем loop, чтобы дойти до конца.
        if (movedVideo.loop) {
          movedVideo.loop = false;
        }
        const nearEnd =
          Number.isFinite(movedVideo.duration) &&
          movedVideo.duration > 0 &&
          movedVideo.currentTime >= movedVideo.duration - 0.15;
        if (nearEnd && Date.now() - lastAutoNextAt > AUTO_NEXT_THROTTLE_MS) {
          lastAutoNextAt = Date.now();
          const nextButton = document.querySelector(YTFP.SELECTORS.shortsNextButton);
          if (nextButton) {
            nextButton.click();
          }
        }
      };
      movedVideo.addEventListener("timeupdate", onShortsTime);
      state.shortsVideo = movedVideo;
      state.onShortsTime = onShortsTime;
    }

    // YouTube мог поставить inline-размеры под старый контейнер — пересчёт.
    layoutPlayer();
    window.dispatchEvent(new Event("resize"));
    return true;
  }

  /** Вернуть плеер на страницу (закрывает окно; restore сработает по pagehide). */
  function close() {
    if (state) {
      state.pipWindow.close();
    } else if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  function restore() {
    if (!state) {
      return;
    }
    const {
      playerEl, placeholder, overlay, controls, progress, related, nav, chat, reactions,
      resizeTimer, aspectVideo, onAspectChange, shortsVideo, onShortsTime,
      titleObserver, titleTicker
    } = state;
    // Сначала гасим таймеры и слушатели, потом обнуляем state.
    clearTimeout(resizeTimer);
    clearInterval(titleTicker);
    if (titleObserver) {
      titleObserver.disconnect();
    }
    if (aspectVideo && onAspectChange) {
      aspectVideo.removeEventListener("loadedmetadata", onAspectChange);
    }
    if (shortsVideo && onShortsTime) {
      shortsVideo.removeEventListener("timeupdate", onShortsTime);
    }
    controls.cleanup();
    progress.cleanup();
    related.cleanup();
    nav.cleanup();
    if (chat) {
      chat.cleanup();
    }
    reactions.cleanup();
    state = null;

    // Снимаем letterbox-геометрию, которую задавал layoutPlayer, —
    // иначе плеер вернётся на страницу с фиксированными размерами окна.
    for (const property of ["position", "width", "height", "left", "top"]) {
      playerEl.style.removeProperty(property);
    }

    overlay.remove();

    if (placeholder.parentElement) {
      placeholder.parentElement.insertBefore(playerEl, placeholder);
    } else {
      // Контейнер исчез (навигация) — пусть YouTube пересоздаст разметку сам.
      console.warn("[YTFP] Original container gone, player not restored in place");
    }
    placeholder.remove();

    // Плеер вернулся — пересчитать размеры под страницу.
    window.dispatchEvent(new Event("resize"));
  }

  async function toggle() {
    if (isOpen()) {
      close();
      return true;
    }
    return open();
  }

  return { open, close, toggle, isOpen, getMovedPlayer };
})();
