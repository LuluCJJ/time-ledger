import test from 'node:test';
import assert from 'node:assert/strict';
import {compareLegacyPayloadToBackup} from './compare-legacy-backup.mjs';

const event={sourceRow:2,start:100,end:200,sourceCategoryName:'阅读',note:'虚构备注',legacyDuration:'100',legacyEstimate:'',legacyTags:''};
const log={sourceRow:2,date:'2026-01-01',type:'晨间',content:'虚构日志'};

test('dated legacy snapshot can be a complete subset of a later phone backup',()=>{
  const result=compareLegacyPayloadToBackup({events:[event],logs:[log]},
    {events:[event,{sourceRow:3,start:201,end:300},{start:301,end:null}],logs:[log]});
  assert.equal(result.complete,true);
  assert.equal(result.eventsExact,1);
  assert.equal(result.extraImportedEvents,1);
  assert.equal(result.nativeEvents,1);
});

test('changed source fields, missing rows and duplicate lineage fail the comparison',()=>{
  const changed=compareLegacyPayloadToBackup({events:[event],logs:[log]},
    {events:[{...event,note:'另一条备注'},{...event}],logs:[]});
  assert.equal(changed.complete,false);
  assert.equal(changed.eventsChanged,1);
  assert.equal(changed.logsMissing,1);
  assert.equal(changed.duplicateBackupEventRows,1);
});
