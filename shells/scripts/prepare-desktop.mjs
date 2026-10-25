import {mkdir,cp,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stage=path.join(root,'staging-desktop');
if(path.dirname(stage)!==root||path.basename(stage)!=='staging-desktop') throw Error('Refusing to clear an unexpected desktop staging path');
await rm(stage,{recursive:true,force:true});
await mkdir(path.join(stage,'desktop'),{recursive:true});
await cp(path.join(root,'web'),path.join(stage,'web'),{recursive:true,force:true});
await cp(path.join(root,'desktop','main.cjs'),path.join(stage,'desktop','main.cjs'),{force:true});
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'time-ledger',version:'0.1.0',main:'desktop/main.cjs',private:true},null,2));
console.log(`Prepared desktop staging in ${stage}`);
