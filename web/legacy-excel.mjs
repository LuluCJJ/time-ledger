const HEADERS={
  '事件':['起始时间','结束时间','分类','备注','总时长','预估时长','标签'],
  '日志':['日期','日志类型','内容']
};
const CATEGORY_IDS={
  '日常':'daily','吃饭':'daily_eat','家务':'daily_house','洗漱':'daily_wash','路上':'daily_travel','睡觉':'daily_sleep',
  '提升':'growth','运动':'growth_sport','大模型应用':'growth_ai','项目复盘':'growth_review','简历撰写':'growth_resume',
  '多领国':'growth_duolingo','多邻国':'growth_duolingo','阅读':'growth_read','输出':'growth_output',
  '工作':'work','会议':'meeting','娱乐':'fun','摸鱼':'fun_slack','打游戏':'fun_game',
  '短视频/追剧/看小说':'fun_video','极':'fun_extreme','其他':'other','社交/旅游':'other_social'
};

function cell(value){return value==null?'':String(value)}
function timeMs(value,row){
  const text=cell(value).trim();
  const match=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if(!match)throw Error(`事件第 ${row} 行的时间格式无法识别`);
  const [,year,month,day,hour,minute,second='00']=match;
  const canonical=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute}:${second}+08:00`;
  const result=Date.parse(canonical);
  if(!Number.isFinite(result)||new Date(result+8*3600_000).toISOString().slice(0,19)!==canonical.slice(0,19))throw Error(`事件第 ${row} 行的日期无效`);
  return result;
}
function readRows(workbook,name){
  const sheet=workbook.Sheets[name];
  if(!sheet)throw Error(`Excel 缺少“${name}”工作表`);
  const rows=globalThis.XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:true});
  const actual=(rows.shift()||[]).map(cell);
  if(JSON.stringify(actual)!==JSON.stringify(HEADERS[name]))throw Error(`“${name}”表列名与原时间日志导出不一致：${actual.join('、')}`);
  return rows.map((cells,index)=>({row:index+2,cells:cells.map(cell)})).filter(({cells})=>cells.some(x=>x!==''));
}
function bytesHex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')}
export async function parseLegacyExcel(arrayBuffer,fileName){
  if(!globalThis.XLSX)throw Error('Excel 读取组件尚未载入');
  const digest=bytesHex(new Uint8Array(await crypto.subtle.digest('SHA-256',arrayBuffer)));
  const workbook=globalThis.XLSX.read(arrayBuffer,{type:'array'});
  const eventRows=readRows(workbook,'事件'),logRows=readRows(workbook,'日志');
  const unknown=new Map(),events=[];
  for(const {row,cells} of eventRows){
    if(cells.length!==7)throw Error(`事件第 ${row} 行列数不符`);
    const [startText,endText,categoryName,note,total,estimate,tags]=cells;
    if(!categoryName)throw Error(`事件第 ${row} 行缺少分类`);
    const start=timeMs(startText,row),end=timeMs(endText,row);
    if(end<start)throw Error(`事件第 ${row} 行结束早于开始`);
    let categoryId=CATEGORY_IDS[categoryName];
    if(!categoryId){if(!unknown.has(categoryName))unknown.set(categoryName,`legacy_${unknown.size+1}`);categoryId=unknown.get(categoryName)}
    events.push({id:`xls_${digest.slice(0,20)}_${row}`,categoryId,start,end,note,legacyDuration:total,legacyEstimate:estimate,legacyTags:tags,sourceRow:row,sourceCategoryName:categoryName});
  }
  const logs=logRows.map(({row,cells})=>{
    if(cells.length!==3)throw Error(`日志第 ${row} 行列数不符`);
    return {date:cells[0],type:cells[1],content:cells[2],sourceRow:row};
  });
  const payload={format:'time-ledger-import-v1',source:{type:'xls',fileName,sha256:digest,timeZone:'Asia/Shanghai'},events,logs,
    extraCategories:Array.from(unknown,([name,id])=>({id,name,color:'#808a86',parentId:null,archived:false}))};
  return {payload,report:{events:events.length,logs:logs.length,unknownCategories:[...unknown.keys()],zeroDuration:events.filter(e=>e.start===e.end).length,
    noteCount:events.filter(e=>e.note).length,firstStart:events.reduce((min,e)=>Math.min(min,e.start),Infinity),lastEnd:events.reduce((max,e)=>Math.max(max,e.end),-Infinity),sha256:digest}};
}
