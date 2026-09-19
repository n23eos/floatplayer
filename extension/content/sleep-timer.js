"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Жизненный цикл вкладки, а не панели. Один тикер только при активном таймере.
YTFP.sleepTimer = (() => {
  let deadline = null, mode = "off", ticker = null, video = null, blocked = false, targetId = null;
  let loopVideo = null, loopBefore = false;
  const listeners = new Set();
  const get = () => ({ mode, remaining: deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0 });
  const emit = () => { for (const fn of listeners) fn(get()); };
  function stop() {
    clearInterval(ticker); ticker = null; deadline = null; mode = "off";
    if (loopVideo) { loopVideo.loop = loopBefore; loopVideo = null; }
    YTFP.audioBoost.setFade(1);
    emit();
  }
  function finish() {
    blocked = true;
    const current = YTFP.playerApi.getVideo();
    if (current) current.pause();
    stop();
  }
  function onPlay() {
    // YouTube может начать автоплей после ended; снимает блокировку только
    // явное действие пользователя через наш плеер или новый таймер.
    if (blocked && video) video.pause();
  }
  function onEnded() {
    if (mode === "end" && !YTFP.playerApi.isAdShowing() && !YTFP.playerApi.isLive()) finish();
  }
  function attachVideo() {
    const current = YTFP.playerApi.getVideo();
    if (current === video) return;
    if (video) { video.removeEventListener("ended", onEnded); video.removeEventListener("play", onPlay); }
    video = current;
    if (video) { video.addEventListener("ended", onEnded); video.addEventListener("play", onPlay); }
  }
  function tick() {
    attachVideo();
    if (mode === "time" && deadline <= Date.now()) { finish(); return; }
    // На время режима «до конца» отключаем loop, чтобы получить ended.
    if (mode === "end" && video && !YTFP.playerApi.isAdShowing()) {
      video.loop = false;
      if (targetId !== YTFP.playerApi.getVideoId()) { finish(); return; }
    }
    const remaining = mode === "time" ? get().remaining : video && !YTFP.playerApi.isAdShowing() ? (video.duration - video.currentTime) / (video.playbackRate || 1) : Infinity;
    YTFP.audioBoost.setFade(YTFP.settings.get().sleepFade && remaining < 10 ? Math.max(0, remaining / 10) : 1);
    emit();
  }
  function start(value) {
    stop(); blocked = false;
    if (value === "end") {
      if (YTFP.playerApi.isLive()) return;
      mode = "end"; targetId = YTFP.playerApi.getVideoId();
    } else {
      if (!Number.isFinite(value) || value <= 0) return;
      mode = "time"; deadline = Date.now() + Math.min(value, 720) * 60000;
    }
    attachVideo();
    if (mode === "end" && video) { loopVideo = video; loopBefore = video.loop; video.loop = false; }
    ticker = setInterval(tick, 250); tick();
  }
  function extend() {
    if (mode !== "time") { start(10); return; }
    deadline = Math.min(deadline + 600000, Date.now() + 720 * 60000);
    tick();
  }
  return { get, start, stop, extend, attachVideo,
    blocksAdvance: () => blocked || mode === "end", resume: () => { blocked = false; },
    onChange: fn => listeners.add(fn), offChange: fn => listeners.delete(fn) };
})();
