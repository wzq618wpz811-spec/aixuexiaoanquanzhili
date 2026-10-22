import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../web/',import.meta.url)),cache=new Map();
function assetIdentity(image){
 const relative=String(image||'').split(/[?#]/)[0].replaceAll('\\','/').replace(/^\/+/,''),file=path.resolve(root,relative);
 if(!file.startsWith(root))return relative;
 try{const stat=statSync(file),stamp=stat.size+':'+stat.mtimeMs,old=cache.get(file);if(old?.stamp===stamp)return old.hash;
  const hash=createHash('sha256').update(readFileSync(file)).digest('hex');cache.set(file,{stamp,hash});return hash;
 }catch{return relative;}
}
// Compare what is actually displayed. Changing a question title, dialogue,
// filename or labels does not turn the same illustration into a new scene.
export function visualKeys(q){
 const c=q.candidate||q,v=c.visual||{},keys=[];
 function raster(image,crop){if(!image)return;const identity=assetIdentity(image);for(const cell of Number.isInteger(crop)?[crop]:[0,1,2,3])keys.push(identity+'#'+cell);}
 if(['image_choice','order'].includes(c.type)){
  for(const o of c.options||[]){
   // Record and book cards are program-rendered documents; their content,
   // rather than the reusable paper texture, is the displayed visual.
   if(o.record)keys.push('record:'+JSON.stringify(o.record));
   else if(o.carrier)keys.push('document:'+o.text);
   else if(o.scene)raster(o.scene.image,o.scene.crop);
   else raster(o.image,o.crop);
  }
 }else raster(v.image,v.crop);
 return [...new Set(keys)];
}
export function hasRepeatedVisual(cards){const used=new Set();for(const q of cards)for(const key of visualKeys(q)){if(used.has(key))return true;used.add(key);}return false;}
