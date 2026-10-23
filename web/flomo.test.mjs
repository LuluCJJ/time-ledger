import test from 'node:test';
import assert from 'node:assert/strict';
import {flomoDraftUrl,eventFlomoText,reviewFlomoText,validateFlomoWebhook,flomoPayload,flomoAccepted} from './flomo.mjs';

test('event draft keeps its source and note',()=>{
  const text=eventFlomoText({date:'2026-10-21',start:'09:00',end:'10:00',category:'工作 / 会议',note:'讨论了方案'});
  assert.match(text,/工作 \/ 会议/);
  assert.match(decodeURIComponent(flomoDraftUrl(text)),/讨论了方案/);
});
test('review draft identifies its period and guards empty or overlong content',()=>{
  assert.match(reviewFlomoText({kind:'week',period:'2026-10-19 至 2026-10-25',content:'本周完成了什么'}),/#周总结/);
  assert.throws(()=>reviewFlomoText({kind:'day',period:'2026-10-21',content:' '}));
  assert.throws(()=>flomoDraftUrl('x'.repeat(5001)));
});
test('webhook accepts only Flomo HTTPS ingress and keeps markdown payload',()=>{
  assert.equal(validateFlomoWebhook('https://flomoapp.com/iwh/example/token'),'https://flomoapp.com/iwh/example/token');
  for(const url of ['http://flomoapp.com/iwh/x','https://flomoapp.com.evil.test/iwh/x','https://evil.test/iwh/x','https://flomoapp.com/other'])assert.throws(()=>validateFlomoWebhook(url));
  assert.deepEqual(flomoPayload('#时间账\n完成事项'),{content:'#时间账\n完成事项',content_type:'markdown'});
  assert.throws(()=>flomoPayload('x'.repeat(5001)));
});
test('Flomo must confirm the note, not merely return HTTP 200',()=>{
  assert.equal(flomoAccepted({status:200,data:{code:0,message:'已记录'}}),true);
  assert.equal(flomoAccepted({status:200,data:'{"code":0,"message":"已记录"}'}),true);
  assert.equal(flomoAccepted({status:200,data:{code:1}}),false);
  assert.equal(flomoAccepted({status:200,data:'not json'}),false);
});
