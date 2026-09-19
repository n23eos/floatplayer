"use strict";
// Ограниченный мост к API родного плеера. Никаких произвольных методов/URL.
(() => {
  window.addEventListener("message", event => {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin || data?.type !== "ytfp-captions" ||
        typeof data.requestId !== "string" || !["read", "toggle", "language"].includes(data.action)) return;
    const pipDoc = window.documentPictureInPicture?.window?.document;
    const player = pipDoc?.querySelector("#movie_player, #shorts-player") || document.querySelector("#movie_player, #shorts-player");
    let result = { available: false, enabled: false, tracks: [] };
    try {
      const button = player?.querySelector(".ytp-subtitles-button");
      if (data.action === "toggle" && button) button.click();
      const tracks = player?.getOption?.("captions", "tracklist") || [];
      if (data.action === "language" && typeof data.language === "string") {
        const track = tracks.find(item => item.languageCode === data.language);
        if (track) player.setOption("captions", "track", track);
      }
      const selected = player?.getOption?.("captions", "track");
      result = {
        available: Boolean(button && button.getAttribute("aria-disabled") !== "true" && button.style.display !== "none") || tracks.length > 0,
        enabled: button?.getAttribute("aria-pressed") === "true",
        selected: selected?.languageCode || "",
        tracks: tracks.slice(0, 100).map(track => ({ code: String(track.languageCode || ""), name: String(track.displayName || track.languageCode || "") }))
      };
    } catch { /* YouTube API отсутствует: UI показывает недоступность. */ }
    window.postMessage({ type: "ytfp-captions-result", requestId: data.requestId, result }, location.origin);
  });
})();
