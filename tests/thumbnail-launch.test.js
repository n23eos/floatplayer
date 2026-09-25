// @vitest-environment jsdom
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.chrome = { i18n: { getMessage: () => "" } };
globalThis.YTFP = { pip: { openVideo: vi.fn(async () => true) } };
require("../extension/content/thumbnail-launch.js");
const module = YTFP.thumbnailLaunch;
function card(id = "AAAAAAAAAAA", extra = "") {
  const node = document.createElement("ytd-rich-item-renderer");
  node.innerHTML = `<ytd-thumbnail><a href="/watch?v=${id}"><img><ytd-thumbnail-overlay-time-status-renderer>21:53</ytd-thumbnail-overlay-time-status-renderer></a></ytd-thumbnail>${extra}`;
  document.body.append(node); return node;
}
const tick = async () => { await Promise.resolve(); await vi.advanceTimersByTimeAsync(120); };
beforeEach(() => {
  vi.useFakeTimers(); document.body.replaceChildren(); window.history.replaceState({}, "", "/");
  window.documentPictureInPicture = { requestWindow: vi.fn() }; YTFP.pip.openVideo.mockReset().mockResolvedValue(true);
});
afterEach(() => { module.destroy(); vi.useRealTimers(); });

test("adds exactly one accessible button beside the thumbnail link and keeps normal clicks", async () => {
  const node = card(); const normal = vi.fn(); node.addEventListener("click", normal);
  module.init(); module.init(); await tick();
  const button = node.querySelector("button");
  expect(node.querySelectorAll("button")).toHaveLength(1);
  expect(button.closest("a")).toBeNull(); expect(button.getAttribute("aria-label")).toBe("Open in full FloatPlayer");
  button.click(); expect(YTFP.pip.openVideo).toHaveBeenCalledWith("AAAAAAAAAAA"); expect(normal).not.toHaveBeenCalled();
  node.querySelector("a").addEventListener("click", event => event.preventDefault());
  node.querySelector("a").click(); expect(normal).toHaveBeenCalledTimes(1);
});

test("ignores ads, Shorts, external and invalid video links", () => {
  card("AAAAAAAAAAA", "<ytd-ad-slot-renderer></ytd-ad-slot-renderer>");
  for (const href of ["/shorts/AAAAAAAAAAA", "https://example.com/watch?v=AAAAAAAAAAA", "/watch?v=bad"]) card().querySelector("a").href = href;
  module.init(); expect(document.querySelectorAll("button")).toHaveLength(0);
});

test("handles delayed cards and rereads a reused card ID at click time", async () => {
  module.init(); const node = card(); await tick();
  node.querySelector("a").href = "/watch?v=BBBBBBBBBBB";
  node.querySelector("button").click(); expect(YTFP.pip.openVideo).toHaveBeenCalledWith("BBBBBBBBBBB");
  await tick(); expect(node.querySelectorAll("button")).toHaveLength(1);
  node.querySelector("a").href = "/shorts/AAAAAAAAAAA";
  node.querySelector("button").click(); expect(YTFP.pip.openVideo).toHaveBeenCalledTimes(1);
  await tick(); expect(node.querySelector("button")).toBeNull();
});

test("reserves space for a long live badge", () => {
  const node = card(); const badge = node.querySelector("ytd-thumbnail-overlay-time-status-renderer");
  badge.getBoundingClientRect = () => ({ width: 100 }); module.init();
  expect(node.querySelector("button").style.getPropertyValue("--ytfp-badge-space")).toBe("116px");
});

test("disconnects on leaving home and restores buttons on SPA return", async () => {
  const node = card(); module.init();
  window.history.replaceState({}, "", "/watch?v=AAAAAAAAAAA"); document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(node.querySelector("button")).toBeNull(); card(); await tick(); expect(document.querySelectorAll("button")).toHaveLength(0);
  window.history.replaceState({}, "", "/"); document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(document.querySelectorAll("button")).toHaveLength(2);
});

test("shows a failure without disabling retry, and keeps cancellation quiet", async () => {
  const node = card(); module.init(); YTFP.pip.openVideo.mockRejectedValueOnce(new Error("blocked"));
  node.querySelector("button").click(); await tick(); expect(document.querySelector('[role="alert"]')).not.toBeNull();
  YTFP.pip.openVideo.mockResolvedValueOnce(false); node.querySelector("button").click(); await tick();
  expect(document.querySelector('[role="alert"]')).toBeNull(); expect(YTFP.pip.openVideo).toHaveBeenCalledTimes(2);
});


test("supports current YouTube markup with the thumbnail inside the link", () => {
  const node = document.createElement("ytd-rich-item-renderer");
  node.innerHTML = '<yt-lockup-view-model><div><a href="/watch?v=BBBBBBBBBBB"><yt-thumbnail-view-model><img><yt-thumbnail-badge-view-model>9:07</yt-thumbnail-badge-view-model></yt-thumbnail-view-model></a><h3>Title</h3></div></yt-lockup-view-model>';
  document.body.append(node); module.init();
  const button = node.querySelector("button"); expect(button).not.toBeNull(); expect(button.closest("a")).toBeNull();
  button.click(); expect(YTFP.pip.openVideo).toHaveBeenCalledWith("BBBBBBBBBBB");
});

function preview(id = "AAAAAAAAAAA") {
  const node = document.createElement("ytd-video-preview");
  node.innerHTML = `<div id="media-container"><a id="media-container-link" href="/watch?v=${id}"><video></video></a></div>`;
  document.body.append(node); return node;
}
test("keeps a clickable button in the external preview media layer", async () => {
  card(); module.init(); const layer = preview(); await tick();
  const button = layer.querySelector("button");
  expect(button.parentElement.id).toBe("media-container");
  expect(button.closest("a")).toBeNull();
  expect(button.parentElement.classList.contains("ytfp-thumbnail-preview")).toBe(true);
  button.click(); expect(YTFP.pip.openVideo).toHaveBeenLastCalledWith("AAAAAAAAAAA");
  await tick(); expect(layer.querySelectorAll("button")).toHaveLength(1);
});
test("preview reuse cannot launch a stale target before the observer runs", async () => {
  card(); card("BBBBBBBBBBB"); const layer = preview(); module.init();
  const stale = layer.querySelector("button");
  layer.querySelector("a").href = "/watch?v=BBBBBBBBBBB";
  stale.click(); expect(YTFP.pip.openVideo).not.toHaveBeenCalled();
  await tick(); layer.querySelector("button").click();
  expect(YTFP.pip.openVideo).toHaveBeenLastCalledWith("BBBBBBBBBBB");
  layer.remove(); await tick(); expect(stale.isConnected).toBe(false);
});
test("does not infer preview target from an ad title or ineligible card", async () => {
  card("AAAAAAAAAAA", "<ytd-ad-slot-renderer></ytd-ad-slot-renderer>");
  const layer = preview(); module.init(); expect(layer.querySelector("button")).toBeNull();
  card("BBBBBBBBBBB"); layer.querySelector("a").removeAttribute("href");
  layer.insertAdjacentHTML("beforeend", '<a class="ytp-title-link" href="/watch?v=BBBBBBBBBBB">Ad</a>');
  await tick(); expect(layer.querySelector("button")).toBeNull();
});

test("rebuilds a replaced preview host and cleans it on navigation", async () => {
  card(); const layer=preview(); module.init();
  layer.innerHTML='<div id="media-container"><a id="media-container-link" href="/watch?v=AAAAAAAAAAA"><video></video></a></div>';
  await tick(); expect(layer.querySelectorAll("button")).toHaveLength(1);
  window.history.replaceState({}, "", "/watch?v=AAAAAAAAAAA");
  document.dispatchEvent(new Event("yt-navigate-finish"));
  expect(layer.querySelector("button")).toBeNull();
});
