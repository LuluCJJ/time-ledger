const localDateTime=value=>{
  if(value===null||value===undefined||value==='')return '';
  const date=new Date(Number(value)+8*3600_000);
  if(!Number.isFinite(date.getTime()))return '';
  return date.toISOString().slice(0,19).replace('T',' ');
};

export function readableWorkbook(state,XLSX){
  if(!XLSX?.utils?.book_new||!XLSX?.utils?.aoa_to_sheet||!XLSX?.write)throw Error('Excel 组件未加载');
  const book=XLSX.utils.book_new();
  const add=(title,headers,rows,widths)=>{
    const sheet=XLSX.utils.aoa_to_sheet([headers,...rows]);
    sheet['!cols']=widths.map(wch=>({wch}));
    sheet['!autofilter']={ref:`A1:${XLSX.utils.encode_col(headers.length-1)}${rows.length+1}`};
    XLSX.utils.book_append_sheet(book,sheet,title);
  };
  const categories=new Map(state.categories.map(c=>[c.id,c]));
  const rootFor=category=>{
    let current=category,depth=0;
    while(current?.parentId&&depth++<state.categories.length)current=categories.get(current.parentId);
    return current||category;
  };
  add('时间记录',
    ['开始时间','结束时间','一级分类','具体分类','用时（分钟）','备注','状态','预估（分钟）','原标签','来源行号','事件ID','分类ID'],
    [...state.events].sort((a,b)=>a.start-b.start).map(e=>{
      const category=categories.get(e.categoryId),root=rootFor(category);
      return [localDateTime(e.start),localDateTime(e.end),root?.name||'',category?.name||'',e.end===null?'':Math.round((e.end-e.start)/60000*100)/100,e.note||'',e.end===null?'进行中':'已结束',e.estimateSeconds==null?'':Math.round(e.estimateSeconds/60*100)/100,e.legacyTags||'',e.sourceRow??'',e.id,e.categoryId];
    }),[21,21,18,22,15,60,12,17,30,12,24,24]);
  add('分类',['分类ID','名称','一级分类','上级ID','颜色','已归档'],
    state.categories.map(c=>[c.id,c.name,rootFor(c)?.name||'',c.parentId||'',c.color,c.archived?'是':'否']),[28,24,20,28,14,12]);
  add('日志',['日期','类型','内容','来源行号'],
    state.logs.map(log=>[log.date,log.type,log.content,log.sourceRow??'']),[18,20,70,12]);
  add('日周月总结',['周期','起始日期','今天想做的事','总结','更新时间'],
    Object.entries(state.reviews||{}).sort(([a],[b])=>a.localeCompare(b)).map(([key,review])=>{
      const [period,date]=key.split(':');
      return [{day:'日',week:'周',month:'月'}[period]||period,date,review.plan||'',review.note||'',review.updatedAt||''];
    }),[12,18,65,75,27]);
  add('说明',['项目','内容'],[
    ['文件用途','便于在 Excel 中查看、筛选和分析；完整恢复请使用同日导出的 JSON 备份。'],
    ['导出时间',localDateTime(Date.now())],
    ['时间记录数',state.events.length],['分类数',state.categories.length],['日志数',state.logs.length],
    ['日周月总结数',Object.keys(state.reviews||{}).length]
  ],[22,78]);
  return book;
}

export function readableExcelBase64(state,XLSX){
  return XLSX.write(readableWorkbook(state,XLSX),{bookType:'xlsx',type:'base64',compression:true});
}
