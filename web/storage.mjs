export function loadLocalState(storage,key,makeEmpty,normalize){
  let raw=null;
  try{
    raw=storage.getItem(key);
    const parsed=raw===null?makeEmpty():JSON.parse(raw);
    if(!parsed||!Array.isArray(parsed.events)||!Array.isArray(parsed.categories))throw Error('invalid state');
    return {state:normalize(parsed),storedSnapshot:null,loadFailure:null};
  }catch(error){
    return {state:makeEmpty(),storedSnapshot:raw,loadFailure:error};
  }
}

export function persistLocalState(storage,key,state,lastSavedJson){
  try{
    const next=JSON.stringify(state);
    storage.setItem(key,next);
    return {saved:true,state,lastSavedJson:next};
  }catch(error){
    return {saved:false,state:JSON.parse(lastSavedJson),lastSavedJson,error};
  }
}
