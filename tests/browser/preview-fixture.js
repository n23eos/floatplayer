// Real video in an external preview layer, matching YouTube's portal layout.
(() => {
  const layer = document.createElement('ytd-video-preview');
  layer.style.cssText = 'position:fixed;z-index:999;background:#111;border-radius:12px;overflow:hidden;display:none';
  layer.innerHTML = '<div id="media-container" style="width:100%;height:100%"><a id="media-container-link" style="display:block;height:100%"><video src="/sample.mp4" autoplay muted loop style="width:100%;height:100%;object-fit:cover"></video></a></div>';
  document.querySelector('ytd-app').append(layer);
  function show(card) {
    const thumbnail = card.querySelector('yt-thumbnail-view-model,ytd-thumbnail');
    const link = thumbnail.closest('a') || thumbnail.querySelector('a');
    const rect = thumbnail.getBoundingClientRect();
    Object.assign(layer.style,{display:'block',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    layer.querySelector('a').href=link.href;
    layer.querySelector('video').play().catch(()=>{});
  }
  for(const card of document.querySelectorAll('ytd-rich-item-renderer')) {
    if(card.querySelector('ytd-ad-slot-renderer'))continue;
    const link=card.querySelector('a');if(!link?.getAttribute('href')?.startsWith('/watch'))continue;
    card.addEventListener('pointerenter',()=>show(card));
    const button=document.createElement('button');button.className='test';button.textContent='Предпросмотр: '+card.querySelector('h3').textContent;
    button.onclick=()=>show(card);document.querySelector('#grid').before(button);
  }
  const hide=()=>{layer.style.display='none';layer.querySelector('video').pause()};
  layer.addEventListener('pointerleave',hide);
  document.addEventListener('yt-navigate-finish',hide);
  window.addEventListener('scroll',hide,true);
})();
