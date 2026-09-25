// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import {
  buildWatchPage,
  createPipWindowStub,
  installChromeStub,
  loadContentScripts
} from "./helpers/extension-env.js";

installChromeStub();
globalThis.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => "", json: async () => [] }));
const YTFP = loadContentScripts();

let page;

function setVideoState({ currentTime, duration, paused = false, seeking = false }) {
  page.video.currentTime = currentTime;
  Object.defineProperties(page.video, {
    duration: { configurable: true, value: duration },
    paused: { configurable: true, value: paused },
    seeking: { configurable: true, value: seeking }
  });
}

function setSeekable(start, end) {
  Object.defineProperty(page.video, "seekable", {
    configurable: true,
    value: {
      length: 1,
      start: (index) => index === 0 ? start : NaN,
      end: (index) => index === 0 ? end : NaN
    }
  });
}

function makeLive({ atHead = false } = {}) {
  const live = document.createElement("div");
  live.className = "ytp-live";
  const badge = document.createElement("button");
  badge.className = "ytp-live-badge";
  if (atHead) {
    badge.classList.add("ytp-live-badge-is-livehead");
    badge.disabled = true;
  }
  live.appendChild(badge);
  page.player.appendChild(live);
  return badge;
}

function setNativeRange(start, end, now) {
  const progress = page.player.querySelector(".ytp-progress-bar");
  progress.setAttribute("aria-valuemin", String(start));
  progress.setAttribute("aria-valuemax", String(end));
  progress.setAttribute("aria-valuenow", String(now));
  return progress;
}

function buildLiveBar() {
  const bar = YTFP.pipControls.buildBar(document, {
    getVideo: () => page.video,
    isShorts: false
  });
  document.body.appendChild(bar.element);
  return bar;
}

beforeEach(async () => {
  page = buildWatchPage();
  window.history.replaceState({}, "", "/watch?v=AAAAAAAAAAA");
  await YTFP.settings.load();
});

test("uses native livehead instead of the inflated media seekable edge", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233 });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5398);

  expect(YTFP.playerApi.getSeekRange(page.video)).toEqual({ start: 0, end: 5410.42 });
  expect(YTFP.playerApi.getLiveEdge(page.video)).toBe(5410.42);
  expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(true);
});

test("detects live state from the video passed during initial PiP construction", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233 });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5398);
  const pipWindow = createPipWindowStub();
  pipWindow.document.body.appendChild(page.player);

  const bar = YTFP.pipControls.buildBar(pipWindow.document, {
    getVideo: () => page.video,
    isShorts: false
  });
  pipWindow.document.body.appendChild(bar.element);
  try {
    const liveButton = bar.element.querySelector(".ytfp-btn--live");
    expect(liveButton.hidden).toBe(false);
    expect(liveButton.textContent).toContain("LIVE");
  } finally {
    bar.cleanup();
  }
});

test("reports DVR lag from a validated native range while paused", () => {
  setVideoState({ currentTime: 5000, duration: 7810.233, paused: true });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5000);

  const bar = buildLiveBar();
  try {
    expect(YTFP.playerApi.getSeekRange(page.video)).toEqual({ start: 0, end: 5398 });
    expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(false);
    expect(bar.element.querySelector(".ytfp-btn--live").textContent).toContain("−6:38");
  } finally {
    bar.cleanup();
  }
});

test("does not rewind from a paused position ahead of stale native max", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233, paused: true });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5398);

  const bar = buildLiveBar();
  try {
    expect(YTFP.playerApi.getSeekRange(page.video)).toBeNull();
    YTFP.playerApi.seekBy(30);
    expect(page.video.currentTime).toBe(5410.42);
    const label = bar.element.querySelector(".ytfp-btn--live").textContent;
    expect(label).toContain("LIVE ?");
    expect(label).not.toContain("−0:00");
  } finally {
    bar.cleanup();
  }
});

test("does not claim livehead while playback is paused or seeking", () => {
  setVideoState({ currentTime: 5398, duration: 7810.233, paused: true });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5398);

  expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(false);
  Object.defineProperties(page.video, {
    paused: { configurable: true, value: false },
    seeking: { configurable: true, value: true }
  });
  expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(false);
});

test("rejects a stale native range instead of using inflated live media bounds", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233 });
  setSeekable(0, 7810.233);
  makeLive();
  setNativeRange(0, 5398, 5300);

  expect(YTFP.playerApi.getSeekRange(page.video)).toBeNull();
  expect(YTFP.playerApi.getLiveEdge(page.video)).toBeNull();
  expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(false);
});

test("keeps live time unknown when the native range is absent", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233 });
  setSeekable(0, 7810.233);
  makeLive();

  const bar = buildLiveBar();
  try {
    expect(YTFP.playerApi.getSeekRange(page.video)).toBeNull();
    expect(bar.element.querySelector(".ytfp-btn--live").textContent)
      .toContain("LIVE ?");
  } finally {
    bar.cleanup();
  }
});

test("hides live controls during an ad and preserves ordinary video bounds", () => {
  setVideoState({ currentTime: 5, duration: 30 });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  setNativeRange(0, 5398, 5398);
  page.player.classList.add("ad-showing");

  const bar = buildLiveBar();
  try {
    expect(YTFP.playerApi.getSeekRange(page.video)).toEqual({ start: 0, end: 30 });
    expect(bar.element.querySelector(".ytfp-btn--live").hidden).toBe(true);
  } finally {
    bar.cleanup();
  }
});

test("keeps duration bounds for an ordinary video", () => {
  setVideoState({ currentTime: 40, duration: 120 });
  setSeekable(0, 7810.233);

  expect(YTFP.playerApi.getSeekRange(page.video)).toEqual({ start: 0, end: 120 });
  expect(YTFP.playerApi.isAtLiveEdge(page.video)).toBe(false);
});

test("returns to live through the native badge without seeking to raw media end", async () => {
  let assignedTime = 5000;
  let played = false;
  Object.defineProperties(page.video, {
    currentTime: {
      configurable: true,
      get: () => assignedTime,
      set: (value) => { assignedTime = value; }
    },
    duration: { configurable: true, value: 7810.233 },
    paused: { configurable: true, value: true },
    seeking: { configurable: true, value: false }
  });
  page.video.play = async () => { played = true; };
  setSeekable(0, 7810.233);
  const badge = makeLive();
  setNativeRange(0, 5398, 5000);
  let nativeSeeked = false;
  badge.addEventListener("click", () => { nativeSeeked = true; });

  expect(YTFP.playerApi.seekToLive(page.video)).toBe(true);
  await Promise.resolve();
  expect(nativeSeeked).toBe(true);
  expect(played).toBe(true);
  expect(assignedTime).toBe(5000);
});

test("clears an old progress fill when live range becomes unknown", () => {
  setVideoState({ currentTime: 50, duration: 100 });
  const progress = YTFP.pipProgress.build(document, { getVideo: () => page.video });
  document.body.appendChild(progress.element);
  const fill = progress.element.querySelector(".ytfp-progress-fill");
  try {
    expect(fill.style.width).toBe("50%");
    makeLive();
    setSeekable(0, 7810.233);
    page.video.dispatchEvent(new Event("timeupdate"));
    expect(fill.style.width).toBe("");
  } finally {
    progress.cleanup();
  }
});

test("shows full progress for a playing native livehead without numeric bounds", () => {
  setVideoState({ currentTime: 5410.42, duration: 7810.233 });
  setSeekable(0, 7810.233);
  makeLive({ atHead: true });
  page.player.querySelector(".ytp-progress-bar").setAttribute("aria-disabled", "true");

  const progress = YTFP.pipProgress.build(document, { getVideo: () => page.video });
  document.body.appendChild(progress.element);
  try {
    expect(progress.element.querySelector(".ytfp-progress-fill").style.width).toBe("100%");
  } finally {
    progress.cleanup();
  }
});
