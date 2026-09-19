"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.shortsPanel = (() => {
  function build(doc, { getVideo, page = false, reactions = null, onPrev, onNext, menuHost = doc.body }) {
    const { t,button,disclosure } = YTFP.surfaceControls;
    YTFP.surfaceControls.install(doc);
    const element = doc.createElement('div'); element.className = 'ytfp-shorts-side ytfp-surface';
    const mode = button(doc,'',async () => {
      try { await chrome.storage.sync.set({shortsAutoNext:!YTFP.settings.get().shortsAutoNext}); }
      catch { status.textContent = t('optSaveError','Could not save'); }
    });
    const status = doc.createElement('span'); status.setAttribute('role','status');
    const search = YTFP.pipSearch.build(doc);
    const history = disclosure(doc,t('shortsHistory','History'));
    const historyList = doc.createElement('div'); historyList.className = 'ytfp-history-list'; history.content.append(historyList);
    let disposed = false, request = 0;
    async function renderHistory() {
      const ticket = ++request;
      historyList.textContent = t('searchLoading','Loading…');
      try {
        const items = YTFP.settings.get().shortsHistory ? await YTFP.localRecords.visits() : [];
        if (disposed || ticket !== request) return;
        historyList.replaceChildren();
        if (!items.length) historyList.textContent = t('historyEmpty','History is empty or disabled');
        for (const item of items) {
          const row = button(doc,`${item.title} · ${new Date(item.at).toLocaleTimeString(chrome.i18n.getUILanguage(),{hour:'2-digit',minute:'2-digit'})}`,async () => {
            row.disabled = true;
            try { if (await YTFP.shortsRuntime.revisit(item.id)) history.element.open = false; }
            finally { row.disabled = false; }
          });
          historyList.append(row);
        }
      } catch { if (!disposed && ticket === request) historyList.textContent = t('historyLoadError','Could not load history'); }
    }
    history.element.addEventListener('toggle',() => { if (history.element.open) renderHistory(); });
    const volume = YTFP.surfaceControls.volume(doc,getVideo), speed = YTFP.surfaceControls.speed(doc,getVideo);
    const extra = doc.createElement('div');
    const side = button(doc,t('switchSide','Switch side'),async () => {
      try { await chrome.storage.sync.set({ shortsSide:YTFP.settings.get().shortsSide === 'right' ? 'left' : 'right' }); }
      catch { status.textContent = t('optSaveError','Could not save'); }
    });
    extra.append(side);
    if (page) extra.append(button(doc,'PiP',() => YTFP.pip.open()));
    const profile = YTFP.channelProfiles.build(doc);
    const sleep = YTFP.pipSleep.build(doc), captions = YTFP.pipCaptions.build(doc);
    const night = button(doc,'☾',() => chrome.storage.sync.set({nightMode:YTFP.nightMode.next(YTFP.settings.get().nightMode)}).catch(() => { status.textContent = t('optSaveError','Could not save'); }),t('nightTooltip','Night mode'));
    if (!doc.querySelector('.ytfp-night-defs')) doc.body.append(YTFP.nightMode.createFilters(doc));
    const compactTools = doc.createElement('div');
    const menu = YTFP.pipMenu.build(doc,[['quick','moreTools','More',compactTools,false],['side' ,'switchSide','Switch side',extra],['profile','profileSave','Remember for this channel',profile.element],
      ['sleep','toolSleep','Sleep timer',sleep.element], ['captions','toolCaptions','Captions',captions.element],
      ['copy','toolCopy','Copy link',YTFP.pipExtras.buildCopyLinkButton(doc,{getVideo,isShorts:true})],
      ['night','toolNight','Night mode',night],
      ...(!page ? [['size','toolSize','Window size',YTFP.windowSize.build(doc,getVideo)]] : [])
    ],{pinKey:'shortsPinnedTools',host:menuHost});
    element.append(...(reactions || []),mode,search.element,history.element,volume.element,speed.element,menu.element,menu.pins,status);
    const timeline = YTFP.shortsTimeline.build(doc,getVideo);
    const nav = doc.createElement('div'); nav.className = 'ytfp-short-nav ytfp-surface';
    const play = button(doc,'▶',() => YTFP.playerApi.togglePlayPause(),t('playTooltip','Play / pause'));
    nav.append(button(doc,'↑',onPrev || (() => YTFP.shortsRuntime.step(-1)),t('navPrev','Previous')),play,
      button(doc,'↓',onNext || (() => YTFP.shortsRuntime.step(1)),t('navNext','Next')));
    function apply() {
      const settings = YTFP.settings.get();
      element.dataset.side = settings.shortsSide;
      element.style.fontSize = `${13 * settings.panelScale / 135}px`;
      YTFP.nightMode.applyTo(doc,settings.nightMode);
      mode.textContent = settings.shortsAutoNext ? t('shortsNextMode','Next') : t('shortsRepeatMode','Repeat');
      mode.setAttribute('aria-label',`${t('shortsMode','Playback mode')}: ${mode.textContent}`);
      mode.setAttribute('aria-pressed',String(settings.shortsAutoNext));
      if (history.element.open) renderHistory();
      YTFP.shortsRuntime.sync();
    }
    function sync() {
      const compact = !page && doc.defaultView.innerHeight < 480;
      for (const control of [search.element,history.element,volume.element,speed.element]) {
        const parent = compact ? compactTools : element;
        if (control.parentElement !== parent) {
          if (compact) parent.append(control); else parent.insertBefore(control,menu.element);
        }
      }
      compactTools.parentElement?.closest('.ytfp-tool-row')?.toggleAttribute('hidden',!compact);
      speed.sync(); volume.sync(); timeline.sync(); play.textContent = getVideo()?.paused ? '▶' : 'Ⅱ';
      // Page controls sit inside the video; avoid the native action rail outside it.
      if (page) element.style.top = '12px';
    }
    const updateStatus = value => { status.textContent = value; };
    YTFP.shortsRuntime.onChange(updateStatus); YTFP.settings.onChange(apply); apply(); sync();
    const hotkeys = page ? null : YTFP.playbackHotkeys.attach(doc,{getVideo,isShorts:true,onPrev,onNext});
    const timer = setInterval(sync,500);
    return { element, timeline:timeline.element, nav, sync, cleanup() {
      disposed = true; request++; clearInterval(timer); hotkeys?.cleanup(); sleep.cleanup(); captions.cleanup(); menu.cleanup(); history.cleanup(); search.cleanup(); volume.cleanup(); speed.cleanup(); timeline.cleanup();
      YTFP.settings.offChange(apply); YTFP.shortsRuntime.offChange(updateStatus);
    } };
  }
  return { build };
})();
