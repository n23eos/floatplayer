"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Общая навигация: очередь удаляет запись только после yt-navigate-finish.
YTFP.navigation = (() => {
  const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
  const PLAYER_READY_REQUEST = "ytfp-player-ready";
  const PLAYER_READY_RESPONSE = "ytfp-player-ready-result";
  const PLAYER_READY_TIMEOUT_MS = 10000;
  const PLAYER_READY_POLL_MS = 200;
  let cancelPending = null;
  function go(videoId, shorts = false, options = {}) {
    const signal = options?.signal;
    if (!VIDEO_ID_PATTERN.test(videoId) || signal?.aborted) return Promise.resolve(false);
    if (cancelPending) cancelPending();
    return new Promise(resolve => {
      let timer = null;
      const finish = ok => {
        clearTimeout(timer);
        document.removeEventListener("yt-navigate-finish", check);
        signal?.removeEventListener("abort", cancel);
        if (cancelPending === cancel) cancelPending = null;
        resolve(ok);
      };
      const cancel = () => finish(false);
      const check = () => {
        const current = shorts ? location.pathname.split("/")[2] : new URLSearchParams(location.search).get("v");
        if (current === videoId) finish(true);
      };
      timer = setTimeout(() => finish(false), 6000);
      cancelPending = cancel;
      document.addEventListener("yt-navigate-finish", check);
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) {
        cancel();
        return;
      }
      window.postMessage({ type: shorts ? "ytfp-shorts-navigate" : "ytfp-watch-navigate", videoId }, location.origin);
    });
  }

  function waitForPlayer(videoId, options = {}) {
    const signal = options?.signal;
    if (!VIDEO_ID_PATTERN.test(videoId) || signal?.aborted) return Promise.resolve(false);
    const requestId = crypto.randomUUID();
    return new Promise(resolve => {
      let settled = false;
      let pollTimer = null;
      let timeoutTimer = null;
      const isTargetPage = () => location.pathname === "/watch" &&
        new URLSearchParams(location.search).get("v") === videoId;
      const hasReadyRootVideo = () => {
        const root = document.querySelector("#movie_player");
        const video = root?.querySelector("video");
        return Boolean(root && video && video.readyState >= 1);
      };
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(pollTimer);
        clearTimeout(timeoutTimer);
        window.removeEventListener("message", receive);
        signal?.removeEventListener("abort", cancel);
        resolve(ok);
      };
      const cancel = () => finish(false);
      const receive = event => {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin ||
            data?.type !== PLAYER_READY_RESPONSE || data.requestId !== requestId ||
            data.videoId !== videoId) return;
        if (data.ready === true && isTargetPage() && hasReadyRootVideo()) finish(true);
      };
      const poll = () => {
        if (signal?.aborted || !isTargetPage()) {
          finish(false);
          return;
        }
        pollTimer = setTimeout(poll, PLAYER_READY_POLL_MS);
        window.postMessage({ type: PLAYER_READY_REQUEST, requestId, videoId }, location.origin);
      };

      window.addEventListener("message", receive);
      signal?.addEventListener("abort", cancel, { once: true });
      timeoutTimer = setTimeout(cancel, PLAYER_READY_TIMEOUT_MS);
      poll();
    });
  }

  return { go, waitForPlayer };
})();
