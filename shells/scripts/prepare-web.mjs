import {mkdir,copyFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(root,'../web');
const dest=path.join(root,'web');
const files=['index.html','app.mjs','model.mjs','portability.mjs','legacy-excel.mjs','color.mjs','insights.mjs','flomo.mjs','styles.css'];
await mkdir(dest,{recursive:true});
for(const file of files) await copyFile(path.join(source,file),path.join(dest,file));
await mkdir(path.join(dest,'vendor'),{recursive:true});
await copyFile(path.join(source,'vendor','xlsx.full.min.js'),path.join(dest,'vendor','xlsx.full.min.js'));
const html=await readFile(path.join(dest,'index.html'),'utf8');
if(!html.includes('<head>')||!html.includes('app.mjs')) throw Error('Web bundle is missing required HTML entry');
console.log(`Prepared ${files.length} local web files in ${dest}`);
