import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {MajorBank} from '../../src/major-bank.mjs';
import {Store} from '../../src/store.mjs';
import {DeepSeekPlanner,QwenImageService,VisualProvider} from '../../src/visual-pipeline.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'artifacts/business-type-samples');mkdirSync(out,{recursive:true});
const bank=new MajorBank(path.join(root,'data/question-bank.sqlite')),rows=bank.candidates('工商管理');
const store=new Store(path.join(root,'data'));
const get=id=>{const q=rows.find(q=>q.sourceQuestionId===id);if(!q)throw new Error('题目不存在：'+id);return structuredClone(q)};
const supplemental=(id,stem,options,answer,explanation)=>({sourceQuestionId:id,stem,options,answer,explanation,majorName:'工商管理',majorScenario:'公共机房',majorTags:['工商管理'],topic:'工商管理课程实训',sourceType:'补充测试题',sourceTitle:'为检查通道编写的自包含测试题，非原始题库',sourceUrl:''});
const casual='角色交小平为参考图中的蓝色校园公仔，保持脸部身份，改穿浅蓝色日常上衣；机房任务不穿实验服、不戴护目镜或实验手套。';
const plans=[];
plans.push({id:'R1',title:'共同情境＋文字选项',source:get('QS05622'),origin:'原题库 QS05622',conversionNotes:'一张共同情境图；A—D 原文不变；选项无图片。',reviewedPlan:{route:'R1',adaptedStem:'观察交小平双手湿润、准备操作电脑的情境，下列哪项说法符合用电安全要求？',sceneDescription:casual+'公共机房内交小平双手带水珠，右手悬在电脑键盘上方尚未接触；周围是电脑桌。',labels:['公共机房','手部潮湿','电脑设备'],issues:[]}});
plans.push({id:'R2',title:'四幅不同行动图',source:get('QS05874'),origin:'原题库 QS05874（补充显式功率条件）',conversionNotes:'四幅图分别改变串联、插排位置和固定方式；B 的负荷数值由程序给出，不凭图片猜测。原 A—D 保留供对照，图片下只显示短动作标签。',reviewedPlan:{route:'R2',adaptedStem:'在课程实训机房，哪幅图中的插线板使用方式符合要求？',sceneDescription:casual+'同一机房电脑桌旁，近景清楚表现一个白色三孔插线板、导线、插头和桌旁暖气片。四格均不得有文字、数字、字母。',optionScenes:['交小平把第二个插线板插头插入第一个插线板，两个插线板明显首尾串联。','交小平只用一个插线板给两台电脑供电，插线板在干燥通风的桌边托架，设备接线清楚，无串接。','交小平将白色插线板直接放在暖气片顶部，线插连接电脑。','交小平用一段裸铁丝紧缠插线板外壳并拧在金属桌腿上，近景看清铁丝。'],captions:['串联插排','单一插排','放在暖气片上','用铁丝固定'],conditions:['本题设备铭牌示例：单个插线板最大允许负荷2500W。','B图两台设备总功率800W；该数值为题目给定条件。'],labels:[],issues:[]}});
plans.push({id:'R3',title:'文件封面选项',source:get('QS00220'),origin:'原题库 QS00220（源答案尚待规范条文核验）',conversionNotes:'复用同一中性封面底图；四个规范全称由程序排版。保留原题问法和选项，不让生图模型写书名。',reviewedPlan:{route:'R3',adaptedStem:get('QS00220').stem,sceneDescription:'四张相同形状、相同尺寸、相同颜色的中性文件封面，无印章。',labels:[],issues:['本题规范依据的唯一性仍需核验，当前仅检查文件载体的呈现。']}});
const recordSource=supplemental('BIZ-TEST-R4','一项已批准的机房长时测试需要交接。记录须包含日期、值守时段、交班人签名和接班人签名。以下哪份记录完整？',['日期已填、时段已填、交班人已签、接班人空白','日期已填、时段空白、交班人已签、接班人已签','日期已填、时段已填、交班人已签、接班人已签','日期空白、时段已填、交班人空白、接班人已签'],2,'依据本题明确给出的四个必填项目，只有C记录全部具备。此题用于测试记录证据呈现，不代表学校已采用此表单。');
const baseRecord={date:'2026-10-18',period:'18:00—20:00',outgoing:'交小平',incoming:'交小安'};
plans.push({id:'R4',title:'交接记录证据图',source:recordSource,origin:'补充测试题 BIZ-TEST-R4',conversionNotes:'工商管理匹配库无合适记录原题，因此补充自包含测试题。底图只画空白夹板；四份表单由程序填写，签名空白与有签名实际不同。',reviewedPlan:{route:'R4',adaptedStem:recordSource.stem,sceneDescription:'一张居中正面视角的浅木色文件夹板，金属夹夹住一张完全空白的象牙白纸，纸面占画面大部分，温暖柔光，周围只留少许电脑桌背景。不画人物、不画任何线条、文字、数字、签名、图标，留给程序排版记录表。',labels:[],optionPresentation:'records',optionOverlays:[{...baseRecord,incoming:''},{...baseRecord,period:''},{...baseRecord},{...baseRecord,date:'',outgoing:''}],conditions:['本题规定必填：日期、值守时段、交班人签名、接班人签名。','批准状态和设备运行状态在四份记录中相同，只比较记录证据。'],issues:[]}});
plans.push({id:'R5',title:'给定条件下选择行动',source:{...get('QS05614'),stem:get('QS05614').stem.replace('小赵','交小平')},original:get('QS05614'),origin:'原题库 QS05614（补充可安全断电条件）',conversionNotes:'四图保留同一插座冒烟状态，分别表现泼水、远处断电、湿布覆盖和打电话。题干补充能够安全断电的条件，避免把靠近冒烟插座的动作当成示范。',reviewedPlan:{route:'R5',adaptedStem:'交小平发现插座冒烟，已确认可从远离冒烟插座的总开关安全断电。此时首先应选择哪幅图中的行动？',sceneDescription:casual+'同一公共机房，右侧墙壁插座冒少量灰烟，无明火无人受伤；左侧远离冒烟插座的墙面有带可操作总开关的电源控制箱。四格烟雾与场所一致，只变化人物动作。',optionScenes:['交小平拿水杯，将水朝冒烟插座方向泼去，水的运动方向清楚。','交小平站在远离冒烟插座的左侧总开关前，将开关拨向断开状态，人物不靠近冒烟插座。','交小平拿湿布朝冒烟插座覆盖，布上水滴可见。','交小平远离插座拿手机打电话，双手没有操作电源开关，插座仍冒灰烟。'],captions:['泼水','远处断电','湿布覆盖','打电话'],conditions:['插座冒烟。','已确认能从远离插座的总开关处安全断电。'],labels:[],issues:['电气异常处置样题需由学校安全教师核对适用流程后再用于正式教学。']}});
plans.push({id:'R6',title:'对话信息＋文字回应',source:get('QS05377'),origin:'原题库 QS05377',conversionNotes:'原话显示在程序排版的对话气泡中；A—D 原文保留，选项不重复配图。画面不使用可点击的真实网站。',reviewedPlan:{route:'R6',adaptedStem:'交小平听到图中交小安的说法，下列哪项回应合适？',sceneDescription:casual+'公共机房内，蓝色交小平坐在电脑前，橙色交小安站在右侧说话，两人看向电脑；电脑屏幕仅有抽象网页缩略块，不显示文字。右上方留浅色空白区域供程序叠加交小安的对话，不画气泡内文字。橙色角色也穿日常上衣，没有实验服。',overlay:{type:'dialogue',speaker:'交小安',text:'不明网站随便访问没关系。'},labels:['公共电脑','网页信息'],issues:[]}});
const originalR7=get('QS03703');
const r7=supplemental('BIZ-ADAPT-R7','机房规定废旧充电电池交专门回收点。交小平更换无线鼠标的充电电池后，哪幅图中的去向符合这项规定？',['投入普通垃圾袋','交专门回收点收集','埋入花盆土里','放在小火堆中焚烧'],1,'题目已经明确规定废旧充电电池交专门回收点，B与该条件一致。不同类型电池应依当地分类规则处理，不能据本题推断所有电池的统一去向。');
plans.push({id:'R7',title:'同一物品的四种去向',source:r7,original:originalR7,origin:'改编测试题，基于 QS03703 重新设置选项',conversionNotes:'原题混合电池、针头、碎玻璃；为比较同一对象的去向，另建改编版并保存新答案。四图实际放置关系不同，不靠换桶上的字区分。',reviewedPlan:{route:'R7',adaptedStem:r7.stem,sceneDescription:casual+'同一张机房边的服务桌旁，同一枚从无线鼠标取出的圆柱形充电电池，同一个人物。四格都清楚画出电池和目的地，不能只更换文字标签。',optionScenes:['交小平把圆柱电池扔进装着纸屑和饮料包装的敞口黑色垃圾袋。','交小平把圆柱电池放进机房服务台专门的透明带盖电池收集箱，箱内已有整齐可见的相同电池。','交小平用小铲子将圆柱电池埋入大花盆的土壤，部分电池仍露在土外。','交小平将圆柱电池放在一小堆正在燃烧的纸片边，不画爆炸、不画人受伤。'],captions:['普通垃圾袋','专门回收点','花盆土里','焚烧'],conditions:['本题对象是废旧充电电池。','本题机房规定：交专门回收点。'],labels:[],issues:[]}});
const sequence='1. 保存报告源文件 2. 导出PDF文件 3. 上传PDF文件 4. 核对提交回执';
const r8=supplemental('BIZ-TEST-R8','营销实训报告的课程提交任务要求：先保存源文件才能导出，导出PDF后才能上传，上传完成后才能核对提交回执。下列步骤的正确顺序是？',[sequence,'1. 导出PDF文件 2. 保存报告源文件 3. 核对提交回执 4. 上传PDF文件','1. 上传PDF文件 2. 导出PDF文件 3. 保存报告源文件 4. 核对提交回执','1. 核对提交回执 2. 上传PDF文件 3. 导出PDF文件 4. 保存报告源文件'],0,'本题给定的任务依赖是：保存源文件→导出PDF→上传PDF→核对回执。步骤图只各生成一次，界面打乱位置后按完整点击序列判定。此为补充交互测试流程，不是安全应急处置流程。');
plans.push({id:'R8',title:'步骤图依次点击',source:r8,origin:'补充测试题 BIZ-TEST-R8',conversionNotes:'工商管理匹配库缺少完整顺序题。使用课程提交任务的显式依赖测试排序：每步只画一次，显示位置打乱，按点击顺序整体判断。',reviewedPlan:{route:'R8',adaptedStem:'请按营销实训报告的提交流程，依次点击四张步骤图。',sceneDescription:casual+'交小平在同一电脑前提交营销实训报告。保存场景显示正在编辑的多段文字文档与磁盘保存图标；导出场景显示文档转成独立文件缩略图的动作；上传场景显示人物拖动文件向云端上传的可见箭头；回执场景显示人物仔细查看电脑上的提交回执面板。所有屏幕不生成文字，精确步骤名称由程序给出；四格动作和屏幕图形要能分辨。',labels:[],conditions:['题目已给定：保存后才能导出，导出后才能上传，上传后才能核对回执。'],issues:[]}});

const planner=new DeepSeekPlanner(),imageService=new QwenImageService({assetsDir:path.join(root,'web/assets/generated'),referencePath:path.join(root,'web/assets/character-atlas.png')}),provider=new VisualProvider({planner,imageService});
const stepPlan=plans.find(p=>p.id==='R8').reviewedPlan;
stepPlan.stepContext=casual+'同一间工商管理实训机房，同一张浅木色电脑桌。镜头从人物侧后方拍摄，电脑屏幕内容占画面一半，可以看见操作动作。';
stepPlan.stepScenes=[
 '交小平使用电脑编辑多段文字的营销报告，手握鼠标点击屏幕工具栏的磁盘形状保存图标，屏幕为无字的文字排版线条。只画保存源文件，不出现云朵或上传箭头。',
 '电脑屏幕显示左边多页报告文档通过向右箭头转换为右边一张独立白色文件图标，交小平用鼠标点选导出；文件图标没有字母或文字。只画导出文件，不画上传云朵。',
 '交小平用鼠标将一张独立文件图标拖向电脑屏幕中央的大云朵，云朵内只有一支明确朝上的上传箭头，图标正在进入上传区域。不能出现朝下箭头，也不要画文档转换。',
 '上传已结束，交小平用鼠标放大查看电脑屏幕上的提交回执卡；回执上只有文件缩略图、无字横线和小钟表图标，人物仔细比对旁边的报告文件；不画云朵，不画上传箭头，不画勾号或序号。'
];
const selected=process.argv.slice(2),samples=[];
const clean=s=>{s=String(s);for(const key of [process.env.DASHSCOPE_API_KEY,process.env.DEEPSEEK_API_KEY])if(key)s=s.split(key).join('[REDACTED]');return s};
const manifestFile=path.join(root,'data/business-type-samples.json');
const prior=existsSync(manifestFile)?JSON.parse(readFileSync(manifestFile,'utf8')).samples||[]:[];
try{
 for(const spec of plans){
  const file=path.join(out,spec.id+'.json');
  if(selected.length&&!selected.includes(spec.id)){const saved=prior.find(x=>x.id===spec.id);if(saved)samples.push(saved);continue;}
  if(existsSync(file)&&!process.env.REGENERATE_SAMPLES){const saved=JSON.parse(readFileSync(file,'utf8'));if(saved.candidate?.visual){samples.push(saved);console.log(spec.id+' reused');continue;}}
  console.log(spec.id+' planning');
  let automaticPlan=null;try{automaticPlan=await planner.plan(spec.source)}catch(e){console.log(clean(spec.id+' planning warning: '+e.message))}
  let candidate;
  if(spec.id==='R1'){
   const existing=store.all().find(q=>q.source.sourceQuestionId===spec.source.sourceQuestionId&&q.candidate?.visual);
   if(existing){candidate=structuredClone(existing.candidate);candidate.options=spec.source.options.map(text=>({text}));candidate.stem=spec.reviewedPlan.adaptedStem;candidate.conditions=[];}
  }
  if(!candidate)candidate=await provider.generate(spec.source,{reviewedPlan:spec.reviewedPlan});
  if(!candidate.visual)throw new Error(spec.id+' 没有生成图片：'+candidate.issues.join('；'));
  if(spec.id==='R8')candidate.stem=spec.reviewedPlan.adaptedStem;
  const result={...spec,automaticPlan,candidate,reviewNotes:[],inspectionOnly:true};
  writeFileSync(file,JSON.stringify(result,null,2));samples.push(result);
  writeFileSync(manifestFile,JSON.stringify({major:'工商管理',generatedAt:new Date().toISOString(),samples},null,2));
  console.log(clean(JSON.stringify({id:spec.id,route:candidate.route,image:candidate.visual.image,issues:candidate.issues})));
 }
 samples.sort((a,b)=>a.id.localeCompare(b.id));
 writeFileSync(manifestFile,JSON.stringify({major:'工商管理',generatedAt:new Date().toISOString(),samples},null,2));
 console.log('DONE '+samples.length+' sample types');
}catch(e){console.error(clean(e.message));process.exitCode=1;}
finally{bank.close();store.db.close();}
