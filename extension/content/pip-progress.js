"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Полоски прогресса внизу PiP-окна (родные контролы YouTube в окне скрыты):
// - красная — прогресс видео, клик/перетаскивание — перемотка,
//   зелёные сегменты SponsorBlock поверх;
// - белая — прогресс рекламы, появляется НАД красной, пока идёт реклама
//   (красная в это время заморожена на позиции видео и не перематывается).
YTFP.pipProgress = (() => {
  function build(pipDocument, { getVideo }) {
    const wrap = pipDocument.createElement("div");
    wrap.className = "ytfp-progress-wrap";

    // Белая полоска рекламы (видна только во время рекламы).
    const adTrack = pipDocument.createElement("div");
    adTrack.className = "ytfp-ad-progress";
    const adFill = pipDocument.createElement("div");
    adFill.className = "ytfp-ad-progress-fill";
    adTrack.appendChild(adFill);

    // Красная полоска видео.
    const track = pipDocument.createElement("div");
    track.className = "ytfp-progress";
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

    wrap.append(adTrack, track, tooltip);

    function isAdShowing() {
      const video = getVideo();
      const playerRoot = video && video.closest("#movie_player");
      return Boolean(playerRoot && playerRoot.classList.contains("ad-showing"));
    }

    function duration() {
      const video = getVideo();
      return video && Number.isFinite(video.duration) ? video.duration : 0;
    }

    function renderFill() {
      const video = getVideo();
      const total = duration();
      const showingAd = isAdShowing();
      wrap.classList.toggle("ytfp-progress-wrap--ad", showingAd);
      if (!video || total <= 0) {
        return;
      }
      const fraction = video.currentTime / total;
      if (showingAd) {
        // Сейчас currentTime/duration — это рекламный ролик:
        // рисуем белую полоску, красную не трогаем (заморожена).
        adFill.style.width = `${(fraction * 100).toFixed(3)}%`;
      } else {
        fill.style.width = `${(fraction * 100).toFixed(3)}%`;
      }
    }

    function renderSegments() {
      segmentsLayer.replaceChildren();
      const total = duration();
      const segments =
        (YTFP.sponsorBlock && YTFP.sponsorBlock.getSegments && YTFP.sponsorBlock.getSegments()) || [];
      if (total <= 0 || isAdShowing()) {
        return;
      }
      for (const segment of segments) {
        const mark = pipDocument.createElement("div");
        mark.className = "ytfp-progress-seg";
        mark.style.left = `${(segment.start / total) * 100}%`;
        mark.style.width = `${Math.max(((segment.end - segment.start) / total) * 100, 0.3)}%`;
        segmentsLayer.appendChild(mark);
      }
    }

    // --- Главы видео ----------------------------------------------------------
    // Основной источник — панель глав страницы: она есть в DOM даже закрытой
    // и даёт точные таймкоды и названия.
    // Запасной — секции нативного таймлайна (переехал в окно вместе с плеером):
    // ширины секций в px дают только позиции, причём с погрешностью округления
    // (на длинном видео это десятки секунд), зато работают без панели.
    let chapters = []; // [{ start: сек, title: строка | null }]

    // Панели глав: у авторских и автоматических разные target-id.
    const CHAPTERS_PANEL_SELECTOR =
      'ytd-engagement-panel-section-list-renderer[target-id^="engagement-panel-macro-markers"]';

    function collectChaptersFromPanel() {
      for (const panel of document.querySelectorAll(CHAPTERS_PANEL_SELECTOR)) {
        const items = panel.querySelectorAll("ytd-macro-markers-list-item-renderer");
        const parsed = [];
        for (const item of items) {
          const timeEl = item.querySelector("#time");
          const titleEl = item.querySelector(".macro-markers");
          const start = timeEl && YTFP.utils.parseTimeLabel(timeEl.textContent);
          if (start === null || start === undefined) {
            continue; // элемент ещё не отрисован или подпись нестандартная
          }
          parsed.push({ start, title: titleEl ? titleEl.textContent.trim() : null });
        }
        if (parsed.length >= 2) {
          return parsed;
        }
      }
      return [];
    }

    function collectChaptersFromTimeline() {
      const total = duration();
      const video = getVideo();
      const playerRoot = video && video.closest("#movie_player");
      if (!playerRoot || total <= 0) {
        return [];
      }
      const sections = playerRoot.querySelectorAll(
        ".ytp-chapters-container .ytp-chapter-hover-container"
      );
      const widths = Array.from(sections, (el) => parseFloat(el.style.width));
      return YTFP.utils
        .chapterFractionsFromWidths(widths)
        .map((fraction) => ({ start: fraction * total, title: null }));
    }

    function collectChapters() {
      const fromPanel = collectChaptersFromPanel();
      return fromPanel.length > 0 ? fromPanel : collectChaptersFromTimeline();
    }

    function renderChapters() {
      chapters = collectChapters();
      chaptersLayer.replaceChildren();
      const total = duration();
      if (total <= 0 || isAdShowing()) {
        return;
      }
      // Первую насечку (0:00) не рисуем — край полоски и так виден.
      for (const chapter of chapters.slice(1)) {
        const tick = pipDocument.createElement("div");
        tick.className = "ytfp-chapter-tick";
        tick.style.left = `${(chapter.start / total) * 100}%`;
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
      const total = duration();
      if (total <= 0 || isAdShowing()) {
        tooltip.classList.remove("ytfp-progress-tooltip--visible");
        return;
      }
      const rect = track.getBoundingClientRect();
      const fraction = YTFP.utils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const time = fraction * total;
      const chapter = chapterAt(time);
      const title = chapter && chapter.title ? chapter.title : "";
      tooltipTitle.textContent = title;
      tooltipTitle.style.display = title ? "" : "none";
      tooltipTime.textContent = YTFP.utils.formatTime(time);
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
      const total = duration();
      if (!video || total <= 0) {
        return;
      }
      const rect = track.getBoundingClientRect();
      const fraction = YTFP.utils.clamp((clientX - rect.left) / rect.width, 0, 1);
      video.currentTime = fraction * total;
      renderFill();
    }

    // Клик + перетаскивание по полоске.
    let dragging = false;
    function onPointerDown(event) {
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

    const video = getVideo();
    if (video) {
      video.addEventListener("timeupdate", renderFill);
      video.addEventListener("durationchange", renderSegments);
      video.addEventListener("durationchange", renderChapters);
    }
    renderFill();
    renderSegments();
    renderChapters();
    // Сегменты SponsorBlock и главы подгружаются асинхронно — периодически обновляем.
    const segmentsTimer = setInterval(() => {
      renderSegments();
      renderChapters();
    }, 3000);

    function cleanup() {
      clearInterval(segmentsTimer);
      // Снимаем с того же элемента, на который вешали: getVideo() мог бы
      // вернуть уже другой <video>, и слушатели остались бы на старом.
      if (video) {
        video.removeEventListener("timeupdate", renderFill);
        video.removeEventListener("durationchange", renderSegments);
        video.removeEventListener("durationchange", renderChapters);
      }
      track.removeEventListener("mousemove", onTrackHover);
      track.removeEventListener("mouseleave", onTrackLeave);
    }

    return { element: wrap, cleanup };
  }

  return { build };
})();
