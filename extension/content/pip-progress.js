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
    track.append(segmentsLayer, fill);

    wrap.append(adTrack, track);

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
    }
    renderFill();
    renderSegments();
    // Сегменты SponsorBlock грузятся асинхронно — периодически обновляем.
    const segmentsTimer = setInterval(renderSegments, 3000);

    function cleanup() {
      clearInterval(segmentsTimer);
      const currentVideo = getVideo();
      if (currentVideo) {
        currentVideo.removeEventListener("timeupdate", renderFill);
        currentVideo.removeEventListener("durationchange", renderSegments);
      }
    }

    return { element: wrap, cleanup };
  }

  return { build };
})();
