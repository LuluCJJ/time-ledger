const MAX_EVENTS=100_000;
const MAX_LOGS=100_000;
export const BACKUP_FORMAT='time-ledger-backup-v1';
export const LEGACY_FORMAT='time-ledger-import-v1';

export function parseImport(text,baseCategories=[]) {
  const input=JSON.parse(text);
  if(!input||![BACKUP_FORMAT,LEGACY_FORMAT].includes(input.format)) throw Error('文件格式不是时间账备份或旧 XLS 转换文件');
  const state=input.format===BACKUP_FORMAT?input.state:{
    schemaVersion:3,categories:[...baseCategories,...(input.extraCategories||[])],
    events:input.events,logs:input.logs,source:input.source
  };
  if(!state||!Array.isArray(state.events)||!Array.isArray(state.categories)||!Array.isArray(state.logs)) throw Error('文件缺少分类、事件或日志列表');
  if(state.events.length>MAX_EVENTS||state.logs.length>MAX_LOGS) throw Error('记录数量超过本机上限');
  if(state.reviews!==undefined){
    if(!state.reviews||typeof state.reviews!=='object'||Array.isArray(state.reviews)||Object.keys(state.reviews).length>2400)throw Error('复盘记录格式无效');
    for(const [key,review] of Object.entries(state.reviews)){
      const validKey=/^(day|week|month):\d{4}-\d{2}-\d{2}$/.test(key);
      const validPlan=!key.startsWith('day:')||typeof review?.plan==='string'&&review.plan.length<=4000;
      if(!validKey||!review||typeof review.note!=='string'||review.note.length>4000||!validPlan||typeof review.updatedAt!=='string')throw Error('复盘记录内容无效');
    }
  }
  const categoryIds=new Set();for(const c of state.categories){if(typeof c.id!=='string'||!c.id||typeof c.name!=='string'||categoryIds.has(c.id))throw Error('分类 ID 或名称无效');
    if(typeof c.color!=='string'||!/^#[0-9a-f]{6}$/i.test(c.color))throw Error(`分类 ${c.id} 的颜色无效`);
    if(c.parentId!==null&&c.parentId!==undefined&&typeof c.parentId!=='string')throw Error(`分类 ${c.id} 的上级无效`);
    categoryIds.add(c.id)}
  const parents=new Map(state.categories.map(c=>[c.id,c.parentId]));
  for(const c of state.categories){const seen=new Set([c.id]);let parent=c.parentId;while(parent){if(!categoryIds.has(parent)||seen.has(parent))throw Error(`分类 ${c.id} 的上级关系无效`);seen.add(parent);parent=parents.get(parent)}}
  const eventIds=new Set();let running=0;
  for(const e of state.events){if(typeof e.id!=='string'||!e.id||eventIds.has(e.id))throw Error('事件 ID 重复或无效');eventIds.add(e.id);
    if(!categoryIds.has(e.categoryId))throw Error(`事件 ${e.id} 的分类不存在`);
    if(!Number.isFinite(e.start)||e.end!==null&&(!Number.isFinite(e.end)||e.end<e.start))throw Error(`事件 ${e.id} 的时间无效`);
    if(e.end===null)running++;
    if(typeof e.note!=='string')throw Error(`事件 ${e.id} 的备注无效`);
  }
  if(running>1)throw Error('文件中有多条进行中事件');
  for(const log of state.logs)if(typeof log.date!=='string'||typeof log.type!=='string'||typeof log.content!=='string')throw Error('日志字段无效');
  return {...state,schemaVersion:state.schemaVersion??2};
}
export function backupText(state){return JSON.stringify({format:BACKUP_FORMAT,exportedAt:new Date().toISOString(),state})}
export function safeCsvCell(value){let s=String(value??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`}
export function csvText(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(safeCsvCell).join(',')).join('\r\n')+'\r\n'}
