import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLegacyExcel} from '../web/legacy-excel.mjs';
import {parseImport} from '../web/portability.mjs';

const require=createRequire(import.meta.url);
const XLSX=require('../web/vendor/xlsx.full.min.js');

function uniqueRows(items){
  const rows=new Map();let duplicates=0;
  for(const item of items){
    if(!Number.isInteger(item.sourceRow))continue;
    if(rows.has(item.sourceRow))duplicates++;
    else rows.set(item.sourceRow,item);
  }
  return {rows,duplicates};
}

function sameFields(a,b,fields){return fields.every(field=>a[field]===b[field])}

export function compareLegacyPayloadToBackup(legacy,backup){
  const oldEvents=uniqueRows(legacy.events),phoneEvents=uniqueRows(backup.events);
  const oldLogs=uniqueRows(legacy.logs),phoneLogs=uniqueRows(backup.logs);
  if(oldEvents.duplicates||oldLogs.duplicates)throw Error('旧导出含重复来源行号');
  const eventFields=['start','end','sourceCategoryName','note','legacyDuration','legacyEstimate','legacyTags'];
  const logFields=['date','type','content'];
  let eventsExact=0,eventsChanged=0,eventsMissing=0,logsExact=0,logsChanged=0,logsMissing=0;
  for(const [row,old] of oldEvents.rows){
    const current=phoneEvents.rows.get(row);
    if(!current)eventsMissing++;
    else if(sameFields(old,current,eventFields))eventsExact++;
    else eventsChanged++;
  }
  for(const [row,old] of oldLogs.rows){
    const current=phoneLogs.rows.get(row);
    if(!current)logsMissing++;
    else if(sameFields(old,current,logFields))logsExact++;
    else logsChanged++;
  }
  const extraImportedEvents=[...phoneEvents.rows.keys()].filter(row=>!oldEvents.rows.has(row)).length;
  const extraImportedLogs=[...phoneLogs.rows.keys()].filter(row=>!oldLogs.rows.has(row)).length;
  return {
    legacyEvents:legacy.events.length,backupEvents:backup.events.length,
    eventsExact,eventsChanged,eventsMissing,
    extraImportedEvents,nativeEvents:backup.events.filter(event=>!Number.isInteger(event.sourceRow)).length,
    duplicateBackupEventRows:phoneEvents.duplicates,
    legacyLogs:legacy.logs.length,backupLogs:backup.logs.length,
    logsExact,logsChanged,logsMissing,extraImportedLogs,
    duplicateBackupLogRows:phoneLogs.duplicates,
    complete:eventsChanged===0&&eventsMissing===0&&logsChanged===0&&logsMissing===0&&phoneEvents.duplicates===0&&phoneLogs.duplicates===0,
  };
}

export async function compareFiles(xlsPath,backupPath){
  const xls=readFileSync(xlsPath);
  globalThis.XLSX=XLSX;
  const {payload}=await parseLegacyExcel(xls.buffer.slice(xls.byteOffset,xls.byteOffset+xls.byteLength),'private.xls');
  const backup=parseImport(readFileSync(backupPath,'utf8'));
  return compareLegacyPayloadToBackup(payload,backup);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4){console.error('用法：node scripts/compare-legacy-backup.mjs <旧时间日志.xls> <完整备份.json>');process.exitCode=2}
  else try{
    const result=await compareFiles(process.argv[2],process.argv[3]);
    console.log(JSON.stringify(result,null,2));
    if(!result.complete)process.exitCode=1;
  }catch{
    // Parser exceptions may contain private values or paths.
    console.error('比对失败：文件不可读、格式不符或旧导出来源行号重复。原文件未被修改。');
    process.exitCode=1;
  }
}
