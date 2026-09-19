(async () => {
  window.testMessages = await (await fetch('/extension/_locales/ru/messages.json')).json();
  if (new URLSearchParams(location.search).has('embedded')) {
    // Visual fixture: use the same PiP DOM without closing the user's real PiP.
    const frame = document.createElement('iframe');
    frame.style.cssText = 'display:block;width:360px;height:300px;border:1px solid #777;margin:16px 0';
    document.body.prepend(frame);
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
      requestWindow: async () => {
        const win = frame.contentWindow;
        Object.defineProperty(win, "outerWidth", { configurable: true, get: () => win.innerWidth });
        Object.defineProperty(win, "outerHeight", { configurable: true, get: () => win.innerHeight });
        win.resizeTo = (width, height) => { frame.style.width = width + 'px'; frame.style.height = height + 'px'; };
        win.close = () => { win.dispatchEvent(new Event('pagehide')); frame.remove(); };
        return win;
      }
    } });
  }
  document.querySelectorAll('ytd-watch-metadata button').forEach(button => button.onclick = () => button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')));
  document.querySelector('#open').onclick = async () => {
    document.querySelector('video')?.play();
    const ok = await YTFP.pip.open(new URLSearchParams(location.search).has('embedded') ? {mode:'document'} : {}); document.querySelector('#status').textContent = ok ? 'PiP открыт' : 'PiP недоступен';
  };
  document.querySelector('#shorts').onclick = () => { YTFP.pip.close(); location.href = '/shorts/AAAAAAAAAAA'; };
  document.querySelector('#timer').onclick = () => YTFP.sleepTimer.start(.2);
  if (location.pathname.startsWith('/shorts/')) {
    document.querySelector('#movie_player').id = 'shorts-player';
    document.querySelector('#player-container').style.cssText = 'width:360px;height:640px;position:relative';
  }
  document.querySelector('#fixture-theater').onclick = () => { document.querySelector('#player-container').style.width = '100%'; };
  document.querySelector('#fixture-fullscreen').onclick = () => document.querySelector('#player-container').requestFullscreen().catch(error => { document.querySelector('#status').textContent = `Fullscreen unavailable: ${error.message}`; });
  let sampleIndex = 0;
  const samples = ['AAAAAAAAAAA','BBBBBBBBBBB','CCCCCCCCCCC'];
  function navigateFixture(id, shorts) {
    history.pushState({},'',shorts ? `/shorts/${id}` : `/watch?v=${id}`);
    document.querySelector('meta[itemprop=videoId]').content = id;
    document.title = `Тестовый ролик ${id} - YouTube`;
    const video = YTFP.playerApi.getVideo(); if (video) video.currentTime = 0;
    document.dispatchEvent(new Event('yt-navigate-finish'));
  }
  document.querySelector('#navigation-button-down button').onclick = () => { sampleIndex = (sampleIndex + 1) % samples.length; navigateFixture(samples[sampleIndex],true); };
  document.querySelector('#navigation-button-up button').onclick = () => { sampleIndex = (sampleIndex + samples.length - 1) % samples.length; navigateFixture(samples[sampleIndex],true); };
  YTFP.shortsRuntime.confirmed();

  // Stand-in for YouTube's private router and captions API, explicitly not
  // evidence of compatibility with YouTube. The PiP window itself is real.
  let enabled = true, selected = 'ru';
  window.addEventListener('message', event => {
    if (event.source !== window) return;
    const data = event.data;
    if (['ytfp-watch-navigate','ytfp-shorts-navigate'].includes(data?.type)) {
      navigateFixture(data.videoId,data.type === 'ytfp-shorts-navigate');
    }
    if (data?.type === 'ytfp-captions') {
      if (data.action === 'toggle') enabled = !enabled;
      if (data.action === 'language') selected = data.language;
      const player = YTFP.playerApi.getVideo()?.closest('#movie_player, #shorts-player');
      const caption = player?.querySelector('.ytp-caption-window-container');
      if (caption) caption.hidden = !enabled;
      window.postMessage({ type: 'ytfp-captions-result', requestId: data.requestId, result: { available: true, enabled, selected, tracks: [{ code:'ru',name:'Русский' },{ code:'en',name:'English' }] } }, location.origin);
    }
  });
})();
