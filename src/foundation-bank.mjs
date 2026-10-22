// Curated text-to-picture mappings for the local experiment; no network calls.
// Original questions/options/answers come from the user's bank, not invented API output.
const refs={
 management:'https://www.moe.gov.cn/srcsite/A16/s3336/201905/t20190531_383962.html',
 electrical:'https://ce.sysu.edu.cn/zh-hans/article/630',
 general:'https://www.htu.edu.cn/smkxsfzx/2020/0107/c12754a161810/page.psp',
 mechanical:'https://lab.hubu.edu.cn/info/1037/1919.htm',
 campus:'https://www.ynufe.edu.cn/sysysyjxglzx/info/1372/3662.htm'
};
// Concept, accepted correct proposition, scene asset, neutral visible facts, explanation.
export const concepts=[
 ['web',/不得访问不明网站/,'computer-security',['电脑屏幕','未知来源窗口'],'公共电脑应避免访问来源不明的网站、下载不明软件；来源不明不等于安全。','campus'],
 ['software',/不得.*安装.*软件|不得随意安装/,'computer-security',['电脑屏幕','软件窗口'],'公共设备的软件安装应遵守管理要求，不自行安装来源不明的软件。','campus'],
 ['machine-guard',/防护装置.*(齐全|可靠)|机械.*防护装置/,'mechanical',['机械设备','封闭防护罩'],'使用机械前应检查防护装置，不拆除或绕过设备的安全防护。','mechanical'],
 ['machine-stop',/停机断电后方可清理检修/,'mechanical',['机械设备','准备检查'],'清理、检修机械前须按规程停机断电，不能只凭设备暂时不转就认为可以操作。','mechanical'],
 ['machine-touch',/运转.*不得.*手|严禁用手.*(清理|触摸|测量)|旋转.*不得戴手套/,'mechanical',['机械设备','设备操作区'],'旋转部件存在卷入风险，应按规程保持距离；调整、清理和检修不能在设备运转时进行。','mechanical'],
 ['chemical-label',/化学品容器标签必须清晰完整/,'chemical-storage',['密闭试剂瓶','存储柜'],'化学品应有清晰完整的标签；不能凭颜色、外观或记忆判断瓶中物质。','management'],
 ['chemical-unknown',/不明化学品不得随意处置/,'chemical-storage',['密闭试剂瓶','存储柜'],'不明化学品应交专业人员鉴别处理，不自行混合、倾倒或处置。','management'],
 ['biological-permission',/培养物未经批准不得带出/,'biological',['生物安全柜','封闭样品管'],'培养物应在规定的区域和管理流程内使用，未经批准不得带出实验室。','management'],
 ['biological-training',/生物安全实验室实行分级管理/,'biological',['生物安全柜','准备区'],'不同生物安全等级的实验室有不同管理和防护要求，应按相应等级管理。','management'],
 ['wet',/湿手不得/,'wet-hands',['手部潮湿','电脑设备'],'手部潮湿时不得操作电气设备；不能用低电压、木凳或设备大小来代替安全操作要求。','electrical'],
 ['damaged',/电线绝缘层破损、老化时应停止使用并报修/,'cable-check',['电缆外皮破损','插头已脱离插座'],'电线绝缘层破损、老化时应停止使用并报修，不能用透明胶带临时包裹后继续使用。','electrical'],
 ['exit',/安全出口、疏散通道不得堆放/,'evacuation',['楼梯间','电梯入口'],'安全出口和疏散通道须保持畅通，临时放置物品或只留下半边通道也不符合要求。','general'],
 ['equipment',/消防器材不得挪作他用/,'fire-equipment',['消防器材','器材存放处'],'消防器材用于消防处置，不得用来顶门、冲洗地面或挪作其他用途。','general'],
 ['training',/进入实验室前必须经过安全培训并考核合格/,'training',['入口','培训资料'],'进入实验室开展操作前，应完成相应安全培训并通过考核；经验不能代替准入要求。','management'],
 ['firstaid',/实验室应配备急救箱/,'first-aid',['急救箱','应急物资'],'实验室应配备适用的急救物资并保持可用，不能认为只有大型实验室才需要。','general'],
 ['shards',/碎玻璃应放入专用容器收集/,'glass-waste',['碎玻璃','收集容器'],'碎玻璃应按管理要求用专用容器收集，避免混入普通垃圾或直接徒手捡拾。','general'],
 ['report',/发生事故应按规定及时报告|发现安全隐患应及时报告/,'report',['正在联系','设备所在位置'],'事故和隐患应按规定及时报告，不能为避免麻烦而隐瞒或拖延；同时保证自身安全。','management'],
 ['manual',/仪器设备应按操作手册使用/,'equipment-manual',['设备','操作资料'],'仪器设备应按操作手册和实验室规程使用，不能凭经验随意改变操作步骤。','management'],
 ['risk',/实验项目开展前应进行风险评估/,'training',['任务准备','资料核对'],'开展新的实验项目前应识别危险、评估风险并落实防护和应急措施，再按程序开展活动。','management'],
 ['repair',/电气设备检修时应先断电，并悬挂警示牌/,'equipment-manual',['设备待检查','操作资料'],'电气检修应按规程断电并设置警示，防止他人误送电；熟练程度不能成为带电检修的理由。','electrical'],
 ['fuse',/不得用铜丝、铁丝代替保险丝/,'equipment-manual',['电气设备','设备资料'],'保险丝承担过流保护作用，不能用铜丝、铁丝或其他普通金属导线替代。','electrical'],
 ['strip',/插线板不得串接使用，且不得超负荷/,'equipment-manual',['电气设备','用电准备'],'插线板不得串接或超负荷使用，新旧程度和插孔数量不能证明用电安全。','electrical'],
 ['ground',/金属外壳必须可靠接地|机房设备金属外壳应可靠接地/,'equipment-manual',['金属外壳设备','设备资料'],'应按设备和安装规范落实保护接地；设备大小和外观不能代替接地要求。','electrical'],
 ['elevator',/火灾疏散时不得乘坐电梯/,'evacuation',['楼梯间','电梯入口'],'火灾疏散应按现场指引选择安全通道，不乘坐普通电梯，不因电梯仍在运行就认为安全。','general'],
 ['plan',/实验室应有完善的应急预案/,'first-aid',['应急物资','应急信息栏'],'实验室应有与风险相适应的应急预案，并落实必要的应急资源和培训演练。','management'],
 ['route',/应熟悉实验室疏散路线与安全出口/,'evacuation',['楼梯间','通道'],'进入活动场所应先熟悉疏散路线与安全出口，遇到紧急情况按现场指引有序撤离。','general'],
 ['drill',/实验室应定期开展应急演练/,'first-aid',['应急物资','演练准备'],'定期开展应急演练有助于掌握处置和疏散要求，不能用口头了解或临时安排替代演练。','management'],
 ['keys',/实验室钥匙应由专人管理/,'training',['入口','出入管理'],'实验室钥匙应由专人按制度管理，不能任意借用、复制或以个人便利代替管理要求。','management'],
 ['register',/贵重仪器使用应进行登记|仪器使用后应归位并登记/,'equipment-manual',['仪器设备','使用记录'],'仪器使用应按规定登记，使用完毕按规程整理归位，形成可追溯的使用记录。','management'],
 ['hazard',/应对实验室危险源进行辨识并管控/,'training',['任务准备','资料核对'],'危险源需要辨识和管控，不能等到事故发生后才讨论风险。','management']
 ,['fire-maintenance',/灭火器应定期检查维护/,'fire-equipment',['消防器材','器材存放处'],'灭火器须按规定检查维护，确保完好可用，不能只在发生火灾时才检查。','general']
 ,['emergency-signs',/应急照明与疏散指示标志应定期检查/,'evacuation',['楼梯间','通道'],'应急照明与疏散指示标志应定期检查并保持完好，损坏应及时处理。','general']
 ,['electrician',/电气线路改造应由专业电工实施/,'equipment-manual',['设备待检查','设备资料'],'电气线路改造须由具备相应资质的专业人员实施，不能仅凭使用经验自行改线。','electrical']
 ,['training-record',/实验室安全培训记录应妥善保存/,'training',['培训资料','准入核验'],'培训和考核应留存记录，不能以口头说明代替必要的管理记录。','management']
 ,['responsibility',/安全责任落实到人，谁使用、谁负责/,'report',['设备所在位置','正在联系'],'使用人应按制度承担相应的安全责任，不能把安全责任全部推给他人。','management']
 ,['end-check',/实验结束应检查水电门窗/,'equipment-manual',['设备','使用结束前'],'活动结束后应按场所和设备规程检查水、电、门窗等，不以简单关灯代替检查。','campus']
];
const special=scenario=>/公共机房|计算机/.test(scenario)?['web','software']: /生物|医学|农学/.test(scenario)?['biological-permission','biological-training']: /机械|电子电工|电气/.test(scenario)?['machine-guard','machine-stop','machine-touch']: /化学|化工|材料|环境/.test(scenario)?['chemical-label','chemical-unknown']:[];
export function offlineRows(bank,{assetsRoot,exists}){
 const out=[],profiles=[];
 for(const major of bank.majors()){
  const candidates=bank.candidates(major.name).filter(q=>/下列说法正确/.test(q.stem)&&new Set(q.options).size===q.options.length);
  const domainIds=new Set(['web','software','machine-guard','machine-stop','machine-touch','chemical-label','chemical-unknown','biological-permission','biological-training']);
  const order=[...special(major.scenario),...concepts.map(c=>c[0]).filter(id=>!domainIds.has(id))],chosen=[],seen=new Set();
  for(const repeatLimit of [1,2,3]){for(const id of order){if(seen.has(id))continue;const concept=concepts.find(c=>c[0]===id);if(chosen.filter(q=>q.candidate.visual.image==='assets/offline/'+concept[2]+'.png').length>=repeatLimit)continue;
   const source=candidates.find(q=>concept[1].test(q.options[q.answer]));if(!source||chosen.some(c=>c.source.sourceQuestionId===source.sourceQuestionId))continue;seen.add(id);
   const [conceptId,,asset,labels,explanation,reference]=concept,image='assets/offline/'+asset+'.png';
   if(!exists(assetsRoot+'/'+image))throw new Error('缺少已核对的预生成素材：'+image);
   const stem=conceptId==='wet'?'交小平双手潮湿，正准备操作图中的电脑。下列哪项说法符合用电安全要求？':source.stem.replace(/（[　 ]*）/g,'');
   const candidate={provider:'gpt-pregenerated-v1',route:'R1',type:'illustrated',stem,options:source.options.map(text=>({text})),answer:source.answer,explanation,sourceUrl:refs[reference],visual:{kind:'generated',image,labels},issues:[],checks:[{name:'原题与选项',status:'pass'},{name:'本地图片与知识点',status:'pass'}],provenance:{mode:'pregenerated',imageProvider:'Codex built-in image generation',liveApiCalled:false,concept:conceptId,originalQuestionId:source.sourceQuestionId}};
   if(conceptId==='shards'){
    candidate.route='R7';candidate.type='image_choice';candidate.stem='在'+source.majorScenario+'准备清理碎玻璃，哪幅图中的做法符合废弃物收集要求？';candidate.visual.image='assets/offline/glass-options.png';
    candidate.options=source.options.map(text=>{const crop=/专用容器/.test(text)?1:/直接用手/.test(text)?2:/扫帚/.test(text)?0:3;return {text,image:candidate.visual.image,crop,caption:['扫入普通垃圾桶','放入硬质专用容器','徒手捡拾','混入普通垃圾'][crop]};});
    if(!exists(assetsRoot+'/'+candidate.visual.image))throw new Error('缺少碎玻璃对照图');
   }
   chosen.push({source,candidate});if(chosen.length===10)break;
  }if(chosen.length===10)break;}
  if(chosen.length!==10)throw new Error(major.name+'仅匹配到'+chosen.length+'道经过内容筛选的题');
  profiles.push({major:major.name,scenario:major.scenario,count:chosen.length,questions:chosen.map(q=>q.source.sourceQuestionId)});out.push(...chosen);
 }
 return {rows:out,profiles};
}
