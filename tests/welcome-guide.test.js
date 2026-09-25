import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { test, expect, vi } from 'vitest';
const read = file => readFileSync(file, 'utf8');
function welcome(lang = 'ru', update = false) {
  const messages = JSON.parse(read(`extension/_locales/${lang}/messages.json`));
  const dom = new JSDOM(read('extension/welcome/welcome.html'), {runScripts:'outside-only', url:`https://example.test/welcome.html${update ? '?mode=update' : ''}`});
  const options = vi.fn(), save = vi.fn();
  dom.window.chrome = {
    i18n: {getMessage:key => messages[key]?.message || '', getUILanguage:() => lang},
    runtime: {getManifest:() => ({version:'1.21.1'}), openOptionsPage:options},
    commands: {getAll:async () => [{shortcut:'Alt+P',description:'Toggle PiP'}]},
    storage: {sync: {set:save}}
  };
  dom.window.eval(read('extension/welcome/welcome.js'));
  return {dom, doc:dom.window.document, options, save};
}
test('welcome demonstrates a selected mode and repeats it without writing preferences', async () => {
  const {dom, doc, save} = welcome();
  doc.querySelector('[data-guide=simple]').click();
  expect(doc.querySelector('[data-guide=simple]').getAttribute('aria-pressed')).toBe('true');
  expect(doc.querySelector('[data-example=simple]').classList.contains('is-selected')).toBe(true);
  doc.querySelector('#repeatMode').click();
  expect(doc.querySelector('#modeFeedback').textContent).toBe('Нижняя кнопка откроет: Simple · только видео');
  doc.querySelector('[data-guide=volume]').click();
  expect(doc.querySelector('#guideFeedback').textContent).toContain('громкость');
  doc.querySelector('#repeatMode').click();
  expect(doc.querySelector('#modeFeedback').textContent).toContain('Simple');
  doc.querySelector('[data-guide=full]').click();
  doc.querySelector('#repeatMode').click();
  expect(doc.querySelector('#modeFeedback').textContent).toContain('С управлением');
  expect(save).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(doc.querySelector('#keys').textContent).toContain('Alt+P'));
  dom.window.close();
});
test.each(['en','ru'])('welcome keeps every explanation, update heading, shortcuts and settings in %s', async lang => {
  const {dom, doc, options} = welcome(lang, true);
  for (const button of doc.querySelectorAll('[data-guide]')) {
    button.click();
    expect(button.getAttribute('aria-label').length).toBeGreaterThan(2);
    expect(doc.querySelector('#guideFeedback').textContent.length).toBeGreaterThan(30);
  }
  await vi.waitFor(() => expect(doc.querySelector('#keys').textContent).toContain('Alt+P'));
  expect(doc.documentElement.lang).toBe(lang);
  expect(doc.querySelector('#heroTitle').textContent).toContain('FloatPlayer');
  doc.querySelector('#openOptions').click(); expect(options).toHaveBeenCalledOnce();
  dom.window.close();
});
