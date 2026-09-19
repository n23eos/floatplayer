"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.videoMetadata = (() => {
  const cache = new Map(), attempts = new Map(), scripts = new WeakMap();
  let pending = null;
  function extractPlayerData(text, id) {
    const marker = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/g;
    let match;
    while ((match = marker.exec(text))) {
      const start = marker.lastIndex;
      if (text[start] !== '{') continue;
      let depth = 0, quoted = false, escaped = false;
      for (let i=start; i<text.length; i++) {
        const char = text[i];
        if (quoted) { if (escaped) escaped=false; else if (char === '\\') escaped=true; else if (char === '"') quoted=false; continue; }
        if (char === '"') quoted=true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) {
          try {
            const data = JSON.parse(text.slice(start,i+1));
            const details = data.videoDetails;
            if (!details?.videoId || (id && details.videoId !== id)) break;
            const micro = data.microformat?.playerMicroformatRenderer || {};
            return { id:details.videoId, channelId:details.channelId, channelTitle:details.author, title:details.title,
              date:micro.publishDate || micro.uploadDate || '', views:String(details.viewCount || '') };
          } catch { break; }
        }
      }
    }
    return null;
  }
  function remember(data) {
    cache.set(data.id,data);
    while (cache.size > 20) cache.delete(cache.keys().next().value);
    return data;
  }
  function get(doc, videoId) {
    if (!videoId) return null;
    if (cache.has(videoId)) return cache.get(videoId);
    const value = name => doc.querySelector(`meta[itemprop="${name}"]`)?.content || '';
    const matches = (value('videoId') || value('identifier')) === videoId;
    let data = matches ? { id:videoId, date:value('datePublished') || value('uploadDate'), views:value('interactionCount'), channelId:value('channelId') } : null;
    if (matches && !data.views) {
      const watch = Array.from(doc.querySelectorAll('[itemprop="interactionStatistic"]')).find(el => el.querySelector('[itemprop="interactionType"]')?.getAttribute('content')?.endsWith('/WatchAction'));
      data.views = watch?.querySelector('[itemprop="userInteractionCount"]')?.getAttribute('content') || '';
    }
    if (!data?.channelId) {
      // Only DOM-backed public boot data; never access YouTube runtime objects.
      for (const script of doc.scripts) {
        const text = script.textContent;
        if (!text.includes('ytInitialPlayerResponse')) continue;
        let inspected = scripts.get(script);
        if (!inspected || inspected.text !== text) {
          inspected = {text,data:extractPlayerData(text,null)}; scripts.set(script,inspected);
        }
        if (inspected.data?.id === videoId) { data = {...data,...inspected.data}; break; }
      }
    }
    return data?.channelId ? remember(data) : data;
  }
  async function refresh() {
    const id = YTFP.playerApi.getVideoId();
    if (!/^[\w-]{11}$/.test(id || '')) return null;
    const data = get(document,id);
    if (data?.channelId) return data;
    if (pending?.id === id) return pending.promise;
    const tried = attempts.get(id);
    if (tried && (tried.count >= 2 || Date.now() - tried.at < 30000)) return data;
    pending?.controller.abort();
    const controller = new AbortController();
    attempts.set(id,{at:Date.now(),count:(tried?.count || 0)+1});
    while (attempts.size > 20) attempts.delete(attempts.keys().next().value);
    const timer = setTimeout(() => controller.abort(),6000);
    const promise = (async () => {
      try {
        const response = await fetch(`/watch?v=${encodeURIComponent(id)}`,{credentials:'same-origin',signal:controller.signal});
        if (!response.ok) return null;
        const html = await response.text();
        const found = html.length <= 8000000 ? extractPlayerData(html,id) : null;
        return found ? remember(found) : null;
      } catch { return null; }
      finally { clearTimeout(timer); if (pending?.id === id) pending=null; }
    })();
    pending = { id,controller,promise };
    return promise;
  }
  function read(doc, videoId) {
    const data = get(doc,videoId);
    if (!data) return '';
    const parts = [];
    const date = data.date || "";
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(date);
    if (match) {
      const day = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      if (!Number.isNaN(day.valueOf()) && day.toISOString().slice(0, 10) === date.slice(0, 10)) {
        parts.push(new Intl.DateTimeFormat(chrome.i18n.getUILanguage(), { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(day));
      }
    }
    const views = data.views || "";
    if (/^\d+$/.test(views)) parts.push(`${new Intl.NumberFormat(chrome.i18n.getUILanguage()).format(Number(views))} ${chrome.i18n.getMessage("videoViews") || "views"}`);
    return parts.join(" · ");
  }
  function reactionCount(button) {
    if (!button) return "—";
    // Animated counters contain whole digit reels in textContent, not the
    // displayed number. Prefer the accessible count and never flatten reels.
    const label = button.getAttribute("aria-label") || "";
    const exact = /like|понрав|нравится|пользовател/i.test(label)
      ? label.match(/\d[\d ,.  ]*\d|\d/)?.[0].trim() : null;
    const valid = (value) => value && value.replace(/\D/g, "").length <= 12 &&
      /^\d[\d\s.,]*(?:[KMBkmb]|тыс\.?|млн\.?|млрд\.?)?$/.test(value);
    if (valid(exact)) return exact;
    for (const counter of button.querySelectorAll("animated-rolling-number, yt-animated-rolling-number")) {
      const accessible = counter.getAttribute("aria-label")?.trim();
      if (valid(accessible)) return accessible;
    }
    const copy = button.cloneNode(true);
    copy.querySelectorAll('animated-rolling-number, yt-animated-rolling-number, [aria-hidden="true"]').forEach((node) => node.remove());
    const text = copy.textContent.trim();
    return valid(text) ? text : "—";
  }
  return { read, reactionCount, get, refresh, extractPlayerData };
})();
