import {execFileSync} from 'node:child_process';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
const objects=git('rev-list','--objects','--all').trim().split('\n').map(line=>{const space=line.indexOf(' ');return {id:space<0?line:line.slice(0,space),path:space<0?'':line.slice(space+1)}}).filter(x=>x.path);
const commitEmails=git('log','--all','--format=%ae%n%ce').trim().split('\n').filter(Boolean);
const publicEmailPattern=/@users\.noreply\.github\.com$/i;
const exposedEmailCount=new Set(commitEmails.filter(email=>!publicEmailPattern.test(email))).size;
const forbidden=/\.(?:xls|xlsx|csv|db|sqlite|sqlite3|apk|exe|mp4|m4a|jks|keystore)$/i;
const unsafePaths=objects.filter(x=>forbidden.test(x.path)||/(?:^|\/)(?:private|backups|recordings)(?:\/|$)/i.test(x.path));
const sensitive=[/flomoapp\.com\/iwh\/[A-Za-z0-9]+\/[A-Za-z0-9]+/i,/[A-Z]:[\\/]Users[\\/][^\\/\s"']+/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const findings=[];
const seen=new Set();
const knownFake=['https://flomoapp.com','/iwh/example/token'].join('');
for(const {id,path} of objects){
  if(seen.has(id)||path.endsWith('xlsx.full.min.js'))continue;
  seen.add(id);
  if(git('cat-file','-t',id).trim()!=='blob')continue;
  const body=execFileSync('git',['cat-file','blob',id],{maxBuffer:32*1024*1024});
  if(body.includes(0))continue;
  const value=body.toString('utf8').replaceAll(knownFake,'');
  if(sensitive.some(pattern=>pattern.test(value)))findings.push({path,id:id.slice(0,12)});
}
console.log(`History checked: ${objects.length} named objects, ${seen.size} distinct eligible blobs.`);
console.log(`Commit identity check: ${exposedEmailCount} distinct non-GitHub-private email address(es). Review author and committer metadata before publication; this is informational for contributors.`);
if(unsafePaths.length||findings.length){
  for(const item of unsafePaths)console.error(`Forbidden history path: ${item.path}`);
  for(const item of findings)console.error(`Sensitive-pattern blob: ${item.path} ${item.id}`);
  process.exitCode=1;
}else console.log('No forbidden history paths or sensitive-pattern blobs found.');
