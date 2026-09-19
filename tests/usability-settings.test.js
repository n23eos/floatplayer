// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { expect, test, vi } from "vitest";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function popupDom(sendMessage) {
  const dom = new JSDOM(read("extension/popup/popup.html"), {
    runScripts: "outside-only",
    url: "chrome-extension://test/popup/popup.html"
  });
  dom.window.chrome = {
    i18n: { getMessage: () => "" },
    runtime: {
      sendMessage: vi.fn(async () => ({
        id: 7,
        url: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
        playerState: { playerPage: true, pipOpen: false }
      })),
      openOptionsPage: vi.fn()
    },
    tabs: { sendMessage },
    commands: { getAll: vi.fn(async () => []) },
    storage: {
      sync: {
        get: vi.fn(async defaults => defaults),
        set: vi.fn(async () => {})
      }
    }
  };
  dom.window.close = vi.fn();
  dom.window.console.warn = vi.fn();
  dom.window.eval(read("extension/shared/settings-schema.js"));
  dom.window.eval(read("extension/popup/popup.js"));
  return dom;
}

test("popup stays open after a rejected PiP command and retries successfully", async () => {
  const sendMessage = vi.fn()
    .mockRejectedValueOnce(new Error("tab closed"))
    .mockResolvedValueOnce({ ok: true });
  const dom = popupDom(sendMessage);
  const primary = dom.window.document.getElementById("primary");

  await vi.waitFor(() => expect(primary.disabled).toBe(false));
  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
  expect(dom.window.close).not.toHaveBeenCalled();
  expect(dom.window.document.getElementById("stateText").textContent).toContain("Try again");
  expect(primary.textContent).toContain("Try again");
  expect(primary.disabled).toBe(false);

  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
  expect(dom.window.close).toHaveBeenCalledTimes(1);
});

test("popup stays open when the content script reports a PiP refusal", async () => {
  const sendMessage = vi.fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true });
  const dom = popupDom(sendMessage);
  const primary = dom.window.document.getElementById("primary");

  await vi.waitFor(() => expect(primary.disabled).toBe(false));
  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
  expect(dom.window.close).not.toHaveBeenCalled();
  expect(dom.window.document.getElementById("stateText").textContent).toContain("Try again");
  expect(primary.disabled).toBe(false);

  primary.click();
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
  expect(dom.window.close).toHaveBeenCalledTimes(1);
});

function optionsDom(get, set = vi.fn(async () => {})) {
  const dom = new JSDOM(read("extension/options/options.html"), {
    runScripts: "outside-only",
    url: "chrome-extension://test/options/options.html"
  });
  dom.window.chrome = {
    i18n: { getMessage: () => "" },
    runtime: { getManifest: () => ({ version: "1.21.0" }) },
    storage: {
      sync: { get, set },
      onChanged: { addListener: vi.fn() }
    }
  };
  dom.window.console.warn = vi.fn();
  dom.window.eval(read("extension/shared/settings-schema.js"));
  dom.window.eval(read("extension/options/options.js"));
  return dom;
}

test("options blocks edits after load failure and recovers through Retry", async () => {
  const get = vi.fn()
    .mockRejectedValueOnce(new Error("storage unavailable"))
    .mockImplementationOnce(async defaults => defaults);
  const dom = optionsDom(get);
  const doc = dom.window.document;
  const form = doc.getElementById("settingsForm");
  const retry = doc.getElementById("retryLoad");

  await vi.waitFor(() => expect(retry.hidden).toBe(false));
  expect(form.disabled).toBe(true);
  expect(doc.getElementById("loadState").getAttribute("role")).toBe("alert");
  expect(doc.getElementById("loadState").getAttribute("aria-live")).toBe("assertive");
  expect(doc.getElementById("loadState").hidden).toBe(false);

  retry.click();
  await vi.waitFor(() => expect(form.disabled).toBe(false));
  expect(doc.getElementById("loadState").hidden).toBe(true);
  expect(form.getAttribute("aria-busy")).toBe("false");
});

test("options no longer exposes or writes the inactive Shorts side setting", async () => {
  const set = vi.fn(async () => {});
  const dom = optionsDom(vi.fn(async defaults => ({ ...defaults, shortsSide: "left" })), set);
  const doc = dom.window.document;

  await vi.waitFor(() => expect(doc.getElementById("settingsForm").disabled).toBe(false));
  expect(doc.getElementById("shortsSide")).toBeNull();
  doc.getElementById("shortsHistory").click();
  await vi.waitFor(() => expect(set).toHaveBeenCalled());
  expect(set.mock.calls.at(-1)[0]).not.toHaveProperty("shortsSide");
});
