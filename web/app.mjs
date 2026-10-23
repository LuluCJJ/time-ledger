import {MINUTE,seed,initializeCategories,ordered,propose,proposeSwitch,proposeSplit,proposeMergeSplit,allocate,localInput,time,dayKey,duration,clockParts,estimateStatus} from './model.mjs?v=21';
import {parseImport,backupText,csvText} from './portability.mjs?v=21';
import {parseLegacyExcel} from './legacy-excel.mjs?v=17';
import {whiteLabelColor} from './color.mjs?v=19';
import {periodInsights} from './insights.mjs?v=19';
import {flomoDraftUrl,eventFlomoText,reviewFlomoText,validateFlomoWebhook,flomoPayload,flomoAccepted} from './flomo.mjs?v=23';
import {loadLocalState} from './storage.mjs?v=1';
const KEY='personal-time-ledger-demo-v1';
const FLOMO_KEY='personal-time-ledger-flomo-webhook-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeState(raw){const version=Number(raw.schemaVersion)||0;
  if(version<4)for(const c of raw.categories||[]){const old={daily_eat:'#a0a4a2',daily_wash:'#a0a4a2',daily_travel:'#a0a4a2',daily_sleep:'#819080'}[c.id];if(old&&c.color?.toLowerCase()===old)c.color={daily_eat:'#c88964',daily_wash:'#78b7c3',daily_travel:'#859bd1',daily_sleep:'#7789b7'}[c.id]}
  if(version<6)for(const c of raw.categories||[]){const previous={daily:'#77a555',daily_eat:'#c88964',daily_house:'#77a555',daily_wash:'#78b7c3',daily_travel:'#859bd1',daily_sleep:'#7789b7',other:'#aa6868',other_social:'#aa6868'}[c.id];const updated={daily:'#929995',daily_eat:'#b7b9b2',daily_house:'#abb2aa',daily_wash:'#c4cac7',daily_travel:'#969e9c',daily_sleep:'#a8afad',other:'#8d817c',other_social:'#a39792'}[c.id];if(previous&&c.color?.toLowerCase()===previous)c.color=updated}
  raw.categories=initializeCategories(raw.categories,version<2);
  if(version<3){const old=raw.categories.find(c=>c.id==='growth_duolingo');if(old?.name==='多邻国')old.name='多领国'}
  raw.schemaVersion=6;raw.logs??=[];if(!raw.reviews||typeof raw.reviews!=='object'||Array.isArray(raw.reviews))raw.reviews={};raw.source??={type:'demo'};return raw}
let {state,loadFailure,storedSnapshot}=loadLocalState(localStorage,KEY,seed,normalizeState);
let view='today',editId=null,switchFrom=null,pending=null,pendingImport=null,pendingMerge=null,categoryEditId=null,splitId=null,undoEvents=null,undoLabel='',selectedDay=dayKey(Date.now()),weekZoom=1;
let flomoSending=false,flomoSent=false;
const save=()=>{if(loadFailure){alert('本机记录读取失败，已暂停保存以保护原始数据');return false}try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(error){alert('本机保存失败，请检查应用存储权限');return false}};
const rememberEvents=label=>{undoEvents=structuredClone(state.events);undoLabel=label};
function undoLast(){if(!undoEvents)return;state.events=undoEvents;undoEvents=null;undoLabel='';save();render()}
const category=id=>state.categories.find(c=>c.id===id)||{name:'未知分类',color:'#888'};
const shortDuration=ms=>{const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s/60)%60,sec=s%60;return `${h?`${h}小时`:''}${m||h?`${m}分`:''}${sec&&!h?`${sec}秒`:''}${!h&&!m&&!sec?'0秒':''}`};
const tint=(hex,amount)=>{const rgb=/^#([0-9a-f]{6})$/i.exec(hex||'');if(!rgb)return '#f2f4f6';return '#'+rgb[1].match(/../g).map(x=>Math.round(parseInt(x,16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('')};
const name=id=>{const c=category(id),p=c.parentId?category(c.parentId):null;return p?`${p.name} / ${c.name}`:c.name};
function render(){if(loadFailure){document.querySelectorAll('nav button').forEach(b=>b.disabled=true);$('#main').innerHTML=`<section class="card data-section"><h2>本机记录暂时无法读取</h2><p>为避免覆盖原始记录，已暂停编辑和保存。请先保留原始数据副本，再检查或恢复；不要清除应用数据。</p>${storedSnapshot?'<button class="primary" data-action="export-raw">保存原始数据副本</button>':'<p>本机存储目前无法读取，请不要在此设备新增记录。</p>'}<p>原始副本可能包含私人记录，不要上传到公开仓库。</p><p id="exportStatus" role="status" aria-live="polite"></p></section>`;return}
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
  $('#main').innerHTML=view==='today'?today():view==='week'?period(7):view==='month'?period(30):view==='categories'?categories():dataPage();
}
const midnight=key=>new Date(`${key}T00:00:00`).getTime();
const addDays=(key,n)=>{const d=new Date(midnight(key));d.setDate(d.getDate()+n);return dayKey(d.getTime())};
function weekStart(key){const d=new Date(midnight(key));return addDays(key,-((d.getDay()+6)%7))}
function dayPicker(){const first=weekStart(selectedDay),days=['一','二','三','四','五','六','日'];
  return `<div class="day-nav"><button data-day-step="-1" aria-label="前一天">‹</button><label>查看日期 <input id="pickDay" type="date" value="${esc(selectedDay)}"></label><button data-day-step="1" aria-label="后一天">›</button>${selectedDay!==dayKey(Date.now())?'<button class="today-jump" data-action="go-today">回到今天</button>':''}</div><div class="week-strip">${days.map((x,i)=>{const key=addDays(first,i),isToday=key===dayKey(Date.now());return `<button data-day="${key}" class="${key===selectedDay?'active':''}" aria-label="${key}"><span>周${x}</span><strong>${isToday?'今':Number(key.slice(-2))}</strong></button>`}).join('')}</div>`}
function eventRow(e,from,to){const c=category(e.categoryId),end=e.end??Date.now(),a=Math.max(from,e.start),b=Math.min(to,end);
  return `<div class="timeline-item"><div class="timeline-hours"><strong>${esc(time(a))}</strong><small>${e.end?esc(time(b)):'进行中'}</small></div><div class="timeline-block" style="--event-color:${esc(c.color)};--label-color:${whiteLabelColor(c.color)};--event-soft:${tint(c.color,.87)};--event-hover:${tint(c.color,.78)}"><button class="timeline-open" data-edit="${esc(e.id)}" aria-label="编辑 ${esc(name(e.categoryId))}，${esc(time(a))} 至 ${e.end?esc(time(b)):'现在'}"><span class="timeline-top"><strong>${shortDuration(b-a)}</strong><span class="timeline-category">${esc(name(e.categoryId))}</span></span>${e.note?`<span class="timeline-note">${esc(e.note)}</span>`:''}</button>${e.note?`<div class="timeline-tools"><button class="quiet" data-flomo-event="${esc(e.id)}">将备注填入 Flomo</button></div>`:''}</div></div>`}
function dayReview(key){const review=state.reviews[`day:${key}`]||{},isToday=key===dayKey(Date.now());
  return `<section class="card day-review"><h2>${isToday?'今天':'这一天'}的记录</h2><div class="day-review-fields"><label>${isToday?'今天':'这天'}想做的事<textarea id="dayPlan" rows="3" maxlength="4000" placeholder="先记下想做的事；之后可以修改">${esc(review.plan??'')}</textarea></label><label>${isToday?'今天':'这天'}的总结<textarea id="daySummary" rows="3" maxlength="4000" placeholder="做了什么，有什么收获，接下来想调整什么">${esc(review.note??'')}</textarea></label></div><div class="review-actions"><button class="primary" data-action="save-day-review" data-review-day="${esc(key)}">保存当天记录</button><button data-flomo-review="day" data-review-day="${esc(key)}">总结填入 Flomo</button><span id="dayReviewStatus" role="status">${review.updatedAt?'已保存':''}</span></div></section>`}
function today(){const now=Date.now(),events=ordered(state.events),active=events.find(e=>e.end===null),from=midnight(selectedDay),to=midnight(addDays(selectedDay,1));let html=dayPicker();
  if(undoEvents)html+=`<div class="undo-bar"><span>刚才${esc(undoLabel)}，可撤销这一次时间修改。</span><button data-action="undo">撤销上一步</button></div>`;
  if(selectedDay===dayKey(now)){
    html+=`<section class="card current"><h2>当前进行</h2>`;
    if(active){html+=`<div class="row-title"><span class="dot" style="background:${esc(category(active.categoryId).color)}"></span>${esc(name(active.categoryId))}</div><div class="elapsed" id="elapsed">${duration(now-active.start,true)}</div><div class="meta">${esc(localInput(active.start,true).replace('T',' '))} 开始</div><div class="actions"><button class="primary" data-action="switch">完成并选下一段</button><button data-action="clock">专注时钟</button><button data-action="stop">只完成这段</button><button data-edit="${esc(active.id)}">修改</button></div>`}
    else{const last=events.at(-1);html+=`<p class="empty-current">${last?'当前没有进行中的记录。':'从这一刻开始，记下你正在做的事。'}</p>${last?`<p class="meta">新段默认接着 ${esc(localInput(last.end).replace('T',' '))}，可改实际起点。</p>`:''}<button class="primary" data-action="add">${last?'继续添加':'开始记录'}</button>`}
    html+='</section>';
  }
  html+=`<section class="card day-timeline"><div class="section-head"><h2>${esc(selectedDay)} 时间线</h2><span class="meta">${duration([...allocate(events,from,to,now).values()].reduce((a,b)=>a+b,0))}</span></div>`;
  const shown=events.filter(e=>(e.end??now)>from&&e.start<to);if(!shown.length){const previous=events.filter(e=>(e.end??now)<=from).at(-1),key=previous?dayKey(previous.start):null;html+=`<p class="muted">这一天还没有记录。${key?`<button class="quiet" data-day="${key}" data-open-day="1">查看最近有记录的 ${esc(key)}</button>`:''}</p>`}
  const gap=(start,end)=>end-start>=MINUTE?`<button class="timeline-gap" data-fill-start="${start}" data-fill-end="${end}" aria-label="补记 ${esc(time(start))} 至 ${esc(time(end))} 的空档">空档 ${duration(end-start)} · 点此补记</button>`:'';
  let prev=from;for(const e of shown){const start=Math.max(from,e.start);html+=gap(prev,start);html+=eventRow(e,from,to);prev=Math.max(prev,Math.min(to,e.end??now))}
  html+=gap(prev,Math.min(to,now));
  return html+'</section>'+dayReview(selectedDay);
}
function colorBands(from,to){const span=to-from,now=Date.now(),parts=state.events.map(e=>({e,a:Math.max(e.start,from),b:Math.min(e.end??now,to)})).filter(x=>x.b>x.a);
  return `<span class="color-bands" aria-label="一天 24 小时的记录位置；空白代表未记录">${parts.map(({e,a,b})=>`<span style="left:${(a-from)/span*100}%;width:${(b-a)/span*100}%;background:${esc(category(e.categoryId).color)}" title="${esc(name(e.categoryId))} ${esc(time(a))}–${esc(time(b))}"></span>`).join('')}</span>`}
function slicesForDay(key){const start=midnight(key),finish=midnight(addDays(key,1)),now=Date.now();return state.events.map(e=>({e,a:Math.max(e.start,start),b:Math.min(e.end??now,finish)})).filter(x=>x.b>x.a).sort((x,y)=>x.a-y.a)}
function weekGrid(first){const days=['一','二','三','四','五','六','日'];
  const axis=`<div class="week-hours">${[0,6,12,18,24].map(h=>`<span style="top:${h/24*100}%">${h}</span>`).join('')}</div>`;
  const columns=days.map((label,i)=>{const key=addDays(first,i),start=midnight(key),finish=midnight(addDays(key,1)),span=finish-start;
    const blocks=slicesForDay(key).map(({e,a,b})=>{const top=(a-start)/span*100,height=(b-a)/span*100,c=category(e.categoryId),short=b-a<45*MINUTE,muted=c.id==='daily'||c.parentId==='daily';
      return `<button class="week-event${short?' compact':''}" data-edit="${esc(e.id)}" style="top:${top}%;height:${height}%;--event-color:${muted?tint(c.color,.3):whiteLabelColor(c.color)};--event-ink:${muted?'#26312d':'#fff'}" title="${esc(name(e.categoryId))} ${esc(time(a))}–${esc(time(b))}${e.note?` ${esc(e.note)}`:''}" aria-label="${esc(key)} ${esc(time(a))} 至 ${esc(time(b))}，${esc(name(e.categoryId))}${e.note?`，备注：${esc(e.note)}`:''}，点按编辑">${b-a<20*MINUTE?'':`<span class="week-event-name">${esc(c.name)}</span>`}${b-a>=30*MINUTE?`<small class="week-event-detail">${e.note?`<em class="week-event-note">${esc(e.note)}</em>`:''}<i>${shortDuration(b-a)} · ${esc(time(a))}–${esc(time(b))}</i></small>`:''}</button>`}).join('');
    return `<div class="week-column" style="grid-column:${i+2}"><button class="week-column-head${key===selectedDay?' selected':''}" data-day="${key}" data-open-day="1"><span>周${label}</span><strong>${Number(key.slice(-2))}</strong></button><div class="week-lane">${blocks}</div></div>`}).join('');
  return `<div class="week-chart" style="--week-zoom:${weekZoom}" data-detailed="${weekZoom>=2}" aria-label="一周 24 小时时间分布；空白代表未记录。可双指缩放"><div class="week-axis-head">时</div>${axis}${columns}</div>`}
function weekAgenda(first){const weekdays=['周一','周二','周三','周四','周五','周六','周日'];
  const all=weekdays.flatMap((_,i)=>slicesForDay(addDays(first,i)).map(slice=>({...slice,key:addDays(first,i)})));
  const noted=all.filter(({e})=>e.note?.trim()),root=({e})=>category(e.categoryId).parentId??e.categoryId;
  const noteRow=({e,a,b,key})=>`<details class="week-note"><summary><span class="week-note-meta">${esc(key.slice(5))} ${esc(time(a))} · ${esc(name(e.categoryId))}</span><span class="week-note-preview">${esc(e.note)}</span></summary><div class="week-agenda-actions"><button class="quiet" data-edit="${esc(e.id)}">编辑这段</button><button class="quiet" data-flomo-event="${esc(e.id)}">填入 Flomo</button></div></details>`;
  const group=(title,items,limit)=>{if(!items.length)return '';const recent=[...items].sort((x,y)=>y.a-x.a),shown=recent.slice(0,limit),rest=recent.slice(limit);return `<div class="week-note-group"><div class="section-head"><h4>${title}</h4><span class="meta">${items.length} 条有备注</span></div>${shown.map(noteRow).join('')}${rest.length?`<details class="week-note-more"><summary>再看 ${rest.length} 条</summary>${rest.map(noteRow).join('')}</details>`:''}</div>`};
  const days=weekdays.map((label,i)=>{const key=addDays(first,i),items=slicesForDay(key);
    const rows=items.map(({e,a,b})=>{const c=category(e.categoryId),hasNote=!!e.note?.trim();return `<div class="week-agenda-item"><span class="week-agenda-time">${esc(time(a))}–${e.end===null?'现在':esc(time(b))}</span><div class="week-agenda-content"><span class="week-agenda-category"><i style="background:${esc(c.color)}"></i>${esc(name(e.categoryId))} · ${shortDuration(b-a)}</span>${hasNote?`<p>${esc(e.note)}</p>`:'<p class="muted">未写备注</p>'}<div class="week-agenda-actions"><button class="quiet" data-edit="${esc(e.id)}">编辑</button>${hasNote?`<button class="quiet" data-flomo-event="${esc(e.id)}">填入 Flomo</button>`:''}</div></div></div>`}).join('');
    return `<details class="week-agenda-day"><summary><strong>${label} · ${Number(key.slice(-2))} 日</strong><span>${items.length} 段${items.length?` · ${items.filter(({e})=>e.note?.trim()).length} 段有备注`:''}</span></summary>${rows||'<p class="muted">这一天没有记录。</p>'}</details>`}).join('');
  return `<section class="week-agenda" id="weekAgenda"><div class="section-head"><h3>本周记录速览</h3><span class="meta">先读内容，再看明细</span></div>${noted.length?'<p class="meta">展示写过备注的事项，按时间由近到远；其余时间段可在下方展开。</p>':'<p class="muted">这周已有时间记录，但还没有写下事项内容。</p>'}${noted.length?`<div class="week-note-groups">${group('工作',noted.filter(x=>root(x)==='work_group'),3)}${group('提升',noted.filter(x=>root(x)==='growth'),2)}${group('日常与其他',noted.filter(x=>!['work_group','growth'].includes(root(x))),1)}</div>`:''}<details class="week-agenda-full"><summary>查看每天的全部时间段（${all.length} 段）</summary>${days}</details></section>`}
function setWeekZoom(value){weekZoom=Math.max(1,Math.min(4,Math.round(value*10)/10));const chart=$('.week-chart');if(chart){chart.style.setProperty('--week-zoom',weekZoom);chart.dataset.detailed=String(weekZoom>=2)}const label=$('#weekZoomValue');if(label)label.textContent=`${weekZoom.toFixed(1)}×`;document.querySelectorAll('[data-week-zoom]').forEach(button=>{button.disabled=button.dataset.weekZoom==='-1'?weekZoom<=1:weekZoom>=4})}
let pinch=null;
document.addEventListener('touchstart',ev=>{const chart=ev.target.closest?.('.week-chart');if(!chart||ev.touches.length!==2)return;const [a,b]=ev.touches;pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:weekZoom}}, {passive:true});
document.addEventListener('touchmove',ev=>{if(!pinch||ev.touches.length!==2||view!=='week')return;const [a,b]=ev.touches;ev.preventDefault();setWeekZoom(pinch.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.distance)}, {passive:false});
document.addEventListener('touchend',ev=>{if(ev.touches.length<2)pinch=null},{passive:true});
function movePeriod(delta,animated=false){if(view==='week')selectedDay=addDays(selectedDay,delta*7);else if(view==='month'){const d=new Date(midnight(selectedDay));d.setDate(1);d.setMonth(d.getMonth()+delta);selectedDay=dayKey(d.getTime())}render();if(animated)$('#main .period-card')?.classList.add(delta>0?'period-enter-next':'period-enter-prev')}
let periodSwipe=null;
function resetPeriodHeading(heading){if(!heading?.isConnected)return;heading.style.transition='transform 160ms ease, opacity 160ms ease';heading.style.transform='';heading.style.opacity='';setTimeout(()=>{if(heading.isConnected)heading.style.transition=''},170)}
document.addEventListener('touchstart',ev=>{const heading=ev.target.closest?.('.period-heading');if(!['week','month'].includes(view)||ev.touches.length!==1||!heading||ev.target.closest?.('button')){periodSwipe=null;return}const p=ev.touches[0];periodSwipe={x:p.clientX,y:p.clientY,at:Date.now(),view,heading}}, {passive:true});
document.addEventListener('touchmove',ev=>{if(!periodSwipe||ev.touches.length!==1)return;const p=ev.touches[0],dx=p.clientX-periodSwipe.x,dy=p.clientY-periodSwipe.y;if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.2){resetPeriodHeading(periodSwipe.heading);periodSwipe=null;return}if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){ev.preventDefault();periodSwipe.heading.style.transform=`translateX(${Math.max(-72,Math.min(72,dx*.45))}px)`;periodSwipe.heading.style.opacity=String(1-Math.min(Math.abs(dx)/600,.25))}}, {passive:false});
document.addEventListener('touchend',ev=>{if(!periodSwipe||ev.touches.length||!ev.changedTouches.length)return;const swipe=periodSwipe,p=ev.changedTouches[0],dx=p.clientX-swipe.x,dy=p.clientY-swipe.y,valid=swipe.view===view&&Date.now()-swipe.at<1200&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.3;periodSwipe=null;if(valid){ev.preventDefault();movePeriod(dx>0?-1:1,true)}else resetPeriodHeading(swipe.heading)}, {passive:false});
document.addEventListener('touchcancel',()=>{resetPeriodHeading(periodSwipe?.heading);periodSwipe=null},{passive:true});
function monthCalendar(first,last,totals){let cells='',startKey=dayKey(first),padding=(new Date(first).getDay()+6)%7;
  for(let i=0;i<padding;i++)cells+='<span class="month-empty" aria-hidden="true"></span>';
  for(let key=startKey;key<dayKey(last);key=addDays(key,1)){const slices=slicesForDay(key),start=midnight(key),finish=midnight(addDays(key,1)),span=finish-start,ms=totals.get(key)||0;
    const blocks=slices.map(({e,a,b})=>`<i style="top:${(a-start)/span*100}%;height:${(b-a)/span*100}%;background:${esc(category(e.categoryId).color)}"></i>`).join('');
    cells+=`<button class="month-cell${key===dayKey(Date.now())?' is-today':''}" data-day="${key}" data-open-day="1" aria-label="${esc(key)}，已记录 ${ms?duration(ms):'0 分钟'}，点按查看时间线"><strong>${Number(key.slice(-2))}</strong><span class="month-mini" aria-hidden="true">${blocks}</span><small>${ms?duration(ms):'空'}</small></button>`}
  return `<div class="month-calendar" aria-label="本月每天的彩色时间结构">${['一','二','三','四','五','六','日'].map(x=>`<span class="month-weekday">周${x}</span>`).join('')}${cells}</div>`}
function monthWeeks(from,to){const roots=['daily','work_group','growth','fun','other'],colors=Object.fromEntries(roots.map(id=>[id,category(id).color]));let rows='';
  for(let key=weekStart(dayKey(from));midnight(key)<to;key=addDays(key,7)){
    const start=Math.max(midnight(key),from),finish=Math.min(midnight(addDays(key,7)),to),totals=Object.fromEntries(roots.map(id=>[id,0]));let count=0;
    for(const e of state.events){const a=Math.max(e.start,start),b=Math.min(e.end??Date.now(),finish);if(b<=a)continue;const c=category(e.categoryId),root=c.parentId??c.id;totals[roots.includes(root)?root:'other']+=b-a;if(e.note?.trim())count++}
    const total=Object.values(totals).reduce((a,b)=>a+b,0),bar=roots.map(id=>totals[id]?`<i style="width:${totals[id]/total*100}%;background:${esc(colors[id])}"></i>`:'').join('');
    rows+=`<button class="month-week" data-open-week="${esc(key)}" aria-label="查看 ${esc(dayKey(start))} 至 ${esc(dayKey(finish-1))} 的周视图"><span class="month-week-title"><strong>${esc(dayKey(start).slice(5))}–${esc(dayKey(finish-1).slice(5))}</strong><span>${total?duration(total):'尚无记录'} · ${count} 段有备注</span></span><span class="month-week-band" aria-hidden="true">${bar}</span><span class="month-week-detail">工作 ${duration(totals.work_group)} · 提升 ${duration(totals.growth)}</span></button>`;
  }
  return `<div class="month-weeks"><div class="section-head"><h3>按周看这个月</h3><span class="meta">点一周查看时间和事项</span></div>${rows}</div>`}
function distribution(insights){if(!insights.recorded)return '<p class="muted">这一周期还没有可统计的时间记录。</p>';
  const share=ms=>Math.round(ms/insights.recorded*100);
  return `<div class="distribution">${insights.groups.map(group=>`<details class="distribution-group"><summary><span class="summary-dot" style="background:${esc(group.color)}"></span><strong>${esc(group.name)}</strong><span>${duration(group.ms)} · ${share(group.ms)}%</span><span class="summary-track"><i style="width:${group.ms/insights.recorded*100}%;background:${esc(group.color)}"></i></span></summary><div class="distribution-children">${group.children.map(child=>`<div><span>${esc(child.name)}</span><span>${duration(child.ms)} · ${share(child.ms)}%</span></div>`).join('')}</div></details>`).join('')}</div>`}
function periodReview(kind,key){const reviewKey=`${kind}:${key}`,review=state.reviews[reviewKey];
  return `<section class="card review-card"><div class="section-head"><h2>${kind==='week'?'这一周':'这个月'}的总结</h2><span class="meta">只记录你的判断</span></div><label for="periodReview">这一段时间有什么收获、变化或待继续？</label><textarea id="periodReview" data-review-key="${reviewKey}" rows="4" maxlength="4000" placeholder="记下结论、原因和下次要做的事">${esc(review?.note??'')}</textarea><div class="review-actions"><button class="primary" data-action="save-review">保存总结</button><button data-flomo-review="${kind}" data-review-key="${reviewKey}">填入 Flomo</button><span id="reviewStatus" role="status">${review?.updatedAt?'已保存':''}</span></div></section>`}
function period(days){const chosen=new Date(midnight(selectedDay)),d=new Date(chosen);if(days===7)d.setDate(d.getDate()-((d.getDay()+6)%7));else d.setDate(1);d.setHours(0,0,0,0);
  const from=d.getTime(),end=new Date(d);if(days===7)end.setDate(end.getDate()+7);else end.setMonth(end.getMonth()+1);
  const totals=allocate(state.events,from,end.getTime()),sum=[...totals.values()].reduce((a,b)=>a+b,0),title=days===7?'周时间':'月时间',insights=periodInsights(state.events,state.categories,from,end.getTime());let rows='';
  for(let key=dayKey(from);key<dayKey(end.getTime());key=addDays(key,1)){const start=midnight(key),finish=midnight(addDays(key,1)),ms=totals.get(key)||0;
    rows+=`<button class="period-day" data-day="${key}" data-open-day="1"><span class="period-date">${esc(key.slice(5))}</span><span class="period-middle">${colorBands(start,finish)}</span><span>${ms?duration(ms):'—'}</span></button>`}
  const overview=days===7?`<div class="week-overview">${Array.from({length:7},(_,i)=>{const key=addDays(dayKey(from),i);return `<button data-day="${key}" data-open-day="1" aria-label="查看 ${esc(key)} 时间线"><strong>${Number(key.slice(-2))}</strong>${colorBands(midnight(key),midnight(addDays(key,1)))}</button>`}).join('')}</div>`:'';
  const summary=`<div class="period-insights"><h3>时间分布</h3><p class="meta">占比以已记录时间为分母；点一级分类看二级分类。</p>${distribution(insights)}${insights.bedtime?`<p class="sleep-insight">夜间睡觉记录平均起点：<strong>${insights.bedtime}</strong> <small>（${insights.sleepCount} 段，按睡觉分类的开始时间估算；不等于实际入睡）</small></p>`:''}</div>`;
  const zoomTools=days===7?`<div class="week-zoom-tools" aria-label="周图缩放"><span>时间轴</span><button type="button" data-week-zoom="-1" aria-label="缩小周图" ${weekZoom<=1?'disabled':''}>−</button><output id="weekZoomValue">${weekZoom.toFixed(1)}×</output><button type="button" data-week-zoom="1" aria-label="放大周图" ${weekZoom>=4?'disabled':''}>＋</button><span class="meta">双指缩放</span></div>`:'';
  const current=days===7?dayKey(from)===weekStart(dayKey(Date.now())):dayKey(from).slice(0,7)===dayKey(Date.now()).slice(0,7);
  const monthDetail=days===7?'':`<details class="month-calendar-details"><summary>按日期查看整月时间结构</summary><p class="meta">彩色区块代表记录，留白代表空档；点日期回到当天时间线。</p>${monthCalendar(from,end.getTime(),totals)}</details>`;
  const weekVisual=`<section class="period-visual" aria-label="本周时间图"><div class="section-head"><h3>一周的时间结构</h3><span class="meta">点色块编辑，点日期查看当天</span></div>${overview}${zoomTools}${weekGrid(dayKey(from))}</section>`;
  const body=sum?days===7?`${weekVisual}${summary}${weekAgenda(dayKey(from))}`:`${monthWeeks(from,end.getTime())}${summary}${monthDetail}`:`<div class="period-empty"><h3>${days===7?'这一周':'这个月'}还没有时间记录</h3><p>开始记录后，这里会呈现时间结构和有备注的事项。</p><button data-day="${dayKey(Date.now())}" data-open-day="1" class="primary">回到今天开始记录</button></div>`;
  return `<section class="card period-card"><div class="period-heading"><button data-period-step="-1" aria-label="上一${days===7?'周':'月'}">‹</button><div><h2>${title}</h2><p class="meta" aria-live="polite">${esc(dayKey(from))} 至 ${esc(dayKey(end.getTime()-1))} · 已记录 ${duration(sum)}</p><small class="period-swipe-hint">在标题区左右滑动切换${days===7?'周':'月'}</small></div><button data-period-step="1" aria-label="下一${days===7?'周':'月'}">›</button></div>${!current?`<button class="period-now" data-action="go-current-period">回到${days===7?'本周':'本月'}</button>`:''}${body}${sum?`<details class="period-details"><summary>查看逐日时长列表</summary>${rows}</details>`:''}</section>${periodReview(days===7?'week':'month',dayKey(from))}`;
}
const categoryRoots=()=>state.categories.filter(c=>!c.parentId||!state.categories.some(p=>p.id===c.parentId)).sort((a,b)=>{const order=['daily','work_group','fun','growth','other'];return (order.indexOf(a.id)<0?order.length:order.indexOf(a.id))-(order.indexOf(b.id)<0?order.length:order.indexOf(b.id))});
const categoryRoot=id=>{let c=category(id),seen=new Set();while(c.parentId&&!seen.has(c.id)){seen.add(c.id);const parent=state.categories.find(x=>x.id===c.parentId);if(!parent)break;c=parent}return c.id};
function categoryPicker(rootId,target='event'){const select=target==='split'?$('#splitCategory'):$('#eventForm').elements.categoryId,picker=target==='split'?$('#splitCategoryPicker'):$('#categoryPicker'),available=state.categories.filter(c=>!c.archived||c.id===select.value),roots=categoryRoots().filter(root=>available.some(c=>categoryRoot(c.id)===root.id)),activeRoot=roots.some(c=>c.id===rootId)?rootId:categoryRoot(select.value);
  picker.innerHTML=`<p class="category-current">已选：<strong>${esc(name(select.value))}</strong></p><div class="category-tabs" role="group" aria-label="一级分类">${roots.map(root=>`<button type="button" data-pick-root="${esc(root.id)}" data-picker="${target}" class="${root.id===activeRoot?'active':''}" aria-pressed="${root.id===activeRoot}" style="--group-color:${esc(root.color)}">${esc(root.name)}</button>`).join('')}</div><div class="category-choices" role="group" aria-label="${esc(category(activeRoot).name)}下的分类">${available.filter(c=>categoryRoot(c.id)===activeRoot).map(c=>`<button type="button" data-pick-category="${esc(c.id)}" data-picker="${target}" class="${c.id===select.value?'active':''}" aria-pressed="${c.id===select.value}"><i style="background:${esc(c.color)}"></i>${esc(c.id===activeRoot?'直接记为'+c.name:name(c.id).split(' / ').slice(1).join(' / '))}</button>`).join('')}</div>`;
}
function categoryManageRow(c){return `<div class="category-manage-row"><span class="dot" style="background:${esc(c.color)}"></span><span>${c.parentId?esc(c.name):`直接记为${esc(c.name)}`}${c.archived?' <small>已归档</small>':''}</span><button data-category-edit="${esc(c.id)}" aria-label="编辑${esc(name(c.id))}">编辑</button><button data-archive="${esc(c.id)}">${c.archived?'恢复':'归档'}</button></div>`}
function categories(){const roots=categoryRoots(),active=state.categories.filter(c=>!c.archived).length,archived=state.categories.filter(c=>c.archived&&c.parentId);
  let html=`<section class="card"><div class="category-manage-head"><div><h2>分类管理</h2><p class="meta">${active} 个可用分类 · ${roots.length} 个一级组。记录只选一个分类。</p></div><button class="primary" data-action="add-category">添加分类</button></div><div class="category-sections">`;
  for(const root of roots){const children=state.categories.filter(c=>c.id!==root.id&&categoryRoot(c.id)===root.id&&!c.archived),count=children.length;html+=`<details class="category-section" style="--group-color:${esc(root.color)}"><summary class="category-section-title"><span class="dot" style="background:${esc(root.color)}"></span><h3>${esc(root.name)}</h3><small>${count} 个子分类</small></summary>${categoryManageRow(root)}${children.map(categoryManageRow).join('')}</details>`}
  html+='</div>';if(archived.length)html+=`<details class="archived-categories"><summary>已归档（${archived.length}）</summary>${archived.map(categoryManageRow).join('')}</details>`;return html+'</section>';
}
function dataPage(){const source=state.source?.type==='xls'?`旧 XLS：${esc(state.source.fileName||'文件名未知')}`:'本机记录';
  const logs=[...state.logs].slice(-10).reverse().map(x=>`<div class="row"><div><strong>${esc(x.date)} · ${esc(x.type)}</strong><p class="row-note">${esc(x.content)}</p></div></div>`).join('');
  return `<div class="data-page"><section class="card data-section data-overview"><p class="eyebrow">数据管理</p><h2>记录由你保管</h2><p class="meta">${source} · ${state.events.length} 条时间记录 · ${state.logs.length} 条日志 · ${state.categories.length} 个分类</p><div class="data-primary-action"><button data-action="backup" class="primary">保存完整备份</button><p>包含时间记录、分类、备注和日周月总结。手机保存时可选择文件夹。</p></div><p id="exportStatus" class="export-status" role="status" aria-live="polite"></p><details class="data-subsection"><summary>导出表格</summary><div class="actions"><button data-action="events-csv">时间记录 CSV</button><button data-action="logs-csv">日志 CSV</button></div></details></section><section class="card data-section"><h2>迁入与恢复</h2><p class="meta">选择原时间日志 Excel（.xls／.xlsx）或本产品完整备份（.json）。核对预览后才会替换当前设备上的记录。</p><label class="file-label">选择文件<input id="importFile" type="file" accept=".xls,.xlsx,.json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json"></label></section><section class="data-secondary"><details class="data-utility"><summary>Flomo 连接 <span>记录与总结</span></summary><div class="data-utility-body"><p class="meta">记录和总结可先预览，再打开 Flomo 草稿。直接发送需在本机设置接入地址。</p><label>Flomo API 地址<input id="flomoWebhook" type="password" autocomplete="off" placeholder="粘贴 flomoapp.com/iwh/… 地址"></label><div class="actions"><button data-action="save-flomo-webhook">保存地址</button><button data-action="clear-flomo-webhook" class="quiet">清除地址</button><span id="flomoSettingStatus" role="status">${localStorage.getItem(FLOMO_KEY)?'本机已保存接入地址':'尚未设置直接发送'}</span></div><p class="meta">地址只保存在当前设备，不写入完整备份。</p></div></details><details class="data-utility"><summary>最近日志 <span>${state.logs.length} 条</span></summary><div class="data-utility-body">${logs||'<p class="muted">当前没有日志。</p>'}</div></details><details class="data-utility danger-zone"><summary>重置本机记录</summary><div class="data-utility-body"><p class="meta">这会清除当前设备上的记录、日志和分类修改。请先保存完整备份。</p><button id="reset" class="quiet">清空本机记录</button></div></details></section></div>`;
}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000)}
const exportStamp=()=>localInput(Date.now(),true).replace(/\D/g,'').slice(0,14);
async function exportFile(name,content,type,button){const status=$('#exportStatus');if(!status)return;
  if(window.Capacitor?.isNativePlatform?.()){
    button.disabled=true;status.textContent='请选择保存文件的位置；只有点“保存”后才会写入。';
    try{const result=await window.Capacitor.nativePromise('LedgerExport','saveFile',{name,content,mimeType:type.split(';')[0]});
      status.textContent=!result.saved?'已取消保存，没有生成文件。':result.verified===true?`已保存并读回校验 ${result.name}（${Math.ceil(result.bytes/1024)} KB）。位置是你刚才在系统文件窗口选择的文件夹。`:result.verified===false?`文件已写入 ${result.name}，但读回校验未通过。请到所选文件夹确认文件并再导出一份。${result.warning||''}`:`已保存 ${result.name}（${Math.ceil(result.bytes/1024)} KB），位置是你刚才在系统文件窗口选择的文件夹。请核对文件。`;
    }catch(error){status.textContent=`导出失败：${error.message||error}。原记录仍保留在应用中。`}
    finally{button.disabled=false}
    return;
  }
  try{download(name,content,type);status.textContent=`已发起下载 ${name}。请到浏览器的下载记录核对文件；保存位置由浏览器设置决定。`}
  catch(error){status.textContent=`下载未完成：${error.message||error}`}
}
function exportEvents(button){const rows=ordered(state.events).map(e=>[localInput(e.start,true).replace('T',' '),e.end===null?'':localInput(e.end,true).replace('T',' '),name(e.categoryId),e.note,e.end===null?'':Math.round((e.end-e.start)/1000),e.estimateSeconds??'',e.legacyTags??'',e.sourceRow??'']);
  return exportFile(`时间账-事件-${exportStamp()}.csv`,csvText(['起始时间','结束时间','分类','备注','总时长（秒）','预估时长（秒）','原标签','来源行号'],rows),'text/csv;charset=utf-8',button)}
function exportLogs(button){const rows=state.logs.map(x=>[x.date,x.type,x.content,x.sourceRow??'']);return exportFile(`时间账-日志-${exportStamp()}.csv`,csvText(['日期','日志类型','内容','来源行号'],rows),'text/csv;charset=utf-8',button)}
async function prepareImport(file){if(!file)return;pendingImport=null;$('#importFile').value='';try{if(file.size>30*1024*1024)throw Error('文件超过 30 MB 的大小限制');
    const excel=/\.xlsx?$/i.test(file.name),parsed=excel?await parseLegacyExcel(await file.arrayBuffer(),file.name):null;
    if(!excel&&!/\.json$/i.test(file.name))throw Error('请选择 .xls、.xlsx 或 .json 文件');
    const incoming=normalizeState(parseImport(excel?JSON.stringify(parsed.payload):await file.text(),excel?seed().categories:state.categories));
    const report=parsed?.report,details=report?`<p>来源 SHA-256：<code>${report.sha256}</code></p><p>时间范围：${esc(new Date(report.firstStart).toLocaleString('zh-CN'))} 至 ${esc(new Date(report.lastEnd).toLocaleString('zh-CN'))}；有备注 ${report.noteCount} 条，零时长 ${report.zeroDuration} 条。</p><p>未匹配分类：${report.unknownCategories.length?esc(report.unknownCategories.join('、')):'无'}。旧表里的“工作”暂映射到“工作 / 工作”，请核对。</p>`:'';
    pendingImport=incoming;$('#importSummary').innerHTML=`<p>文件：${esc(file.name)}</p><p>当前设备：${state.events.length} 条事件、${state.logs.length} 条日志。</p><p>将替换为：<strong>${incoming.events.length} 条事件、${incoming.logs.length} 条日志、${incoming.categories.length} 个分类</strong>。</p>${details}<p>当前数据会被覆盖。若需要保留，请先下载完整 JSON 备份。</p>`;$('#importError').textContent='';$('#importPreview').showModal();
  }catch(error){alert(`无法预览导入文件：${error.message}`)}}
function openEvent(id,switching=false,range=null){editId=id;switchFrom=switching?state.events.find(x=>x.end===null)?.id:null;const e=id?state.events.find(x=>x.id===id):null,last=ordered(state.events).at(-1),nearby=range?ordered(state.events).filter(x=>(x.end??Date.now())<=range.start).at(-1):null,start=range?.start??e?.start??(switching?Math.floor(Date.now()/1000)*1000:Math.ceil((last?.end??Date.now())/1000)*1000);
  $('#formTitle').textContent=range?'补记空档':switching?'完成并选下一段':id?'修改时间记录':'继续添加';const f=$('#eventForm');f.reset();
  f.elements.categoryId.innerHTML=state.categories.filter(c=>!c.archived||c.id===e?.categoryId).map(c=>`<option value="${esc(c.id)}">${esc(name(c.id))}</option>`).join('');
  const suggested=range?nearby:last;
  f.elements.categoryId.value=e?.categoryId??(suggested&&!category(suggested.categoryId).archived?suggested.categoryId:null)??state.categories.find(c=>!c.archived&&c.parentId)?.id??'';
  categoryPicker(categoryRoot(f.elements.categoryId.value));
  f.elements.start.value=localInput(start,true);f.elements.end.value=range?localInput(range.end,true):e?.end?localInput(e.end,true):'';f.elements.running.checked=!range&&(switching||(e?.end===null&&!!e));f.elements.note.value=e?.note??'';$('#formError').textContent='';syncRunning();
  const next=e?ordered(state.events).find(x=>x.start>=e.end&&x.id!==e.id):null;
  const canMerge=e&&next?.splitFrom===e.id&&e.end===next.start&&next.end!==null&&e.categoryId===next.categoryId&&e.note===next.note&&next.estimateSeconds==null;
  $('#editTools').hidden=!(e?.end!==null&&e?.end-e?.start>=2000||canMerge);
  $('#editSplit').hidden=!(e?.end!==null&&e?.end-e?.start>=2000);
  $('#editMerge').hidden=!canMerge;
  $('#editor').showModal();
}
function syncRunning(){const f=$('#eventForm');f.elements.end.disabled=f.elements.running.checked;f.elements.end.required=!f.elements.running.checked}
function submitEvent(ev){ev.preventDefault();const f=ev.currentTarget;
  try{const start=new Date(f.elements.start.value).getTime(),end=f.elements.running.checked?null:new Date(f.elements.end.value).getTime();
    const draft={id:editId??crypto.randomUUID(),categoryId:f.elements.categoryId.value,start,end,note:f.elements.note.value.trim()};
    if(!state.categories.some(c=>c.id===draft.categoryId))throw Error('请选择分类');
    pending=switchFrom?proposeSwitch(state.events,draft):propose(state.events,draft);const changes=pending.changes;
    if(!changes.length){rememberEvents('保存了记录');state.events=pending.events;pending=null;save();$('#editor').close();render();return}
    $('#previewText').innerHTML=`<p><strong>${esc(name(draft.categoryId))}</strong><br>${esc(localInput(start,true).replace('T',' '))} → ${end?esc(localInput(end,true).replace('T',' ')):'进行中'}</p>`+
      (changes.length?`<p>相邻记录也会调整：</p><ul>${changes.map(c=>`<li>${esc(name(state.events.find(e=>e.id===c.id).categoryId))}的${c.field==='start'?'起点':'终点'}：${c.before===null?'进行中':esc(localInput(c.before,true).replace('T',' '))} → ${esc(localInput(c.after,true).replace('T',' '))}</li>`).join('')}</ul>`:'');
    $('#editor').close();$('#preview').showModal();
  }catch(error){$('#formError').textContent=error.message}
}
function openSplit(id){const e=state.events.find(x=>x.id===id);if(!e||e.end===null)return;splitId=id;
  $('#splitOriginal').textContent=`${name(e.categoryId)} · ${localInput(e.start,true).replace('T',' ')} → ${localInput(e.end,true).replace('T',' ')}`;
  $('#splitAt').value=localInput(Math.floor((e.start+e.end)/2000)*1000,true);
  $('#splitCategory').innerHTML=state.categories.filter(c=>!c.archived||c.id===e.categoryId).map(c=>`<option value="${esc(c.id)}">${esc(name(c.id))}</option>`).join('');
  $('#splitCategory').value=e.categoryId;categoryPicker(categoryRoot(e.categoryId),'split');$('#splitNote').value='';$('#splitError').textContent='';updateSplitSummary();$('#splitDialog').showModal()}
function updateSplitSummary(){const e=state.events.find(x=>x.id===splitId),at=new Date($('#splitAt').value).getTime();
  $('#splitSummary').textContent=e&&at>e.start&&at<e.end?`前一段保留 ${duration(at-e.start,true)}；后一段记为 ${duration(e.end-at,true)}。原记录不会丢失，可撤销这一步。`:'请选择原记录内部的时点。'}
function submitSplit(ev){ev.preventDefault();try{const at=new Date($('#splitAt').value).getTime(),result=proposeSplit(state.events,splitId,at,crypto.randomUUID());
    const nextCategory=$('#splitCategory').value;if(!state.categories.some(c=>c.id===nextCategory))throw Error('请选择后一段的分类');
    result.second.categoryId=nextCategory;result.second.note=$('#splitNote').value.trim();result.second.sourceCategoryName=undefined;
    rememberEvents('从中间切换了活动');state.events=result.events;save();$('#splitDialog').close();splitId=null;render()}catch(error){$('#splitError').textContent=error.message}}
function openMerge(id){try{pendingMerge=proposeMergeSplit(state.events,id);const {first,second}=pendingMerge;
    $('#mergeSummary').textContent=`${name(first.categoryId)}：${duration(first.end-first.start,true)} ＋ ${duration(second.end-second.start,true)} → ${duration(second.end-first.start,true)}。备注保持原样。`;
    $('#mergeDialog').showModal()}catch(error){alert(error.message)}}
function stop(){const current=state.events.find(e=>e.end===null);if(!current)return;const end=Math.floor(Date.now()/1000)*1000;if(end<=current.start){alert('开始时间晚于当前时间，请先修改起点');return}rememberEvents('完成了记录');current.end=end;save();render()}
let clockAwake=true,clockLandscape=false,clockFullscreen=true,clockWakeLock=null,clockOrientationLocked=false,clockDisplayQueue=Promise.resolve();
function updateClockDisplayButtons(){const awake=$('#toggleClockAwake'),landscape=$('#toggleClockLandscape'),fullscreen=$('#toggleClockFullscreen');awake.textContent=clockAwake?'亮屏中':'保持亮屏';awake.setAttribute('aria-pressed',String(clockAwake));landscape.textContent=clockLandscape?'横屏中':'切换横屏';landscape.setAttribute('aria-pressed',String(clockLandscape));fullscreen.textContent=clockFullscreen?'全屏中':'切换全屏';fullscreen.setAttribute('aria-pressed',String(clockFullscreen))}
async function applyClockDisplay(awake,landscape,fullscreen){if(window.Capacitor?.isNativePlatform?.()){
    await window.Capacitor.nativePromise('FocusDisplay','setMode',{awake,landscape,fullscreen});return}
  if(awake&&!clockWakeLock){if(!navigator.wakeLock?.request)throw Error('当前浏览器不支持保持亮屏，请在 APK 中使用');clockWakeLock=await navigator.wakeLock.request('screen');clockWakeLock.addEventListener('release',()=>{clockWakeLock=null})}
  if(!awake&&clockWakeLock){await clockWakeLock.release();clockWakeLock=null}
  if(fullscreen&&document.fullscreenElement!==$('#clock')){try{await $('#clock').requestFullscreen()}catch{const error=Error('当前浏览器无法进入全屏');error.feature='fullscreen';throw error}}
  if(landscape&&!clockOrientationLocked){if(!screen.orientation?.lock)throw Error('当前浏览器不支持横屏锁定，请在 APK 中使用');await screen.orientation.lock('landscape');clockOrientationLocked=true}
  if(!landscape&&clockOrientationLocked){screen.orientation.unlock();clockOrientationLocked=false}
  if(!fullscreen&&document.fullscreenElement===$('#clock'))await document.exitFullscreen()}
function syncClockDisplay(){const awake=$('#clock').open&&clockAwake,landscape=$('#clock').open&&clockLandscape,fullscreen=$('#clock').open&&clockFullscreen;clockDisplayQueue=clockDisplayQueue.catch(()=>{}).then(async()=>{try{await applyClockDisplay(awake,landscape,fullscreen);if($('#clock').open){const modes=[fullscreen?'全屏':'',landscape?'横屏':'',awake?'亮屏':''].filter(Boolean);$('#clockDisplayStatus').textContent=modes.length?modes.join(' · ')+'中':'已恢复系统屏幕设置'}}
    catch(error){if($('#clock').open){$('#clockDisplayStatus').textContent=window.Capacitor?.isNativePlatform?.()?String(error.message||error):error.feature==='fullscreen'?'当前浏览器无法进入全屏，请在手机 APK 使用。':landscape?'当前浏览器无法切换横屏，请在手机 APK 使用。':'当前浏览器无法保持亮屏，请在手机 APK 使用。';if(error.feature==='fullscreen')clockFullscreen=false;else if(landscape)clockLandscape=false;else if(awake)clockAwake=false;updateClockDisplayButtons()}}});return clockDisplayQueue}
function openClock(){const active=state.events.find(e=>e.end===null);if(!active)return;const seconds=active.estimateSeconds;
  $('#estimateHours').value=seconds==null?'':Math.floor(seconds/3600);$('#estimateMinutes').value=seconds==null?'':Math.floor(seconds/60)%60;$('#estimateSeconds').value=seconds==null?'':seconds%60;
  $('#clock').classList.add('is-minimal');$('#toggleClockFocus').textContent='设置';$('#toggleClockFocus').setAttribute('aria-pressed','false');
  clockAwake=true;clockLandscape=false;clockFullscreen=true;updateClockDisplayButtons();$('#clockDisplayStatus').textContent='';$('#clock').showModal();syncClockDisplay();renderClock()}
function renderClock(){if(!$('#clock').open)return;const active=state.events.find(e=>e.end===null);if(!active){$('#clock').close();return}
  const now=Date.now(),parts=clockParts(now-active.start),status=estimateStatus(active,now);
  $('#clockCategory').textContent=name(active.categoryId);$('#clockStart').textContent=`${localInput(active.start,true).replace('T',' ')} 开始 · 当前时间－起点`;
  $('#clockNote').textContent=active.note||'这段还没有备注，可回时间线添加。';
  $('#clockHours').textContent=parts[0];$('#clockMinutes').textContent=parts[1];$('#clockSeconds').textContent=parts[2];
  const expectedEnd=active.start+(active.estimateSeconds??0)*1000;
  $('#clockEnd').textContent=active.estimateSeconds==null?'':`预计结束 ${dayKey(expectedEnd)===dayKey(now)?'':dayKey(expectedEnd).slice(5)+' '}${time(expectedEnd)}`;
  $('#clockEstimate').textContent=status?`${status.over?'已超出预计':'距离预计还有'} ${duration(status.ms,true)}`:($('#clock').classList.contains('is-minimal')?'':'尚未设置预计时间');
  $('#clockEstimate').classList.toggle('overrun',!!status?.over)}
function saveEstimate(){const active=state.events.find(e=>e.end===null);if(!active)return;
  const values=['#estimateHours','#estimateMinutes','#estimateSeconds'].map(s=>Number($(s).value||0));
  if(values.some((x,i)=>!Number.isInteger(x)||x<0||x>(i===0?999:59))){alert('预计时间须为非负整数，分钟和秒小于 60');return}
  active.estimateSeconds=values[0]*3600+values[1]*60+values[2];undoEvents=null;undoLabel='';save();render();renderClock()}
function openCategory(id=null){categoryEditId=id;const c=state.categories.find(x=>x.id===id),f=$('#categoryForm');f.reset();$('#categoryTitle').textContent=c?'编辑分类':'添加分类';
  const blocked=new Set(id?[id]:[]);let changed=true;while(changed){changed=false;for(const x of state.categories){if(blocked.has(x.parentId)&&!blocked.has(x.id)){blocked.add(x.id);changed=true}}}
  f.elements.parentId.innerHTML='<option value="">无（顶层分类）</option>'+state.categories.filter(x=>!x.archived&&!blocked.has(x.id)).map(x=>`<option value="${esc(x.id)}">${esc(name(x.id))}</option>`).join('');
  f.elements.name.value=c?.name??'';f.elements.parentId.value=c?.parentId??'';f.elements.color.value=c?.color??'#3878a8';$('#categoryError').textContent='';$('#categoryDialog').showModal()}
function addCategory(ev){ev.preventDefault();const f=ev.currentTarget,n=f.elements.name.value.trim(),parentId=f.elements.parentId.value||null;
  if(!n){$('#categoryError').textContent='请输入分类名称';return}
  if(state.categories.some(c=>c.id!==categoryEditId&&c.name===n&&c.parentId===parentId)){$('#categoryError').textContent='同一层级已经有这个名称';return}
  const c=state.categories.find(x=>x.id===categoryEditId);if(c){c.name=n;c.color=f.elements.color.value;c.parentId=parentId}else state.categories.push({id:crypto.randomUUID(),name:n,color:f.elements.color.value,parentId,archived:false});
  save();$('#categoryDialog').close();render()}
function savePeriodReview(){const area=$('#periodReview'),key=area?.dataset.reviewKey;if(!key)return null;const note=area.value.trim();if(note)state.reviews[key]={note,updatedAt:new Date().toISOString()};else delete state.reviews[key];save();$('#reviewStatus').textContent=note?'已保存':'已清空';return {key,note}}
function saveDayReview(key){const plan=$('#dayPlan').value.trim(),note=$('#daySummary').value.trim(),reviewKey=`day:${key}`;if(plan||note)state.reviews[reviewKey]={plan,note,updatedAt:new Date().toISOString()};else delete state.reviews[reviewKey];save();$('#dayReviewStatus').textContent=plan||note?'已保存':'已清空';return {plan,note}}
async function openFlomoDraft(content){const url=flomoDraftUrl(content);if(window.Capacitor?.isNativePlatform?.()){window.location.href=url;return}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(content);alert('内容已复制。请打开 Flomo 粘贴并确认保存。');return}window.location.href=url}
function handoffFlomo(button){try{let content;if(button.dataset.flomoEvent){const e=state.events.find(x=>x.id===button.dataset.flomoEvent);if(!e)throw Error('记录已不存在');content=eventFlomoText({date:dayKey(e.start),start:time(e.start),end:e.end===null?'进行中':time(e.end),category:name(e.categoryId),note:e.note})}else{const kind=button.dataset.flomoReview,key=button.dataset.reviewKey??`day:${button.dataset.reviewDay}`;let note;if(kind==='day')note=saveDayReview(button.dataset.reviewDay).note;else note=savePeriodReview()?.note;const start=key.split(':')[1],period=kind==='week'?`${start} 至 ${addDays(start,6)}`:kind==='month'?start.slice(0,7):start;content=reviewFlomoText({kind,period,content:note})}flomoPayload(content);flomoSent=false;$('#flomoContent').value=content;$('#flomoResult').textContent='';$('#sendFlomo').disabled=!localStorage.getItem(FLOMO_KEY);$('#flomoDialog').showModal()}catch(error){alert(`无法准备 Flomo 内容：${error.message}`)}}
async function sendFlomo(){if(flomoSending||flomoSent)return;const button=$('#sendFlomo'),result=$('#flomoResult');try{const url=validateFlomoWebhook(localStorage.getItem(FLOMO_KEY)),data=flomoPayload($('#flomoContent').value);flomoSending=true;button.disabled=true;result.textContent='正在发送…';let response;
    if(window.Capacitor?.isNativePlatform?.()){response=await window.Capacitor.nativePromise('CapacitorHttp','post',{url,headers:{'Content-Type':'application/json'},data})}
    else{const http=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});response={status:http.status,data:await http.text()}}
    if(!flomoAccepted(response))throw Error(`Flomo 未确认接收（HTTP ${response.status}）`);
    flomoSent=true;result.textContent='Flomo 已确认记录。可以到 Flomo 查看这条内容。';
  }catch(error){result.textContent=`发送未确认：${error.message}。请先到 Flomo 核对，再决定是否重试。`}
  finally{flomoSending=false;button.disabled=flomoSent}}
function saveFlomoWebhook(){try{const value=validateFlomoWebhook($('#flomoWebhook').value);localStorage.setItem(FLOMO_KEY,value);$('#flomoWebhook').value='';$('#flomoSettingStatus').textContent='接入地址已保存在这台设备';}catch(error){$('#flomoSettingStatus').textContent=error.message}}
document.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
  if(loadFailure){if(b.dataset.action==='export-raw'&&storedSnapshot)exportFile(`时间账-原始数据-${exportStamp()}.txt`,storedSnapshot,'text/plain;charset=utf-8',b);return}
  if(b.dataset.pickRoot){categoryPicker(b.dataset.pickRoot,b.dataset.picker);return}
  if(b.dataset.pickCategory){(b.dataset.picker==='split'?$('#splitCategory'):$('#eventForm').elements.categoryId).value=b.dataset.pickCategory;categoryPicker(categoryRoot(b.dataset.pickCategory),b.dataset.picker);return}
  if(b.dataset.fillStart){openEvent(null,false,{start:Number(b.dataset.fillStart),end:Number(b.dataset.fillEnd)});return}
  if(b.dataset.flomoEvent||b.dataset.flomoReview)handoffFlomo(b);
  if(b.dataset.action==='save-flomo-webhook')saveFlomoWebhook();
  if(b.dataset.action==='clear-flomo-webhook'){localStorage.removeItem(FLOMO_KEY);$('#flomoWebhook').value='';$('#flomoSettingStatus').textContent='已清除本机接入地址'}
  if(b.dataset.weekZoom)setWeekZoom(weekZoom+Number(b.dataset.weekZoom)*.5);
  if(b.dataset.view){view=b.dataset.view;render()}
  if(b.dataset.dayStep){selectedDay=addDays(selectedDay,Number(b.dataset.dayStep));render()}
  if(b.dataset.periodStep)movePeriod(Number(b.dataset.periodStep),true);
  if(b.dataset.action==='go-today'){selectedDay=dayKey(Date.now());view='today';render();window.scrollTo({top:0,behavior:'smooth'})}
  if(b.dataset.action==='go-current-period'){selectedDay=dayKey(Date.now());render()}
  if(b.dataset.openWeek){selectedDay=b.dataset.openWeek;view='week';render();window.scrollTo({top:0,behavior:'smooth'})}
  if(b.dataset.day){selectedDay=b.dataset.day;if(b.dataset.openDay)view='today';render()}
  if(b.dataset.edit)openEvent(b.dataset.edit);
  if(b.dataset.split)openSplit(b.dataset.split);
  if(b.dataset.merge)openMerge(b.dataset.merge);
  if(b.dataset.action==='add')openEvent(null);
  if(b.dataset.action==='switch')openEvent(null,true);
  if(b.dataset.action==='clock')openClock();
  if(b.dataset.action==='backup')exportFile(`时间账-完整备份-${exportStamp()}.json`,backupText(state),'application/json;charset=utf-8',b);
  if(b.dataset.action==='events-csv')exportEvents(b);
  if(b.dataset.action==='logs-csv')exportLogs(b);
  if(b.dataset.action==='save-review')savePeriodReview();
  if(b.dataset.action==='save-day-review')saveDayReview(b.dataset.reviewDay);
  if(b.dataset.action==='stop')stop();
  if(b.dataset.action==='undo')undoLast();
  if(b.id==='editSplit'){const id=editId;$('#editor').close();openSplit(id)}
  if(b.id==='editMerge'){const id=editId;$('#editor').close();openMerge(id)}
  if(b.id==='reset'&&confirm('将清除当前设备中的全部时间记录、日志和分类修改，并恢复默认分类。请先确认完整备份已保存。')){state=seed();undoEvents=null;undoLabel='';save();view='today';selectedDay=dayKey(Date.now());render()}
  if(b.dataset.action==='add-category')openCategory();
  if(b.dataset.categoryEdit)openCategory(b.dataset.categoryEdit);
  if(b.dataset.archive){const c=state.categories.find(c=>c.id===b.dataset.archive);c.archived=!c.archived;save();render()}
});
document.addEventListener('change',ev=>{if(ev.target.id==='pickDay'&&ev.target.value){selectedDay=ev.target.value;render()}if(ev.target.id==='importFile')prepareImport(ev.target.files[0])});
$('#eventForm').onsubmit=submitEvent;$('#eventForm').elements.running.onchange=syncRunning;
$('#splitForm').onsubmit=submitSplit;$('#splitAt').oninput=updateSplitSummary;$('#cancelSplit').onclick=()=>{$('#splitDialog').close();splitId=null};
$('#cancelMerge').onclick=()=>{pendingMerge=null;$('#mergeDialog').close()};$('#confirmMerge').onclick=()=>{if(!pendingMerge)return;rememberEvents('合并了拆分段');state.events=pendingMerge.events;pendingMerge=null;save();$('#mergeDialog').close();render()};
$('#cancelEdit').onclick=()=>$('#editor').close();$('#cancelPreview').onclick=()=>{$('#preview').close();$('#editor').showModal()};
$('#confirmPreview').onclick=()=>{rememberEvents('保存了记录');state.events=pending.events;save();pending=null;$('#preview').close();render()};
$('#categoryForm').onsubmit=addCategory;$('#cancelCategory').onclick=()=>$('#categoryDialog').close();
$('#closeClock').onclick=()=>$('#clock').close();$('#saveEstimate').onclick=saveEstimate;
$('#toggleClockAwake').onclick=()=>{clockAwake=!clockAwake;updateClockDisplayButtons();syncClockDisplay()};
$('#toggleClockLandscape').onclick=()=>{clockLandscape=!clockLandscape;updateClockDisplayButtons();syncClockDisplay()};
$('#toggleClockFullscreen').onclick=()=>{clockFullscreen=!clockFullscreen;updateClockDisplayButtons();syncClockDisplay()};
$('#clock').addEventListener('close',()=>{clockAwake=false;clockLandscape=false;clockFullscreen=false;syncClockDisplay()});
document.addEventListener('fullscreenchange',()=>{if($('#clock').open&&!window.Capacitor?.isNativePlatform?.()&&document.fullscreenElement!==$('#clock')&&clockFullscreen){clockFullscreen=false;updateClockDisplayButtons();$('#clockDisplayStatus').textContent='已退出全屏'}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#clock').open&&clockAwake&&!window.Capacitor?.isNativePlatform?.())syncClockDisplay()});
$('#toggleClockFocus').onclick=()=>{const minimal=$('#clock').classList.toggle('is-minimal');$('#toggleClockFocus').textContent=minimal?'设置':'返回专注';$('#toggleClockFocus').setAttribute('aria-pressed',String(!minimal));renderClock()};
$('#clearEstimate').onclick=()=>{const active=state.events.find(e=>e.end===null);if(active){active.estimateSeconds=null;undoEvents=null;undoLabel='';save();render();['#estimateHours','#estimateMinutes','#estimateSeconds'].forEach(s=>$(s).value='');renderClock()}};
$('#stopFromClock').onclick=()=>{$('#clock').close();stop()};
$('#noteFromClock').onclick=()=>{const active=state.events.find(e=>e.end===null);$('#clock').close();if(active)openEvent(active.id)};
$('#cancelImport').onclick=()=>{pendingImport=null;$('#importPreview').close()};
$('#cancelFlomo').onclick=()=>$('#flomoDialog').close();
$('#openFlomoDraft').onclick=async()=>{try{await openFlomoDraft($('#flomoContent').value)}catch(error){$('#flomoResult').textContent=`无法打开草稿：${error.message}`}};
$('#sendFlomo').onclick=sendFlomo;
$('#flomoContent').oninput=()=>{flomoSent=false;$('#flomoResult').textContent='';$('#sendFlomo').disabled=!localStorage.getItem(FLOMO_KEY)};
$('#confirmImport').onclick=()=>{if(!pendingImport)return;try{localStorage.setItem(KEY,JSON.stringify(pendingImport));state=pendingImport;undoEvents=null;undoLabel='';pendingImport=null;$('#importPreview').close();view='data';render()}catch(error){$('#importError').textContent=`本地保存失败：${error.message}`}};
setInterval(()=>{if(loadFailure)return;if(view==='today'){const active=state.events.find(e=>e.end===null),el=$('#elapsed');if(active&&el)el.textContent=duration(Date.now()-active.start,true)}renderClock()},1000);
render();
