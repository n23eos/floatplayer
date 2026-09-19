"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.channelProfiles = (() => {
  let route = null, completed = null, pending = null, generation = 0, previous = null;
  function channel() {
    const videoId = YTFP.playerApi.getVideoId();
    const data = YTFP.videoMetadata.get(document,videoId);
    const id = data?.channelId;
    if (!/^UC[\w-]{22}$/.test(id || '')) return null;
    const title = data.channelTitle || document.querySelector('#owner #channel-name, #owner #text, ytd-channel-name')?.textContent?.trim() || id;
    return { id, title:title.slice(0,200) };
  }
  async function sync() {
    const video = YTFP.playerApi.getVideo();
    const nextRoute = YTFP.playerApi.getVideoId();
    if (!video || !nextRoute || YTFP.playerApi.isAdShowing()) return;
    if (route !== nextRoute) {
      route = nextRoute; generation++; completed = null; pending = null;
      if (previous) {
        if (video.playbackRate === previous.speed) video.playbackRate = previous.baseSpeed;
        if (YTFP.audioBoost.getBoostPercent(video) === previous.volume) YTFP.audioBoost.setBoostPercent(video,previous.baseVolume);
        previous = null;
      }
    }
    if (completed === route || pending === route) return;
    const owner = channel(); if (!owner) return;
    const ticket = generation, target = route;
    const baseSpeed = video.playbackRate, baseVolume = YTFP.audioBoost.getBoostPercent(video);
    pending = target;
    try {
      const profile = await YTFP.localRecords.getProfile(owner.id);
      if (ticket !== generation || route !== target || target !== YTFP.playerApi.getVideoId() || video !== YTFP.playerApi.getVideo()) return;
      completed = target;
      if (!profile || YTFP.playerApi.isAdShowing()) { if (YTFP.playerApi.isAdShowing()) completed = null; return; }
      // A user adjustment made while storage was loading takes precedence.
      if (video.playbackRate !== baseSpeed || YTFP.audioBoost.getBoostPercent(video) !== baseVolume) return;
      const volume = Math.min(profile.volume, YTFP.settings.get().volumeBoostMax);
      video.playbackRate = profile.speed;
      YTFP.audioBoost.setBoostPercent(video,volume);
      previous = { speed:profile.speed, volume, baseSpeed, baseVolume };
    } catch { /* Retry on the next guard tick if storage was unavailable. */ }
    finally { if (ticket === generation) pending = null; }
  }
  function build(doc) {
    const {t,button} = YTFP.surfaceControls;
    const element = doc.createElement('div');
    const label = doc.createElement('label');
    const allowBoost = doc.createElement('input'); allowBoost.type = 'checkbox';
    label.append(allowBoost,doc.createTextNode(t('profileBoost','Also remember amplification above 100%')));
    const status = doc.createElement('span'); status.setAttribute('role','status');
    const save = button(doc,t('profileSave','Remember for this channel'),async () => {
      const owner = channel(), video = YTFP.playerApi.getVideo();
      if (!owner || !video || YTFP.playerApi.isAdShowing()) { status.textContent = t('profileUnavailable','Channel data is not available yet'); return; }
      save.disabled = true;
      try {
        await YTFP.localRecords.saveProfile({ ...owner, speed:video.playbackRate, volume:Math.min(YTFP.audioBoost.getBoostPercent(video),allowBoost.checked ? 300 : 100), allowBoost:allowBoost.checked });
        completed = YTFP.playerApi.getVideoId(); status.textContent = t('profileSaved','Channel profile saved');
      } catch { status.textContent = t('optSaveError','Could not save'); }
      finally { save.disabled = false; }
    });
    element.append(save,label,status);
    return {element};
  }
  return { sync, channel, build };
})();
