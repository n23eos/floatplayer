"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

// Общая навигация: очередь удаляет запись только после yt-navigate-finish.
YTFP.navigation = (() => {
  let cancelPending = null;
  function go(videoId, shorts = false) {
    if (!/^[\w-]{11}$/.test(videoId)) return Promise.resolve(false);
    if (cancelPending) cancelPending();
    return new Promise(resolve => {
      const finish = ok => {
        clearTimeout(timer);
        document.removeEventListener("yt-navigate-finish", check);
        if (cancelPending === cancel) cancelPending = null;
        resolve(ok);
      };
      const cancel = () => finish(false);
      const check = () => {
        const current = shorts ? location.pathname.split("/")[2] : new URLSearchParams(location.search).get("v");
        if (current === videoId) finish(true);
      };
      const timer = setTimeout(() => finish(false), 6000);
      cancelPending = cancel;
      document.addEventListener("yt-navigate-finish", check);
      window.postMessage({ type: shorts ? "ytfp-shorts-navigate" : "ytfp-watch-navigate", videoId }, location.origin);
    });
  }
  return { go };
})();
