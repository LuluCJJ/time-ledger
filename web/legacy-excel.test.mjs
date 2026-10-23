import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {parseLegacyExcel} from './legacy-excel.mjs';

const require=createRequire(import.meta.url);
globalThis.XLSX=require('./vendor/xlsx.full.min.js');

test('legacy Excel preserves event and journal content without a private fixture',async()=>{
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([
    ['起始时间','结束时间','分类','备注','总时长','预估时长','标签'],
    ['2026-10-20 09:00:00','2026-10-20 10:30:00','工作','虚构：整理资料','1时30分','',''],
    ['2026-10-20 10:35:00','2026-10-20 11:00:00','阅读','虚构：读书','25分','','']
  ]),'事件');
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([
    ['日期','日志类型','内容'],['2026-10-20','晨间日志','虚构：今天想阅读']
  ]),'日志');
  const bytes=XLSX.write(workbook,{bookType:'xls',type:'array'});
  const {payload,report}=await parseLegacyExcel(bytes,'fictional.xls');
  assert.equal(report.events,2);
  assert.equal(report.logs,1);
  assert.equal(payload.events[0].categoryId,'work');
  assert.equal(payload.events[0].note,'虚构：整理资料');
  assert.equal(payload.events[1].categoryId,'growth_read');
  assert.equal(payload.logs[0].content,'虚构：今天想阅读');
  assert.equal(payload.events[1].start-payload.events[0].end,5*60_000);
});
