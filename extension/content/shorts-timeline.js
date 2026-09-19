"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.shortsTimeline = (() => {
  function build(doc, getVideo) {
    const element = doc.createElement('div'); element.className = 'ytfp-short-timeline ytfp-surface';
    const input = doc.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '1000'; input.step = '1';
    input.setAttribute('aria-label', YTFP.surfaceControls.t('shortsSeek','Seek in this short'));
    const output = doc.createElement('output');
    element.append(input, output);
    let bound = null, dragging = false, wasPlaying = false, dragVideo = null, dragId = null;
    const format = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2,'0')}`;
    function sync() {
      const video = getVideo();
      if (video !== bound) {
        end(); bound?.removeEventListener('timeupdate', sync); bound?.removeEventListener('durationchange', sync);
        bound = video; bound?.addEventListener('timeupdate', sync); bound?.addEventListener('durationchange', sync);
      }
      const valid = video && Number.isFinite(video.duration) && video.duration > 0 && !YTFP.playerApi.isAdShowing();
      input.disabled = !valid;
      if (valid) { if (!dragging) input.value = String(video.currentTime / video.duration * 1000); output.textContent = `${format(video.currentTime)} / ${format(video.duration)}`; }
      else output.textContent = '— / —';
    }
    function start(event) {
      if (input.disabled || (event.type === 'pointerdown' && typeof event.button === 'number' && event.button !== 0)) return;
      event.stopPropagation(); dragging = true; dragVideo = getVideo(); dragId = YTFP.playerApi.getVideoId(); wasPlaying = !dragVideo.paused;
      YTFP.shortsRuntime.setScrubbing(dragVideo,true); dragVideo.pause();
      if (event.type === 'pointerdown') {
        event.preventDefault(); input.focus(); input.setPointerCapture?.(event.pointerId); seekPointer(event);
      }
    }
    function seek() {
      const video = getVideo(); if (!video || input.disabled || (dragging && (video !== dragVideo || dragId !== YTFP.playerApi.getVideoId()))) return;
      video.currentTime = Number(input.value) / 1000 * video.duration;
      output.textContent = `${format(video.currentTime)} / ${format(video.duration)}`;
    }
    function seekPointer(event) {
      if (!dragging || !Number.isFinite(event.clientX)) return;
      const rect = input.getBoundingClientRect(); if (rect.width <= 0) return;
      input.value = String(Math.round(YTFP.utils.clamp((event.clientX - rect.left) / rect.width,0,1) * 1000)); seek();
    }
    function end() {
      if (!dragging) return;
      const video = dragVideo; dragging = false; dragVideo = null;
      YTFP.shortsRuntime.setScrubbing(video,false);
      if (wasPlaying && video === getVideo() && dragId === YTFP.playerApi.getVideoId() && !YTFP.sleepTimer.blocksAdvance()) video.play().catch(() => {});
    }
    input.addEventListener('pointerdown',start); input.addEventListener('pointermove',seekPointer); input.addEventListener('input',seek);
    doc.addEventListener('pointerup',end,true); doc.addEventListener('pointercancel',end,true);
    input.addEventListener('keydown', event => {
      event.stopPropagation();
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || input.disabled) return;
      event.preventDefault(); if (!dragging) start(event);
      const step = 1000 / Math.max(1,getVideo()?.duration || 1);
      input.value = String(event.key === 'Home' ? 0 : event.key === 'End' ? 1000 : YTFP.utils.clamp(Number(input.value) + (event.key === 'ArrowRight' ? step : -step),0,1000)); seek();
    });
    input.addEventListener('keyup',end); input.addEventListener('blur',end);
    for (const type of ['click','dblclick','pointerdown','wheel']) element.addEventListener(type,event => event.stopPropagation());
    sync();
    return { element, sync, cleanup() { end(); bound?.removeEventListener('timeupdate',sync); bound?.removeEventListener('durationchange',sync); doc.removeEventListener('pointerup',end,true); doc.removeEventListener('pointercancel',end,true); } };
  }
  return { build };
})();
