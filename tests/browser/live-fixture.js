// Reproduces observed YouTube live timing without touching a real stream.
if (new URLSearchParams(location.search).has("liveFixture")) {
  const video = document.querySelector("video");
  const player = document.querySelector("#movie_player");
  const progress = player.querySelector(".ytp-progress-bar");
  const time = document.createElement("div"); time.className = "ytp-time-display ytp-live";
  const badge = document.createElement("button"); badge.className = "ytp-live-badge ytp-live-badge-is-livehead"; badge.textContent = "Прямой эфир";
  time.append(badge); player.append(time);
  let mediaTime=5410.42, paused=false;
  Object.defineProperties(video, {
    currentTime:{configurable:true,get:()=>mediaTime,set:value=>{mediaTime=value}},
    duration:{configurable:true,get:()=>7810.233},
    seekable:{configurable:true,get:()=>({length:1,start:()=>0,end:()=>7810.233})},
    paused:{configurable:true,get:()=>paused}
  });
  video.play=async()=>{paused=false;video.dispatchEvent(new Event("play"))};
  video.pause=()=>{paused=true;video.dispatchEvent(new Event("pause"))};
  function setState(mode) {
    player.classList.toggle("ad-showing",mode==='ad');
    mediaTime=mode==='behind'?5100:5410.42;
    badge.classList.toggle("ytp-live-badge-is-livehead",mode==='live');badge.disabled=mode==='live';
    if(mode==='unknown') {
      for(const a of ['aria-valuemin','aria-valuemax','aria-valuenow'])progress.removeAttribute(a);
    } else {
      progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',mode==='live'?'5398':'5400');progress.setAttribute('aria-valuenow',mode==='live'?'5398':String(mediaTime));
    }
    video.dispatchEvent(new Event('timeupdate'));
  }
  badge.addEventListener('click',()=>setState('live'));
  for(const [mode,label] of [['live','Тест: прямой эфир'],['behind','Тест: отставание 5 минут'],['unknown','Тест: время неизвестно'],['ad','Тест: реклама']]) {
    const button=document.createElement('button');button.textContent=label;button.onclick=()=>setState(mode);document.querySelector('#status').before(button);
  }
  setState('live');
}
