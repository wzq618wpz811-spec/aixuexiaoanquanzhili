import {fixtureFor,cases} from './catalog.mjs';
export const characters=[
 {id:'xiaoping',name:'交小平',version:1,atlas:'assets/character-atlas.png',row:0,views:['front','quarter','back'],source:'https://rwxy.xjtu.edu.cn/info/1038/9501.htm'},
 {id:'fox',name:'交小安',version:1,atlas:'assets/character-atlas.png',row:1,views:['front','quarter','back'],source:'校园安全文化形象交小安（用户确认）'}
];
export const visualTypes=['image_choice','image_judge','multi','hotspot','order','branch','illustrated'];
export class DemoProvider {
 async generate(q){
  const n=fixtureFor(q),issues=[];
  if(q.answer===null)issues.push('缺少标准答案');if(!q.sourceUrl)issues.push('缺少来源');
  if(n<0)issues.push('待接入 AI，需补充情境图与题型设计');if(n===6)issues.push('缺少样品条件与包装依据');
  if(n===3)issues.push('原型事故时间线不是题库原始排序题，暂不发布');
  const type=['image_choice','multi','hotspot','order','branch','image_judge','illustrated'][n]||'illustrated';
  return {stem:q.stem,options:q.options.map((text,i)=>({text,image:null,scene:n===0?{image:'assets/lab-scene.png',note:i?'值守人已确认 · 交接已完成':'可能还有同学 · 交接未确认'}:null})),answer:q.answer,explanation:q.explanation||'',sourceUrl:q.sourceUrl,type,
   visual:n<0?null:n===0?{kind:'paired'}:n===5||n===6?{kind:'integrated',image:'assets/transfer-blue.png',variants:{xiaoping:'assets/transfer-blue.png',fox:'assets/transfer-fox.png'}}:{kind:'layered',image:'assets/lab-scene.png',pose:'quarter'},
   caseInfo:cases.find(c=>c.url===q.sourceUrl)||null,
   markers:n===2?[{label:'运行设备',x:18,y:51},{label:'交接记录',x:91,y:29},{label:'安全出口',x:78,y:30}]:[],
   nodes:n===4?[{text:'审批状态未确认',options:['先确认审批与实验要求','先启动，再补手续']},{text:'负责人已确认可以按批准方案开展，但值守安排仍未落实。',options:['审批通过就可以离开','先落实值守与交接安排']},{text:'你已打算先启动，但同伴提出审批还未确认。',options:['暂停安排，先确认审批和实验条件','仍按原计划启动']}]:[],
   rationale:({image_choice:'比较可观察差异',multi:'结合情境识别多个条件',hotspot:'定位需要核查的区域',order:'通过事件链理解管理缺口',branch:'在连续决策中补全条件',image_judge:'结合画面判断说法',illustrated:'等待情境材料'})[type],issues,
   checks:[{name:'答案',status:q.answer===null?'flag':'pass'},{name:'来源',status:q.sourceUrl?'pass':'flag'},{name:'图文',status:issues.length?'flag':'pass'}],
   provider:'demo-fixture-v2',generatedAt:new Date().toISOString()};
 }
 async characterViews(characterId){const c=characters.find(c=>c.id===characterId);if(!c)throw new Error('形象不存在');return {...c,mode:'prebuilt',onlineCalls:0};}
 async replaceActor({characterId,mode,sceneId='transfer'}){if(!characters.some(c=>c.id===characterId))throw new Error('形象不存在');
  if(mode==='layer')return {mode,characterId,background:'assets/lab-scene.png',atlas:'assets/character-atlas.png',onlineCalls:0,reused:true};
  if(mode!=='edit'||sceneId!=='transfer')throw new Error('当前仅有送样场景的局部重绘样例');
  return {mode,characterId,image:characterId==='fox'?'assets/transfer-fox.png':'assets/transfer-blue.png',original:'assets/transfer-blue.png',onlineCalls:0,reused:true,provenance:'pre-generated-image-edit',region:'角色及与手部接触的器材边缘',quality:'已人工查看；未执行自动像素差异检测'};
 }
}

