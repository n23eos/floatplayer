import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// utils.js — обычный браузерный скрипт с CJS-экспортом для тестов.
// panelGapAboveControls считает отступ по масштабу из настроек, поэтому
// общий модуль настроек нужен и здесь — как и в манифесте, он идёт первым.
const require = createRequire(import.meta.url);
require("../extension/shared/settings-schema.js");
const utils = require("../extension/content/utils.js");

describe("clamp", () => {
  test("returns value when inside range", () => {
    expect(utils.clamp(5, 0, 10)).toBe(5);
  });

  test("clamps to min when below range", () => {
    expect(utils.clamp(-3, 0, 10)).toBe(0);
  });

  test("clamps to max when above range", () => {
    expect(utils.clamp(42, 0, 10)).toBe(10);
  });
});

describe("formatTime", () => {
  test("formats seconds under a minute", () => {
    expect(utils.formatTime(7)).toBe("0:07");
  });

  test("formats minutes and seconds", () => {
    expect(utils.formatTime(125)).toBe("2:05");
  });

  test("formats hours with padded minutes", () => {
    expect(utils.formatTime(3671)).toBe("1:01:11");
  });

  test("returns 0:00 for negative input", () => {
    expect(utils.formatTime(-5)).toBe("0:00");
  });

  test("returns 0:00 for NaN and Infinity", () => {
    expect(utils.formatTime(NaN)).toBe("0:00");
    expect(utils.formatTime(Infinity)).toBe("0:00");
  });

  test("truncates fractional seconds", () => {
    expect(utils.formatTime(59.9)).toBe("0:59");
  });
});

describe("abLoopTarget", () => {
  test("returns null when points are not set", () => {
    expect(utils.abLoopTarget(10, null, null)).toBeNull();
    expect(utils.abLoopTarget(10, 5, null)).toBeNull();
  });

  test("returns A when current time passes B", () => {
    expect(utils.abLoopTarget(20, 5, 15)).toBe(5);
  });

  test("returns A when current time is before A", () => {
    expect(utils.abLoopTarget(2, 5, 15)).toBe(5);
  });

  test("returns null while inside the loop", () => {
    expect(utils.abLoopTarget(10, 5, 15)).toBeNull();
  });

  test("returns null when B is not after A", () => {
    expect(utils.abLoopTarget(10, 15, 5)).toBeNull();
    expect(utils.abLoopTarget(10, 5, 5)).toBeNull();
  });
});

describe("normalizeSegments", () => {
  test("returns empty array for empty or invalid input", () => {
    expect(utils.normalizeSegments([])).toEqual([]);
    expect(utils.normalizeSegments(null)).toEqual([]);
    expect(utils.normalizeSegments([[NaN, 5], [3], "junk", [10, 5], [-2, 3]])).toEqual([]);
  });

  test("maps valid pairs to sorted objects", () => {
    expect(utils.normalizeSegments([[60, 90], [10, 20]])).toEqual([
      { start: 10, end: 20 },
      { start: 60, end: 90 }
    ]);
  });

  test("merges overlapping and adjacent segments", () => {
    expect(utils.normalizeSegments([[10, 20], [15, 30], [30.2, 40]])).toEqual([
      { start: 10, end: 40 }
    ]);
  });

  test("keeps separated segments apart", () => {
    expect(utils.normalizeSegments([[10, 20], [25, 30]])).toEqual([
      { start: 10, end: 20 },
      { start: 25, end: 30 }
    ]);
  });

  test("does not shrink a containing segment", () => {
    expect(utils.normalizeSegments([[10, 50], [20, 30]])).toEqual([
      { start: 10, end: 50 }
    ]);
  });
});

describe("segmentEndAt", () => {
  const segments = [
    { start: 10, end: 20 },
    { start: 60, end: 90 }
  ];

  test("returns segment end when time is inside", () => {
    expect(utils.segmentEndAt(15, segments)).toBe(20);
    expect(utils.segmentEndAt(60, segments)).toBe(90);
  });

  test("returns null outside segments", () => {
    expect(utils.segmentEndAt(5, segments)).toBeNull();
    expect(utils.segmentEndAt(30, segments)).toBeNull();
    expect(utils.segmentEndAt(95, segments)).toBeNull();
  });

  test("returns null right at the segment end (no loop at boundary)", () => {
    expect(utils.segmentEndAt(20, segments)).toBeNull();
    expect(utils.segmentEndAt(19.95, segments)).toBeNull();
  });

  test("returns null for empty segment list", () => {
    expect(utils.segmentEndAt(15, [])).toBeNull();
  });
});

describe("nextSpeed", () => {
  test("increases speed by step", () => {
    expect(utils.nextSpeed(1, 0.25, 1, 0.25, 3)).toBe(1.25);
  });

  test("decreases speed by step", () => {
    expect(utils.nextSpeed(1, 0.25, -1, 0.25, 3)).toBe(0.75);
  });

  test("clamps at max speed", () => {
    expect(utils.nextSpeed(3, 0.25, 1, 0.25, 3)).toBe(3);
  });

  test("clamps at min speed", () => {
    expect(utils.nextSpeed(0.25, 0.25, -1, 0.25, 3)).toBe(0.25);
  });

  test("avoids floating point drift with 0.1 step", () => {
    expect(utils.nextSpeed(1.1, 0.1, 1, 0.25, 3)).toBe(1.2);
  });

  test("snaps off-grid speed to the step grid", () => {
    expect(utils.nextSpeed(1.13, 0.25, 1, 0.25, 3)).toBe(1.5);
  });
});

describe("speedSliderRange", () => {
  test("keeps the range when the step already lands on 1x", () => {
    expect(utils.speedSliderRange(0.25, 3, 0.25)).toEqual({ min: 0.25, max: 3 });
  });

  test("raises min so that a 0.1 step can reach exactly 1x", () => {
    // 0.25 + 0.1n даёт 1.05, но не 1: сетку сдвигаем к 0.3.
    expect(utils.speedSliderRange(0.25, 3, 0.1)).toEqual({ min: 0.3, max: 3 });
  });

  test("raises min so that a 0.5 step can reach exactly 1x", () => {
    expect(utils.speedSliderRange(0.25, 3, 0.5)).toEqual({ min: 0.5, max: 3 });
  });

  test("lowers max to the last value on the grid", () => {
    expect(utils.speedSliderRange(0.25, 3, 0.7)).toEqual({ min: 0.7, max: 2.8 });
  });

  test("falls back to the original range when the step is nonsense", () => {
    expect(utils.speedSliderRange(0.25, 3, 0)).toEqual({ min: 0.25, max: 3 });
  });
});

describe("digitSeekTime", () => {
  test("maps digits to tenths of the duration", () => {
    expect(utils.digitSeekTime(100, 0)).toBe(0);
    expect(utils.digitSeekTime(100, 5)).toBe(50);
    expect(utils.digitSeekTime(100, 9)).toBe(90);
  });

  test("returns null for invalid duration", () => {
    expect(utils.digitSeekTime(0, 5)).toBeNull();
    expect(utils.digitSeekTime(NaN, 5)).toBeNull();
    expect(utils.digitSeekTime(Infinity, 5)).toBeNull();
  });

  test("returns null for digit outside 0-9", () => {
    expect(utils.digitSeekTime(100, -1)).toBeNull();
    expect(utils.digitSeekTime(100, 10)).toBeNull();
    expect(utils.digitSeekTime(100, 2.5)).toBeNull();
  });
});

describe("chapterFractionsFromWidths", () => {
  test("converts section widths to chapter start fractions", () => {
    expect(utils.chapterFractionsFromWidths([300, 100, 100])).toEqual([0, 0.6, 0.8]);
  });

  test("returns empty array for a single section (no chapters)", () => {
    expect(utils.chapterFractionsFromWidths([500])).toEqual([]);
  });

  test("returns empty array for empty or missing input", () => {
    expect(utils.chapterFractionsFromWidths([])).toEqual([]);
    expect(utils.chapterFractionsFromWidths(null)).toEqual([]);
  });

  test("ignores NaN and non-positive widths", () => {
    expect(utils.chapterFractionsFromWidths([NaN, 300, 0, 100])).toEqual([0, 0.75]);
  });
});

describe("parseTimeLabel", () => {
  test("parses mm:ss", () => {
    expect(utils.parseTimeLabel("0:00")).toBe(0);
    expect(utils.parseTimeLabel("1:05")).toBe(65);
    expect(utils.parseTimeLabel("12:34")).toBe(754);
  });

  test("parses h:mm:ss", () => {
    expect(utils.parseTimeLabel("1:02:03")).toBe(3723);
    expect(utils.parseTimeLabel("4:20:11")).toBe(15611);
  });

  test("trims surrounding whitespace", () => {
    expect(utils.parseTimeLabel("  2:30\n")).toBe(150);
  });

  test("returns null for malformed labels", () => {
    expect(utils.parseTimeLabel("")).toBeNull();
    expect(utils.parseTimeLabel("90")).toBeNull();
    expect(utils.parseTimeLabel("1:2:3:4")).toBeNull();
    expect(utils.parseTimeLabel("a:bc")).toBeNull();
    expect(utils.parseTimeLabel("-1:30")).toBeNull();
    expect(utils.parseTimeLabel(null)).toBeNull();
    expect(utils.parseTimeLabel(undefined)).toBeNull();
  });
});

describe("videoTitleFromPageTitle", () => {
  test("strips the YouTube suffix", () => {
    expect(utils.videoTitleFromPageTitle("Кино - YouTube")).toBe("Кино");
  });

  test("strips the notification counter", () => {
    expect(utils.videoTitleFromPageTitle("(3) Кино - YouTube")).toBe("Кино");
    expect(utils.videoTitleFromPageTitle("(12) Кино - YouTube")).toBe("Кино");
  });

  test("keeps a dash that belongs to the video title", () => {
    expect(utils.videoTitleFromPageTitle("Rush - YYZ (live) - YouTube")).toBe(
      "Rush - YYZ (live)"
    );
  });

  test("returns the title as is when the suffix is missing", () => {
    expect(utils.videoTitleFromPageTitle("YouTube")).toBe("YouTube");
    expect(utils.videoTitleFromPageTitle("(1) YouTube")).toBe("YouTube");
  });

  test("returns empty string for non-string input", () => {
    expect(utils.videoTitleFromPageTitle(null)).toBe("");
    expect(utils.videoTitleFromPageTitle(undefined)).toBe("");
  });
});

describe("behindLiveSeconds", () => {
  test("returns the gap between the live edge and the current position", () => {
    expect(utils.behindLiveSeconds(100, 70)).toBe(30);
  });

  test("returns 0 at the live edge", () => {
    expect(utils.behindLiveSeconds(100, 100)).toBe(0);
  });

  test("clamps to 0 when the position is past the edge", () => {
    // Край эфира растёт между кадрами: currentTime может обогнать замер.
    expect(utils.behindLiveSeconds(100, 100.4)).toBe(0);
  });

  test("returns null for non-finite input", () => {
    expect(utils.behindLiveSeconds(Infinity, 10)).toBeNull();
    expect(utils.behindLiveSeconds(100, NaN)).toBeNull();
    expect(utils.behindLiveSeconds(null, 10)).toBeNull();
    expect(utils.behindLiveSeconds(100, undefined)).toBeNull();
  });
});

describe("liveResumeTarget", () => {
  test("keeps a safety gap behind the live edge", () => {
    // Ровно в край прыгать нельзя: последних секунд ещё нет на сервере,
    // и плеер после такой перемотки встаёт насовсем.
    expect(utils.liveResumeTarget(0, 100)).toBe(95);
  });

  test("never goes before the start of the DVR window", () => {
    expect(utils.liveResumeTarget(98, 100)).toBe(98);
  });

  test("returns null for a degenerate or non-finite window", () => {
    expect(utils.liveResumeTarget(100, 100)).toBeNull();
    expect(utils.liveResumeTarget(200, 100)).toBeNull();
    expect(utils.liveResumeTarget(0, Infinity)).toBeNull();
    expect(utils.liveResumeTarget(null, 100)).toBeNull();
  });
});

describe("windowFraction", () => {
  test("returns the position inside the window", () => {
    expect(utils.windowFraction(50, 0, 100)).toBe(0.5);
  });

  test("counts from the window start, not from zero", () => {
    // DVR-окно стрима начинается не в нуле.
    expect(utils.windowFraction(150, 100, 200)).toBe(0.5);
  });

  test("clamps outside the window", () => {
    expect(utils.windowFraction(50, 100, 200)).toBe(0);
    expect(utils.windowFraction(500, 100, 200)).toBe(1);
  });

  test("returns null for a degenerate window", () => {
    expect(utils.windowFraction(100, 100, 100)).toBeNull();
    expect(utils.windowFraction(100, 200, 100)).toBeNull();
  });

  test("returns null for non-finite input", () => {
    expect(utils.windowFraction(NaN, 0, 100)).toBeNull();
    expect(utils.windowFraction(50, 0, Infinity)).toBeNull();
    expect(utils.windowFraction(50, undefined, 100)).toBeNull();
  });
});

describe("cycleSpeedPreset", () => {
  test("cycles through presets 1 -> 1.5 -> 2 -> 1", () => {
    expect(utils.cycleSpeedPreset(1)).toBe(1.5);
    expect(utils.cycleSpeedPreset(1.5)).toBe(2);
    expect(utils.cycleSpeedPreset(2)).toBe(1);
  });

  test("jumps to the next preset above an intermediate speed", () => {
    expect(utils.cycleSpeedPreset(1.25)).toBe(1.5);
    expect(utils.cycleSpeedPreset(1.75)).toBe(2);
  });

  test("returns 1 when above the last preset", () => {
    expect(utils.cycleSpeedPreset(2.5)).toBe(1);
    expect(utils.cycleSpeedPreset(3)).toBe(1);
  });

  test("climbs to 1 from slow speeds", () => {
    expect(utils.cycleSpeedPreset(0.5)).toBe(1);
  });

  test("falls back to 1 for garbage input", () => {
    expect(utils.cycleSpeedPreset(NaN)).toBe(1);
    expect(utils.cycleSpeedPreset(undefined)).toBe(1);
  });
});

describe("sliderFillPercent", () => {
  test("returns the share of the range already passed", () => {
    expect(utils.sliderFillPercent(50, 0, 100)).toBe(50);
    expect(utils.sliderFillPercent(0, 0, 100)).toBe(0);
    expect(utils.sliderFillPercent(100, 0, 100)).toBe(100);
  });

  test("counts from the range start, not from zero", () => {
    // Ползунок скорости начинается с 0.25, а не с нуля.
    expect(utils.sliderFillPercent(1.625, 0.25, 3)).toBe(50);
  });

  test("accepts the string attributes an input element exposes", () => {
    expect(utils.sliderFillPercent("150", "0", "300")).toBe(50);
  });

  test("clamps values outside the range", () => {
    expect(utils.sliderFillPercent(-10, 0, 100)).toBe(0);
    expect(utils.sliderFillPercent(500, 0, 100)).toBe(100);
  });

  test("returns 0 for a degenerate or unparsable range", () => {
    expect(utils.sliderFillPercent(5, 10, 10)).toBe(0);
    expect(utils.sliderFillPercent(5, 10, 0)).toBe(0);
    expect(utils.sliderFillPercent(5, "a", "b")).toBe(0);
  });
});

describe("panelGapAboveControls", () => {
  test("keeps the gaps the two old presets used", () => {
    // 100% — прежний компактный зазор, 135% — прежний крупный.
    expect(utils.panelGapAboveControls(100)).toBe(14);
    expect(utils.panelGapAboveControls(135)).toBe(34);
  });

  test("grows with the scale", () => {
    expect(utils.panelGapAboveControls(200)).toBe(71);
  });

  test("falls back to the default scale for garbage input", () => {
    expect(utils.panelGapAboveControls(NaN)).toBe(34);
  });
});

describe("timecodeUrl", () => {
  test("builds a short link with the current time", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", 83, {})).toBe("https://youtu.be/dQw4w9WgXcQ?t=83");
  });

  test("omits t at zero seconds", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", 0, {})).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  test("floors fractional seconds", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", 83.9, {})).toBe("https://youtu.be/dQw4w9WgXcQ?t=83");
  });

  test("live stream gets no timecode", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", 500, { isLive: true })).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  test("shorts get a shorts link without timecode", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", 10, { isShorts: true })).toBe(
      "https://www.youtube.com/shorts/dQw4w9WgXcQ"
    );
  });

  test("returns null without a video id", () => {
    expect(utils.timecodeUrl("", 10, {})).toBeNull();
    expect(utils.timecodeUrl(null, 10, {})).toBeNull();
  });

  test("treats garbage seconds as zero", () => {
    expect(utils.timecodeUrl("dQw4w9WgXcQ", NaN, {})).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(utils.timecodeUrl("dQw4w9WgXcQ", -5, {})).toBe("https://youtu.be/dQw4w9WgXcQ");
  });
});

describe("hotkeyFromEvent", () => {
  // Раскладка меняет event.key, но не event.code: на кириллице «k» приходит
  // как «л», и без запасного пути через code окно теряло горячие клавиши.
  const press = (key, code = "", shiftKey = false) => ({ key, code, shiftKey });

  test("takes the key as is on a latin layout", () => {
    expect(utils.hotkeyFromEvent(press("k", "KeyK"))).toBe("k");
    expect(utils.hotkeyFromEvent(press("m", "KeyM"))).toBe("m");
    expect(utils.hotkeyFromEvent(press(" ", "Space"))).toBe(" ");
    expect(utils.hotkeyFromEvent(press("<", "Comma", true))).toBe("<");
    expect(utils.hotkeyFromEvent(press(">", "Period", true))).toBe(">");
  });

  test("passes the arrow keys through — they do not depend on the layout", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      expect(utils.hotkeyFromEvent(press(key, key))).toBe(key);
    }
  });

  test("passes digits through", () => {
    expect(utils.hotkeyFromEvent(press("0", "Digit0"))).toBe("0");
    expect(utils.hotkeyFromEvent(press("7", "Digit7"))).toBe("7");
  });

  test("falls back to the physical key on a cyrillic layout", () => {
    expect(utils.hotkeyFromEvent(press("л", "KeyK"))).toBe("k");
    expect(utils.hotkeyFromEvent(press("ь", "KeyM"))).toBe("m");
    expect(utils.hotkeyFromEvent(press("Б", "Comma", true))).toBe("<");
    expect(utils.hotkeyFromEvent(press("Ю", "Period", true))).toBe(">");
  });

  test("falls back to the physical key for the azerty digit row", () => {
    expect(utils.hotkeyFromEvent(press("&", "Digit1"))).toBe("1");
    expect(utils.hotkeyFromEvent(press("(", "Digit5"))).toBe("5");
  });

  test("recognises an uppercase letter from caps lock", () => {
    expect(utils.hotkeyFromEvent(press("K", "KeyK"))).toBe("k");
  });

  test("needs shift for the speed keys, so a plain comma stays a comma", () => {
    expect(utils.hotkeyFromEvent(press(",", "Comma"))).toBeNull();
    expect(utils.hotkeyFromEvent(press(".", "Period"))).toBeNull();
  });

  test("ignores a shifted digit: shift+1 is not a seek", () => {
    expect(utils.hotkeyFromEvent(press("!", "Digit1", true))).toBeNull();
  });

  test("ignores keys the window does not handle", () => {
    expect(utils.hotkeyFromEvent(press("f", "KeyF"))).toBeNull();
    expect(utils.hotkeyFromEvent(press("c", "KeyC"))).toBeNull();
    expect(utils.hotkeyFromEvent(press("Enter", "Enter"))).toBeNull();
  });

  test("survives an event without a code", () => {
    expect(utils.hotkeyFromEvent(press("k"))).toBe("k");
    expect(utils.hotkeyFromEvent(press("щ"))).toBeNull();
  });
});
