import {readFileSync,writeFileSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseImport,backupText} from '../web/portability.mjs';

const FIELDS=['sourceCategoryName','legacyDuration','legacyEstimate','legacyTags'];
const sameCore=(a,b)=>a.start===b.start&&a.end===b.end&&a.note===b.note&&a.categoryId===b.categoryId&&a.sourceRow===b.sourceRow;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function recoverProvenance(earlier,later){
  const oldById=new Map(earlier.events.map(event=>[event.id,event]));
  const newById=new Map(later.events.map(event=>[event.id,event]));
  const missing=[...oldById.keys()].filter(id=>!newById.has(id));
  if(missing.length)throw Error('The newer backup is missing events from the earlier backup');
  const events=later.events.map(event=>{
    const old=oldById.get(event.id);
    if(!old||!Number.isInteger(old.sourceRow))return event;
    if(!sameCore(old,event))throw Error('An imported event changed its core fields');
    const copy={...event};
    for(const field of FIELDS){
      if(!Object.hasOwn(old,field))continue;
      if(Object.hasOwn(copy,field)&&copy[field]!==old[field])throw Error('An imported provenance field conflicts');
      copy[field]=old[field];
    }
    return copy;
  });
  return {...later,events};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==5){console.error('Usage: node scripts/recover-legacy-provenance.mjs <earlier-complete.json> <newer-complete.json> <new-private-output.json>');process.exitCode=2}
  else {
    const [oldPath,newPath,outPath]=process.argv.slice(2);
    let temp;
    try{
      if(existsSync(outPath))throw Error('Output exists');
      const oldBytes=readFileSync(oldPath),newBytes=readFileSync(newPath);
      const old=parseImport(oldBytes.toString('utf8'));
      const recent=parseImport(newBytes.toString('utf8'));
      const restored=recoverProvenance(old,recent);
      const text=backupText(restored);
      const checked=parseImport(text);
      if(checked.events.length!==recent.events.length||checked.logs.length!==recent.logs.length)throw Error('Roundtrip count mismatch');
      temp=`${outPath}.tmp-${process.pid}`;
      writeFileSync(temp,text,{encoding:'utf8',flag:'wx'});
      renameSync(temp,outPath);
      const recovered=restored.events.filter(event=>Number.isInteger(event.sourceRow)&&FIELDS.every(field=>Object.hasOwn(event,field))).length;
      console.log(JSON.stringify({earlierSha256:sha256(oldBytes),newerSha256:sha256(newBytes),outputSha256:sha256(Buffer.from(text)),events:restored.events.length,logs:restored.logs.length,provenanceRecoveredEvents:recovered},null,2));
    }catch{
      if(temp&&existsSync(temp))unlinkSync(temp);
      console.error('Recovery candidate was not created: backups conflict, output exists, or a file is invalid. Originals were not changed.');
      process.exitCode=1;
    }
  }
}
