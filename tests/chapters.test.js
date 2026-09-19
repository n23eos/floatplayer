// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);

globalThis.chrome = {
  i18n: {
    getMessage: () => "",
    getUILanguage: () => "en-US"
  }
};

require("../extension/content/constants.js");
require("../extension/content/utils.js");
require("../extension/content/player-api.js");
require("../extension/content/pip-progress.js");

const progress = globalThis.YTFP.pipProgress;

function initialData(videoId, chapters) {
  return {
    currentVideoEndpoint: { watchEndpoint: { videoId } },
    playerOverlays: {
      playerOverlayRenderer: {
        decoratedPlayerBarRenderer: {
          decoratedPlayerBarRenderer: {
            playerBar: {
              multiMarkersPlayerBarRenderer: {
                markersMap: [{
                  key: "DESCRIPTION_CHAPTERS",
                  value: {
                    chapters: chapters.map(([title, timeRangeStartMillis]) => ({
                      chapterRenderer: {
                        title: { simpleText: title },
                        timeRangeStartMillis
                      }
                    }))
                  }
                }]
              }
            }
          }
        }
      }
    }
  };
}

function scriptFor(videoId, chapters) {
  return `var ytInitialData = ${JSON.stringify(initialData(videoId, chapters))};`;
}

function setDuration(video, duration) {
  Object.defineProperty(video, "duration", { configurable: true, value: duration });
}

describe("chapter extraction", () => {
  test("reads named chapters from public ytInitialData for the requested video", () => {
    const text = scriptFor("AAAAAAAAAAA", [
      ['Intro } and "setup"', 0],
      ["Main topic", 90500]
    ]);

    expect(progress.extractInitialDataChapters(text, "AAAAAAAAAAA")).toEqual([
      { start: 0, title: 'Intro } and "setup"' },
      { start: 90.5, title: "Main topic" }
    ]);
  });

  test("rejects ytInitialData that belongs to the previous SPA video", () => {
    const text = scriptFor("AAAAAAAAAAA", [["Old intro", 0], ["Old topic", 60000]]);

    expect(progress.extractInitialDataChapters(text, "BBBBBBBBBBB")).toEqual([]);
  });

  test("ignores chapter renderers without a numeric start time", () => {
    const data = initialData("IIIIIIIIIII", [["First", 60000], ["Second", 120000]]);
    data.playerOverlays.playerOverlayRenderer.decoratedPlayerBarRenderer
      .decoratedPlayerBarRenderer.playerBar.multiMarkersPlayerBarRenderer
      .markersMap[0].value.chapters.unshift({
        chapterRenderer: { title: { simpleText: "Missing time" } }
      });

    expect(progress.extractInitialDataChapters(
      `ytInitialData = ${JSON.stringify(data)};`,
      "IIIIIIIIIII"
    )).toEqual([
      { start: 60, title: "First" },
      { start: 120, title: "Second" }
    ]);
  });

  test("falls back to timestamp links in the matching video description", () => {
    document.body.innerHTML = `
      <div id="description-inline-expander">
        <a href="/watch?v=CCCCCCCCCCC&t=0s">0:00</a> Opening<br>
        <a href="/watch?v=CCCCCCCCCCC&t=75s">1:15</a> Details<br>
        <a href="/watch?v=OLDOLDOLD11&t=140s">2:20</a> Stale chapter
      </div>`;

    expect(progress.extractDescriptionChapters(document, "CCCCCCCCCCC")).toEqual([
      { start: 0, title: "Opening" },
      { start: 75, title: "Details" }
    ]);
    expect(progress.extractDescriptionChapters(document, "DDDDDDDDDDD")).toEqual([]);
  });
});

describe("chapter progress UI", () => {
  let originalGetVideoId;
  let originalGetSeekRange;

  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = '<div id="movie_player"><video class="html5-main-video"></video></div>';
    originalGetVideoId = YTFP.playerApi.getVideoId;
    originalGetSeekRange = YTFP.playerApi.getSeekRange;
    globalThis.fetch = vi.fn(async () => { throw new Error("offline test"); });
  });

  afterEach(() => {
    YTFP.playerApi.getVideoId = originalGetVideoId;
    YTFP.playerApi.getSeekRange = originalGetSeekRange;
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  test("shows the current chapter and exposes seek buttons without opening YouTube panel", () => {
    document.head.innerHTML = `<script>${scriptFor("EEEEEEEEEEE", [
      ["Introduction", 0],
      ["Core idea", 60000],
      ["Summary", 120000]
    ])}</script>`;
    const video = document.querySelector("video");
    setDuration(video, 180);
    video.currentTime = 65;
    let currentId = "EEEEEEEEEEE";
    YTFP.playerApi.getVideoId = () => currentId;
    YTFP.playerApi.getSeekRange = () => ({ start: 0, end: 180 });
    const pipDocument = new JSDOM("<!doctype html><body></body>", { url: "https://pip.test/" }).window.document;

    const view = progress.build(pipDocument, { getVideo: () => video });
    pipDocument.body.appendChild(view.element);
    const chapterUi = view.element.querySelector(".ytfp-chapters-ui");
    const current = chapterUi.querySelector(".ytfp-current-chapter");
    const toggle = chapterUi.querySelector(".ytfp-chapters-toggle");
    const list = chapterUi.querySelector(".ytfp-chapters-list");

    expect(current.textContent).toBe("Core idea");
    expect(current.getAttribute("aria-label")).toBe("Current chapter: Core idea");
    expect(toggle.getAttribute("aria-label")).toBe("Chapters");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(list.hidden).toBe(true);

    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(list.hidden).toBe(false);
    const buttons = [...list.querySelectorAll(".ytfp-chapter-button")];
    expect(buttons.map((button) => button.textContent)).toEqual([
      "0:00 Introduction",
      "1:00 Core idea",
      "2:00 Summary"
    ]);

    pipDocument.dispatchEvent(new pipDocument.defaultView.KeyboardEvent("keydown", { key: "Escape" }));
    expect(list.hidden).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(pipDocument.activeElement).toBe(toggle);
    toggle.click();
    pipDocument.body.dispatchEvent(new pipDocument.defaultView.MouseEvent("click", { bubbles: true }));
    expect(list.hidden).toBe(true);

    toggle.click();
    buttons[2].click();
    expect(video.currentTime).toBe(120);
    expect(video.paused).toBe(true);
    expect(current.textContent).toBe("Summary");
    expect(buttons[2].classList.contains("ytfp-chapter-button--current")).toBe(true);
    expect(list.hidden).toBe(true);
    expect(pipDocument.activeElement).toBe(toggle);

    document.getElementById("movie_player").classList.add("ad-showing");
    video.currentTime = 5;
    video.dispatchEvent(new Event("timeupdate"));
    expect(chapterUi.hidden).toBe(true);
    expect(current.hidden).toBe(true);
    document.getElementById("movie_player").classList.remove("ad-showing");
    video.currentTime = 65;
    video.dispatchEvent(new Event("timeupdate"));
    expect(chapterUi.hidden).toBe(false);
    expect(current.textContent).toBe("Core idea");

    currentId = "HHHHHHHHHHH";
    video.dispatchEvent(new Event("timeupdate"));
    expect(current.hidden).toBe(true);
    expect(current.textContent).toBe("");
    const timeBeforeStaleClick = video.currentTime;
    buttons[0].click();
    expect(video.currentTime).toBe(timeBeforeStaleClick);
    const track = view.element.querySelector(".ytfp-progress");
    track.getBoundingClientRect = () => ({ left: 0, width: 100 });
    track.dispatchEvent(new pipDocument.defaultView.MouseEvent("mousemove", {
      bubbles: true,
      clientX: 50
    }));
    expect(view.element.querySelector(".ytfp-progress-tooltip-title").textContent).toBe("");
    view.cleanup();
  });

  test("does not apply an async chapter response after the video changes", async () => {
    const video = document.querySelector("video");
    setDuration(video, 180);
    YTFP.playerApi.getSeekRange = () => ({ start: 0, end: 180 });
    let currentId = "FFFFFFFFFFF";
    YTFP.playerApi.getVideoId = () => currentId;
    let resolveResponse;
    globalThis.fetch = vi.fn(() => new Promise((resolve) => { resolveResponse = resolve; }));
    const pipDocument = new JSDOM("<!doctype html><body></body>", { url: "https://pip.test/" }).window.document;

    const view = progress.build(pipDocument, { getVideo: () => video });
    pipDocument.body.appendChild(view.element);
    currentId = "GGGGGGGGGGG";
    resolveResponse({
      ok: true,
      text: async () => scriptFor("FFFFFFFFFFF", [["Intro", 0], ["Topic", 60000]])
    });
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await Promise.resolve();
    await Promise.resolve();

    expect(view.element.querySelector(".ytfp-chapters-ui").hidden).toBe(true);
    expect(view.element.querySelectorAll(".ytfp-chapter-button")).toHaveLength(0);
    view.cleanup();
  });

  test("rebinds progress events when the player replaces its video", async () => {
    const root = document.getElementById("movie_player");
    const oldVideo = root.querySelector("video");
    setDuration(oldVideo, 100);
    oldVideo.currentTime = 10;
    YTFP.playerApi.getVideoId = () => "JJJJJJJJJJJ";
    YTFP.playerApi.getSeekRange = (video) => video ? { start: 0, end: 100 } : null;
    const pipDocument = new JSDOM("<!doctype html><body></body>", { url: "https://pip.test/" }).window.document;
    const view = progress.build(pipDocument, { getVideo: () => root.querySelector("video") });
    pipDocument.body.appendChild(view.element);
    const fill = view.element.querySelector(".ytfp-progress-fill");
    expect(fill.style.width).toBe("10%");

    const nextVideo = document.createElement("video");
    nextVideo.className = "html5-main-video";
    setDuration(nextVideo, 100);
    nextVideo.currentTime = 50;
    root.replaceChildren(nextVideo);
    await Promise.resolve();

    nextVideo.currentTime = 60;
    nextVideo.dispatchEvent(new Event("timeupdate"));
    expect(fill.style.width).toBe("60%");

    nextVideo.currentTime = 70;
    oldVideo.dispatchEvent(new Event("timeupdate"));
    expect(fill.style.width).toBe("60%");

    view.cleanup();
    nextVideo.currentTime = 80;
    nextVideo.dispatchEvent(new Event("timeupdate"));
    expect(fill.style.width).toBe("60%");
  });

  test("exposes a DVR-aware keyboard slider and blocks seeking during ads", () => {
    const video = document.querySelector("video");
    setDuration(video, 200);
    video.currentTime = 150;
    YTFP.playerApi.getVideoId = () => "KKKKKKKKKKK";
    YTFP.playerApi.getSeekRange = () => ({ start: 100, end: 200 });
    const pipDocument = new JSDOM("<!doctype html><body></body>", { url: "https://pip.test/" }).window.document;
    const view = progress.build(pipDocument, { getVideo: () => video });
    pipDocument.body.appendChild(view.element);
    const track = view.element.querySelector(".ytfp-progress");
    const press = (key) => {
      const event = new pipDocument.defaultView.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true
      });
      track.dispatchEvent(event);
      return event;
    };

    expect(track.getAttribute("role")).toBe("slider");
    expect(track.tabIndex).toBe(0);
    expect(track.getAttribute("aria-label")).toBe("Video timeline");
    expect(track.getAttribute("aria-valuemin")).toBe("100");
    expect(track.getAttribute("aria-valuemax")).toBe("200");
    expect(track.getAttribute("aria-valuetext")).toBe("0:50 / 1:40");

    expect(press("ArrowRight").defaultPrevented).toBe(true);
    expect(video.currentTime).toBe(155);
    press("ArrowDown");
    expect(video.currentTime).toBe(150);
    press("Home");
    expect(video.currentTime).toBe(100);
    press("End");
    expect(video.currentTime).toBe(200);
    expect(video.paused).toBe(true);

    document.getElementById("movie_player").classList.add("ad-showing");
    video.dispatchEvent(new Event("timeupdate"));
    expect(track.getAttribute("aria-disabled")).toBe("true");
    press("ArrowLeft");
    expect(video.currentTime).toBe(200);
    view.cleanup();
  });
});
