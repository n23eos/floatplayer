"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// 0–100% = обычная громкость video; >100% = video 100% + Web Audio.
// Один источник на элемент, один AudioContext на страницу.
YTFP.audioBoost = (() => {
  const graphs = new WeakMap();
  let context = null, activeVideo = null, requested = null, fade = 1;
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  function graphFor(video) {
    if (graphs.has(video)) return graphs.get(video);
    try {
      context ||= new AudioContext();
      const gain = context.createGain();
      const source = context.createMediaElementSource(video);
      source.connect(gain);
      gain.connect(context.destination);
      const graph = { gain, multiplier: 1 };
      graphs.set(video, graph);
      return graph;
    } catch (error) {
      console.warn("[YTFP] Audio boost unavailable:", error);
      return null;
    }
  }
  function getBoostPercent(video = YTFP.playerApi.getVideo()) {
    if (!video) return 100;
    if (video.muted) return 0;
    if (video === activeVideo && fade < 1 && requested !== null) return requested;
    return Math.round(video.volume * 100 * (graphs.get(video)?.multiplier || 1));
  }
  function apply(video, percent) {
    let graph = graphs.get(video);
    if (percent > 100 && !graph) graph = graphFor(video);
    if (percent > 100 && !graph) return false;
    if (graph) {
      if (context.state === "suspended") context.resume().catch(() => {});
      graph.multiplier = Math.max(1, percent / 100);
      const param = graph.gain.gain;
      param.cancelScheduledValues(context.currentTime);
      param.setTargetAtTime(graph.multiplier * fade, context.currentTime, 0.03);
    }
    video.volume = Math.min(percent / 100, 1) * (graph ? 1 : fade);
    return true;
  }
  function setBoostPercent(video, percent) {
    if (!video || !Number.isFinite(percent)) return false;
    const value = YTFP.utils.clamp(percent, 0, YTFP.settings.get().volumeBoostMax);
    if (!apply(video, value)) return false;
    activeVideo = video;
    requested = value;
    if (value > 0) video.muted = false;
    emit();
    return true;
  }
  function syncVideo() {
    const video = YTFP.playerApi.getVideo();
    if (!video) return;
    if (video !== activeVideo) {
      activeVideo = video;
      if (requested !== null) apply(video, requested);
    }
    const max = YTFP.settings.get().volumeBoostMax;
    if (getBoostPercent(video) > max) setBoostPercent(video, max);
  }
  function setFade(value) {
    if (value === fade) return;
    const video = YTFP.playerApi.getVideo();
    if (fade === 1 && value < 1 && video) requested = Math.round(video.volume * 100 * (graphs.get(video)?.multiplier || 1));
    fade = YTFP.utils.clamp(value, 0, 1);
    if (video && requested !== null) apply(video, requested);
  }
  YTFP.settings.onChange(syncVideo);
  return { setBoostPercent, getBoostPercent, syncVideo, setFade,
    onChange: fn => listeners.add(fn), offChange: fn => listeners.delete(fn) };
})();
