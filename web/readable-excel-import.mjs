const EVENT_HEADERS_V1=['开始时间','结束时间','一级分类','具体分类','用时（分钟）','备注','状态','预估（分钟）','原标签','来源行号','事件ID','分类ID'];
const EVENT_HEADERS=[...EVENT_HEADERS_V1,'原分类名','原总时长','原预估时长'];
const CATEGORY_HEADERS=['分类ID','名称','一级分类','上级ID','颜色','已归档'];
const LOG_HEADERS=['日期','类型','内容','来源行号'];
const REVIEW_HEADERS=['周期','起始日期','今天想做的事','总结','更新时间'];
const PERIODS={'日':'day','周':'week','月':'month'};

const asText=value=>value==null?'':String(value);
function rows(workbook,XLSX,name,headers){
  const sheet=workbook.Sheets[name];
  if(!sheet)throw Error(`时间账表格缺少“${name}”工作表`);
  const data=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:false});
  const actual=(data.shift()||[]).map(asText);
  if(JSON.stringify(actual)!==JSON.stringify(headers)&&!(name==='时间记录'&&JSON.stringify(actual)===JSON.stringify(EVENT_HEADERS_V1)))throw Error(`“${name}”表列名与时间账导出不一致`);
  return data.map((cells,index)=>({row:index+2,cells:Array.from({length:actual.length},(_,column)=>asText(cells[column]))}))
    .filter(({cells})=>cells.some(value=>value!==''));
}
function dateTime(value,row){
  const match=/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if(!match)throw Error(`“时间记录”第 ${row} 行的时间格式无法识别`);
  const canonical=`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
  const ms=Date.parse(`${canonical}+08:00`);
  if(!Number.isFinite(ms)||new Date(ms+8*3600_000).toISOString().slice(0,19)!==canonical)throw Error(`“时间记录”第 ${row} 行的时间无效`);
  return ms;
}
function optionalNumber(value,row,label){
  if(value==='')return null;
  const number=Number(value);
  if(!Number.isFinite(number)||number<0)throw Error(`“时间记录”第 ${row} 行的${label}无效`);
  return number;
}
export function parseReadableWorkbook(workbook,XLSX,fileName,digest){
  const categoryRows=rows(workbook,XLSX,'分类',CATEGORY_HEADERS);
  const eventRows=rows(workbook,XLSX,'时间记录',EVENT_HEADERS);
  const logRows=rows(workbook,XLSX,'日志',LOG_HEADERS);
  const reviewRows=rows(workbook,XLSX,'日周月总结',REVIEW_HEADERS);
  const categories=categoryRows.map(({row,cells})=>{
    if(cells.length!==CATEGORY_HEADERS.length)throw Error(`“分类”第 ${row} 行列数不符`);
    return {id:cells[0],name:cells[1],parentId:cells[3]||null,color:cells[4],archived:cells[5]==='是'};
  });
  const events=eventRows.map(({row,cells})=>{
    if(cells.length!==EVENT_HEADERS.length&&cells.length!==EVENT_HEADERS_V1.length)throw Error(`“时间记录”第 ${row} 行列数不符`);
    const start=dateTime(cells[0],row),end=cells[1]?dateTime(cells[1],row):null;
    if((end===null)!==(cells[6]==='进行中'))throw Error(`“时间记录”第 ${row} 行状态与结束时间不符`);
    const estimate=optionalNumber(cells[7],row,'预估时长');
    const event={id:cells[10],categoryId:cells[11],start,end,note:cells[5]};
    if(estimate!==null)event.estimateSeconds=Math.round(estimate*60);
    if(cells[8]||cells.length===EVENT_HEADERS.length&&cells[9])event.legacyTags=cells[8];
    if(cells[9])event.sourceRow=Number(cells[9]);
    if(cells.length===EVENT_HEADERS.length&&cells[9]){
      event.sourceCategoryName=cells[12];
      event.legacyDuration=cells[13];
      event.legacyEstimate=cells[14];
    }
    return event;
  });
  const logs=logRows.map(({row,cells})=>{
    if(cells.length!==LOG_HEADERS.length)throw Error(`“日志”第 ${row} 行列数不符`);
    return {date:cells[0],type:cells[1],content:cells[2],...(cells[3]?{sourceRow:Number(cells[3])}:{})};
  });
  const reviews={};
  for(const {row,cells} of reviewRows){
    if(cells.length!==REVIEW_HEADERS.length)throw Error(`“日周月总结”第 ${row} 行列数不符`);
    const period=PERIODS[cells[0]];
    if(!period)throw Error(`“日周月总结”第 ${row} 行周期无效`);
    const key=`${period}:${cells[1]}`;
    if(Object.hasOwn(reviews,key))throw Error(`“日周月总结”第 ${row} 行周期重复`);
    reviews[key]={plan:cells[2],note:cells[3],updatedAt:cells[4]};
  }
  const state={schemaVersion:6,categories,events,logs,reviews,source:{type:'readable-xlsx',fileName,sha256:digest}};
  return {payload:{format:'time-ledger-backup-v1',state},report:{kind:'readable',events:events.length,logs:logs.length,reviews:Object.keys(reviews).length,sha256:digest}};
}

const PROVENANCE_FIELDS=['sourceCategoryName','legacyDuration','legacyEstimate','legacyTags'];
export function preserveReadableImport(current,incoming){
  if(!current.events.length)return incoming;
  const importedEvents=new Map(incoming.events.map(event=>[event.id,event]));
  const importedCategories=new Set(incoming.categories.map(category=>category.id));
  const importedLogs=new Set(incoming.logs.map(log=>JSON.stringify(log)));
  if(current.events.some(event=>!importedEvents.has(event.id))||
     current.categories.some(category=>!importedCategories.has(category.id))||
     current.logs.some(log=>!importedLogs.has(JSON.stringify(log)))||
     Object.keys(current.reviews||{}).some(key=>!Object.hasOwn(incoming.reviews||{},key)))
    throw Error('这份可读表格比当前记录旧，导入会丢失已有内容。请使用更新的完整 JSON 备份。');
  const existingEvents=new Map(current.events.map(event=>[event.id,event]));
  return {...incoming,events:incoming.events.map(event=>{
    const old=existingEvents.get(event.id);
    if(!old||!Number.isInteger(old.sourceRow)||old.sourceRow!==event.sourceRow)return event;
    const copy={...event};
    for(const field of PROVENANCE_FIELDS){
      if(!Object.hasOwn(old,field))continue;
      if(Object.hasOwn(copy,field)&&copy[field]!==old[field])throw Error('可读表格中的旧来源字段与当前记录冲突，请改用完整 JSON 备份。');
      copy[field]=old[field];
    }
    return copy;
  })};
}
