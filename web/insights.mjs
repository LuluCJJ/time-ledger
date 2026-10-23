const HOUR=3_600_000;

export function periodInsights(events,categories,from,to,now=Date.now()){
  const byId=new Map(categories.map(c=>[c.id,c]));
  const parents=new Map();
  let recorded=0;
  const sleepStarts=[];
  for(const event of events){
    const start=Math.max(from,event.start),end=Math.min(to,event.end??now);
    if(end<=start)continue;
    const ms=end-start,child=byId.get(event.categoryId),parent=child?.parentId?byId.get(child.parentId):child;
    const parentId=parent?.id??'unknown',childId=child?.id??'unknown';
    if(!parents.has(parentId))parents.set(parentId,{id:parentId,name:parent?.name??'未知分类',color:parent?.color??'#667',ms:0,children:new Map()});
    const group=parents.get(parentId);group.ms+=ms;
    if(!group.children.has(childId))group.children.set(childId,{id:childId,name:child?.name??'未知分类',color:child?.color??'#667',ms:0});
    group.children.get(childId).ms+=ms;
    recorded+=ms;
    if(childId==='daily_sleep'&&event.start>=from&&event.start<to){
      const span=(event.end??now)-event.start,d=new Date(event.start),hour=d.getHours()+d.getMinutes()/60;
      if(span>=3*HOUR&&(hour>=18||hour<4))sleepStarts.push(hour<4?hour+24:hour);
    }
  }
  const groups=[...parents.values()].map(group=>({...group,children:[...group.children.values()].sort((a,b)=>b.ms-a.ms)})).sort((a,b)=>b.ms-a.ms);
  const mean=sleepStarts.length?sleepStarts.reduce((a,b)=>a+b,0)/sleepStarts.length:null;
  const minutes=mean===null?null:Math.round(mean*60)%(24*60);
  const bedtime=minutes===null?null:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  return {recorded,groups,bedtime,sleepCount:sleepStarts.length};
}
