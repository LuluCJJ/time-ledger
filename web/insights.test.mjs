import test from 'node:test';
import assert from 'node:assert/strict';
import {periodInsights} from './insights.mjs';
import {initialCategories} from './model.mjs';

const at=value=>new Date(value).getTime();
test('period clips events and groups child time under its parent',()=>{
  const from=at('2026-10-19T00:00:00'),to=at('2026-10-26T00:00:00');
  const events=[
    {categoryId:'daily_travel',start:from-3_600_000,end:from+3_600_000},
    {categoryId:'daily_sleep',start:at('2026-10-20T23:30:00'),end:at('2026-10-21T07:30:00')},
    {categoryId:'growth_read',start:to-3_600_000,end:to+3_600_000},
  ];
  const result=periodInsights(events,initialCategories,from,to);
  assert.equal(result.recorded,10*3_600_000);
  assert.equal(result.groups.find(x=>x.id==='daily').ms,9*3_600_000);
  assert.equal(result.groups.find(x=>x.id==='daily').children.find(x=>x.id==='daily_travel').ms,3_600_000);
  assert.equal(result.bedtime,'23:30');
  assert.equal(result.sleepCount,1);
});

test('naps and short sleep records do not count as bedtime',()=>{
  const from=at('2026-10-19T00:00:00'),to=at('2026-10-26T00:00:00');
  const events=[{categoryId:'daily_sleep',start:at('2026-10-20T13:00:00'),end:at('2026-10-20T14:00:00')}];
  assert.equal(periodInsights(events,initialCategories,from,to).bedtime,null);
});
