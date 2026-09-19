// @vitest-environment jsdom
import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeStub, buildWatchPage, createPipWindowStub, loadContentScripts } from './helpers/extension-env.js';
installChromeStub();
globalThis.matchMedia = () => ({matches:false,addListener(){},removeListener(){}});
globalThis.fetch = vi.fn(async () => ({ok:true,text:async()=>'',json:async()=>[]}));
const YTFP = loadContentScripts();
let page, dispose = [], number = 0;
beforeEach(async () => {
  page = buildWatchPage(); window.history.replaceState({},'',`/watch?v=${String(++number).padStart(11,'0')}`);
  await YTFP.settings.load();
  Object.defineProperties(page.video,{duration:{value:45,configurable:true},paused:{value:false,configurable:true}});
  page.video.play = vi.fn(async()=>{}); page.video.pause = vi.fn();
});
afterEach(() => {
  dispose.forEach(fn=>fn()); dispose=[];
  if (YTFP.pip.isOpen()) YTFP.pip.close();
  window.history.replaceState({},'','/'); YTFP.pagePanel.ensurePanel(); YTFP.shortsRuntime.sync();
  YTFP.sleepTimer.stop(); YTFP.sleepTimer.resume(); vi.restoreAllMocks();
});
function settings(values) { Object.assign(YTFP.settings.get(),values); }
function shorts() { window.history.replaceState({},'',`/shorts/${String(number).padStart(11,'0')}`); page.player.id='shorts-player'; }
test('compact page hides playback extras, pins live controls and closes before video actions', () => {
  YTFP.pagePanel.ensurePanel();
  const panel = document.querySelector('.ytfp-page-panel');
  expect(panel).not.toBeNull();
  const menu = panel.querySelector('.ytfp-more'), tools = panel.querySelector('.ytfp-more-panel');
  expect(tools.hidden).toBe(true);
  const clicked = vi.fn(); page.video.addEventListener('click',clicked);
  menu.open=true; tools.hidden=false;
  page.video.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,cancelable:true}));
  page.video.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  expect(menu.open).toBe(false); expect(clicked).not.toHaveBeenCalled();
  page.video.dispatchEvent(new MouseEvent('click',{bubbles:true})); expect(clicked).toHaveBeenCalledTimes(1);
});
test('direct presets apply immediately and follow native speed changes', () => {
  const ui=YTFP.surfaceControls.speed(document,()=>page.video); dispose.push(ui.cleanup);
  document.body.append(ui.element);
  const preset=[...ui.element.querySelectorAll('button')].find(btn=>btn.textContent==='1.25×');
  preset.click(); expect(page.video.playbackRate).toBe(1.25); expect(preset.getAttribute('aria-pressed')).toBe('true');
  page.video.playbackRate=2; page.video.dispatchEvent(new Event('ratechange'));
  expect(ui.summary.textContent).toBe('2×'); expect(preset.getAttribute('aria-pressed')).toBe('false');
});
test('Shorts has one shared auto advance on page and PiP and no advance while scrubbing', () => {
  shorts(); settings({shortsAutoNext:true}); const next=vi.spyOn(YTFP.shortsSearch,'next').mockReturnValue(true); vi.spyOn(YTFP.shortsSearch,'isActive').mockReturnValue(true);
  YTFP.shortsRuntime.sync(); YTFP.shortsRuntime.sync(); page.video.currentTime=44.95;
  YTFP.shortsRuntime.setScrubbing(page.video,true); page.video.dispatchEvent(new Event('timeupdate')); expect(next).not.toHaveBeenCalled();
  YTFP.shortsRuntime.setScrubbing(page.video,false); page.video.dispatchEvent(new Event('timeupdate')); page.video.dispatchEvent(new Event('ended')); expect(next).toHaveBeenCalledTimes(1);
});
test('Repeat sets loop, Next removes it, sleep end takes priority over both', () => {
  shorts(); settings({shortsAutoNext:false}); YTFP.shortsRuntime.sync(); expect(page.video.loop).toBe(true);
  settings({shortsAutoNext:true}); YTFP.shortsRuntime.sync(); expect(page.video.loop).toBe(false);
  settings({shortsAutoNext:false}); YTFP.sleepTimer.start('end'); YTFP.shortsRuntime.sync(); expect(page.video.loop).toBe(false);
});
test('timeline preserves pause state, seeks accurately and ignores advertising', () => {
  shorts(); const ui=YTFP.shortsTimeline.build(document,()=>page.video); document.body.append(ui.element); dispose.push(ui.cleanup);
  const input=ui.element.querySelector('input'); input.dispatchEvent(new Event('pointerdown',{bubbles:true})); input.value='500'; input.dispatchEvent(new Event('input'));
  expect(page.video.currentTime).toBe(22.5); expect(page.video.pause).toHaveBeenCalledTimes(1);
  document.dispatchEvent(new Event('pointerup')); expect(page.video.play).toHaveBeenCalledTimes(1);
  page.player.classList.add('ad-showing'); ui.sync(); expect(input.disabled).toBe(true);
  input.value='900'; input.dispatchEvent(new Event('input')); expect(page.video.currentTime).toBe(22.5);
});
test('confirmed Shorts history excludes duplicate route events and honours disabled history', async () => {
  shorts(); settings({shortsHistory:true}); const record=vi.spyOn(YTFP.localRecords,'recordVisit').mockResolvedValue();
  await YTFP.shortsRuntime.confirmed(); await YTFP.shortsRuntime.confirmed(); expect(record).toHaveBeenCalledTimes(1);
  window.history.replaceState({},'','/shorts/ZZZZZZZZZZZ'); settings({shortsHistory:false}); await YTFP.shortsRuntime.confirmed(); expect(record).toHaveBeenCalledTimes(1);
});
test('history return uses confirmed navigation without clearing the search', async () => {
  shorts(); const stop=vi.spyOn(YTFP.shortsSearch,'stop'); const go=vi.spyOn(YTFP.navigation,'go').mockResolvedValue(false);
  expect(await YTFP.shortsRuntime.revisit('BBBBBBBBBBB')).toBe(false); expect(YTFP.shortsRuntime.getStatus()).toContain('Could not');
  expect(go).toHaveBeenCalledWith('BBBBBBBBBBB',true); expect(stop).not.toHaveBeenCalled();
});
test('channel profile applies once and does not overwrite a later manual adjustment', async () => {
  const id = YTFP.playerApi.getVideoId();
  document.head.innerHTML=`<meta itemprop="videoId" content="${id}"><meta itemprop="channelId" content="UCabcdefghijklmnopqrstuv">`;
  vi.spyOn(YTFP.localRecords,'getProfile').mockResolvedValue({speed:1.5,volume:70});
  await YTFP.channelProfiles.sync(); expect(page.video.playbackRate).toBe(1.5); expect(page.video.volume).toBe(.7);
  page.video.playbackRate=2; await YTFP.channelProfiles.sync(); expect(page.video.playbackRate).toBe(2);
});
test('late channel profile cannot change another video or override manual changes', async () => {
  const id=YTFP.playerApi.getVideoId(); document.head.innerHTML=`<meta itemprop="videoId" content="${id}"><meta itemprop="channelId" content="UCabcdefghijklmnopqrstuv">`;
  let resolve; vi.spyOn(YTFP.localRecords,'getProfile').mockReturnValue(new Promise(r=>resolve=r));
  const pending=YTFP.channelProfiles.sync(); page.video.playbackRate=1.25; resolve({speed:2,volume:50}); await pending;
  expect(page.video.playbackRate).toBe(1.25);
});
test('Shorts PiP restores the compact bottom controls instead of the side rail', async () => {
  shorts(); const win=createPipWindowStub(); window.documentPictureInPicture={requestWindow:vi.fn(async()=>win)};
  expect(await YTFP.pip.open()).toBe(true);
  expect(win.document.querySelector('.ytfp-shorts-side')).toBeNull();
  expect(win.document.querySelector('.ytfp-short-timeline')).toBeNull();
  expect(win.document.querySelector('.ytfp-bottom--narrow.ytfp-bottom--compact')).not.toBeNull();
  expect(win.document.querySelector('.ytfp-sleep')).not.toBeNull();
  expect(win.document.querySelector('.ytfp-speed-presets')).not.toBeNull();
});
test('saved relative panel position is bounded after resize and can be reset', async () => {
  const panel=document.createElement('div'), handle=document.createElement('button'); panel.append(handle); page.player.append(panel);
  let width=800;
  page.player.getBoundingClientRect=()=>({left:0,top:0,width,height:450,bottom:450});
  panel.getBoundingClientRect=()=>({left:0,top:0,width:200,height:50});
  vi.spyOn(chrome.storage.local,'get').mockResolvedValue({pagePanelPosition:{x:1,y:.5}});
  const position=YTFP.panelPosition.attach(panel,handle,page.player); dispose.push(position.cleanup);
  await Promise.resolve(); expect(panel.style.left).toBe('600px'); expect(panel.style.top).toBe('200px');
  width=250; position.layout(); expect(panel.style.left).toBe('50px');
  await position.reset(); expect(panel.style.left).toBe('50%'); expect(chrome.storage.local.remove).toHaveBeenCalledWith('pagePanelPosition');
});
test('dragging controls does not move panel, dragging the handle persists normalized coordinates', async () => {
  const panel=document.createElement('div'),handle=document.createElement('button'),input=document.createElement('input'); panel.append(handle,input); page.player.append(panel);
  page.player.getBoundingClientRect=()=>({left:0,top:0,width:800,height:450,bottom:450});
  panel.getBoundingClientRect=()=>({left:0,top:0,width:200,height:50});
  const position=YTFP.panelPosition.attach(panel,handle,page.player); dispose.push(position.cleanup); await Promise.resolve();
  const event=(type,x,y)=>new MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});
  input.dispatchEvent(event('pointerdown',0,0)); input.dispatchEvent(event('pointermove',600,400)); input.dispatchEvent(event('pointerup',600,400));
  expect(chrome.storage.local.set).not.toHaveBeenCalledWith(expect.objectContaining({pagePanelPosition:expect.anything()}));
  handle.dispatchEvent(event('pointerdown',0,0)); handle.dispatchEvent(event('pointermove',900,900)); handle.dispatchEvent(event('pointerup',900,900));
  expect(chrome.storage.local.set).toHaveBeenCalledWith({pagePanelPosition:{x:1,y:1}});
});
test('a profile response after route change is ignored even before the next guard tick', async () => {
  const id=YTFP.playerApi.getVideoId(); document.head.innerHTML=`<meta itemprop="videoId" content="${id}"><meta itemprop="channelId" content="UCabcdefghijklmnopqrstuv">`;
  let resolve; vi.spyOn(YTFP.localRecords,'getProfile').mockReturnValue(new Promise(r=>resolve=r));
  const before=page.video.playbackRate, pending=YTFP.channelProfiles.sync();
  window.history.replaceState({},'','/watch?v=other_video'); resolve({speed:2,volume:20}); await pending;
  expect(page.video.playbackRate).toBe(before);
});
test('replacing the page player removes stale controls and their outside handlers', () => {
  YTFP.pagePanel.ensurePanel(); const old=document.querySelector('.ytfp-page-panel');
  const oldMenu=old.querySelector('.ytfp-more'); oldMenu.open=true;
  page=buildWatchPage(); YTFP.pagePanel.ensurePanel();
  expect(document.querySelectorAll('.ytfp-page-panel')).toHaveLength(1);
  const click=vi.fn(); page.video.addEventListener('click',click); page.video.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  expect(click).toHaveBeenCalledTimes(1);
});

test.each(['img', '.ytfp-related-title'])('recommendation %s uses confirmed navigation, even with a stale source link', async target => {
  document.querySelector('#secondary').innerHTML='<ytd-compact-video-renderer><a href="/watch?v=BBBBBBBBBBB"><span id="video-title">Next video</span></a></ytd-compact-video-renderer>';
  let finish; const go=vi.spyOn(YTFP.navigation,'go').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const win=createPipWindowStub(), related=YTFP.pipRelated.build(win.document);
  dispose.push(related.cleanup); win.document.body.append(related.element);
  related.element.querySelector('.ytfp-related-toggle').click();
  document.querySelector('#secondary').replaceChildren();
  const button=related.element.querySelector('.ytfp-related-open');
  button.querySelector(target).click();
  expect(go).toHaveBeenCalledWith('BBBBBBBBBBB');
  expect(button.disabled).toBe(true);
  expect(related.element.querySelector('.ytfp-related-panel--open')).not.toBeNull();
  finish(false); await Promise.resolve();
  expect(button.disabled).toBe(false);
  expect(related.element.querySelector('.ytfp-related-panel--open')).not.toBeNull();
  button.click(); finish(true); await Promise.resolve();
  expect(related.element.querySelector('.ytfp-related-panel--open')).toBeNull();
});

test('recommendation queue actions never navigate', () => {
  document.querySelector('#secondary').innerHTML='<ytd-compact-video-renderer><a href="/watch?v=BBBBBBBBBBB"><span id="video-title">Next video</span></a></ytd-compact-video-renderer>';
  const go=vi.spyOn(YTFP.navigation,'go'), add=vi.spyOn(YTFP.watchQueue,'add').mockResolvedValue(true);
  const related=YTFP.pipRelated.build(document); dispose.push(related.cleanup);
  related.element.querySelector('.ytfp-related-toggle').click();
  related.element.querySelectorAll('.ytfp-queue-add').forEach(button=>button.click());
  expect(add).toHaveBeenCalledTimes(2); expect(go).not.toHaveBeenCalled();
});

test('normal panel hides on player leave even after a click and with menu open', () => {
  YTFP.pagePanel.ensurePanel(); const panel=document.querySelector('.ytfp-page-panel');
  page.player.dispatchEvent(new Event('pointerenter'));
  expect(panel.classList.contains('ytfp-page-panel--visible')).toBe(true);
  panel.querySelector('button').focus(); panel.querySelector('.ytfp-more').open=true;
  page.player.dispatchEvent(new Event('pointerleave'));
  expect(panel.classList.contains('ytfp-page-panel--visible')).toBe(false);
  expect(panel.querySelector('.ytfp-more').open).toBe(false);
  expect(panel.querySelector('.ytfp-more-panel').hidden).toBe(true);
});
test('normal panel hides on idle but stays visible while operating controls', () => {
  vi.useFakeTimers();
  try {
    YTFP.pagePanel.ensurePanel(); const panel=document.querySelector('.ytfp-page-panel');
    page.player.dispatchEvent(new Event('pointermove')); vi.advanceTimersByTime(1800);
    expect(panel.classList.contains('ytfp-page-panel--visible')).toBe(false);
    page.player.dispatchEvent(new Event('pointermove')); panel.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(3000); expect(panel.classList.contains('ytfp-page-panel--visible')).toBe(true);
    panel.dispatchEvent(new Event('pointerleave')); vi.advanceTimersByTime(1800);
    expect(panel.classList.contains('ytfp-page-panel--visible')).toBe(false);
  } finally { vi.useRealTimers(); }
});


test('normal panel exposes icon-only buttons for both explicit window modes', () => {
  const open=vi.spyOn(YTFP.pip,'open').mockResolvedValue(true);
  YTFP.pagePanel.ensurePanel();
  const panel=document.querySelector('.ytfp-page-panel');
  for (const mode of ['document','native']) {
    const button=panel.querySelector(`:scope > button[data-mode="${mode}"]`);
    expect(button).not.toBeNull(); expect(button.textContent).toBe('');
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBeTruthy();
    button.click(); expect(open).toHaveBeenLastCalledWith({mode});
  }
});

test('Shorts page retains its native controls without the new extension side panel', () => {
  shorts(); YTFP.pagePanel.ensurePanel();
  expect(document.querySelector('.ytfp-page-shorts, .ytfp-shorts-side, .ytfp-page-panel')).toBeNull();
});

test('Shorts controls include visible auto-next with pressed state and separate rows', async () => {
  shorts(); settings({windowMode:'document',shortsAutoNext:false});
  const win=createPipWindowStub(); window.documentPictureInPicture={requestWindow:vi.fn(async()=>win)};
  await YTFP.pip.open();
  const bar=win.document.querySelector('.ytfp-bottom');
  expect(bar.querySelector('.ytfp-row--shorts-volume')).not.toBeNull();
  const auto=bar.querySelector('.ytfp-row--shorts-tools > button[aria-pressed]');
  expect(auto.getAttribute('aria-pressed')).toBe('false'); auto.click();
  expect(auto.getAttribute('aria-pressed')).toBe('true');
  expect(chrome.storage.sync.set).toHaveBeenCalledWith({shortsAutoNext:true});
});

test('compact Document PiP hides after pointer leave and releases visibility listeners on close', async () => {
  settings({windowMode:'document',compactMode:true});
  const win=createPipWindowStub(); window.documentPictureInPicture={requestWindow:vi.fn(async()=>win)};
  await YTFP.pip.open();
  expect(win.document.body.dataset.compact).toBe('true');
  win.document.body.dispatchEvent(new win.Event('pointermove',{bubbles:true}));
  expect(win.document.body.classList.contains('ytfp-ui-hidden')).toBe(false);
  win.document.querySelector('button').focus();
  win.document.documentElement.dispatchEvent(new win.Event('pointerleave'));
  expect(win.document.body.classList.contains('ytfp-ui-hidden')).toBe(true);
  const focused=win.document.querySelector('.ytfp-bottom button'); focused.focus();
  focused.dispatchEvent(new win.KeyboardEvent('keydown',{key:' ',bubbles:true}));
  expect(win.document.body.classList.contains('ytfp-ui-hidden')).toBe(false);
  focused.dispatchEvent(new win.Event('pointerdown',{bubbles:true}));
  win.document.documentElement.dispatchEvent(new win.Event('pointerleave'));
  YTFP.pip.close();
  win.document.body.dispatchEvent(new win.Event('pointermove',{bubbles:true}));
  expect(win.document.body.classList.contains('ytfp-ui-hidden')).toBe(true);
});

test('toggle accepts an explicit document mode even when the saved mode is native', async () => {
  settings({windowMode:'native'}); const win=createPipWindowStub();
  window.documentPictureInPicture={requestWindow:vi.fn(async()=>win)};
  expect(await YTFP.pip.toggle({mode:'document'})).toBe(true);
  expect(window.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
});
