// @vitest-environment jsdom
import { beforeEach, expect, test } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.chrome = { i18n: { getUILanguage: () => 'ru-RU', getMessage: () => '' } };
require('../extension/content/video-metadata.js');
const metadata = globalThis.YTFP.videoMetadata;
beforeEach(() => { document.head.innerHTML = '<meta itemprop="videoId" content="test"><meta itemprop="datePublished" content="2026-09-08T23:00:00-07:00"><meta itemprop="interactionCount" content="1234567">'; });
test('calendar date keeps publication day regardless of timezone', () => {
 expect(metadata.read(document, 'test')).toBe('08.09.2026 · 1 234 567 views');
});
test('never shows metadata from the previous video', () => { expect(metadata.read(document, 'next')).toBe(''); });
test('rejects invalid calendar date and nonnumeric views', () => {
 document.querySelector('[itemprop=datePublished]').content = '2026-02-31';
 document.querySelector('[itemprop=interactionCount]').content = 'unknown';
 expect(metadata.read(document, 'test')).toBe('');
});
test.each([['9,4 тыс.', '', '9,4 тыс.'], ['', 'это видео понравилось 9 449 пользователям', '9 449'], ['', 'like this video along with 9,449 other people', '9,449'], ['0', '', '0'], ['', 'Dislike', '—']])('reaction count %s %s', (text,label,expected) => {
 const button = document.createElement('button'); button.textContent=text; button.setAttribute('aria-label',label);
 expect(metadata.reactionCount(button)).toBe(expected);
});
test('reads YouTube identifier and WatchAction count without confusing likes', () => {
 document.head.innerHTML = '<meta itemprop="identifier" content="actual"><meta itemprop="datePublished" content="2026-09-05"><div itemprop="interactionStatistic"><meta itemprop="interactionType" content="https://schema.org/LikeAction"><meta itemprop="userInteractionCount" content="2643"></div><div itemprop="interactionStatistic"><meta itemprop="interactionType" content="https://schema.org/WatchAction"><meta itemprop="userInteractionCount" content="239148"></div>';
 expect(metadata.read(document,'actual')).toBe('05.09.2026 · 239 148 views');
 expect(metadata.read(document,'other')).toBe('');
});
test('public player JSON handles braces in titles and rejects stale video IDs', () => {
 const data={videoDetails:{videoId:'AAAAAAAAAAA',channelId:'UCabcdefghijklmnopqrstuv',title:'a } "quoted" title',author:'Channel',viewCount:'500'},microformat:{playerMicroformatRenderer:{publishDate:'2026-09-09'}}};
 const script='var ytInitialPlayerResponse = '+JSON.stringify(data)+';';
 expect(metadata.extractPlayerData(script,'AAAAAAAAAAA')).toMatchObject({title:data.videoDetails.title,views:'500',date:'2026-09-09'});
 expect(metadata.extractPlayerData(script,'BBBBBBBBBBB')).toBeNull();
 expect(metadata.extractPlayerData('var ytInitialPlayerResponse = {bad};','AAAAAAAAAAA')).toBeNull();
});

test('animated like reels use the accessible count instead of every hidden digit', () => {
 const button = document.createElement('button');
 button.setAttribute('aria-label', 'это видео понравилось 9 449 пользователям');
 button.innerHTML = '<animated-rolling-number>12345678901234567890123456789 12345678901234567890123456789 тыс.</animated-rolling-number>';
 expect(metadata.reactionCount(button)).toBe('9 449');
 button.removeAttribute('aria-label');
 expect(metadata.reactionCount(button)).toBe('—');
 button.firstChild.setAttribute('aria-label', '9,4 тыс.');
 expect(metadata.reactionCount(button)).toBe('9,4 тыс.');
});
test('rejects flattened reels even when their custom element name changes', () => {
 const button = document.createElement('button');
 button.textContent = '12345678901234567890123456789 12345678901234567890123456789 тыс.';
 expect(metadata.reactionCount(button)).toBe('—');
});
