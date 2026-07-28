"use strict";

var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Тонкая красная полоска прогресса внизу PiP-окна (родные контролы YouTube
// в окне скрыты). Клик и перетаскивание — перемотка. Поверх полоски
// рисуются зелёные сегменты SponsorBlock, если они есть.
YTFP.pipProgress = (() => {
  function build(pipDocument, { getVideo }) {
    const track = pipDocument.createElement("div");
    track.className = "ytfp-progress";

    const fill = pipDocument.createElement("div");
    fill.className = "ytfp-progress-fill";

    const segmentsLayer = pipDocument.createElement("div");
    segmentsLayer.className = "ytfp-progress-segments";

    track.append(segmentsLayer, fill);

    function duration() {
      const video = getVideo();
      return video && Number.isFinite(video.duration) ? video.duration : 0;
    }

    function renderFill() {
      const video = getVideo();
      const total = duration();
      const fraction = video && total > 0 ? video.currentTime / total : 0;
      fill.style.width = `${(fraction * 100).toFixed(3)}%`;
    }

    function renderSegments() {
      segmentsLayer.replaceChildren();
      const total = duration();
      const segments =
        (YTFP.sponsorBlock && YTFP.sponsorBlock.getSegments && YTFP.sponsorBlock.getSegments()) || [];
      if (total <= 0) {
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

    return { element: track, cleanup, renderSegments };
  }

  return { build };
})();
