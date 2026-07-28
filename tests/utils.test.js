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
