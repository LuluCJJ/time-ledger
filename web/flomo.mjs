const MAX_SCHEME_CONTENT=5000;

export function validateFlomoWebhook(value){
  let url;
  try{url=new URL(value?.trim()||'')}catch{throw Error('请输入完整的 Flomo API 地址')}
  if(url.protocol!=='https:'||url.hostname!=='flomoapp.com'||!url.pathname.startsWith('/iwh/')||url.username||url.password||url.search||url.hash)throw Error('只支持 flomoapp.com 的 HTTPS 接入地址');
  return url.href;
}

export function flomoPayload(content){
  if(!content?.trim())throw Error('发送内容不能为空');
  if(content.length>MAX_SCHEME_CONTENT)throw Error('Flomo 内容不能超过 5000 字');
  return {content,content_type:'markdown'};
}

export function flomoAccepted(response){
  const status=Number(response?.status),raw=response?.data;
  let body=raw;
  if(typeof raw==='string'){try{body=JSON.parse(raw)}catch{return false}}
  return status>=200&&status<300&&Number(body?.code)===0;
}

export function flomoDraftUrl(content){
  if(!content||content.length>MAX_SCHEME_CONTENT)throw Error('Flomo 草稿内容不能超过 5000 字');
  return `flomo://create?content=${encodeURIComponent(content)}`;
}

export function eventFlomoText({date,start,end,category,note}){
  if(!note?.trim())throw Error('这段记录还没有备注');
  return `#时间账\n${date} ${start}–${end} · ${category}\n\n${note.trim()}`;
}

export function reviewFlomoText({kind,period,content}){
  if(!content?.trim())throw Error('这段总结还没有内容');
  const label={plan:'今日计划',day:'日总结',week:'周总结',month:'月总结'}[kind];
  if(!label)throw Error('总结类型无效');
  return `#时间账 #${label}\n${period}\n\n${content.trim()}`;
}
