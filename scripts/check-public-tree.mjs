import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const paths=git('ls-files','-z').split('\0').filter(Boolean);
const forbidden=/\.(?:xls|xlsx|csv|db|sqlite|sqlite3|apk|exe|mp4|m4a|jks|keystore)$/i;
const unsafePaths=paths.filter(path=>forbidden.test(path)||/(?:^|\/)(?:private|backups|recordings)(?:\/|$)/i.test(path));
if(unsafePaths.length) throw Error(`Tracked private/build files: ${unsafePaths.join(', ')}`);
const checks=[
  {name:'private webhook',pattern:/flomoapp\.com\/iwh\/[A-Za-z0-9]+\/[A-Za-z0-9]+/i},
  {name:'local user path',pattern:/[A-Z]:[\\/]Users[\\/][^\\/\s"']+/i},
  {name:'private key block',pattern:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
];
const textPaths=paths.filter(path=>/\.(?:md|mjs|js|cjs|json|py|java|gradle|xml|html|css|properties|txt|gitignore)$/i.test(path)&&!path.endsWith('xlsx.full.min.js'));
const findings=[];
const knownFake=['https://flomoapp.com','/iwh/example/token'].join('');
for(const path of textPaths){
  const body=readFileSync(path,'utf8');
  const scanBody=body.replaceAll(knownFake,'');
  for(const check of checks) if(check.pattern.test(scanBody)) findings.push(`${path}: ${check.name}`);
}
if(findings.length) throw Error(`Sensitive-pattern findings:\n${findings.join('\n')}`);
console.log(`Public-tree check passed: ${paths.length} tracked paths, ${textPaths.length} text files.`);
console.log('Manual image, history, and content review is still required.');
