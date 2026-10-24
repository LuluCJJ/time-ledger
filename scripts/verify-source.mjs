import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdirSync} from 'node:fs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'web');
const testFiles=readdirSync(web).filter(file=>file.endsWith('.test.mjs'));
const checks=[
  ['Web tests','node',['--test',...testFiles],web],
  ['Public path tests','node',['--test','scripts/public-paths.test.mjs'],root],
  ['Private-data inspection tests','node',['--test','scripts/check-private-backup.test.mjs','scripts/compare-legacy-backup.test.mjs'],root],
  ['Tracked files','node',['scripts/check-public-tree.mjs'],root],
  ['Git history','node',['scripts/check-history.mjs'],root],
  ['Committed whitespace','git',['show','--format=','--check','HEAD'],root],
  ['Working-tree whitespace','git',['diff','--check','HEAD'],root],
];
for(const [label,command,args,cwd] of checks){
  console.log(`\n== ${label} ==`);
  execFileSync(command,args,{cwd,stdio:'inherit'});
}
console.log('\nSource checks passed. Phone backup, visual review, and release signing require separate verification.');
