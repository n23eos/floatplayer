"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.watchQueue = (() => {
  let items = [], storageKey = null, error = false, busy = false, loaded = false;
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn({ items: [...items], error, busy }); };
  // Каждая вкладка имеет независимую очередь; tabId стабилен при reload.
  async function restore() {
    try {
      const { tabId } = await chrome.runtime.sendMessage({ command: "get-tab-id" });
      if (!Number.isInteger(tabId)) throw new Error("Missing tab id");
      storageKey = `queue:${tabId}`;
      const data = (await chrome.storage.local.get(storageKey))[storageKey];
      if (Array.isArray(data)) items = data.filter(item => item && /^[\w-]{11}$/.test(item.videoId) && typeof item.title === "string").slice(0, 100);
      loaded = true; error = false;
    } catch { error = true; }
    emit();
  }
  const ready = restore();
  let writes = Promise.resolve();
  function save() {
    const snapshot = items.map(({ videoId, title }) => ({ videoId, title }));
    writes = writes.then(async () => {
      try {
        if (!storageKey || !loaded) throw new Error("Queue storage unavailable");
        await chrome.storage.local.set({ [storageKey]: snapshot });
        error = false;
      } catch { error = true; }
      emit();
    });
    emit();
    return writes;
  }
  async function add(item, first = false) {
    await ready;
    if (!loaded) { await restore(); if (!loaded) return; }
    if (!/^[\w-]{11}$/.test(item.videoId) || busy) return;
    items = items.filter(entry => entry.videoId !== item.videoId);
    const safe = { videoId: item.videoId, title: String(item.title).slice(0, 500) };
    if (first) items.unshift(safe); else items.push(safe);
    items = items.slice(0, 100);
    await save();
  }
  async function remove(id) { await ready; if (busy) return; items = items.filter(item => item.videoId !== id); await save(); }
  async function move(id, direction) {
    await ready;
    if (busy) return;
    const index = items.findIndex(item => item.videoId === id), next = index + direction;
    if (index < 0 || next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    await save();
  }
  async function playNext() {
    await ready;
    if (!loaded) { await restore(); if (!loaded) return true; }
    if (busy) return true;
    if (!items.length) return false;
    busy = true; error = false; emit();
    const first = items[0];
    const ok = await YTFP.navigation.go(first.videoId);
    if (ok) items = items.filter(item => item.videoId !== first.videoId);
    busy = false;
    if (ok) await save(); else { error = true; emit(); }
    // При ошибке удерживаем очередь и не уходим в случайный автоплей.
    return true;
  }
  async function retry() { await ready; if (!loaded) await restore(); else await save(); }
  return { ready, add, remove, move, playNext, retry,
    get: () => ({ items: [...items], error, busy }),
    onChange: fn => listeners.add(fn), offChange: fn => listeners.delete(fn) };
})();
