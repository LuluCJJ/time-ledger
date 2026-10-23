import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const root=resolve(import.meta.dirname);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port=Number(process.env.PORT||4174);
createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403).end();return}
  try{const data=await readFile(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream'}).end(data)}
  catch{res.writeHead(404).end('Not found')}
}).listen(port,'127.0.0.1',()=>process.stdout.write(`Time Ledger preview: http://127.0.0.1:${port}/\n`));
