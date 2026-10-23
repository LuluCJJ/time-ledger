export const MINUTE = 60_000;
export const pad = n => String(n).padStart(2, '0');
export function localInput(ms,seconds=false) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}${seconds?':'+pad(d.getSeconds()):''}`;
}
export function time(ms,seconds=false) { return new Date(ms).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:seconds?'2-digit':undefined,hour12:false}); }
export function dayKey(ms) { return localInput(ms).slice(0,10); }
export function duration(ms,seconds=false) {
  const value=Math.max(0,ms),mins=Math.floor(value / MINUTE);
  return `${Math.floor(mins/60)} 小时 ${pad(mins%60)} 分钟${seconds?' '+pad(Math.floor(value/1000)%60)+' 秒':''}`;
}
export function clockParts(ms) {
  const seconds=Math.max(0,Math.floor(ms/1000));
  return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(pad);
}
export function estimateStatus(event,now=Date.now()) {
  if(event.estimateSeconds==null) return null;
  const delta=now-event.start-event.estimateSeconds*1000;
  return {over:delta>=0,ms:Math.abs(delta)};
}
// 名称、父子关系来自用户提供的四张原 App 截图；颜色按用户反馈调整。
export const initialCategories = [
  ['daily','日常','#929995',null],
  ['daily_eat','吃饭','#b7b9b2','daily'],
  ['daily_house','家务','#abb2aa','daily'],
  ['daily_wash','洗漱','#c4cac7','daily'],
  ['daily_travel','路上','#969e9c','daily'],
  ['daily_sleep','睡觉','#a8afad','daily'],
  ['growth','提升','#008b72',null],
  ['growth_sport','运动','#48bd88','growth'],
  ['growth_ai','大模型应用','#60c49b','growth'],
  ['growth_review','项目复盘','#82be95','growth'],
  ['growth_resume','简历撰写','#005b4f','growth'],
  ['growth_duolingo','多领国','#008d78','growth'],
  ['growth_read','阅读','#008b74','growth'],
  ['growth_output','输出','#008b74','growth'],
  ['work_group','工作','#36a9d4',null],
  ['meeting','会议','#36a9d4','work_group'],
  ['work','工作','#91d9e9','work_group'],
  ['fun','娱乐','#994146',null],
  ['fun_slack','摸鱼','#f08b9c','fun'],
  ['fun_game','打游戏','#f15875','fun'],
  ['fun_video','短视频/追剧/看小说','#f15875','fun'],
  ['fun_extreme','极','#161012','fun'],
  ['other','其他','#8d817c',null],
  ['other_social','社交/旅游','#a39792','other'],
].map(([id,name,color,parentId])=>({id,name,color,parentId,archived:false}));
export function initializeCategories(existing=[],upgradeLegacy=false) {
  const ids=new Set(initialCategories.map(c=>c.id));
  return [...initialCategories.map(c=>{const old=existing.find(x=>x.id===c.id);return old&&!(upgradeLegacy&&['work','meeting'].includes(c.id))?{...c,...old}:{...c,archived:old?.archived??false}}),
    ...existing.filter(c=>!ids.has(c.id)).map(c=>({...c,archived:upgradeLegacy&&c.id==='rest'?true:c.archived}))];
}
export function seed(now=Date.now()) {
  return {schemaVersion:6,categories:initializeCategories(),events:[],logs:[],reviews:{},source:{type:'local'}};
}
export function ordered(events) { return [...events].sort((a,b)=>a.start-b.start); }
export function propose(events, draft, now=Date.now()) {
  const parsed={...draft,start:Number(draft.start),end:draft.end==null?null:Number(draft.end)};
  if (!Number.isFinite(parsed.start) || parsed.start>now+MINUTE) throw Error('开始时间无效或晚于当前时间');
  if (parsed.end!==null && (!Number.isFinite(parsed.end) || parsed.end<=parsed.start || parsed.end>now+MINUTE)) throw Error('结束时间须晚于开始时间且不晚于当前时间');
  if (parsed.end===null && events.some(e=>e.end===null && e.id!==parsed.id)) throw Error('已有进行中的事件');
  const old=events.find(e=>e.id===parsed.id);
  const list=ordered([...events.filter(e=>e.id!==parsed.id).map(e=>({...e})),parsed]);
  const i=list.findIndex(e=>e.id===parsed.id), changes=[];
  if (i>0 && list[i-1].end!==null && list[i-1].end>parsed.start) {
    const prev=list[i-1];
    if(parsed.start<=prev.start) throw Error('新起点会让上一段变成零时长，请先单独调整上一段');
    changes.push({id:prev.id,field:'end',before:prev.end,after:parsed.start});
    prev.end=parsed.start;
  }
  if (i<list.length-1) {
    const next=list[i+1];
    if(parsed.end===null) throw Error('进行中的事件不能排在后续事件之前');
    if(parsed.end>next.start) {
      if(next.end!==null && parsed.end>=next.end) throw Error('新终点会让下一段变成零时长，请先单独调整下一段');
      changes.push({id:next.id,field:'start',before:next.start,after:parsed.end});
      next.start=parsed.end;
    }
  }
  return {events:list,changes,old};
}
export function proposeSwitch(events,draft,now=Date.now()) {
  const active=events.find(e=>e.end===null);
  if(!active) throw Error('当前没有进行中的记录');
  const start=Number(draft.start);
  if(!Number.isFinite(start)||start<=active.start) throw Error('下一段的起点必须晚于当前段的起点');
  const closed=events.map(e=>e.id===active.id?{...e,end:start}:{...e});
  const result=propose(closed,draft,now);
  result.changes.unshift({id:active.id,field:'end',before:null,after:start});
  return result;
}
export function proposeSplit(events,id,at,newId) {
  const original=events.find(e=>e.id===id),point=Number(at);
  if(!original||original.end===null) throw Error('只能拆分已结束的记录');
  if(!Number.isFinite(point)||point<=original.start||point>=original.end) throw Error('拆分时点必须在这段记录内部');
  if(!newId||events.some(e=>e.id===newId)) throw Error('新记录编号重复或缺失');
  const first={...original,end:point};
  const second={...original,id:newId,start:point,sourceRow:undefined,legacyDuration:undefined,legacyEstimate:undefined,estimateSeconds:null,splitFrom:original.id};
  return {events:ordered([...events.filter(e=>e.id!==id).map(e=>({...e})),first,second]),first,second};
}
export function proposeMergeSplit(events,id) {
  const list=ordered(events),index=list.findIndex(e=>e.id===id),first=list[index],second=list[index+1];
  if(!first||!second||second.splitFrom!==first.id||first.end===null||second.end===null||first.end!==second.start||first.categoryId!==second.categoryId||first.note!==second.note||second.estimateSeconds!=null)
    throw Error('只能合并仍相邻、内容一致的拆分段；其他情况请先单独修改');
  const merged={...first,end:second.end};
  return {events:ordered([...list.filter(e=>e.id!==first.id&&e.id!==second.id).map(e=>({...e})),merged]),first,second,merged};
}
export function allocate(events, from, to, now=Date.now()) {
  const result=new Map();
  for(const e of events) {
    let cursor=Math.max(e.start,from), limit=Math.min(e.end??now,to);
    while(cursor<limit) {
      const next=new Date(cursor); next.setHours(24,0,0,0);
      const finish=Math.min(limit,next.getTime()), key=dayKey(cursor);
      result.set(key,(result.get(key)||0)+finish-cursor); cursor=finish;
    }
  }
  return result;
}
