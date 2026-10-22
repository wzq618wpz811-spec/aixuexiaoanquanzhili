export const cases = [
 {id:'qust-2021',title:'干燥箱无人值守',school:'青岛科技大学',date:'2021-04-14',published:'2021-04-15',url:'https://sbc.qust.edu.cn/info/1008/3574.htm',kind:'事故学校原通报',summary:'实验计划改变后，仍在加热的样品被遗忘。人员先后离开，干燥箱继续运行，随后冒烟触发报警。',limits:'原通报未披露本起事件伤亡与损失；教学画面和提问为改编。'},
 {id:'nwu-2024',title:'过夜实验审批与值守',school:'西北大学',date:'2024-05-12',published:'2024-05-12',url:'https://gyzc.nwu.edu.cn/info/1004/1412.htm',kind:'事故学校原通报（初步情况）',summary:'通报初步指出过夜实验未按规定审批报备、现场值守不足等问题，起火范围限于单个通风橱。',limits:'属于初步通报，不扩写结论；画面不是现场还原。'},
 {id:'swjtu-2020',title:'样品包装不当',school:'西南交通大学',date:'2020-12-21',published:'2020-12-28',url:'https://clxy.swjtu.edu.cn/info/1110/14586.htm',kind:'事故学校原通报',summary:'送样使用不合规包装，样品反应放热导致包装燃烧。通报明确未造成人员受伤和财产损失。',limits:'不依据外观指定通用包装材料；容器与防护由具体实验要求确定。'}
];
export const source={title:'西安交通大学何刚课题组安全教育',url:'https://ganghe.xjtu.edu.cn/info/1024/2643.htm'};
const make=(id,stem,options,answer,explanation,topic,caseId)=>{const c=cases.find(c=>c.id===caseId);return {id,stem,options,answer,explanation,topic,sourceUrl:c?.url||source.url,sourceTitle:c?.title||source.title,caseId};};
export const samples=[
 make('handover-choice','同一台设备按要求继续运行，哪份交接安排更完整？',['情境 A','情境 B'],1,'情境 B 同时明确了值守人员与交接确认；情境 A 仅猜测有人负责。仍需遵守设备和实验方案的其他要求。','责任交接','qust-2021'),
 make('handover','设备仍在运行，记录上没有明确的值守人。最后离开前，应该确认哪些问题？',['设备是否按操作要求运行','值守及交接是否落实','只要没有冒烟就可以离开'],[0,1],'设备用途、运行要求和责任交接都需要核实；没有冒烟不等于可以无人管理。题目为事故教训改编。','离室核查','qust-2021'),
 make('hotspot','检查准备结束的实验室。请选择需要进一步核实的区域。',['运行设备','空白交接记录','保持畅通的出口'],[0,1],'图中运行设备与空白交接记录共同提示需要核查运行责任。出口畅通本身不是隐患。此图为教学构造。','隐患识别','qust-2021'),
 make('timeline','把这起事故的事件卡片按发生先后排列。',['烟感报警，检查发现干燥箱冒烟','计划改变，正在加热的样品被遗忘','实验人员先后离开，设备仍在运行'],[1,2,0],'通报事件链为：遗忘加热中的样品，人员先后离开，最后冒烟报警。这是事故经过排序，不是应急操作步骤。','事故复盘','qust-2021'),
 make('branch','准备开展过夜实验，审批状态尚未确认。你会怎么做？',['先确认审批与实验要求','先启动，之后补办手续'],[0,1],'先核实审批及方案要求，再确认值守安排；审批通过本身不能替代实际值守。分支为教学改编，不是原通报的当事人对话。','过夜实验','nwu-2024'),
 make('sample','同学说：“样品已经装好，看起来没问题，就不用确认包装是否适配了。”这个判断对吗？',['正确','错误'],1,'容器外观不能证明与样品性质相适配。送样前应依据具体样品要求确认包装和交接信息。图中的箱子不是对所有样品通用的包装建议。','样品转运','swjtu-2020'),
 make('uncertain','这份未知样品可以直接沿用上一批的包装吗？',['可以','不可以'],null,'需补充样品性质、实验要求与包装依据。','样品转运','swjtu-2020')
];
export const normalize=s=>String(s??'').replace(/\s+/g,'').trim();
export function fixtureFor(q){return samples.findIndex(s=>normalize(s.stem)===normalize(q.stem)&&JSON.stringify(s.options)===JSON.stringify(q.options)&&JSON.stringify(s.answer)===JSON.stringify(q.answer)&&s.sourceUrl===q.sourceUrl&&s.explanation===q.explanation&&s.topic===q.topic);}
export const sampleText=JSON.stringify(samples,null,2);

