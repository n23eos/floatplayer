"use strict";
(() => {
  const t = (key,fallback) => chrome.i18n.getMessage(key) || fallback;
  const status = document.getElementById('localDataStatus');
  const list = document.getElementById('channelProfiles');
  let generation = 0;
  async function render() {
    const ticket = ++generation;
    try {
      const profiles = await YTFP.localRecords.profiles();
      if (ticket !== generation) return;
      list.replaceChildren();
      if (!profiles.length) list.textContent = t('profilesEmpty','No saved channel profiles');
      for (const profile of profiles.sort((a,b) => a.title.localeCompare(b.title))) {
        const row = document.createElement('div'); row.className = 'row';
        const title = document.createElement('span'); title.textContent = `${profile.title} · ${profile.speed}× · ${profile.volume}%`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = t('profileDelete','Delete');
        remove.setAttribute('aria-label',`${remove.textContent}: ${profile.title}`);
        remove.onclick = async () => {
          remove.disabled = true;
          try { await YTFP.localRecords.removeProfile(profile.id); status.textContent = ''; await render(); }
          catch { status.textContent = t('optSaveError','Could not save'); remove.disabled = false; }
        };
        row.append(title,remove); list.append(row);
      }
    } catch { status.textContent = t('historyLoadError','Could not load local data'); }
  }
  document.getElementById('clearShortsHistory').onclick = async event => {
    event.currentTarget.disabled = true;
    try { await YTFP.localRecords.clearVisits(); status.textContent = t('historyCleared','History cleared'); }
    catch { status.textContent = t('optSaveError','Could not save'); }
    finally { document.getElementById('clearShortsHistory').disabled = false; }
  };
  chrome.storage.onChanged.addListener((changes,area) => { if (area === 'local' && Object.keys(changes).some(key => key.startsWith('channelProfile:'))) render(); });
  render();
})();
