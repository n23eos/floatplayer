"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.surfaceControls = (() => {
  const t = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
  function button(doc, text, action, title = text) {
    const element = doc.createElement('button'); element.type = 'button'; element.className = 'ytfp-btn';
    element.textContent = text; element.title = title; element.setAttribute('aria-label', title);
    element.addEventListener('click', action); return element;
  }
  function disclosure(doc, label) {
    const element = doc.createElement('details'); element.className = 'ytfp-disclosure';
    const summary = doc.createElement('summary'); summary.textContent = label; summary.setAttribute('aria-label', label);
    const content = doc.createElement('div'); content.className = 'ytfp-disclosure-content'; element.append(summary, content);
    const outside = event => { if (!element.contains(event.target)) element.open = false; };
    const escape = event => { if (event.key === 'Escape' && element.open) { element.open = false; summary.focus(); event.stopPropagation(); } };
    function place() {
      content.style.translate = '';
      if (!element.open) return;
      const box = content.getBoundingClientRect();
      const bounds = element.closest('#movie_player, #shorts-player')?.getBoundingClientRect() || {left:0,top:0,right:doc.defaultView.innerWidth,bottom:doc.defaultView.innerHeight};
      const dx = box.left < bounds.left + 8 ? bounds.left + 8 - box.left : box.right > bounds.right - 8 ? bounds.right - 8 - box.right : 0;
      const dy = box.top < bounds.top + 8 ? bounds.top + 8 - box.top : box.bottom > bounds.bottom - 8 ? bounds.bottom - 8 - box.bottom : 0;
      content.style.translate = `${dx}px ${dy}px`;
    }
    element.addEventListener('toggle',place);
    doc.addEventListener('pointerdown', outside, true); element.addEventListener('keydown', escape);
    return { element, summary, content, cleanup() { doc.removeEventListener('pointerdown', outside, true); } };
  }
  function speed(doc, getVideo) {
    const ui = disclosure(doc, t('speedTooltip', 'Playback speed'));
    ui.element.classList.add('ytfp-speed-presets');
    const row = doc.createElement('div'); row.className = 'ytfp-preset-row';
    const buttons = [1, 1.25, 1.5, 2].map(rate => {
      const btn = button(doc, `${rate}×`, () => { const video = getVideo(); if (video) video.playbackRate = rate; sync(); });
      row.append(btn); return [rate, btn];
    });
    const range = doc.createElement('input'); range.type = 'range'; range.setAttribute('aria-label', t('speedTooltip', 'Playback speed'));
    range.oninput = () => { const video = getVideo(); if (video) video.playbackRate = Number(range.value); sync(); };
    ui.content.append(row, range);
    let bound = null;
    function sync() {
      const video = getVideo();
      if (bound !== video) { bound?.removeEventListener('ratechange', sync); bound = video; bound?.addEventListener('ratechange', sync); }
      const rate = video?.playbackRate || 1;
      ui.summary.textContent = `${rate}×`;
      const step = YTFP.settings.get().speedStep;
      const bounds = YTFP.utils.speedSliderRange(YTFP.SPEED_MIN, YTFP.SPEED_MAX, step);
      range.min = String(bounds.min); range.max = String(bounds.max); range.step = String(step); range.value = String(rate);
      for (const [value, btn] of buttons) btn.setAttribute('aria-pressed', String(value === rate));
    }
    YTFP.settings.onChange(sync); sync();
    return { ...ui, sync, cleanup() { ui.cleanup(); bound?.removeEventListener('ratechange', sync); YTFP.settings.offChange(sync); } };
  }
  function volume(doc, getVideo) {
    const ui = disclosure(doc, t('boostTooltip', 'Volume'));
    const range = doc.createElement('input'); range.type = 'range'; range.min = '0'; range.step = '1';
    range.setAttribute('aria-label', t('boostTooltip', 'Volume'));
    const status = doc.createElement('span'); status.setAttribute('role', 'status');
    range.oninput = () => { status.textContent = YTFP.audioBoost.setBoostPercent(getVideo(), Number(range.value)) ? '' : t('volumeUnavailable', 'Volume unavailable'); sync(); };
    ui.content.append(range, status);
    let bound = null;
    function sync() {
      const video = getVideo();
      if (bound !== video) { bound?.removeEventListener('volumechange', sync); bound = video; bound?.addEventListener('volumechange', sync); }
      range.max = String(YTFP.settings.get().volumeBoostMax); range.value = String(YTFP.audioBoost.getBoostPercent(video));
      ui.summary.textContent = `${range.value}%`;
    }
    YTFP.settings.onChange(sync); YTFP.audioBoost.onChange(sync); sync();
    return { ...ui, sync, cleanup() { ui.cleanup(); bound?.removeEventListener('volumechange', sync); YTFP.settings.offChange(sync); YTFP.audioBoost.offChange(sync); } };
  }
  function install(doc) {
    if (doc.getElementById('ytfp-surface-css')) return;
    const style = doc.createElement('style'); style.id = 'ytfp-surface-css';
    style.textContent = `
.ytfp-disclosure { position:relative; font:inherit; color:#fff; }
.ytfp-disclosure > summary { list-style:none; cursor:pointer; padding:9px; border-radius:10px; background:rgba(25,25,25,.86); white-space:nowrap; }
.ytfp-disclosure > summary::-webkit-details-marker { display:none; }
.ytfp-disclosure-content { position:absolute; bottom:calc(100% + 6px); right:0; padding:10px; border-radius:12px; background:#202024; box-shadow:0 4px 20px #0008; z-index:10030; width:max-content; max-width:calc(100vw - 32px); }
.ytfp-disclosure-content input[type=range] { width:160px; max-width:100%; accent-color:#ff4747; }
.ytfp-preset-row { display:flex; gap:3px; }
.ytfp-preset-row button { border:0; border-radius:8px; padding:8px; color:#fff; background:#37373b; cursor:pointer; }
.ytfp-preset-row button[aria-pressed=true] { background:#a82020; }
.ytfp-surface { color:#fff; font:13px Arial,sans-serif; box-sizing:border-box; }
.ytfp-surface button, .ytfp-surface summary { font:inherit; line-height:1.2; color:inherit; cursor:pointer; margin:0; box-sizing:border-box; }
.ytfp-surface button, .ytfp-surface .ytfp-more > summary { padding:9px; border:0; border-radius:10px; background:#27272be8; min-height:34px; }
.ytfp-surface button:hover, .ytfp-surface summary:hover { background:#49494f; }
.ytfp-surface [hidden] { display:none !important; }
.ytfp-surface button:focus-visible, .ytfp-surface summary:focus-visible { outline:2px solid #fff; outline-offset:2px; }
.ytfp-surface .ytfp-more > summary { list-style:none; }
.ytfp-surface .ytfp-more > summary::-webkit-details-marker { display:none; }
.ytfp-page-panel { position:absolute; left:50%; bottom:76px; transform:translateX(-50%); display:flex; align-items:center; flex-wrap:wrap; gap:5px; max-width:calc(100% - 16px); padding:6px; border-radius:15px; background:#121216e8; z-index:59; opacity:0; pointer-events:none; }
.ytfp-page-panel { width:max-content; transition:opacity .16s ease; border:1px solid #ffffff20; box-shadow:0 4px 18px #0005; gap:8px; padding:8px; border-radius:16px; }
.ytfp-page-panel--visible { opacity:1; pointer-events:auto; }
.ytfp-page-panel > .ytfp-btn, .ytfp-page-panel > details > summary { display:flex; align-items:center; justify-content:center; min-width:44px; min-height:44px; padding:10px 12px; border-radius:10px; font-size:14px; font-weight:500; background:transparent; }
.ytfp-page-panel > .ytfp-drag { min-width:24px; padding:8px 4px; color:#aaa; }
.ytfp-page-panel > .ytfp-page-pip { font-size:24px; }
.ytfp-page-panel > .ytfp-page-pip svg { width:30px; height:26px; }
.ytfp-page-panel > .ytfp-page-pip[aria-pressed=true] { background:#ffffff25; box-shadow:inset 0 0 0 1px #ffffff80; }
.ytfp-page-panel > .ytfp-btn:hover, .ytfp-page-panel > details > summary:hover { background:#ffffff20; }
.ytfp-page-panel > [role=status]:empty { display:none; }
.ytfp-page-panel .ytfp-pinned-tools > div { display:flex; align-items:center; gap:4px; }
.ytfp-page-panel .ytfp-pinned-tools button { min-width:44px; min-height:44px; }
@media(prefers-reduced-motion:reduce) { .ytfp-page-panel { transition:none; } }
.ytfp-page-panel .ytfp-pinned-tools { display:flex; gap:4px; flex-wrap:wrap; }
.ytfp-surface-menu .ytfp-tool-row { display:grid; grid-template-columns:1fr auto; gap:6px; padding:8px 0; border-bottom:1px solid #ffffff20; }
.ytfp-surface-menu .ytfp-tool-slot { grid-column:1/-1; display:flex; gap:4px; flex-wrap:wrap; }
.ytfp-surface-menu { position:absolute; right:8px; bottom:8px; width:280px; max-width:calc(100% - 16px); max-height:calc(100% - 16px); overflow:auto; padding:10px; border-radius:12px; background:#19191ef7; z-index:10040; }
.ytfp-surface-menu .ytfp-disclosure-content { position:static; width:auto; max-width:100%; box-shadow:none; }
.ytfp-surface-menu .ytfp-search-controls form { position:static; width:auto; }
.ytfp-surface-menu .ytfp-disclosure, .ytfp-surface-menu .ytfp-search-controls { margin:5px 0; }
.ytfp-page-panel .ytfp-more-panel { position:absolute; bottom:calc(100% + 6px); right:0; width:280px; max-width:calc(100vw - 32px); max-height: min(330px,60vh); overflow:auto; padding:10px; border-radius:12px; background:#19191ef7; box-sizing:border-box; z-index:10030; }
.ytfp-page-panel[data-menu-below=true] .ytfp-more-panel, .ytfp-page-panel[data-menu-below=true] .ytfp-disclosure-content { bottom:auto; top:calc(100% + 6px); }
.ytfp-drag { touch-action:none; cursor:grab !important; }
.ytfp-shorts-side { position:absolute; right:8px; top:64px; bottom:72px; display:flex; flex-direction:column; justify-content:center; align-items:stretch; gap:6px; z-index:10010; pointer-events:auto; max-width:min(35vw,120px); }
.ytfp-shorts-side[data-side=left] { right:auto; left:8px; }
.ytfp-shorts-side .ytfp-disclosure-content { right:calc(100% + 8px); bottom:0; }
.ytfp-shorts-side[data-side=left] .ytfp-disclosure-content { left:calc(100% + 8px); right:auto; }
.ytfp-shorts-side .ytfp-search-controls { display:flex; flex-direction:column; position:relative; }
.ytfp-shorts-side form { position:absolute; right:calc(100% + 8px); width:180px; padding:8px; background:#222; border-radius:10px; z-index:10030; }
.ytfp-shorts-side[data-side=left] form { right:auto; left:calc(100% + 8px); }
.ytfp-shorts-side .ytfp-pinned-tools { display:flex; flex-direction:column; gap:3px; }
.ytfp-shorts-side input[type=search] { box-sizing:border-box; width:100%; }
.ytfp-shorts-side .ytfp-reaction { display:flex; flex-direction:column; align-items:center; justify-content:center; align-self:center; gap:3px; min-width:40px; }
.ytfp-shorts-side .ytfp-reaction-count { font-size:10px; white-space:nowrap; }
.ytfp-shorts-side .ytfp-reaction--on { background:#942525; }
.ytfp-short-timeline { position:absolute; left:12px; right:12px; bottom:8px; z-index:10015; display:flex; align-items:center; gap:8px; padding:3px 8px; border-radius:10px; background:#121216cf; }
.ytfp-short-timeline input { flex:1; min-width:0; height:30px; accent-color:#ff4040; touch-action:none; }
.ytfp-short-timeline output { font:11px Arial,sans-serif; font-variant-numeric:tabular-nums; white-space:nowrap; color:#fff; }
.ytfp-night-defs { position:absolute; width:0; height:0; pointer-events:none; }
body.ytfp-night--warm video.html5-main-video { filter:url(#ytfp-night-warm); }
body.ytfp-night--deep video.html5-main-video { filter:url(#ytfp-night-deep); }
.ytfp-history-list { max-height:220px; overflow:auto; width:220px; max-width:60vw; }
.ytfp-history-list button { display:block; width:100%; text-align:left; margin:3px 0; white-space:normal; }
.ytfp-short-nav { position:absolute; bottom:48px; left:50%; transform:translateX(-50%); z-index:10010; display:flex; gap:4px; }
@media(max-height:500px) { .ytfp-shorts-side { top:44px; gap:3px; } .ytfp-shorts-side button, .ytfp-shorts-side summary { padding:5px; min-height:28px; } }
`;
    doc.head.append(style);
  }
  return { t, button, disclosure, speed, volume, install };
})();
