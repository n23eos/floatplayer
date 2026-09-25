import { describe, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../extension/background/service-worker.js", import.meta.url), "utf8");
function setup({ stored = {}, installType = "normal", tabs = [] } = {}) {
  const listeners = [], updates = [];
  const chrome = {
    runtime: { id: "test", getURL: p => `chrome-extension://test/${p}`, getManifest: () => ({ version: "1.22.1" }),
      setUninstallURL: async () => {}, onInstalled: { addListener() {} }, onUpdateAvailable: { addListener: fn => updates.push(fn) },
      onMessage: { addListener: fn => listeners.push(fn) }, requestUpdateCheck: vi.fn(async () => ({ status:"no_update" })), reload: vi.fn() },
    management: { getSelf: vi.fn(async () => ({ installType })) },
    storage: { local: { get: vi.fn(async key => ({[key]:stored[key]})), set:vi.fn(async values=>Object.assign(stored,values)),remove:vi.fn() } },
    tabs: { query:vi.fn(async()=>tabs),sendMessage:vi.fn(async()=>({pipOpen:false})),onRemoved:{addListener(){}} },
    commands:{onCommand:{addListener(){}}}
  };
  vm.runInNewContext(source, { chrome, console, setTimeout, clearTimeout });
  const sender = { id:"test", url:"chrome-extension://test/popup/popup.html" };
  const send = (command, who=sender) => new Promise(resolve => {
    let handled=false;
    for (const listener of listeners) if (listener({command},who,resolve)===true) handled=true;
    if(!handled) resolve(undefined);
  });
  return {chrome,send,stored,notify:async version=>{updates[0]({version});await Promise.resolve();}};
}

describe("extension update service", () => {
  test("state read does not force checks, and a manual check distinguishes no update/throttle/error", async () => {
    const e=setup();expect((await e.send("update-state")).status).toBe("idle");expect(e.chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    expect((await e.send("check-update")).status).toBe("no_update");
    e.chrome.runtime.requestUpdateCheck.mockResolvedValueOnce({status:"throttled"});expect((await e.send("check-update")).status).toBe("throttled");
    e.chrome.runtime.requestUpdateCheck.mockRejectedValueOnce(new Error("offline"));expect((await e.send("check-update")).status).toBe("error");
    expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
  });
  test("remembers notification across worker restarts and ignores installed or malformed versions", async () => {
    const e=setup();await e.notify("1.23.0");
    const restarted=setup({stored:e.stored});expect(await restarted.send("update-state")).toMatchObject({status:"update_available",version:"1.23.0"});
    for(const version of ["1.22.1","1.9.0","invalid"]){const x=setup({stored:{availableUpdateVersion:version}});expect((await x.send("update-state")).status).toBe("idle");}
  });
  test("new notification wins over stale storage and storage failure", async()=>{
    const e=setup({stored:{availableUpdateVersion:"invalid"}}); e.chrome.storage.local.set.mockRejectedValue(new Error("quota"));
    await e.notify("1.23.0");expect((await e.send("update-state")).version).toBe("1.23.0");
    e.chrome.storage.local.get.mockRejectedValue(new Error("unavailable"));expect((await e.send("update-state")).version).toBe("1.23.0");
  });
  test("offers the downloaded version but never reloads just from checking", async()=>{
    const e=setup();e.chrome.runtime.requestUpdateCheck.mockResolvedValue({status:"update_available",version:"1.23.0"});
    expect((await e.send("check-update")).version).toBe("1.23.0");expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
    expect((await e.send("install-update")).status).toBe("installing");expect(e.chrome.runtime.reload).toHaveBeenCalledTimes(1);
  });
  test("does not reload without an update, from a content script, or from another extension", async()=>{
    const e=setup();expect((await e.send("install-update")).status).toBe("idle");
    await e.notify("1.23.0");
    expect(await e.send("install-update",{id:"test",url:"https://www.youtube.com/watch",tab:{id:1}})).toBeUndefined();
    expect(await e.send("install-update",{id:"other",url:"chrome-extension://test/popup/popup.html"})).toBeUndefined();
    expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
  });
  test("blocks restart for an open player and retries after closing it",async()=>{
    const e=setup({stored:{availableUpdateVersion:"1.23.0"},tabs:[{id:1}]});
    e.chrome.tabs.sendMessage.mockResolvedValueOnce({pipOpen:true});expect((await e.send("install-update")).status).toBe("close_player");expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
    expect((await e.send("install-update")).status).toBe("installing");expect(e.chrome.runtime.reload).toHaveBeenCalledTimes(1);
  });
  test("unknown tab state does not restart the extension",async()=>{
    const e=setup({stored:{availableUpdateVersion:"1.23.0"},tabs:[{id:1}]});e.chrome.tabs.sendMessage.mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."));
    expect((await e.send("install-update")).status).toBe("tabs_unavailable");expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
  });
  test("unpacked install explains manual updates without checking/reloading",async()=>{
    const e=setup({installType:"development",stored:{availableUpdateVersion:"1.23.0"}});
    for(const action of ["update-state","check-update","install-update"])expect((await e.send(action)).status).toBe("unpacked");
    expect(e.chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled();expect(e.chrome.runtime.reload).not.toHaveBeenCalled();
  });
  test("concurrent checks are deduplicated",async()=>{
    const e=setup();let resolve;e.chrome.runtime.requestUpdateCheck.mockImplementation(()=>new Promise(r=>resolve=r));
    const first=e.send("check-update"),second=e.send("check-update");await vi.waitFor(()=>expect(resolve).toBeTypeOf("function"));resolve({status:"no_update"});
    expect((await first).status).toBe("no_update");expect((await second).status).toBe("no_update");expect(e.chrome.runtime.requestUpdateCheck).toHaveBeenCalledTimes(1);
  });
  test("failed reload reports error and permits retry",async()=>{
    const e=setup({stored:{availableUpdateVersion:"1.23.0"}});e.chrome.runtime.reload.mockImplementationOnce(()=>{throw new Error("reload failed")});
    expect((await e.send("install-update")).status).toBe("error");expect((await e.send("install-update")).status).toBe("installing");
  });
});
