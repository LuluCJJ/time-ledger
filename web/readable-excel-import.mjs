const EVENT_HEADERS=['开始时间','结束时间','一级分类','具体分类','用时（分钟）','备注','状态','预估（分钟）','原标签','来源行号','事件ID','分类ID'];
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
  if(JSON.stringify(actual)!==JSON.stringify(headers))throw Error(`“${name}”表列名与时间账导出不一致`);
  return data.map((cells,index)=>({row:index+2,cells:cells.map(asText)}))
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
    if(cells.length!==EVENT_HEADERS.length)throw Error(`“时间记录”第 ${row} 行列数不符`);
    const start=dateTime(cells[0],row),end=cells[1]?dateTime(cells[1],row):null;
    if((end===null)!==(cells[6]==='进行中'))throw Error(`“时间记录”第 ${row} 行状态与结束时间不符`);
    const estimate=optionalNumber(cells[7],row,'预估时长');
    const event={id:cells[10],categoryId:cells[11],start,end,note:cells[5]};
    if(estimate!==null)event.estimateSeconds=Math.round(estimate*60);
    if(cells[8])event.legacyTags=cells[8];
    if(cells[9])event.sourceRow=Number(cells[9]);
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
