"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
// One storage key per record: saving in another tab cannot overwrite the list.
YTFP.localRecords = (() => {
  const VISIT = 'shortsVisit:', PROFILE = 'channelProfile:';
  const videoId = value => typeof value === 'string' && /^[\w-]{11}$/.test(value);
  const channelId = value => typeof value === 'string' && /^UC[\w-]{22}$/.test(value);
  function validVisit(item) { return item && videoId(item.id) && typeof item.title === 'string' && Number.isFinite(item.at); }
  function validProfile(item) { return item && channelId(item.id) && typeof item.title === 'string' && Number.isFinite(item.speed) && item.speed >= .25 && item.speed <= 3 && Number.isFinite(item.volume) && item.volume >= 0 && item.volume <= (item.allowBoost === true ? 300 : 100); }
  async function list(prefix, validate) {
    const all = await chrome.storage.local.get(null);
    return Object.entries(all).filter(([key, value]) => key.startsWith(prefix) && validate(value) && key === prefix + value.id).map(([, value]) => value);
  }
  const visits = async () => (await list(VISIT, validVisit)).sort((a,b) => b.at-a.at).slice(0,100);
  async function recordVisit(item) {
    if (!validVisit(item)) return;
    await chrome.storage.local.set({ [VISIT + item.id]: { id:item.id, title:item.title.slice(0,200), at:item.at } });
    const items = (await list(VISIT, validVisit)).sort((a,b) => b.at-a.at);
    const stale = items.slice(100).map(item => VISIT + item.id);
    if (stale.length) await chrome.storage.local.remove(stale);
  }
  async function clearVisits() {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(key => key.startsWith(VISIT));
    if (keys.length) await chrome.storage.local.remove(keys);
  }
  async function saveProfile(item) {
    if (!validProfile(item)) throw new Error('Invalid channel profile');
    await chrome.storage.local.set({ [PROFILE + item.id]: { ...item, title:item.title.slice(0,200) } });
  }
  async function getProfile(id) {
    if (!channelId(id)) return null;
    const item = (await chrome.storage.local.get(PROFILE + id))[PROFILE + id];
    return validProfile(item) && item.id === id ? item : null;
  }
  return { visits, recordVisit, clearVisits, profiles:() => list(PROFILE,validProfile), saveProfile, getProfile,
    removeProfile:id => channelId(id) ? chrome.storage.local.remove(PROFILE + id) : Promise.resolve(), validProfile };
})();
