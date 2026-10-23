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
