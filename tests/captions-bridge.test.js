import { test, expect, vi } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function setup() {
  let listener;
  const button = { style: {}, getAttribute: name => name === 'aria-pressed' ? 'true' : null, click: vi.fn() };
  const tracks = [{ languageCode:'ru', displayName:'Русский' }];
  const player = { querySelector: () => button, getOption: (_, option) => option === 'tracklist' ? tracks : tracks[0], setOption: vi.fn() };
  const window = { addEventListener: (_, fn) => listener = fn, postMessage: vi.fn() };
  const context = vm.createContext({ window, document: { querySelector: () => player }, location: { origin:'https://www.youtube.com' } });
  vm.runInContext(readFileSync(new URL('../extension/content/captions-bridge.js', import.meta.url),'utf8'), context);
  const send = (data, source = window) => listener({ source, origin:'https://www.youtube.com', data: { type:'ytfp-captions', requestId:'test', ...data } });
  return { send, window, player, button };
}
test('caption bridge lists languages and selects only an existing language', () => {
  const env = setup(); env.send({ action:'read' });
  expect(env.window.postMessage.mock.calls[0][0].result.tracks).toEqual([{ code:'ru', name:'Русский' }]);
  env.send({ action:'language', language:'not-a-track' }); expect(env.player.setOption).not.toHaveBeenCalled();
  env.send({ action:'language', language:'ru' }); expect(env.player.setOption).toHaveBeenCalledWith('captions','track', { languageCode:'ru', displayName:'Русский' });
});
test('caption bridge rejects foreign senders and arbitrary actions', () => {
  const env = setup(); env.send({ action:'toggle' }, {}); env.send({ action:'loadVideoById' });
  expect(env.button.click).not.toHaveBeenCalled(); expect(env.window.postMessage).not.toHaveBeenCalled();
});
test('caption bridge reports unavailable when YouTube exposes neither API nor CC', () => {
  const env = setup(); env.player.querySelector = () => null; env.player.getOption = undefined;
  env.send({ action:'read' }); expect(env.window.postMessage.mock.calls[0][0].result.available).toBe(false);
});
