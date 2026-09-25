// @vitest-environment jsdom
import { test, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const script=readFileSync("extension/popup/updates.js","utf8");
const html=readFileSync("extension/popup/popup.html","utf8");
let cleanup;
async function setup(initial={status:"idle"}){
  document.body.innerHTML=html.slice(html.indexOf('<body>')+6,html.indexOf('</body>'));
  let listener;
  const sendMessage=vi.fn(async()=>initial);
  const chrome={runtime:{getManifest:()=>({version:"1.22.1"}),sendMessage},i18n:{getMessage:()=>""},storage:{onChanged:{addListener:fn=>listener=fn,removeListener:vi.fn()}}};
  vm.runInNewContext(script,{chrome,document,window,console});
  cleanup=()=>window.dispatchEvent(new Event("pagehide"));
  await vi.waitFor(()=>expect(document.getElementById("updateStatus").textContent).not.toBe("Checking…"));
  return {chrome,sendMessage,button:document.getElementById("updateAction"),status:document.getElementById("updateStatus"),notify:()=>listener({availableUpdateVersion:{newValue:"1.23.0"}},"local")};
}
afterEach(()=>cleanup?.());
test("shows version, then check and install as separate explicit actions",async()=>{
  const e=await setup();expect(document.getElementById("extensionVersion").textContent).toBe("v1.22.1");
  e.sendMessage.mockResolvedValueOnce({status:"update_available",version:"1.23.0"});e.button.click();
  await vi.waitFor(()=>expect(e.button.textContent).toBe("Update now"));
  expect(e.status.textContent).toContain("1.23.0");expect(document.getElementById("updateHint").hidden).toBe(false);
  expect(e.sendMessage).toHaveBeenLastCalledWith({command:"check-update"});
  e.sendMessage.mockResolvedValueOnce({status:"installing"});e.button.click();await vi.waitFor(()=>expect(e.status.textContent).toBe("Applying update…"));
  expect(e.sendMessage).toHaveBeenLastCalledWith({command:"install-update"});
});
test("disables duplicate clicks while pending and supports error retry",async()=>{
  const e=await setup();let reject;e.sendMessage.mockImplementationOnce(()=>new Promise((_,r)=>reject=r));
  e.button.click();e.button.click();expect(e.button.disabled).toBe(true);expect(e.sendMessage).toHaveBeenCalledTimes(2);
  reject(new Error("network"));await vi.waitFor(()=>expect(e.button.disabled).toBe(false));expect(e.status.textContent).toContain("Try again");
  e.sendMessage.mockResolvedValueOnce({status:"no_update"});e.button.click();await vi.waitFor(()=>expect(e.status.textContent).toBe("No update is available."));
});
test("blocks install for active player and keeps the retry as install",async()=>{
  const e=await setup({status:"update_available",version:"1.23.0"});
  e.sendMessage.mockResolvedValueOnce({status:"close_player",version:"1.23.0"});e.button.click();
  await vi.waitFor(()=>expect(e.status.textContent).toContain("Close the floating player"));expect(e.button.textContent).toBe("Update now");expect(e.button.disabled).toBe(false);
});
test("unpacked mode is honest and does not disable unrelated controls",async()=>{
  const e=await setup({status:"unpacked"});expect(e.button.disabled).toBe(true);expect(e.status.textContent).toContain("Local installation");expect(document.getElementById("openOptions").disabled).toBe(false);
});
test("a background notification refreshes availability without a forced check",async()=>{
  const e=await setup();e.sendMessage.mockResolvedValueOnce({status:"update_available",version:"1.23.0"});e.notify();
  await vi.waitFor(()=>expect(e.button.textContent).toBe("Update now"));expect(e.sendMessage).toHaveBeenLastCalledWith({command:"update-state"});
});
