import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKUP_FORMAT,LEGACY_FORMAT,parseImport,backupText,csvText} from './portability.mjs';
const state={schemaVersion:2,categories:[{id:'a',name:'A',color:'#123456',parentId:null,archived:false}],events:[{id:'e1',categoryId:'a',start:1,end:1,note:'零时长原始记录'}],logs:[{date:'2026-10-20',type:'晨间日志',content:'test'}]};
test('full backup roundtrip keeps zero duration event and logs',()=>{const parsed=parseImport(backupText(state));assert.equal(parsed.events[0].end,1);assert.deepEqual(parsed.logs,state.logs)});
test('legacy converted format uses existing categories',()=>{const imported=parseImport(JSON.stringify({format:LEGACY_FORMAT,events:state.events,logs:state.logs,source:{type:'xls'}}),state.categories);assert.equal(imported.events.length,1);assert.equal(imported.categories[0].id,'a')});
test('duplicate event ids are rejected before replacement',()=>assert.throws(()=>parseImport(JSON.stringify({format:BACKUP_FORMAT,state:{...state,events:[state.events[0],state.events[0]]}}))));
test('import rejects unsafe colors and broken category ancestry',()=>{
  assert.throws(()=>parseImport(backupText({...state,categories:[{...state.categories[0],color:'#123456;background:url(https://example.com)'}]})),/颜色无效/);
  assert.throws(()=>parseImport(backupText({...state,categories:[{...state.categories[0],parentId:'a'}]})),/上级关系无效/);
  assert.throws(()=>parseImport(backupText({...state,categories:[{...state.categories[0],parentId:'missing'}]})),/上级关系无效/);
});
test('Excel readable CSV neutralizes leading formulas',()=>{const csv=csvText(['备注'],[['=SUM(1,2)'],['hello']]);assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.startsWith('\uFEFF'))});
test('period review survives full backup and rejects malformed records',()=>{
  const reviews={'week:2026-10-19':{note:'记录本周收获',updatedAt:'2026-10-21T12:00:00.000Z'}};
  assert.deepEqual(parseImport(backupText({...state,reviews})).reviews,reviews);
  assert.throws(()=>parseImport(backupText({...state,reviews:{'bad':{note:'x',updatedAt:'now'}}})));
});
test('daily plan and summary survive full backup',()=>{
  const reviews={'day:2026-10-21':{plan:'读完一章',note:'完成了半章，明天继续',updatedAt:'2026-10-21T12:00:00.000Z'}};
  assert.deepEqual(parseImport(backupText({...state,reviews})).reviews,reviews);
  assert.throws(()=>parseImport(backupText({...state,reviews:{'day:2026-10-21':{plan:42,note:'x',updatedAt:'now'}}})));
});
