const {app,BrowserWindow,net,protocol}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

protocol.registerSchemesAsPrivileged([{scheme:'ledger',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const webRoot=path.resolve(__dirname,'../web');

app.whenReady().then(()=>{
  protocol.handle('ledger',request=>{
    const url=new URL(request.url);
    if(url.host!=='bundle') return new Response('Not found',{status:404});
    const target=path.resolve(webRoot,decodeURIComponent(url.pathname).replace(/^\/+/,''));
    const relative=path.relative(webRoot,target);
    if(relative.startsWith('..')||path.isAbsolute(relative)) return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(target).toString());
  });
  const smoke=process.env.TIMELEDGER_SMOKE==='1';
  const win=new BrowserWindow({width:1120,height:820,minWidth:360,minHeight:540,show:!smoke,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('ledger://bundle/'))event.preventDefault()});
  win.loadURL('ledger://bundle/index.html');
  if(smoke)win.webContents.once('did-finish-load',async()=>{
    try{
      const result=await win.webContents.executeJavaScript(`new Promise(resolve=>{let attempts=0;const check=()=>{const main=document.querySelector('#main');if(main?.textContent?.includes('时间线')||++attempts>20)resolve({title:document.title,mainText:main?.textContent?.slice(0,100)||'',origin:location.origin});else setTimeout(check,100)};check()})`);
      if(process.env.TIMELEDGER_SMOKE_OUT)fs.writeFileSync(process.env.TIMELEDGER_SMOKE_OUT,JSON.stringify(result));
      app.exit(result.mainText?0:2);
    }catch(error){if(process.env.TIMELEDGER_SMOKE_OUT)fs.writeFileSync(process.env.TIMELEDGER_SMOKE_OUT,String(error));app.exit(3)}
  });
});
app.on('window-all-closed',()=>app.quit());
