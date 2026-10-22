import {readFileSync} from 'node:fs';

// Each topic has its own inspected panel. No family-workflow fallback is allowed.
const spec=JSON.parse(readFileSync(new URL('./topic-scene-specs.json',import.meta.url),'utf8'));
export const topicSceneBindings=new Map(spec.plates.flatMap(p=>p.topicIds.map((id,crop)=>[id,{
 image:'assets/curriculum/topics/'+p.name+'.png',crop,sceneId:id,description:p.scenes[crop]
}])));
export function topicScene(id){
 const scene=topicSceneBindings.get(id);
 if(!scene)throw new Error('本考点尚无匹配的场景图，不允许使用通用流程图代替：'+id);
 return {...scene};
}
