import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdirSync} from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'web');
const testFiles=readdirSync(web).filter(file=>file.endsWith('.test.mjs'));
const checks=[
  ['Web tests','node',['--test',...testFiles],web],
  ['Tracked files','node',['scripts/check-public-tree.mjs'],root],
  ['Git history','node',['scripts/check-history.mjs'],root],
  ['Whitespace','git',['diff','--check'],root],
];
for(const [label,command,args,cwd] of checks){
  console.log(`\n== ${label} ==`);
  execFileSync(command,args,{cwd,stdio:'inherit'});
}
console.log('\nSource checks passed. Phone backup, visual review, and release signing require separate verification.');
