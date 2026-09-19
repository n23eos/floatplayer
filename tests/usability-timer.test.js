// @vitest-environment jsdom
import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { installChromeStub, buildWatchPage, createPipWindowStub, loadContentScripts } from './helpers/extension-env.js';
installChromeStub();
globalThis.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){} });
globalThis.fetch = vi.fn(async () => ({ ok:true, text:async()=>'', json:async()=>[] }));
const YTFP = loadContentScripts();
let ui, page;
beforeEach(async () => {
  vi.useFakeTimers(); page = buildWatchPage();
  window.history.replaceState({}, '', '/watch?v=AAAAAAAAAAA');
  await YTFP.settings.load();
  Object.assign(YTFP.settings.get(), { pinnedTools:[], sleepFade:false });
  Object.defineProperty(page.video, 'duration', { value:120, configurable:true });
  page.video.pause = vi.fn();
  ui = YTFP.pipSleep.build(document); document.body.append(ui.element);
});
afterEach(() => { ui.cleanup(); YTFP.sleepTimer.stop(); YTFP.sleepTimer.resume(); vi.useRealTimers(); vi.restoreAllMocks(); });
const panel = () => document.querySelector('.ytfp-sleep-panel');
const button = () => ui.element.querySelector('button');
function choose(value) {
  button().click(); const select = panel().querySelector('select');
  select.value=value; select.dispatchEvent(new Event('change', { bubbles:true }));
}
test('running timer is one compact button, updates, extends and cancels', () => {
  choose('15');
  expect(panel().hidden).toBe(true);
  expect(ui.element.querySelectorAll('button')).toHaveLength(1);
  expect(ui.element.querySelector('select')).toBeNull();
  expect(button().textContent).toBe('15:00');
  vi.advanceTimersByTime(1000); expect(button().textContent).toBe('14:59');
  button().click(); panel().querySelector('[aria-label="Add 10 minutes"]').click();
  expect(button().textContent).toBe('24:59'); expect(panel().hidden).toBe(true);
  button().click(); panel().querySelector('.ytfp-sleep-actions button:last-child').click();
  expect(button().dataset.active).toBe('false'); expect(YTFP.sleepTimer.get().mode).toBe('off');
});
test('custom entry is not overwritten by timer ticks and Escape returns focus', () => {
  YTFP.sleepTimer.start(15); choose('custom');
  const input=panel().querySelector('input'); input.value='23';
  vi.advanceTimersByTime(2000); expect(input.value).toBe('23');
  expect(panel().querySelector('select').value).toBe('custom');
  panel().querySelector('form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
  expect(YTFP.sleepTimer.get().remaining).toBe(23*60); expect(panel().hidden).toBe(true);
  button().click(); input.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true, cancelable:true }));
  expect(panel().hidden).toBe(true); expect(document.activeElement).toBe(button());
});
test('menu allows timer popup interactions; pinning keeps only compact control', async () => {
  const menu=YTFP.pipMenu.build(document,[['sleep','toolSleep','Sleep timer',ui.element]]);
  document.body.append(menu.element,menu.pins);
  menu.element.open=true; await vi.advanceTimersByTimeAsync(1);
  button().click();
  const select=panel().querySelector('select');
  select.dispatchEvent(new MouseEvent('pointerdown',{ bubbles:true,cancelable:true }));
  expect(panel().hidden).toBe(false); expect(menu.element.open).toBe(true);
  select.value='30'; select.dispatchEvent(new Event('change',{bubbles:true}));
  const notify=chrome.storage.onChanged.addListener.mock.calls[0][0];
  Object.assign(YTFP.settings.get(), { pinnedTools:['sleep'] });
  notify({ pinnedTools:{newValue:['sleep']} }, 'sync');
  expect(menu.pins.contains(ui.element)).toBe(true);
  expect(menu.pins.querySelector('select')).toBeNull();
  expect(button().textContent).toBe('30:00');
  menu.cleanup();
});
test('timer completion and UI cleanup preserve independent timer lifecycle', () => {
  YTFP.sleepTimer.start(1/60); vi.advanceTimersByTime(1000);
  expect(page.video.pause).toHaveBeenCalled(); expect(button().dataset.active).toBe('false');
  YTFP.sleepTimer.start(15); ui.cleanup();
  expect(document.querySelector('.ytfp-sleep-panel')).toBeNull();
  expect(YTFP.sleepTimer.get().mode).toBe('time');
});


test('controller dismisses timer before hiding its parent menu on pointer leave', async () => {
  ui.cleanup();
  Object.assign(YTFP.settings.get(), {compactMode:true, pinnedTools:[]});
  const win=createPipWindowStub();
  window.documentPictureInPicture={ requestWindow:vi.fn(async()=>win) };
  await YTFP.pip.open({mode:'document'});
  const menu=win.document.querySelector('.ytfp-more');
  menu.open=true; await vi.advanceTimersByTimeAsync(1);
  const toggle=win.document.querySelector('.ytfp-sleep-toggle');
  toggle.click();
  const popup=win.document.querySelector('.ytfp-sleep-panel');
  expect(popup.hidden).toBe(false);
  win.document.documentElement.dispatchEvent(new win.Event('pointerleave'));
  expect(popup.hidden).toBe(true);
  expect(menu.open).toBe(false);
  expect(popup.contains(win.document.activeElement)).toBe(false);
  YTFP.pip.close();
});
