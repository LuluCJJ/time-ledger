import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {extractFile,listPackage} from '@electron/asar';

const shellsRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.resolve(shellsRoot,'..');
const packageRoot=path.resolve(process.argv[2]||path.join(shellsRoot,'dist','TimeLedger-win32-x64'));
const archive=path.join(packageRoot,'resources','app.asar');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
const expected=new Map([
  ['desktop/main.cjs',path.join(shellsRoot,'desktop','main.cjs')],
  ...['index.html','app.mjs','model.mjs','portability.mjs','legacy-excel.mjs','readable-excel-import.mjs','color.mjs','insights.mjs','flomo.mjs','storage.mjs','excel-export.mjs','styles.css']
    .map(name=>[`web/${name}`,path.join(sourceRoot,'web',name)]),
  ['web/vendor/xlsx.full.min.js',path.join(sourceRoot,'web','vendor','xlsx.full.min.js')],
  ['web/legal/PROJECT-LICENSE.txt',path.join(sourceRoot,'LICENSE')],
  ['web/legal/SHEETJS-LICENSE.txt',path.join(sourceRoot,'web','vendor','SHEETJS-LICENSE.txt')],
  ['web/legal/CAPACITOR-LICENSE.txt',path.join(shellsRoot,'node_modules','@capacitor','android','LICENSE')],
  ['web/legal/ANDROID-DEPENDENCIES.txt',path.join(sourceRoot,'docs','ANDROID_DEPENDENCIES.txt')],
]);
const normalize=name=>name.replace(/^[\\/]+/,'').replaceAll('\\','/');
const contents=listPackage(archive).map(normalize).filter(name=>name&&!name.endsWith('/'));
const files=contents.filter(name=>!['desktop','web','web/vendor','web/legal'].includes(name));
const unexpected=files.filter(name=>name!=='package.json'&&!expected.has(name));
const missing=[...expected.keys(),'package.json'].filter(name=>!files.includes(name));
if(unexpected.length||missing.length) throw Error(`Unexpected or missing desktop archive entries: ${JSON.stringify({unexpected,missing})}`);
for(const [name,source] of expected){
  const packed=extractFile(archive,name.replaceAll('/',path.sep));
  if(hash(packed)!==hash(await readFile(source))) throw Error(`Desktop package differs from source: ${name}`);
}
const metadata=JSON.parse(extractFile(archive,`package.json`).toString('utf8'));
if(metadata.name!=='time-ledger'||metadata.main!=='desktop/main.cjs'||metadata.version!=='0.1.0') throw Error('Unexpected desktop package metadata');
const electronLicense=await readFile(path.join(packageRoot,'LICENSE'));
if(hash(electronLicense)!==hash(await readFile(path.join(shellsRoot,'node_modules','electron','LICENSE')))) throw Error('Electron license differs from pinned package');
if((await stat(path.join(packageRoot,'LICENSES.chromium.html'))).size<1000000) throw Error('Chromium notices are missing or implausibly small');
const executable=path.join(packageRoot,'TimeLedger.exe');
if((await stat(executable)).size<1000000) throw Error('Desktop executable is missing or implausibly small');
console.log(`Verified ${files.length} desktop archive entries against current source.`);
console.log(`EXE SHA-256: ${hash(await readFile(executable))}`);
console.log(`ASAR SHA-256: ${hash(await readFile(archive))}`);
console.log('Electron license and Chromium notice file present.');
