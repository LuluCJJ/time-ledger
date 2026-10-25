import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLegacyExcel} from '../web/legacy-excel.mjs';
import {parseImport} from '../web/portability.mjs';

const require=createRequire(import.meta.url);
globalThis.XLSX=require('../web/vendor/xlsx.full.min.js');

function uniqueBy(items,key){
  const map=new Map();let duplicates=0;
  for(const item of items){
    const id=item[key];
    if(id==null||id==='')continue;
    if(map.has(id))duplicates++;
    else map.set(id,item);
  }
  return {map,duplicates};
}
function overlap(left,right,key,fields){
  const a=uniqueBy(left,key),b=uniqueBy(right,key);
  let exact=0,changed=0,missing=0;
  const changedFieldCounts=Object.fromEntries(fields.map(field=>[field,0]));
  let openToClosed=0,closedToOpen=0;
  for(const [id,item] of a.map){
    const other=b.map.get(id);
    if(!other)missing++;
    else if(fields.every(field=>item[field]===other[field]))exact++;
    else {
      changed++;
      for(const field of fields)if(item[field]!==other[field])changedFieldCounts[field]++;
      if(fields.includes('end')){
        if(item.end==null&&other.end!=null)openToClosed++;
        if(item.end!=null&&other.end==null)closedToOpen++;
      }
    }
  }
  return {left:left.length,right:right.length,exact,changed,missing,
    rightOnly:[...b.map.keys()].filter(id=>!a.map.has(id)).length,
    leftWithoutKey:left.length-a.map.size-a.duplicates,rightWithoutKey:right.length-b.map.size-b.duplicates,
    leftDuplicateKeys:a.duplicates,rightDuplicateKeys:b.duplicates,
    changedFieldCounts:Object.fromEntries(Object.entries(changedFieldCounts).filter(([,count])=>count>0)),
    ...(fields.includes('end')?{openToClosed,closedToOpen}:{})};
}
async function parseSheet(path){
  const bytes=readFileSync(path);
  const {payload,report}=await parseLegacyExcel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'private-snapshot');
  return {payload,report};
}

export async function compareSnapshots(legacyPath,readablePath,backupPath){
  const legacy=await parseSheet(legacyPath),readable=await parseSheet(readablePath);
  if(legacy.payload.format!=='time-ledger-import-v1'||readable.payload.format!=='time-ledger-backup-v1')throw Error('Unexpected workbook type');
  const backup=parseImport(readFileSync(backupPath,'utf8'));
  const current=readable.payload.state;
  const old=legacy.payload;
  return {
    fileHashes:{legacy:legacy.report.sha256,readable:readable.report.sha256},
    counts:{legacyEvents:old.events.length,readableEvents:current.events.length,backupEvents:backup.events.length,
      legacyLogs:old.logs.length,readableLogs:current.logs.length,backupLogs:backup.logs.length,
      readableCategories:current.categories.length,backupCategories:backup.categories.length,
      readableReviews:Object.keys(current.reviews||{}).length,backupReviews:Object.keys(backup.reviews||{}).length},
    legacyInReadableEvents:overlap(old.events,current.events,'sourceRow',['start','end','note','categoryId']),
    legacyInReadableLogs:overlap(old.logs,current.logs,'sourceRow',['date','type','content']),
    backupInReadableEvents:overlap(backup.events,current.events,'id',['start','end','note','categoryId']),
    backupInReadableLogs:overlap(backup.logs,current.logs,'sourceRow',['date','type','content']),
  };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==5){console.error('Usage: node scripts/compare-migration-snapshots.mjs <legacy.xls> <readable.xlsx> <complete-backup.json>');process.exitCode=2}
  else try{console.log(JSON.stringify(await compareSnapshots(...process.argv.slice(2)),null,2))}
  catch{console.error('Migration comparison failed: check workbook types and backup validity. Original files were not changed.');process.exitCode=1}
}
