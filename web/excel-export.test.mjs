import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readableExcelBase64} from './excel-export.mjs';
import {parseLegacyExcel} from './legacy-excel.mjs';
import {preserveReadableImport} from './readable-excel-import.mjs';
import {parseImport} from './portability.mjs';

const require=createRequire(import.meta.url);
const XLSX=require('./vendor/xlsx.full.min.js');

test('readable Excel retains event, category, log and review text in separate sheets',()=>{
  const state={categories:[{id:'root',name:'工作',parentId:null,color:'#123456'},{id:'child',name:'会议',parentId:'root',color:'#345678'}],events:[{id:'event',categoryId:'child',start:1760000000000,end:1760001800000,note:'讨论下一步',estimateSeconds:1800}],logs:[{date:'2026-10-24',type:'晨间',content:'写下计划'}],reviews:{'day:2026-10-24':{plan:'完成设计',note:'已完成',updatedAt:'2026-10-24T12:00:00.000Z'}}};
  const bytes=Buffer.from(readableExcelBase64(state,XLSX),'base64');
  assert.ok(bytes.length>1000);
  const book=XLSX.read(bytes,{type:'buffer'});
  assert.deepEqual(book.SheetNames,['时间记录','分类','日志','日周月总结','说明']);
  const rows=XLSX.utils.sheet_to_json(book.Sheets['时间记录'],{header:1});
  assert.equal(rows[1][2],'工作');
  assert.equal(rows[1][3],'会议');
  assert.equal(rows[1][5],'讨论下一步');
  assert.equal(XLSX.utils.sheet_to_json(book.Sheets['日周月总结'],{header:1})[1][3],'已完成');
});

test('text beginning with an Excel formula remains text',()=>{
  const state={categories:[{id:'a',name:'日常',parentId:null,color:'#123456'}],events:[{id:'e',categoryId:'a',start:1760000000000,end:1760000001000,note:'=HYPERLINK("https://example.com")'}],logs:[],reviews:{}};
  const book=XLSX.read(Buffer.from(readableExcelBase64(state,XLSX),'base64'),{type:'buffer'});
  const cell=book.Sheets['时间记录'].F2;
  assert.equal(cell.t,'s');
  assert.equal(cell.f,undefined);
});

test('a readable Excel export can be previewed and restored without the legacy 事件 sheet',async()=>{
  const state={categories:[{id:'root',name:'工作',parentId:null,color:'#123456',archived:false},{id:'child',name:'会议',parentId:'root',color:'#345678',archived:false}],events:[{id:'event',categoryId:'child',start:1760000000000,end:1760001800000,note:'讨论下一步',estimateSeconds:1800}],logs:[{date:'2026-10-24',type:'晨间',content:'写下计划'}],reviews:{'day:2026-10-24':{plan:'完成设计',note:'已完成',updatedAt:'2026-10-24T12:00:00.000Z'}}};
  globalThis.XLSX=XLSX;
  const bytes=Buffer.from(readableExcelBase64(state,XLSX),'base64');
  const parsed=await parseLegacyExcel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'时间账-可读表格.xlsx');
  const restored=parseImport(JSON.stringify(parsed.payload));
  assert.equal(parsed.report.kind,'readable');
  assert.equal(restored.events[0].note,'讨论下一步');
  assert.equal(restored.events[0].categoryId,'child');
  assert.equal(restored.events[0].start,state.events[0].start);
  assert.equal(restored.categories[1].parentId,'root');
  assert.equal(restored.logs[0].content,'写下计划');
  assert.equal(restored.reviews['day:2026-10-24'].plan,'完成设计');
});

test('new readable Excel preserves legacy provenance through a fresh import',async()=>{
  const state={categories:[{id:'a',name:'日常',parentId:null,color:'#123456'}],events:[{id:'old',categoryId:'a',start:1760000000000,end:1760000001000,note:'例子',sourceRow:2,sourceCategoryName:'睡觉',legacyDuration:'1秒',legacyEstimate:'',legacyTags:'#日常'}],logs:[],reviews:{}};
  globalThis.XLSX=XLSX;
  const bytes=Buffer.from(readableExcelBase64(state,XLSX),'base64');
  const parsed=await parseLegacyExcel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'可读.xlsx');
  const restored=parseImport(JSON.stringify(parsed.payload));
  for(const field of ['sourceRow','sourceCategoryName','legacyDuration','legacyEstimate','legacyTags'])assert.equal(restored.events[0][field],state.events[0][field]);
});

test('older readable Excel remains importable and cannot erase newer local events',async()=>{
  const state={categories:[{id:'a',name:'日常',parentId:null,color:'#123456'}],events:[{id:'old',categoryId:'a',start:1760000000000,end:1760000001000,note:'例子',sourceRow:2,sourceCategoryName:'睡觉',legacyDuration:'1秒',legacyEstimate:'',legacyTags:'#日常'}],logs:[],reviews:{}};
  globalThis.XLSX=XLSX;
  const book=XLSX.read(Buffer.from(readableExcelBase64(state,XLSX),'base64'),{type:'buffer'});
  const rows=XLSX.utils.sheet_to_json(book.Sheets['时间记录'],{header:1,defval:''}).map(row=>row.slice(0,12));
  book.Sheets['时间记录']=XLSX.utils.aoa_to_sheet(rows);
  const bytes=Buffer.from(XLSX.write(book,{bookType:'xlsx',type:'base64'}),'base64');
  const parsed=await parseLegacyExcel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'旧版可读.xlsx');
  const incoming=parseImport(JSON.stringify(parsed.payload));
  assert.equal(incoming.events[0].sourceCategoryName,undefined);
  assert.equal(preserveReadableImport(state,incoming).events[0].sourceCategoryName,'睡觉');
  const newer={...state,events:[...state.events,{id:'new',categoryId:'a',start:1760000002000,end:null,note:''}]};
  assert.throws(()=>preserveReadableImport(newer,incoming),/比当前记录旧/);
});
