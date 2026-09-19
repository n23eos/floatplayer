"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.pagePanel = (() => {
  let current = null;
  function buildPanel(root) {
    const { t,button } = YTFP.surfaceControls;
    YTFP.surfaceControls.install(document);
    const panel = document.createElement('div'); panel.className = 'ytfp-page-panel ytfp-surface';
    for (const type of ['click','dblclick','mousedown','pointerdown','touchstart']) panel.addEventListener(type,event => event.stopPropagation());
    const getVideo = () => YTFP.playerApi.getVideo();
    const handle = button(document,'⠿',() => {},t('dragPanel','Move panel')); handle.classList.add('ytfp-drag');
    const volume = YTFP.surfaceControls.volume(document,getVideo), speed = YTFP.surfaceControls.speed(document,getVideo);
    const playback = document.createElement('div');
    const play = button(document,'▶',() => YTFP.playerApi.togglePlayPause(),t('playTooltip','Play / pause'));
    playback.append(button(document,'−30',() => YTFP.playerApi.seekBy(-30)),play,button(document,'+30',() => YTFP.playerApi.seekBy(30)));
    YTFP.pageControls.ensureNightReady();
    const night = button(document,'☾',() => YTFP.pageControls.cycleNight(),t('nightTooltip','Night mode')); night.classList.add(YTFP.pageControls.NIGHT_BUTTON_CLASS);
    const status = document.createElement('span'); status.setAttribute('role','status');
    let position;
    const reset = button(document,t('resetPanelPosition','Reset position'),async () => {
      try { await position.reset(); status.textContent = ''; } catch { status.textContent = t('optSaveError','Could not save'); }
    });
    const profile = YTFP.channelProfiles.build(document);
    const menu = YTFP.pipMenu.build(document,[
      ['playback','playTooltip','Playback',playback], ['night','nightTooltip','Night mode',night],
      ['position','resetPanelPosition','Reset position',reset],
      ['profile','profileSave','Remember for this channel',profile.element]
    ],{host:panel,pinKey:'pagePinnedTools'});
    const modeButtons = [];
    function paintMode(mode) {
      for (const control of modeButtons) control.setAttribute('aria-pressed',String(control.dataset.mode === mode));
    }
    function modeButton(mode, label, paths) {
      const control = button(document,'',() => {
        paintMode(mode);
        chrome.storage.sync.set({windowMode:mode}).catch(() => syncMode(YTFP.settings.get()));
        YTFP.pip.open({mode});
      },label);
      control.classList.add('ytfp-page-pip'); control.dataset.mode = mode;
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','24'); svg.setAttribute('height','24');
      svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','1.7');
      svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round'); svg.setAttribute('aria-hidden','true');
      for (const d of paths) { const path = document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',d); svg.append(path); }
      control.append(svg); modeButtons.push(control); return control;
    }
    const full = modeButton('document',t('modeControls','Window with controls'),['M3 4h18v16H3z','M3 15h18','M6 18h.01M9 18h.01M13 18h5']);
    const clean = modeButton('native',t('modeVideo','Video only'),['M3 4h18v16H3z','M10 8l6 4-6 4z']);
    const syncMode = settings => paintMode(settings.windowMode);
    YTFP.settings.onChange(syncMode); syncMode(YTFP.settings.get());
    panel.append(handle,speed.element,volume.element,full,clean,menu.element,menu.pins,status);
    root.append(panel); position = YTFP.panelPosition.attach(panel,handle,root);
    let hideTimer, overPanel = false, keyboard = false;
    function hide() {
      clearTimeout(hideTimer);
      panel.classList.remove('ytfp-page-panel--visible');
      for (const details of panel.querySelectorAll('details[open]')) details.open = false;
      panel.querySelector('.ytfp-more-panel').hidden = true;
    }
    function schedule() {
      clearTimeout(hideTimer);
      if (!overPanel && !keyboard) hideTimer = setTimeout(hide,1800);
    }
    function show() { panel.classList.add('ytfp-page-panel--visible'); schedule(); }
    function leave() { overPanel = false; if (!keyboard) hide(); }
    function enterPanel() { overPanel = true; clearTimeout(hideTimer); }
    function leavePanel() { overPanel = false; schedule(); }
    function pointer() { keyboard = false; }
    function key(event) { if (event.key === 'Tab') { keyboard = true; show(); } }
    function focus() { if (keyboard) show(); }
    function blur(event) { if (!panel.contains(event.relatedTarget)) { keyboard = false; schedule(); } }
    root.addEventListener('pointermove',show); root.addEventListener('pointerenter',show);
    root.addEventListener('pointerleave',leave); root.addEventListener('pointerdown',pointer,true);
    root.addEventListener('keydown',key); panel.addEventListener('pointerenter',enterPanel);
    panel.addEventListener('pointerleave',leavePanel); panel.addEventListener('focusin',focus); panel.addEventListener('focusout',blur);
    if (root.matches(':hover')) show();
    function cleanupVisibility() {
      clearTimeout(hideTimer);
      root.removeEventListener('pointermove',show); root.removeEventListener('pointerenter',show);
      root.removeEventListener('pointerleave',leave); root.removeEventListener('pointerdown',pointer,true);
      root.removeEventListener('keydown',key); panel.removeEventListener('pointerenter',enterPanel);
      panel.removeEventListener('pointerleave',leavePanel); panel.removeEventListener('focusin',focus); panel.removeEventListener('focusout',blur);
    }
    let boundVideo = null;
    function syncPlayback() {
      const video = getVideo();
      if (video !== boundVideo) {
        boundVideo?.removeEventListener('play',syncPlayback);
        boundVideo?.removeEventListener('pause',syncPlayback);
        boundVideo?.removeEventListener('ended',syncPlayback);
        boundVideo = video;
        boundVideo?.addEventListener('play',syncPlayback);
        boundVideo?.addEventListener('pause',syncPlayback);
        boundVideo?.addEventListener('ended',syncPlayback);
      }
      play.textContent = video?.paused ? '▶' : 'Ⅱ';
    }
    const sync = () => { const settings = YTFP.settings.get(); syncPlayback(); panel.style.fontSize = `${13 * settings.panelScale / 135}px`; volume.sync(); speed.sync(); };
    sync();
    return { panel, root, sync, cleanup() { boundVideo?.removeEventListener('play',syncPlayback); boundVideo?.removeEventListener('pause',syncPlayback); boundVideo?.removeEventListener('ended',syncPlayback); boundVideo=null; YTFP.settings.offChange(syncMode); cleanupVisibility(); menu.cleanup(); volume.cleanup(); speed.cleanup(); position.cleanup(); panel.remove(); } };
  }
  function ensurePanel() {
    const settings = YTFP.settings.get();
    const shorts = YTFP.playerApi.isShortsPage();
    const root = document.querySelector(shorts ? YTFP.SELECTORS.shortsPlayerRoot : YTFP.SELECTORS.playerRoot);
    if (shorts || !settings.pagePanel || !YTFP.playerApi.isPlayerPage() || YTFP.pip.isOpen() || !root) {
      current?.cleanup(); current = null; return;
    }
    if (current && current.root === root && root.contains(current.panel) && current.shorts === shorts) { current.sync(); return; }
    current?.cleanup(); current = buildPanel(root); current.shorts = shorts;
  }
  return { ensurePanel };
})();
