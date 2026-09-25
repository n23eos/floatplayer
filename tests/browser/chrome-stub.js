// Только локальный тестовый стенд. В пакет расширения не входит.
const listeners = new Set();
const readStore = area => JSON.parse(localStorage.getItem(`fp-test-${area}`) || '{}');
function storage(area) {
  return {
    async get(defaults) { const values = readStore(area); return typeof defaults === 'string' ? { [defaults]: values[defaults] } : { ...defaults, ...values }; },
    async set(values) {
      const before = readStore(area), after = { ...before, ...values };
      localStorage.setItem(`fp-test-${area}`, JSON.stringify(after));
      const changes = Object.fromEntries(Object.entries(values).map(([key,newValue]) => [key, { oldValue: before[key], newValue }]));
      for (const fn of listeners) fn(changes, area);
    },
    async remove(key) { const values = readStore(area); for (const item of Array.isArray(key) ? key : [key]) delete values[item]; localStorage.setItem(`fp-test-${area}`, JSON.stringify(values)); }
  };
}
window.chrome = {
  runtime: { getURL: file => `/extension/${file}`, getManifest: () => window.testManifest || ({ version: '1.20.0-dev' }), onMessage: { addListener() {} }, sendMessage: async message => {
    const mode = new URLSearchParams(location.search).get('update') || 'idle';
    if (['update-state','check-update','install-update'].includes(message?.command)) {
      if (mode === 'error') throw new Error('Fixture update error');
      if (mode === 'unpacked') return {status:'unpacked'};
      if (message.command === 'install-update') return {status:mode === 'open-player' ? 'close_player' : 'installing'};
      if (mode === 'available' || mode === 'open-player') return {status:'update_available',version:'1.23.0'};
      return {status: message.command === 'check-update' ? (mode === 'throttled' ? 'throttled' : 'no_update') : 'idle'};
    }
    return message?.command === 'resolve-target' ? {id:1,url:'https://www.youtube.com/watch?v=AAAAAAAAAAA',playerState:{playerPage:true,pipOpen:false,title:'Тестовое видео'}} : ({tabId:1});
  } },
  tabs: {sendMessage:async (_id, message) => message?.command === 'toggle-pip' ? {ok:true} : ({playerPage:true,pipOpen:false}), create:async () => {}},
  i18n: { getMessage: key => window.testMessages?.[key]?.message || '', getUILanguage: () => 'ru' },
  storage: { sync: storage('sync'), local: storage('local'), onChanged: { addListener: fn => listeners.add(fn) } }
};
window.addEventListener('storage', event => {
  if (!event.key?.startsWith('fp-test-')) return;
  const before = JSON.parse(event.oldValue || '{}'), after = JSON.parse(event.newValue || '{}');
  const changes = Object.fromEntries(Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(key => [key,{ newValue: after[key] }]));
  for (const fn of listeners) fn(changes, event.key.slice(8));
});
