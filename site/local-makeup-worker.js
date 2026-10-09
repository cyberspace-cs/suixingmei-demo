/* Local CPU composition. Decode once, compile requested states only; no network. */
const PARTS=['blush','brow','contour','eyeliner','eyeshadow','lashes','lip'];
const clamp=(v,l=0,h=1)=>Math.max(l,Math.min(h,v));
const linear=Float32Array.from({length:256},(_,i)=>i/255<=.04045?i/255/12.92:((i/255+.055)/1.055)**2.4);
function lab(r,g,b){
  r=linear[r];g=linear[g];b=linear[b];
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
function rgb([L,a,b]){
  const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
  return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s]
    .map(v=>Math.round(255*(v<=.0031308?12.92*clamp(v):1.055*clamp(v)**(1/2.4)-.055)));
}
let canvas,ctx,base,patches;
let queue=Promise.resolve();
const canonical=key=>{
  const parts=key?key.split(','):[];
  if(!parts.length||parts.some(p=>!PARTS.includes(p))||new Set(parts).size!==parts.length)throw Error('local_selection_invalid');
  return parts.sort().join(',');
};
async function init(data){
  const bitmaps=[];
  try{
    const master=await createImageBitmap(data.master,{colorSpaceConversion:'none'});bitmaps.push(master);
    canvas=new OffscreenCanvas(master.width,master.height);ctx=canvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});
    if(!ctx)throw Error('local_canvas_unavailable');
    ctx.drawImage(master,0,0);base=ctx.getImageData(0,0,canvas.width,canvas.height);patches=[];
    const keys=new Set();
    for(const p of data.patches){
      const key=p.part==='eye'?canonical((p.disabled??[]).join(',')):p.part;
      if(p.part==='eye'&&key.split(',').some(v=>!['eyeliner','eyeshadow','lashes'].includes(v)))throw Error('local_patch_invalid');
      if(!['lip','blush','eye','brow','contour'].includes(p.part)||keys.has(key)||!Number.isInteger(p.left)||!Number.isInteger(p.top)||p.part==='contour'&&p.blend!=='luminance')throw Error('local_patch_invalid');
      keys.add(key);
      const image=await createImageBitmap(p.blob,{colorSpaceConversion:'none'});bitmaps.push(image);
      if(image.width!==p.width||image.height!==p.height||p.left<0||p.top<0||p.left+p.width>canvas.width||p.top+p.height>canvas.height)throw Error('local_patch_invalid');
      const c=new OffscreenCanvas(p.width,p.height),cx=c.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});
      cx.drawImage(image,0,0);const pixels=cx.getImageData(0,0,p.width,p.height).data;
      let luminance;
      if(p.part==='contour'){
        luminance=new Float32Array(p.width*p.height);
        for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
          const at=y*p.width+x,j=at*4,i=((y+p.top)*canvas.width+x+p.left)*4;if(!pixels[j+3])continue;
          luminance[at]=(lab(pixels[j],pixels[j+1],pixels[j+2])[0]-lab(base.data[i],base.data[i+1],base.data[i+2])[0])*pixels[j+3]/255;
        }
      }
      patches.push({...p,key,pixels,luminance});
    }
    if(!keys.has('lip')||!keys.has('blush'))throw Error('local_patch_invalid');
  }finally{for(const bitmap of bitmaps)bitmap.close();}
}
async function render(key){
  if(!base)throw Error('local_not_prepared');
  key=canonical(key);
  const parts=key.split(','),eye=parts.filter(p=>['eyeliner','eyeshadow','lashes'].includes(p)).join(',');
  if(eye&&!patches.some(p=>p.part==='eye'&&p.key===eye))throw Error('local_eye_unavailable');
  if(parts.some(part=>!['eyeliner','eyeshadow','lashes'].includes(part)&&!patches.some(p=>p.part===part)))throw Error('local_part_unavailable');
  const chosen=patches.filter(p=>p.part==='eye'?p.key===eye:parts.includes(p.part));
  const left=Math.min(...chosen.map(p=>p.left)),top=Math.min(...chosen.map(p=>p.top));
  const right=Math.max(...chosen.map(p=>p.left+p.width)),bottom=Math.max(...chosen.map(p=>p.top+p.height));
  const rw=right-left,rh=bottom-top,correction=new Float32Array(rw*rh*3);
  for(const patch of chosen){
    if(patch.part==='contour')continue;
    const {width:w,height:h,pixels}=patch;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const j=(y*w+x)*4,i=((y+patch.top)*canvas.width+x+patch.left)*4,a=pixels[j+3]/255;if(!a)continue;
      const at=((y+patch.top-top)*rw+x+patch.left-left)*3;
      // Eye overlap is resolved in one joint patch. Only the shared lip/blush/eye
      // feather transitions accumulate corrections to the immutable master.
      for(let c=0;c<3;c++)correction[at+c]+=(pixels[j+c]-base.data[i+c])*a;
    }
  }
  const bytes=new Uint8ClampedArray(base.data);
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
    const at=(y*rw+x)*3,i=((y+top)*canvas.width+x+left)*4;
    for(let c=0;c<3;c++)if(correction[at+c])bytes[i+c]=Math.round(base.data[i+c]+correction[at+c]);
  }
  // Apply contour in a separate luminance channel after cosmetic colour edits.
  // A simultaneous blush toggle cannot reintroduce contour or change its hue.
  const contour=chosen.find(p=>p.part==='contour');
  if(contour)for(let y=0;y<contour.height;y++)for(let x=0;x<contour.width;x++){
    const shift=contour.luminance[y*contour.width+x];if(!shift)continue;
    const i=((y+contour.top)*canvas.width+x+contour.left)*4,v=lab(bytes[i],bytes[i+1],bytes[i+2]);
    const colour=rgb([v[0]+shift,v[1],v[2]]);for(let c=0;c<3;c++)bytes[i+c]=colour[c];
  }
  ctx.putImageData(new ImageData(bytes,canvas.width,canvas.height),0,0);
  return canvas.convertToBlob({type:'image/png'});
}
self.onmessage=({data})=>{
  queue=queue.then(async()=>{
    try{
      const started=performance.now();
      if(data.type==='init'){
        await init(data);const images={};
        // Only the three approved lip/blush states are warmed; new states are on demand.
        if(data.warm!==false)for(const key of ['lip','blush','blush,lip'])images[key]=await render(key);
        self.postMessage({id:data.id,images,width:canvas.width,height:canvas.height,composeMs:Math.round(performance.now()-started)});
      }else if(data.type==='render'){
        const key=canonical(data.key),blob=await render(key);
        self.postMessage({id:data.id,key,blob,renderMs:Math.round(performance.now()-started)});
      }else throw Error('local_request_invalid');
    }catch(error){self.postMessage({id:data.id,error:error?.message??'local_composition_failed'});}
  });
  return queue;
};
