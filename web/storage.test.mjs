import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLocalState,persistLocalState} from './storage.mjs';

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

test('failed device write restores the last persisted ledger instead of showing an unsaved edit',()=>{
  const prior={events:[{id:'saved'}],categories:[],reviews:{}};
  const changed={events:[{id:'unsaved'}],categories:[],reviews:{}};
  const snapshot=JSON.stringify(prior);
  const storage={setItem:()=>{throw new Error('quota exceeded')}};
  const result=persistLocalState(storage,'ledger',changed,snapshot);
  assert.equal(result.saved,false);
  assert.deepEqual(result.state,prior);
  assert.equal(result.lastSavedJson,snapshot);
  assert.deepEqual(changed.events,[{id:'unsaved'}]);
});

test('successful device write advances the rollback point',()=>{
  const data={events:[{id:'new'}],categories:[],reviews:{}};
  let written='';
  const result=persistLocalState({setItem:(_key,value)=>written=value},'ledger',data,'old');
  assert.equal(result.saved,true);
  assert.equal(written,JSON.stringify(data));
  assert.equal(result.lastSavedJson,written);
});
