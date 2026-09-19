"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.shortsRuntime = (() => {
  let video = null, id = null, originalLoop = false, advanced = false, lastVisit = null;
  let confirmedId = null;
  let navigating = false, status = '', initialized = false;
  const scrubbing = new Set(), listeners = new Set();
  const emit = () => listeners.forEach(fn => fn(status));
  function getId() { return YTFP.playerApi.isShortsPage() ? location.pathname.split('/')[2] : null; }
  function sync() {
    const next = getId() ? YTFP.playerApi.getVideo() : null;
    if (next !== video) {
      if (video) { video.removeEventListener('timeupdate', tick); video.removeEventListener('ended', tick); video.loop = originalLoop; }
      video = next; originalLoop = Boolean(video?.loop);
      video?.addEventListener('timeupdate', tick); video?.addEventListener('ended', tick);
      advanced = false;
    }
    if (id !== getId()) { id = getId(); advanced = false; status = ''; emit(); }
    if (video && advanced && video.currentTime < video.duration - 1) advanced = false;
    if (initialized) recordConfirmed();
    if (video && !YTFP.playerApi.isAdShowing()) video.loop = !YTFP.settings.get().shortsAutoNext && !YTFP.sleepTimer.blocksAdvance();
  }
  function tick() {
    sync();
    if (!video || scrubbing.has(video) || YTFP.playerApi.isAdShowing() || YTFP.sleepTimer.blocksAdvance()) return;
    if (!YTFP.settings.get().shortsAutoNext || advanced || navigating) return;
    if ((video.ended || !video.paused) && Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration - .10) {
      advanced = true;
      step(1);
    }
  }
  function step(direction) {
    if (YTFP.shortsSearch.isActive()) return direction < 0 ? YTFP.shortsSearch.prev() : YTFP.shortsSearch.next();
    const target = document.querySelector(direction < 0 ? '#navigation-button-up button' : YTFP.SELECTORS.shortsNextButton);
    if (!target || target.disabled) { status = YTFP.surfaceControls.t('shortsNavigationError','Could not switch video'); emit(); return false; }
    target.click(); return true;
  }
  async function recordConfirmed() {
    const currentId = getId();
    if (confirmedId !== currentId) return;
    const metaId = document.querySelector('meta[itemprop="videoId"], meta[itemprop="identifier"]')?.content;
    if (metaId && metaId !== currentId && !YTFP.videoMetadata.get(document,currentId)) return;
    if (!currentId || currentId === lastVisit || !YTFP.settings.get().shortsHistory) return;
    // Called on confirmed route events, never for neighbouring/preloaded players.
    if (!video) return;
    lastVisit = currentId;
    try { await YTFP.localRecords.recordVisit({ id:currentId, title:YTFP.utils.videoTitleFromPageTitle(document.title), at:Date.now() }); }
    catch { status = YTFP.surfaceControls.t('historySaveError','Could not save history'); emit(); }
  }
  async function confirmed() { confirmedId = getId(); sync(); await recordConfirmed(); }
  async function revisit(targetId) {
    if (navigating) return false;
    navigating = true; status = ''; emit();
    try {
      const ok = targetId === getId() || await YTFP.navigation.go(targetId, true);
      if (!ok) status = YTFP.surfaceControls.t('shortsNavigationError','Could not switch video');
      // Do not reset the search playlist or advance its cursor on a history jump.
      return ok;
    } finally { navigating = false; emit(); }
  }
  function init() {
    if (initialized) return; initialized = true;
    document.addEventListener('yt-navigate-finish', confirmed);
    YTFP.settings.onChange(sync); confirmed();
  }
  return { init, sync, confirmed, step, revisit, setScrubbing(v,on) { if(on) scrubbing.add(v); else scrubbing.delete(v); },
    getStatus:() => status, onChange:fn => listeners.add(fn), offChange:fn => listeners.delete(fn) };
})();
