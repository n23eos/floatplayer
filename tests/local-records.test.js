import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function setup(initial = {}) {
  const data = {...initial};
  const chrome = { storage:{ local:{ get:async key => key === null ? {...data} : {[key]:data[key]}, set:async values => Object.assign(data,values), remove:async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; } } } };
  const context = vm.createContext({chrome});
  vm.runInContext(readFileSync('extension/shared/local-records.js','utf8'),context);
  return { records:context.YTFP.localRecords, data };
}
test('history keeps 100 newest unique video records and survives reload', async () => {
  const {records,data} = setup();
  for (let i=0;i<102;i++) await records.recordVisit({id:String(i).padStart(11,'0'),title:`Video ${i}`,at:i});
  const items = await records.visits();
  expect(items).toHaveLength(100); expect(items[0].title).toBe('Video 101');
  expect(items.some(item => item.title === 'Video 0')).toBe(false);
  await records.recordVisit({id:items[0].id,title:'Updated',at:200});
  expect(await records.visits()).toHaveLength(100);
  expect((await setup(data).records.visits())[0].title).toBe('Updated');
});
test('clear history preserves channel profiles and unrelated settings', async () => {
  const {records,data} = setup({pagePanelPosition:{x:.5,y:.5},'channelProfile:test':{keep:true}});
  await records.recordVisit({id:'AAAAAAAAAAA',title:'Video',at:1}); await records.clearVisits();
  expect(await records.visits()).toHaveLength(0); expect(data.pagePanelPosition).toBeTruthy(); expect(data['channelProfile:test']).toBeTruthy();
});
test('profiles reject implicit boost and invalid channel identifiers', async () => {
  const {records} = setup(); const profile = {id:'UCabcdefghijklmnopqrstuv',title:'Channel',speed:1.5,volume:150,allowBoost:false};
  await expect(records.saveProfile(profile)).rejects.toThrow();
  await records.saveProfile({...profile,allowBoost:true});
  expect((await records.getProfile(profile.id)).volume).toBe(150);
  await records.removeProfile(profile.id); expect(await records.getProfile(profile.id)).toBeNull();
  await expect(records.saveProfile({...profile,id:'@handle',volume:50})).rejects.toThrow();
});
test('malformed storage is ignored and records in different tabs do not replace each other', async () => {
  const {records,data} = setup({'shortsVisit:AAAAAAAAAAA':{id:'BBBBBBBBBBB',title:'Wrong',at:1}});
  expect(await records.visits()).toHaveLength(0);
  await Promise.all([records.recordVisit({id:'BBBBBBBBBBB',title:'B',at:2}),records.recordVisit({id:'CCCCCCCCCCC',title:'C',at:3})]);
  expect((await records.visits()).map(item => item.id)).toEqual(['CCCCCCCCCCC','BBBBBBBBBBB']);
  expect(data['shortsVisit:BBBBBBBBBBB']).toBeTruthy();
});
