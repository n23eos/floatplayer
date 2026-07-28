import { describe, test, expect } from "vitest";
import { createRequire } from "node:module";

// utils.js — обычный браузерный скрипт с CJS-экспортом для тестов.
const require = createRequire(import.meta.url);
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
