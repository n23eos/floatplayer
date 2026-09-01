# FloatPlayer — Picture in Picture for YouTube

_[Русская версия](README.ru.md)_

A Chrome extension (Manifest V3) that pops YouTube videos into an
**always-on-top window** (Document Picture-in-Picture) with its own
mini-player. The window shows the video and playback controls only —
the rest of YouTube's interface is hidden. Keep watching videos and
Shorts while you work in other apps.

- Chrome Web Store materials — [store/LISTING.md](store/LISTING.md)
- Privacy policy — [PRIVACY.md](PRIVACY.md)
- Author — [@Raincoat_talk](https://x.com/Raincoat_talk)

## Why it beats native PiP and other extensions

| | Chrome native PiP | Popup extensions | **FloatPlayer** |
|---|---|---|---|
| Always on top | ✅ | ❌ (ordinary window) | ✅ (Document PiP) |
| Seeking, speed, volume | ❌ | ✅ | ✅ |
| Same video stream (no restart) | ✅ | ❌ (second player) | ✅ (moves the real player) |
| Shorts with auto-advance | ❌ | ❌ | ✅ |
| Shorts by keyword, played in the window | ❌ | ❌ | ✅ |
| Clean window without YouTube UI | ❌ | ❌ | ✅ (whitelist: video only) |

Playback never restarts: the actual YouTube player moves into the window, so
your account, history, quality and captions are preserved. YouTube ads are
neither blocked nor skipped (Web Store safe).

## Features

### Regular videos

- **Player button** (to the left of YouTube's own button group) or `Alt+P`
  pops the video into the mini-window.
- **One bottom panel** (a translucent capsule, appears on hover), symmetric
  around its centre and never breaking apart when the window is narrowed:
  - the playback row in the middle:
    `[−30] [◀ previous] [⏯ play/pause] [▶ next] [+30]`;
  - **volume 0–300%** — quieter than YouTube's zero and louder than its
    maximum (Web Audio) — and the **speed** slider, 0.25x–3x with a
    configurable step, click "1x" to reset;
  - **A-B loop**: click 1 sets point A, click 2 sets point B, click 3 resets;
    plus loop for the whole video and autoplay of the next one;
  - **night mode** in two strengths and the **sleep timer** — 15–90 min
    presets or a custom value (1–720 min); the video pauses when it runs out;
  - the side-column toggle (comments, live chat, recommendations);
  - a **LIVE** badge on streams: how far behind the live edge you are, click
    to jump back to it.
- **The same panel on the YouTube page** (optional): volume, speed and the
  30-second jumps over the normal player, on hover.
- **Red progress strip** at the bottom: click or drag to seek, thickens on
  hover, chapter ticks on it and the chapter name in a tooltip above the panel.
  During ads a separate **white ad-progress strip** appears above it
  (the red one freezes at the video position).
- **Click zones on the video**: left third seeks back 10 s, right third
  forward 10 s, center toggles pause. A "« 10s" / "» 10s" pill flashes at
  the corresponding edge.
- **Paused state**: a translucent ▶ badge appears in the center — click it
  to resume.
- **Side column**: an arrow at the right edge opens comments (endless
  scrolling, pinned and creator comments marked), a stream's live chat, or a
  column of up to 20 recommendations (thumbnail + title) — switch videos right
  inside the window.
- **SponsorBlock**: in-video sponsor segments are highlighted in green on the
  progress strip and skipped automatically out of the box; turn auto-skip off
  and a "Skip sponsor segment" button appears inside a segment instead.
  Community data from sponsor.ajay.app (only the video ID is sent); the whole
  feature can be turned off in the options.

### Shorts

- **A button above Like** in the action rail pops the short into a vertical
  mini-window (sized for 9:16).
- **Its own capsule above the panel**: `[like] [auto-advance] [search]`.
  There is no dislike button in YouTube's Shorts markup, so there is none here.
- **Auto-advance**: when a short ends the next one starts automatically
  (the switch in the capsule and the checkbox in the options are the same
  setting).
- **Search by keyword** (the magnifier): a field opens over the capsule, type a
  word and press Enter — the window plays shorts found for it. Forward/back and
  auto-advance then walk that list instead of the algorithmic feed; the
  magnifier stays highlighted while the mode is on, `Esc` or a second click
  turns it off. The search itself is a same-origin request to YouTube's own
  `/results` page (no new permissions, no third-party host), and it takes the
  first page of results (~30 shorts), stopping on the last one.
- The ◀/▶ buttons — and the `↑`/`↓` keys — scroll the Shorts feed straight from
  the window.
- A narrow version of the panel fits the vertical window: no A-B and no ±30
  buttons (a short is shorter than the jump).

### The window

- **Drag from anywhere**: press and hold on the video, move — the window
  follows; release and it stays. Controls remain clickable.
- **Video proportions**: the window opens at the video's exact aspect ratio,
  snaps back to it after manual resizing and rebuilds itself when the video
  changes. Inside the window the player is always letterboxed — no
  "technical parts" are ever visible around the video.
- **Size memory** — stored separately for landscape videos and vertical
  Shorts. (Window position cannot be set — the Document PiP API only accepts
  a size; Chrome partially remembers where the window was on its own.)
- **The sleep timer hides the UI**: while it counts down, every panel is
  hidden even under the cursor; moving the mouse reveals them for 3 seconds.
- **Video only**: YouTube's interface inside the window is hidden by a
  whitelist rule (only the video, captions and the loading spinner survive),
  so shopping overlays, cards, endscreens and any future YouTube overlays
  can never leak in.
- **Two window modes** (in the options): "Full (with panel)" — the Document PiP
  window described above, with the panel, the progress strip and the side
  column, under Chrome's thin address strip; "Clean video (no strip)" — native
  PiP with no address strip at all, but no panels of ours either, just the
  video and the system buttons.
- **Auto-PiP** (optional, Chrome 120+): leave the tab and the video pops out
  by itself.

### Keyboard shortcuts

| Where | Keys | Action |
|---|---|---|
| Any Chrome window | `Alt+P` (⌥P on Mac) | toggle the mini-window |
| Any Chrome window | `Alt+K` / `Alt+J` / `Alt+L` | pause / −5 s / +5 s |
| Inside the window | `Space` or `K` | pause |
| Inside the window | `←` / `→` | ±5 s |
| Inside the window | `↑` / `↓` | volume ±10% (previous / next short on Shorts) |
| Inside the window | `M` | mute |

Rebind them at `chrome://extensions/shortcuts`.

### Options page

- Mini-window style: "Full (with panel)" or "Clean video (no strip)".
- Auto-PiP when leaving the tab.
- SponsorBlock on/off, auto-skip on/off, and the segment categories.
- Shorts auto-advance.
- Compact panel mode (hide until hover).
- Control panel size: 100–200% slider (135% by default; touch screens get a bit more).
- Panel on the YouTube page itself.
- Speed slider step (0.1x / 0.25x / 0.5x).
- Volume ceiling (100 / 200 / 300%).
- Interface language: English by default, Russian for Russian browsers.

### Miscellaneous

- A feedback form (Google Form) opens when the extension is uninstalled.
- Minimal permissions: `storage` plus the youtube.com and
  sponsor.ajay.app hosts. No bundler, no remote code, no analytics.

## Installation (development)

1. `chrome://extensions` → enable Developer mode.
2. "Load unpacked" → pick the **`extension/`** folder (that one, not the
   repository root).
3. Open a video on YouTube. After updating the extension, press F5 on open
   YouTube tabs.

Build for the Web Store: `npm run build` → `dist/floatplayer-<version>.zip`.

## Honest limitations

- Chrome 116+ (older versions fall back to native PiP).
- The Chrome strip showing the site address cannot be removed — it is an
  anti-phishing requirement for every Document PiP window (it auto-hides when
  the cursor is away). For no strip at all, use "clean video" mode.
- Window transparency and click-through are impossible in the Chrome API.
- One PiP window per browser.
- Window position cannot be set programmatically (size only).
- Seeking is unavailable during YouTube ads — there is nothing to seek, the
  main video is not loaded at that moment.

## Support

FloatPlayer is free, ad-free and collects nothing. If it saves you time:

[![ETH](https://img.shields.io/badge/ETH-0x7777...88C4-blue?logo=ethereum&style=flat-square)](https://etherscan.io/address/0x77777da54702AC8789D53fc7cC6201C29a1A88C4)

`0x77777da54702AC8789D53fc7cC6201C29a1A88C4`

## Development

```
extension/
├── manifest.json           MV3, default_locale: en
├── content/                content scripts (load order matters)
│   ├── constants.js        YouTube selectors + defaults (single edit point)
│   ├── utils.js            pure logic (covered by tests)
│   ├── settings.js         chrome.storage.sync + cache
│   ├── player-api.js       player DOM wrapper (watch + shorts)
│   ├── audio-boost.js      Web Audio gain (0–300% volume)
│   ├── night-mode.js       night mode over the video
│   ├── pip-tooltip.js      in-window tooltips instead of native title
│   ├── pip-controls.js     the bottom panel (sleep timer, Shorts capsule)
│   ├── pip-progress.js     red/white progress strips, chapters
│   ├── pip-related.js      recommendations column
│   ├── pip-nav.js          playback buttons, click zones, pause badge
│   ├── pip-comments.js     comments in the side column
│   ├── pip-chat.js         live chat in the side column
│   ├── pip-reactions.js    like/dislike buttons in the window
│   ├── shorts-search.js    Shorts by keyword: search, list, stepping
│   ├── pip-controller.js   moves the player into Document PiP and back
│   ├── sponsor-block.js    SponsorBlock segments + auto-skip
│   ├── page-panel.js       the same panel over the player on the page
│   ├── page-controls.js    page-side controls and hotkeys
│   ├── inject-button.js    page buttons, SPA navigation, hotkeys
│   └── yt-navigate-bridge.js  MAIN world: calls YouTube's own router so a
│                           Shorts jump does not reload the page
├── pip/pip.css             PiP window styles (video-only whitelist)
├── background/             service worker (hotkeys, install/update pages)
├── options/                options page (i18n via data-i18n)
├── popup/                  toolbar popup: tab state and quick switches
├── welcome/                first-run and post-update page
└── _locales/               14 languages, en is the default
```

Tests: `npm install && npm test` — vitest over the pure functions
(A-B logic, speed stepping, time formatting, SponsorBlock segments).

## Manual E2E checklist before a release

- [ ] Regular video: pop out, every control, return via the X and the button.
- [ ] Click zones: left/center/right; ▶ badge while paused; no double toggle.
- [ ] Switching videos from the recommendations column (window survives,
      aspect rebuilt).
- [ ] Playlist: ◀/▶ from the window.
- [ ] Ads: white strip above the red one, everything restored afterwards.
- [ ] SponsorBlock: green segments, automatic skip (on a video with a segment).
- [ ] Shorts: button above Like, vertical window, ◀/▶ and ↑/↓, auto-advance.
- [ ] Shorts capsule: like, the auto-advance switch (it reaches the options
      page), the magnifier.
- [ ] Shorts by keyword: search, ◀/▶ and auto-advance over the found list,
      `Esc` and a second click on the magnifier turn the mode off.
- [ ] Comments in the side column on a regular video; live chat on a stream.
- [ ] The chapter tooltip is drawn above the panel, not under it.
- [ ] Sleep timer: preset and "custom…", UI hides, pauses when it runs out.
- [ ] Resizing: letterboxed with no leftovers, snaps back to the aspect ratio.
- [ ] Hotkeys from another Chrome window and inside the window.
- [ ] Options apply without a page reload; en/ru locales.
- [ ] Uninstalling the extension opens the feedback form.
