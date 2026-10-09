/* Local-only serialization. Large immutable photos are registered once, reused and released. */
const resources=new Map();
function unpack(value){
  if(!value||typeof value!=='object')return value;
  if(value.t==='resource'){
    if(!resources.has(value.id))throw Error('photo_resource_missing');
    return resources.get(value.id);
  }
  if(value.t==='array')return value.values.map(unpack);
  if(value.t==='object')return Object.fromEntries(Object.entries(value.values).map(([key,v])=>[key,unpack(v)]));
  throw Error('photo_snapshot_invalid');
}
self.onmessage=({data})=>{
  try{
    for(const [id,value] of data.resources)resources.set(id,value);
    const json=JSON.stringify(unpack(data.packed));
    for(const id of data.drop)resources.delete(id);
    self.postMessage({id:data.id,json});
  }catch{self.postMessage({id:data.id,error:'photo_serialization_failed'});}
};
