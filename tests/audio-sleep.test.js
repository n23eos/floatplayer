import { test, expect, vi, afterEach } from "vitest";
import vm from "node:vm";
import { readFileSync } from "node:fs";
function setup() {
  let video = new EventTarget(); Object.assign(video, { volume: .4, muted: false, duration: 120, currentTime: 0, playbackRate: 1, pause: vi.fn() });
  const sources = [], ramps = [];
  const settings = { volumeBoostMax: 300, sleepFade: true };
  const YTFP = { settings: { get: () => settings, onChange() {} }, utils: { clamp: (n,a,b) => Math.min(b, Math.max(a,n)) },
    playerApi: { getVideo: () => video, isAdShowing: () => false, isLive: () => false, getVideoId: () => "AAAAAAAAAAA" } };
  class AudioContext {
    state = "running"; currentTime = 0; destination = {};
    createGain() { return { connect() {}, gain: { cancelScheduledValues() {}, setTargetAtTime: (...args) => ramps.push(args) } }; }
    createMediaElementSource(v) { if (sources.includes(v)) throw new Error("duplicate"); sources.push(v); return { connect() {} }; }
  }
  const context = vm.createContext({ YTFP, console, AudioContext, Date, setInterval, clearInterval });
  for (const file of ["audio-boost.js", "sleep-timer.js"]) vm.runInContext(readFileSync(new URL(`../extension/content/${file}`, import.meta.url), "utf8"), context);
  return { YTFP, settings, sources, ramps, video, replace() { const next = new EventTarget(); Object.assign(next, video); video = next; return next; } };
}
afterEach(() => vi.useRealTimers());
test("normal volume uses no graph; boost creates one source per video and smooth gain", () => {
  const env = setup(), audio = env.YTFP.audioBoost;
  expect(audio.getBoostPercent()).toBe(40);
  audio.setBoostPercent(env.video, 80); expect(env.video.volume).toBe(.8); expect(env.sources).toHaveLength(0);
  audio.setBoostPercent(env.video, 200); expect(audio.getBoostPercent()).toBe(200); expect(env.video.volume).toBe(1);
  audio.setBoostPercent(env.video, 150); expect(env.sources).toHaveLength(1); expect(env.ramps.at(-1)[2]).toBe(.03);
  env.replace(); audio.syncVideo(); expect(env.sources).toHaveLength(2); expect(audio.getBoostPercent()).toBe(150);
  env.settings.volumeBoostMax = 100; audio.syncVideo(); expect(audio.getBoostPercent()).toBe(100);
});
test("sleep deadline is independent of UI, fades, pauses and restores sound", () => {
  vi.useFakeTimers(); const { YTFP, video } = setup();
  YTFP.sleepTimer.start(1); vi.advanceTimersByTime(55000);
  expect(video.volume).toBeLessThan(.4);
  vi.advanceTimersByTime(5000); expect(video.pause).toHaveBeenCalled(); expect(video.volume).toBe(.4);
  expect(YTFP.sleepTimer.get().mode).toBe("off"); expect(YTFP.sleepTimer.blocksAdvance()).toBe(true);
  YTFP.sleepTimer.resume(); expect(YTFP.sleepTimer.blocksAdvance()).toBe(false);
});
test("extend adds ten minutes and end-of-video blocks autoplay before ended", () => {
  vi.useFakeTimers(); const { YTFP, video } = setup();
  YTFP.sleepTimer.start(1); YTFP.sleepTimer.extend(); expect(YTFP.sleepTimer.get().remaining).toBe(660);
  video.loop = true;
  YTFP.sleepTimer.start("end"); expect(video.loop).toBe(false); expect(YTFP.sleepTimer.blocksAdvance()).toBe(true);
  video.dispatchEvent(new Event("ended")); expect(video.pause).toHaveBeenCalled(); expect(YTFP.sleepTimer.get().mode).toBe("off"); expect(video.loop).toBe(true);
});

test("sleep fading preserves the underlying volume of a muted video", () => {
  const { YTFP, video } = setup(); video.muted = true;
  YTFP.audioBoost.setFade(.5); YTFP.audioBoost.setFade(1);
  expect(video.muted).toBe(true); expect(video.volume).toBe(.4);
});
