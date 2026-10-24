import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBackup} from './check-private-backup.mjs';
import {backupText} from '../web/portability.mjs';

const state = {
  schemaVersion: 6,
  categories: [{id:'a',name:'虚构分类',color:'#123456',parentId:null}],
  events: [{id:'e',categoryId:'a',start:1,end:2,note:'虚构私密备注'}],
  logs: [{date:'2026-10-24',type:'晨间日志',content:'虚构日志'}],
  reviews: {'day:2026-10-24':{plan:'虚构计划',note:'虚构总结',updatedAt:'now'}},
};

test('backup inspector confirms roundtrip and prints only counts/hash', () => {
  const result = inspectBackup(Buffer.from(backupText(state)));
  assert.equal(result.events, 1);
  assert.equal(result.categories, 1);
  assert.equal(result.logs, 1);
  assert.equal(result.dailyReviews, 1);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(result).includes('虚构私密备注'));
});

test('backup inspector rejects empty and malformed files', () => {
  assert.throws(() => inspectBackup(Buffer.alloc(0)));
  assert.throws(() => inspectBackup(Buffer.from('{}')));
});
