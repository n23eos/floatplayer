"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Полоски прогресса внизу PiP-окна (родные контролы YouTube в окне скрыты):
// - красная — прогресс видео, клик/перетаскивание — перемотка,
//   зелёные сегменты SponsorBlock поверх;
// - белая — прогресс рекламы, появляется НАД красной, пока идёт реклама
//   (красная в это время заморожена на позиции видео и не перематывается).
YTFP.pipProgress = (() => {
  const chapterCache = new Map();
  const chapterAttempts = new Map();
  const inspectedScripts = new WeakMap();
  let pendingChapters = null;
  let chapterListSequence = 0;
  const KEYBOARD_SEEK_STEP_SECONDS = 5;

  function textFromRuns(value) {
    if (typeof value?.simpleText === "string") {
      return value.simpleText.trim();
    }
    if (Array.isArray(value?.runs)) {
      return value.runs.map((run) => run?.text || "").join("").trim();
    }
    return "";
  }

  function normalizeChapters(chapters) {
    const sorted = (chapters || [])
      .filter((chapter) => Number.isFinite(chapter?.start) && chapter.start >= 0 && chapter.title)
      .sort((a, b) => a.start - b.start);
    const result = [];
    for (const chapter of sorted) {
      if (result.length >= 500) break;
      if (result.at(-1)?.start === chapter.start) continue;
      result.push({ start: chapter.start, title: String(chapter.title).trim().slice(0, 500) });
    }
    return result.length >= 2 ? result : [];
  }

  function readJsonObject(text, start) {
    if (text[start] !== "{") return null;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try {
          return { data: JSON.parse(text.slice(start, index + 1)), end: index + 1 };
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  function collectChapterRenderers(root) {
    const chapters = [];
    const stack = [root];
    while (stack.length > 0 && chapters.length < 500) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const renderer = node.chapterRenderer;
      if (renderer && typeof renderer === "object") {
        const title = textFromRuns(renderer.title);
        const millis = Number(renderer.timeRangeStartMillis);
        if (title && Number.isFinite(millis) && millis >= 0) {
          chapters.push({ start: millis / 1000, title });
        }
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === "object") stack.push(value);
      }
    }
    return normalizeChapters(chapters);
  }

  function parseInitialDataRecords(text) {
    if (typeof text !== "string" || !text.includes("ytInitialData")) return [];
    const records = [];
    const marker = /(?:var\s+)?ytInitialData\s*=\s*/g;
    let match;
    while ((match = marker.exec(text))) {
      const parsed = readJsonObject(text, marker.lastIndex);
      if (!parsed) continue;
      marker.lastIndex = parsed.end;
      const videoId = parsed.data?.currentVideoEndpoint?.watchEndpoint?.videoId;
      if (typeof videoId !== "string") continue;
      const chapters = collectChapterRenderers(parsed.data);
      if (chapters.length > 0) records.push({ videoId, chapters });
    }
    return records;
  }

  function extractInitialDataChapters(text, videoId) {
    if (!videoId) return [];
    return parseInitialDataRecords(text).find((record) => record.videoId === videoId)?.chapters || [];
  }

  function secondsFromTimestamp(value) {
    if (typeof value !== "string") return null;
    if (/^\d+(?:\.\d+)?s?$/.test(value)) return Number(value.replace(/s$/, ""));
    const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
    if (!units || !units.slice(1).some(Boolean)) return null;
    return Number(units[1] || 0) * 3600 + Number(units[2] || 0) * 60 + Number(units[3] || 0);
  }

  function titleAfterTimestamp(anchor) {
    const parts = [];
    for (let node = anchor.nextSibling; node; node = node.nextSibling) {
      if (node.nodeType === 1 && (node.tagName === "BR" || node.tagName === "A")) break;
      const text = node.textContent || "";
      const line = text.split(/\r?\n/, 1)[0];
      parts.push(line);
      if (line !== text) break;
    }
    return parts.join(" ").replace(/^[\s\-–—:·]+/, "").replace(/\s+/g, " ").trim();
  }

  function extractDescriptionChapters(doc, videoId) {
    if (!doc || !videoId) return [];
    const selector = [
      "#description-inline-expander a[href]",
      "#description a[href]",
      "ytd-text-inline-expander a[href]"
    ].join(",");
    const chapters = [];
    for (const anchor of doc.querySelectorAll(selector)) {
      let url;
      try {
        url = new URL(anchor.getAttribute("href"), doc.location?.href || location.href);
      } catch {
        continue;
      }
      if (url.searchParams.get("v") !== videoId) continue;
      const start = secondsFromTimestamp(url.searchParams.get("t") || url.searchParams.get("start"));
      const labelStart = YTFP.utils.parseTimeLabel(anchor.textContent || "");
      const title = titleAfterTimestamp(anchor);
      if (start === null || labelStart === null || !title) continue;
      chapters.push({ start, title });
    }
    return normalizeChapters(chapters);
  }

  function rememberChapters(videoId, chapters) {
    if (!videoId || chapters.length === 0) return chapters;
    chapterCache.set(videoId, chapters);
    while (chapterCache.size > 20) chapterCache.delete(chapterCache.keys().next().value);
    return chapters;
  }

  function readDocumentChapters(doc, videoId) {
    if (!videoId) return [];
    if (chapterCache.has(videoId)) return chapterCache.get(videoId);
    for (const script of doc.scripts) {
      const text = script.textContent || "";
      if (!text.includes("ytInitialData")) continue;
      let inspected = inspectedScripts.get(script);
      if (!inspected || inspected.text !== text) {
        inspected = { text, records: parseInitialDataRecords(text) };
        inspectedScripts.set(script, inspected);
      }
      const found = inspected.records.find((record) => record.videoId === videoId)?.chapters || [];
      if (found.length > 0) return rememberChapters(videoId, found);
    }
    return rememberChapters(videoId, extractDescriptionChapters(doc, videoId));
  }

  function chaptersFromHtml(html, videoId) {
    const fromJson = extractInitialDataChapters(html, videoId);
    if (fromJson.length > 0 || typeof DOMParser === "undefined") return fromJson;
    try {
      return extractDescriptionChapters(new DOMParser().parseFromString(html, "text/html"), videoId);
    } catch {
      return [];
    }
  }

  function refreshChapters(videoId) {
    const local = readDocumentChapters(document, videoId);
    if (local.length > 0) return Promise.resolve(local);
    if (!videoId || typeof fetch !== "function") return Promise.resolve([]);
    if (pendingChapters?.videoId === videoId) return pendingChapters.promise;
    const tried = chapterAttempts.get(videoId);
    if (tried && (tried.count >= 2 || Date.now() - tried.at < 30000)) return Promise.resolve([]);
    pendingChapters?.controller.abort();
    const controller = new AbortController();
    chapterAttempts.set(videoId, { at: Date.now(), count: (tried?.count || 0) + 1 });
    while (chapterAttempts.size > 20) chapterAttempts.delete(chapterAttempts.keys().next().value);
    const timer = setTimeout(() => controller.abort(), 6000);
    const promise = (async () => {
      try {
        const response = await fetch(`/watch?v=${encodeURIComponent(videoId)}`, {
          credentials: "same-origin",
          signal: controller.signal
        });
        if (!response.ok) return [];
        const html = await response.text();
        if (html.length > 8000000) return [];
        return rememberChapters(videoId, chaptersFromHtml(html, videoId));
      } catch {
        return [];
      } finally {
        clearTimeout(timer);
        if (pendingChapters?.videoId === videoId) pendingChapters = null;
      }
    })();
    pendingChapters = { videoId, controller, promise };
    return promise;
  }

  function build(pipDocument, { getVideo }) {
    const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
    const wrap = pipDocument.createElement("div");
    wrap.className = "ytfp-progress-wrap";

    const chaptersUi = pipDocument.createElement("div");
    chaptersUi.className = "ytfp-chapters-ui";
    chaptersUi.hidden = true;
    const currentChapter = pipDocument.createElement("span");
    currentChapter.className = "ytfp-current-chapter";
    const chaptersToggle = pipDocument.createElement("button");
    chaptersToggle.type = "button";
    chaptersToggle.className = "ytfp-chapters-toggle";
    chaptersToggle.textContent = t("chapters", "Chapters");
    chaptersToggle.setAttribute("aria-label", t("chapters", "Chapters"));
    chaptersToggle.setAttribute("aria-expanded", "false");
    const chaptersList = pipDocument.createElement("div");
    chaptersList.id = `ytfp-chapters-list-${++chapterListSequence}`;
    chaptersList.className = "ytfp-chapters-list";
    chaptersList.hidden = true;
    chaptersList.setAttribute("role", "region");
    chaptersList.setAttribute("aria-label", t("chapters", "Chapters"));
    chaptersToggle.setAttribute("aria-controls", chaptersList.id);
    function closeChaptersList(focusToggle = false) {
      chaptersToggle.setAttribute("aria-expanded", "false");
      chaptersList.hidden = true;
      if (focusToggle) chaptersToggle.focus();
    }
    chaptersToggle.addEventListener("click", () => {
      const expanded = chaptersToggle.getAttribute("aria-expanded") !== "true";
      chaptersToggle.setAttribute("aria-expanded", String(expanded));
      chaptersList.hidden = !expanded;
    });
    function onChaptersKeydown(event) {
      if (event.key === "Escape" && !chaptersList.hidden) closeChaptersList(true);
    }
    function onChapterOutsideClick(event) {
      if (!chaptersList.hidden && !chaptersUi.contains(event.target)) closeChaptersList();
    }
    pipDocument.addEventListener("keydown", onChaptersKeydown);
    pipDocument.addEventListener("click", onChapterOutsideClick);
    chaptersUi.append(currentChapter, chaptersToggle, chaptersList);

    // Белая полоска рекламы (видна только во время рекламы).
    const adTrack = pipDocument.createElement("div");
    adTrack.className = "ytfp-ad-progress";
    const adFill = pipDocument.createElement("div");
    adFill.className = "ytfp-ad-progress-fill";
    adTrack.appendChild(adFill);

    // Красная полоска видео.
    const track = pipDocument.createElement("div");
    track.className = "ytfp-progress";
    track.tabIndex = 0;
    track.setAttribute("role", "slider");
    track.setAttribute("aria-orientation", "horizontal");
    track.setAttribute("aria-label", t("timelineLabel", "Video timeline"));
    const fill = pipDocument.createElement("div");
    fill.className = "ytfp-progress-fill";
    const segmentsLayer = pipDocument.createElement("div");
    segmentsLayer.className = "ytfp-progress-segments";
    const chaptersLayer = pipDocument.createElement("div");
    chaptersLayer.className = "ytfp-progress-chapters";
    track.append(segmentsLayer, fill, chaptersLayer);

    // Tooltip над полоской: название главы под курсором и время (как у YouTube).
    const tooltip = pipDocument.createElement("div");
    tooltip.className = "ytfp-progress-tooltip";
    const tooltipTitle = pipDocument.createElement("div");
    tooltipTitle.className = "ytfp-progress-tooltip-title";
    const tooltipTime = pipDocument.createElement("div");
    tooltipTime.className = "ytfp-progress-tooltip-time";
    tooltip.append(tooltipTitle, tooltipTime);

    wrap.append(chaptersUi, adTrack, track, tooltip);

    function isAdShowing() {
      const video = getVideo();
      const playerRoot = video && video.closest("#movie_player");
      return Boolean(playerRoot && playerRoot.classList.contains("ad-showing"));
    }

    /** Окно, которое рисует полоска: { start, end } или null. */
    function range() {
      return YTFP.playerApi.getSeekRange(getVideo());
    }

    function syncTrackAccessibility(video, bounds, disabled) {
      track.setAttribute("aria-disabled", String(disabled));
      if (!video || !bounds) {
        for (const name of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) {
          track.removeAttribute(name);
        }
        return;
      }
      const current = YTFP.utils.clamp(video.currentTime, bounds.start, bounds.end);
      track.setAttribute("aria-valuemin", String(bounds.start));
      track.setAttribute("aria-valuemax", String(bounds.end));
      track.setAttribute("aria-valuenow", String(current));
      track.setAttribute(
        "aria-valuetext",
        `${YTFP.utils.formatTime(current - bounds.start)} / ${YTFP.utils.formatTime(bounds.end - bounds.start)}`
      );
    }

    function renderFill() {
      const video = getVideo();
      const showingAd = isAdShowing();
      wrap.classList.toggle("ytfp-progress-wrap--ad", showingAd);
      if (!video) {
        syncTrackAccessibility(null, null, true);
        renderCurrentChapter();
        return;
      }
      renderCurrentChapter();
      const bounds = range();
      syncTrackAccessibility(video, bounds, showingAd || !bounds);
      const fraction = bounds
        ? YTFP.utils.windowFraction(video.currentTime, bounds.start, bounds.end)
        : null;
      if (fraction === null) {
        return;
      }
      if (showingAd) {
        // Сейчас currentTime/duration — это рекламный ролик:
        // рисуем белую полоску, красную не трогаем (заморожена).
        adFill.style.width = `${(fraction * 100).toFixed(3)}%`;
      } else if (YTFP.playerApi.isAtLiveEdge(video)) {
        // Стрим в онлайне: полоска прижата к правому краю, как у самого
        // YouTube. По доле она вечно застревала бы на 98–99% — живой плеер
        // всегда на несколько секунд позади края буфера.
        fill.style.width = "100%";
      } else {
        fill.style.width = `${(fraction * 100).toFixed(3)}%`;
      }
    }

    // Отпечаток последней отрисовки: страховочный таймер зовёт render*,
    // но у обычного видео сегменты и границы после загрузки не меняются —
    // без отпечатка мы бы вечно пересоздавали одни и те же DOM-узлы.
    // У лайвов bounds ползут, отпечаток меняется — перерисовка происходит.
    let lastSegmentsSig = null;
    function renderSegments() {
      const bounds = range();
      const segments =
        (YTFP.sponsorBlock && YTFP.sponsorBlock.getSegments && YTFP.sponsorBlock.getSegments()) || [];
      const sig = JSON.stringify([bounds, isAdShowing(), segments]);
      if (sig === lastSegmentsSig) {
        return;
      }
      lastSegmentsSig = sig;
      segmentsLayer.replaceChildren();
      if (!bounds || isAdShowing()) {
        return;
      }
      const width = bounds.end - bounds.start;
      for (const segment of segments) {
        const mark = pipDocument.createElement("div");
        mark.className = "ytfp-progress-seg";
        mark.style.left = `${((segment.start - bounds.start) / width) * 100}%`;
        mark.style.width = `${Math.max(((segment.end - segment.start) / width) * 100, 0.3)}%`;
        segmentsLayer.appendChild(mark);
      }
    }

    // --- Главы видео ----------------------------------------------------------
    // Названия берём из публичного ytInitialData или ссылок описания и всегда
    // сверяем videoId. Для SPA со старым boot-скриптом один раз читаем ту же
    // публичную /watch страницу. Геометрия таймлайна остаётся запасным
    // источником насечек, но названия из неё не выдумываем.
    let chapters = []; // [{ start: сек, title: строка | null }]
    let chaptersVideoId = null;
    let disposed = false;

    function collectChaptersFromTimeline() {
      const bounds = range();
      const video = getVideo();
      const playerRoot = video && video.closest("#movie_player");
      if (!playerRoot || !bounds) {
        return [];
      }
      const sections = playerRoot.querySelectorAll(
        ".ytp-chapters-container .ytp-chapter-hover-container"
      );
      const widths = Array.from(sections, (el) => parseFloat(el.style.width));
      const windowWidth = bounds.end - bounds.start;
      return YTFP.utils
        .chapterFractionsFromWidths(widths)
        .map((fraction) => ({ start: bounds.start + fraction * windowWidth, title: null }));
    }

    function renderCurrentChapter() {
      const video = getVideo();
      const belongsToCurrentVideo = chaptersVideoId === YTFP.playerApi.getVideoId();
      const showingAd = isAdShowing();
      const active = video && belongsToCurrentVideo && !showingAd
        ? chapterAt(video.currentTime)
        : null;
      const title = active?.title || "";
      if (!belongsToCurrentVideo) {
        chapters = [];
        chaptersUi.hidden = true;
        closeChaptersList();
        chaptersLayer.replaceChildren();
        tooltipTitle.textContent = "";
        tooltipTitle.style.display = "none";
      } else {
        chaptersUi.hidden = showingAd || chapters.filter((chapter) => chapter.title).length < 2;
        if (showingAd) closeChaptersList();
      }
      currentChapter.textContent = title;
      currentChapter.hidden = !title;
      if (title) {
        currentChapter.setAttribute(
          "aria-label",
          `${t("currentChapter", "Current chapter")}: ${title}`
        );
      } else {
        currentChapter.removeAttribute("aria-label");
      }
      for (const button of chaptersList.querySelectorAll(".ytfp-chapter-button")) {
        const selected = Boolean(active) && Number(button.dataset.start) === active.start;
        button.classList.toggle("ytfp-chapter-button--current", selected);
        if (selected) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      }
    }

    function renderChapterList() {
      const named = chapters.filter((chapter) => chapter.title);
      chaptersList.replaceChildren();
      chaptersUi.hidden = named.length < 2;
      if (chaptersUi.hidden) {
        closeChaptersList();
        renderCurrentChapter();
        return;
      }
      for (const chapter of named) {
        const button = pipDocument.createElement("button");
        button.type = "button";
        button.className = "ytfp-chapter-button";
        button.dataset.start = String(chapter.start);
        const time = YTFP.utils.formatTime(chapter.start);
        button.textContent = `${time} ${chapter.title}`;
        button.setAttribute("aria-label", `${chapter.title}, ${time}`);
        button.addEventListener("click", () => {
          if (chaptersVideoId !== YTFP.playerApi.getVideoId()) return;
          const video = getVideo();
          const bounds = range();
          if (!video || !bounds || isAdShowing()) return;
          video.currentTime = YTFP.utils.clamp(chapter.start, bounds.start, bounds.end);
          renderFill();
          closeChaptersList(true);
        });
        chaptersList.appendChild(button);
      }
      renderCurrentChapter();
    }

    let lastChaptersSig = null;
    function renderChapters() {
      const videoId = YTFP.playerApi.getVideoId();
      const named = readDocumentChapters(document, videoId);
      chaptersVideoId = videoId;
      chapters = named.length > 0 ? named : collectChaptersFromTimeline();
      if (named.length === 0 && videoId) {
        refreshChapters(videoId).then((found) => {
          if (!disposed && found.length > 0 && YTFP.playerApi.getVideoId() === videoId) {
            lastChaptersSig = null;
            renderChapters();
          }
        });
      }
      // Границы считаем один раз на всю отрисовку: getSeekRange щупает DOM
      // плеера, и звать его на каждую главу — лишняя работа.
      const bounds = range();
      const sig = JSON.stringify([videoId, bounds, isAdShowing(), chapters]);
      if (sig === lastChaptersSig) {
        renderCurrentChapter();
        return;
      }
      lastChaptersSig = sig;
      chaptersLayer.replaceChildren();
      renderChapterList();
      if (!bounds || isAdShowing()) {
        return;
      }
      // Первую насечку (0:00) не рисуем — край полоски и так виден.
      for (const chapter of chapters.slice(1)) {
        const fraction = YTFP.utils.windowFraction(chapter.start, bounds.start, bounds.end);
        if (fraction === null) {
          continue;
        }
        const tick = pipDocument.createElement("div");
        tick.className = "ytfp-chapter-tick";
        tick.style.left = `${fraction * 100}%`;
        chaptersLayer.appendChild(tick);
      }
    }

    /** Глава, в которую попадает время (последняя с start <= time). */
    function chapterAt(time) {
      let found = null;
      for (const chapter of chapters) {
        if (chapter.start <= time) {
          found = chapter;
        }
      }
      return found;
    }

    function onTrackHover(event) {
      const bounds = range();
      if (!bounds || isAdShowing()) {
        tooltip.classList.remove("ytfp-progress-tooltip--visible");
        return;
      }
      const rect = track.getBoundingClientRect();
      const fraction = YTFP.utils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const time = bounds.start + fraction * (bounds.end - bounds.start);
      const chapter = chaptersVideoId === YTFP.playerApi.getVideoId()
        ? chapterAt(time)
        : null;
      const title = chapter && chapter.title ? chapter.title : "";
      tooltipTitle.textContent = title;
      tooltipTitle.style.display = title ? "" : "none";
      // От начала окна, а не от абсолютного времени: у обычного видео окно
      // начинается в нуле и подпись прежняя, у стрима это позиция в буфере.
      tooltipTime.textContent = YTFP.utils.formatTime(time - bounds.start);
      // Позиция над курсором, но не за краями окна.
      const half = tooltip.offsetWidth / 2 || 40;
      // В узком окне тултип может быть шире доступного места: тогда границы
      // clamp «переворачиваются» и он уехал бы за левый край. Центрируем.
      const minLeft = half + 4;
      const maxLeft = rect.width - half - 4;
      const left = maxLeft < minLeft
        ? rect.width / 2
        : YTFP.utils.clamp(event.clientX, minLeft, maxLeft);
      tooltip.style.left = `${left}px`;
      tooltip.classList.add("ytfp-progress-tooltip--visible");
    }

    function onTrackLeave() {
      tooltip.classList.remove("ytfp-progress-tooltip--visible");
    }

    track.addEventListener("mousemove", onTrackHover);
    track.addEventListener("mouseleave", onTrackLeave);

    function seekToClientX(clientX) {
      // Во время рекламы перемотка бессмысленна: currentTime — рекламный.
      if (isAdShowing()) {
        return;
      }
      const video = getVideo();
      const bounds = range();
      if (!video || !bounds) {
        return;
      }
      const rect = track.getBoundingClientRect();
      const fraction = YTFP.utils.clamp((clientX - rect.left) / rect.width, 0, 1);
      video.currentTime = bounds.start + fraction * (bounds.end - bounds.start);
      renderFill();
    }

    function onTrackKeydown(event) {
      const direction = {
        ArrowLeft: -1,
        ArrowDown: -1,
        ArrowRight: 1,
        ArrowUp: 1
      }[event.key];
      if (direction === undefined && event.key !== "Home" && event.key !== "End") {
        return;
      }
      // Не отдаём эти клавиши странице: у YouTube они могут перемотать рекламу
      // или переключить воспроизведение, пока фокус находится на таймлайне.
      event.preventDefault();
      event.stopPropagation();
      if (isAdShowing()) {
        return;
      }
      const video = getVideo();
      const bounds = range();
      if (!video || !bounds) {
        return;
      }
      if (event.key === "Home") {
        video.currentTime = bounds.start;
      } else if (event.key === "End") {
        video.currentTime = bounds.end;
      } else {
        video.currentTime = YTFP.utils.clamp(
          video.currentTime + direction * KEYBOARD_SEEK_STEP_SECONDS,
          bounds.start,
          bounds.end
        );
      }
      renderFill();
    }

    // Клик + перетаскивание по полоске.
    let dragging = false;
    function onPointerDown(event) {
      if (isAdShowing() || !range()) {
        return;
      }
      dragging = true;
      track.setPointerCapture(event.pointerId);
      seekToClientX(event.clientX);
    }
    function onPointerMove(event) {
      if (dragging) {
        seekToClientX(event.clientX);
      }
    }
    function onPointerUp() {
      dragging = false;
    }
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", onPointerUp);
    track.addEventListener("pointercancel", onPointerUp);
    track.addEventListener("keydown", onTrackKeydown);

    let boundVideo = null;
    function syncVideoBinding() {
      if (disposed) {
        return;
      }
      const nextVideo = getVideo();
      if (nextVideo === boundVideo) {
        return;
      }
      if (boundVideo) {
        boundVideo.removeEventListener("timeupdate", renderFill);
        boundVideo.removeEventListener("durationchange", renderSegments);
        boundVideo.removeEventListener("durationchange", renderChapters);
      }
      boundVideo = nextVideo;
      if (boundVideo) {
        boundVideo.addEventListener("timeupdate", renderFill);
        boundVideo.addEventListener("durationchange", renderSegments);
        boundVideo.addEventListener("durationchange", renderChapters);
      }
      renderFill();
      renderSegments();
      renderChapters();
    }

    const playerRoot = getVideo()?.closest("#movie_player, #shorts-player");
    const Observer = playerRoot?.ownerDocument?.defaultView?.MutationObserver;
    const videoObserver = Observer ? new Observer(syncVideoBinding) : null;
    if (playerRoot) {
      videoObserver?.observe(playerRoot, { childList: true, subtree: true });
    }
    syncVideoBinding();
    const refreshData = () => {
      syncVideoBinding();
      renderSegments();
      renderChapters();
    };
    document.addEventListener("ytfp-segments-changed", refreshData);
    document.addEventListener("yt-navigate-finish", refreshData);
    // Сегменты SponsorBlock и главы подгружаются асинхронно — периодически обновляем.
    const segmentsTimer = setInterval(() => {
      syncVideoBinding();
      renderSegments();
      renderChapters();
    }, 10000);

    function cleanup() {
      disposed = true;
      clearInterval(segmentsTimer);
      videoObserver?.disconnect();
      pipDocument.removeEventListener("keydown", onChaptersKeydown);
      pipDocument.removeEventListener("click", onChapterOutsideClick);
      document.removeEventListener("ytfp-segments-changed", refreshData);
      document.removeEventListener("yt-navigate-finish", refreshData);
      if (boundVideo) {
        boundVideo.removeEventListener("timeupdate", renderFill);
        boundVideo.removeEventListener("durationchange", renderSegments);
        boundVideo.removeEventListener("durationchange", renderChapters);
        boundVideo = null;
      }
      track.removeEventListener("mousemove", onTrackHover);
      track.removeEventListener("mouseleave", onTrackLeave);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", onPointerUp);
      track.removeEventListener("pointercancel", onPointerUp);
      track.removeEventListener("keydown", onTrackKeydown);
    }

    return { element: wrap, cleanup };
  }

  return { build, extractInitialDataChapters, extractDescriptionChapters };
})();
