// 只读端到端校验：原 XLS -> Python 转换 -> 浏览器 JSON 格式验证；不落盘或输出备注。
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {initialCategories} from './model.mjs';
import {parseImport} from './portability.mjs';

const [xls,python='python']=process.argv.slice(2);
if(!xls) throw Error('Usage: node integration-smoke.mjs <source.xls> [python-executable]');
const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'legacy_xls_converter.py');
const code='import importlib.util,json,sys; from pathlib import Path; s=importlib.util.spec_from_file_location("converter",sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(m.convert(Path(sys.argv[2])),ensure_ascii=True))';
const child=spawnSync(python,['-c',code,script,xls],{encoding:'utf8',maxBuffer:50*1024*1024,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
if(child.status!==0)throw Error(child.stderr.trim()||`Converter exit ${child.status}`);
const imported=parseImport(child.stdout,initialCategories);
console.log(JSON.stringify({events:imported.events.length,logs:imported.logs.length,categories:imported.categories.length,zeroDuration:imported.events.filter(e=>e.end===e.start).length,serializedChars:child.stdout.length}));
