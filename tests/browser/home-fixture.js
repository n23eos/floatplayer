// Test-only router and embedded PiP, preserving the user's existing real PiP.
(() => {
  let fail = false, slow = false, currentId = "";
  const video = document.querySelector("video");
  const player = document.querySelector("#movie_player");
  player.getVideoData = () => ({ video_id: currentId });
  document.querySelector("#fail").onclick = () => { fail = true; };
  document.querySelector("#slow").onclick = () => { slow = true; };
  document.querySelector("#home-return").onclick = () => {
    YTFP.pip.close(); history.pushState({}, "", "/");
    document.querySelector("#grid").hidden = false; document.querySelector("#watch").hidden = true;
    document.querySelector("#home-return").style.display = "none";
    document.dispatchEvent(new Event("yt-navigate-finish"));
  };
  document.querySelector("ytd-app").fire = (_event, { endpoint }) => {
    const id = endpoint.watchEndpoint.videoId;
    history.pushState({}, "", `/watch?v=${id}`);
    document.querySelector("#grid").hidden = true; document.querySelector("#watch").hidden = false;
    document.querySelector("#home-return").style.display = "inline-block";
    document.title = `Тестовый ролик ${id} - YouTube`;
    document.dispatchEvent(new Event("yt-navigate-finish"));
    const delay = slow ? 4000 : 200; slow = false;
    setTimeout(() => { currentId = id; video.play().catch(() => {}); }, delay);
  };
  Object.defineProperty(window, "documentPictureInPicture", { configurable: true, value: {
    requestWindow() {
      if (fail) { fail = false; return Promise.reject(new Error("Fixture blocked opening")); }
      const frame = document.createElement("iframe"); frame.id = "fixture-pip"; frame.title = "FloatPlayer"; document.body.append(frame);
      const win = frame.contentWindow;
      let closed = false;
      Object.defineProperty(win, "closed", { configurable: true, get: () => closed });
      Object.defineProperty(win, "outerWidth", { configurable: true, get: () => win.innerWidth });
      Object.defineProperty(win, "outerHeight", { configurable: true, get: () => win.innerHeight });
      const close = document.createElement("button"); close.id = "fixture-close"; close.textContent = "Закрыть тестовое окно"; document.body.append(close);
      win.close = () => { if (closed) return; closed = true; win.dispatchEvent(new Event("pagehide")); frame.remove(); close.remove(); };
      close.onclick = () => win.close();
      win.resizeTo = (width, height) => { frame.style.width = width + "px"; frame.style.height = height + "px"; };
      return Promise.resolve(win);
    }
  } });
})();
