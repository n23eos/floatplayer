"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});

YTFP.thumbnailLaunch = (() => {
  const CARD = "ytd-rich-item-renderer";
  const THUMBNAIL = "ytd-thumbnail, yt-thumbnail-view-model";
  const ADS = "ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer, ad-badge-view-model, .badge-style-type-ad";
  const PREVIEW = "ytd-video-preview";
  const CLASS = "ytfp-thumbnail-launch";
  const entries = new Map();
  let observer = null, timer = null, errorTimer = null, initialized = false;
  const message = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
  const isHome = () => location.pathname === "/";

  function videoId(card, thumbnail) {
    if (!card || card.querySelector(ADS) || card.closest(ADS)) return null;
    const preview = thumbnail.matches(PREVIEW);
    const link = preview ? thumbnail.querySelector("a#media-container-link[href]")
      : thumbnail.closest("a[href]") || thumbnail.querySelector("a[href]");
    if (!link) return null;
    try {
      const url = new URL(link.getAttribute("href"), location.origin);
      if (url.origin !== location.origin || url.pathname !== "/watch") return null;
      const id = url.searchParams.get("v");
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return null;
      if (preview) {
        const original = card.querySelector(THUMBNAIL);
        if (!original || videoId(card, original) !== id) return null;
      }
      return id;
    } catch { return null; }
  }

  function installStyle() {
    if (document.getElementById("ytfp-thumbnail-style")) return;
    const style = document.createElement("style");
    style.id = "ytfp-thumbnail-style";
    style.textContent = `
      .ytfp-thumbnail-host { position: relative !important; }
      .${CLASS} { position:absolute;right:var(--ytfp-badge-space,64px);bottom:6px;z-index:50;
        width:30px;height:30px;box-sizing:border-box;margin:0;padding:5px;border:1px solid #ffffff38;
        border-radius:7px;background:rgba(15,15,15,.86);color:#fff;cursor:pointer;
        display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;
        transition:opacity .12s,background .12s; }
      .${CLASS} svg { width:20px;height:20px;fill:currentColor;pointer-events:none; }
      .ytfp-thumbnail-host:hover > .${CLASS}, .ytfp-thumbnail-host:focus-within > .${CLASS} {
        opacity:1;pointer-events:auto;
      }
      .ytfp-thumbnail-preview > .${CLASS} { opacity:1;pointer-events:auto;z-index:100; }
      .${CLASS}:hover { background:#292929; }
      .${CLASS}:focus-visible { outline:2px solid #8ab4f8;outline-offset:2px;opacity:1;pointer-events:auto; }
      @media (hover:none) { .${CLASS} { opacity:1;pointer-events:auto; } }
      #ytfp-thumbnail-error { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;
        max-width:min(460px,calc(100vw - 40px));box-sizing:border-box;padding:14px 18px;border:1px solid #555;
        border-radius:10px;background:#202124;color:#fff;font:14px/1.5 system-ui;box-shadow:0 4px 20px #0005; }
    `;
    document.head.append(style);
  }

  function showError() {
    let error = document.getElementById("ytfp-thumbnail-error");
    if (!error) {
      error = document.createElement("div");
      error.id = "ytfp-thumbnail-error";
      error.setAttribute("role", "alert");
      document.body.append(error);
    }
    error.textContent = message("thumbnailLaunchError", "Could not open FloatPlayer. Try again, or open the video and use the FloatPlayer button.");
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => error.remove(), 10000);
  }

  function remove(thumbnail, entry) {
    entry.resize?.disconnect();
    entry.button.remove();
    entry.host.classList.remove("ytfp-thumbnail-host", "ytfp-thumbnail-preview");
    entries.delete(thumbnail);
  }

  function add(card, thumbnail) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = CLASS;
    button.title = message("thumbnailOpen", "Open in full FloatPlayer");
    button.setAttribute("aria-label", button.title);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("d", "M4 4.2 15 10.4 4 16.6z M13.6 12.6h7.9a1.5 1.5 0 0 1 1.5 1.5v5.4a1.5 1.5 0 0 1-1.5 1.5h-7.9a1.5 1.5 0 0 1-1.5-1.5v-5.4a1.5 1.5 0 0 1 1.5-1.5z M13.9 14.5v4.6h7.3v-4.6z");
    svg.append(path); button.append(svg);
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "keydown", "keyup", "dblclick"]) {
      button.addEventListener(type, event => event.stopPropagation());
    }
    button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      const id = isHome() && videoId(card, thumbnail);
      if (!id) return;
      document.getElementById("ytfp-thumbnail-error")?.remove();
      // No await before openVideo: requestWindow needs this click's activation.
      YTFP.pip.openVideo(id).catch(showError);
    });
    const preview = thumbnail.matches(PREVIEW);
    const host = preview ? thumbnail.querySelector("#media-container") || thumbnail
      : thumbnail.closest("a")?.parentElement || thumbnail;
    if (preview) host.classList.add("ytfp-thumbnail-preview");
    host.classList.add("ytfp-thumbnail-host");
    host.append(button);
    const entry = { button, card, host, resize: null, badge: undefined };
    entries.set(thumbnail, entry);
    return entry;
  }

  function place(thumbnail, entry) {
    const badge = thumbnail.querySelector("ytd-thumbnail-overlay-time-status-renderer, yt-thumbnail-badge-view-model, .yt-badge-shape");
    const update = () => {
      const width = badge?.getBoundingClientRect().width || 0;
      const offset = Math.max(64, Math.ceil(width) + 16);
      entry.button.style.setProperty("--ytfp-badge-space", `${offset}px`);
      if (entry.host !== thumbnail && !thumbnail.matches(PREVIEW)) {
        const rect = thumbnail.getBoundingClientRect(), host = entry.host.getBoundingClientRect();
        entry.button.style.bottom = "auto";
        entry.button.style.right = "auto";
        entry.button.style.top = `${Math.max(0, rect.bottom - host.top + entry.host.scrollTop - entry.host.clientTop - 36)}px`;
        entry.button.style.left = `${Math.max(0, rect.right - host.left + entry.host.scrollLeft - entry.host.clientLeft - offset - 30)}px`;
      }
    };
    if (entry.badge !== badge) {
      entry.resize?.disconnect(); entry.badge = badge;
      if (typeof ResizeObserver !== "undefined") {
        entry.resize = new ResizeObserver(update);
        entry.resize.observe(thumbnail);
        if (entry.host !== thumbnail) entry.resize.observe(entry.host);
        if (badge) entry.resize.observe(badge);
      }
    }
    update();
  }

  function scan() {
    timer = null;
    if (!isHome()) return;
    for (const [thumbnail, entry] of entries) {
      if (!thumbnail.isConnected || !entry.host.isConnected || !videoId(entry.card, thumbnail) || !entry.host.contains(entry.button)) remove(thumbnail, entry);
    }
    for (const card of document.querySelectorAll(CARD)) {
      if (card.closest('[hidden]')) continue;
      const thumbnail = card.querySelector(THUMBNAIL);
      if (!thumbnail || !videoId(card, thumbnail)) continue;
      const entry = entries.get(thumbnail) || add(card, thumbnail);
      place(thumbnail, entry);
    }
    // YouTube mounts its hover player outside the original rich-item card.
    // Bind only its media link to a current, eligible card, never its ad/title links.
    for (const preview of document.querySelectorAll(PREVIEW)) {
      const card = [...document.querySelectorAll(CARD)].find(candidate =>
        !candidate.closest("[hidden]") && videoId(candidate, preview));
      if (!card) continue;
      const entry = entries.get(preview) || add(card, preview);
      place(preview, entry);
    }
  }

  function schedule(records) {
    // Ignore our own button insertion/removal and status messages.
    const relevant = records.some(record => record.type === "attributes" ||
      [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
        !node.matches?.(`.${CLASS}, #ytfp-thumbnail-error`)));
    if (relevant && timer === null) timer = setTimeout(scan, 100);
  }

  function sync() {
    observer?.disconnect(); observer = null;
    clearTimeout(timer); timer = null;
    if (!isHome() || !window.documentPictureInPicture?.requestWindow) {
      for (const [thumbnail, entry] of entries) remove(thumbnail, entry);
      return;
    }
    installStyle(); scan();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "hidden"] });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("yt-navigate-finish", sync);
    sync();
  }

  function destroy() {
    document.removeEventListener("yt-navigate-finish", sync);
    observer?.disconnect(); observer = null;
    clearTimeout(timer); timer = null; clearTimeout(errorTimer);
    for (const [thumbnail, entry] of entries) remove(thumbnail, entry);
    document.getElementById("ytfp-thumbnail-error")?.remove();
    initialized = false;
  }

  return { init, destroy };
})();
