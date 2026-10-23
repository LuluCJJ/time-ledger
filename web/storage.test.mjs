import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLocalState} from './storage.mjs';

test('invalid local record is preserved and never replaced during startup',()=>{
  const raw='{"events":[';
  let writes=0;
  const storage={getItem:()=>raw,setItem:()=>writes++};
  const result=loadLocalState(storage,'ledger',()=>({events:[],categories:[]}),x=>x);
  assert.ok(result.loadFailure);
  assert.equal(result.storedSnapshot,raw);
  assert.equal(writes,0);
});

test('valid local record and empty first launch remain editable',()=>{
  const value={events:[],categories:[],logs:[]};
  const valid=loadLocalState({getItem:()=>JSON.stringify(value)},'ledger',()=>null,x=>x);
  assert.equal(valid.loadFailure,null);
  assert.deepEqual(valid.state,value);
  const empty=loadLocalState({getItem:()=>null},'ledger',()=>value,x=>x);
  assert.equal(empty.loadFailure,null);
  assert.deepEqual(empty.state,value);
});
