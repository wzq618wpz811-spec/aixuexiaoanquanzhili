// Selected after reading the original T1 propositions. Numeric treatment/first-aid
// recipes and broad claims with important missing exceptions are not added here.
// Scenes are neutral backgrounds, not demonstrations of actual operations.
const groups=[
 {ids:[2,3,4,7,8,9,10,11,12,14,15,16,17,219,225,228],image:'assets/offline/equipment-manual.png',crop:null,reference:'https://ce.sysu.edu.cn/zh-hans/article/630',reason:'用电安全应防止失去保护、接触带电部分和不合规操作，发现异常应按场所规定停用并联系合适人员。'},
 {ids:[22,23,24,25,27,29,30,31,34,35,36,221],image:'assets/offline/fire-equipment.png',crop:null,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'消防设施和疏散条件需要保持可用；发生火情应按现场情况报警、疏散并避免冒险处置。'},
 {ids:[39,40,41,43,44,45,47,49,51,58,64,68,69,70,226,227],image:'assets/curriculum/chemical-contexts.png',crop:1,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'化学品的标识、相容性、授权及存放边界须明确，不能用外观、经验或便利替代规范核查。'},
 {ids:[50,54,55,56,224],image:'assets/curriculum/chemical-contexts.png',crop:0,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'化学实验的操作环境和防护要与物质危害相适应，遵守指定设备与实验室的操作要求。'},
 {ids:[42,63,157,158,159,161,162,167,223],image:'assets/curriculum/chemical-contexts.png',crop:2,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'废弃物须根据性质和相容性分类、标识并经合适渠道处理，不能混合未知废液或直接排入下水道。'},
 {ids:[71,72,73,74,75,77,78,79,80,81,82,84],image:'assets/curriculum/equipment-contexts.png',crop:0,reference:'https://cce.upc.edu.cn/2020/1104/c2607a320987/pagem.htm',reason:'气瓶和附件涉及压力、倾倒、气体性质等风险，应按检验、固定、搬运及使用规程管理，未经培训不自行处置异常。'},
 {ids:[101,102],image:'assets/curriculum/equipment-contexts.png',crop:2,reference:'https://re.njau.edu.cn/info/1291/11370.htm',reason:'离心机运行涉及高速转动与不平衡风险，须按设备要求配平、关闭防护并待完全停止后按规程处理。'},
 {ids:[103,104,105,106,109,110,111,112,113,114,116],image:'assets/offline/mechanical.png',crop:null,reference:'https://lab.hubu.edu.cn/info/1037/1919.htm',reason:'机械操作须防止卷入、飞出、切割和误启动风险，检查、清理与检修遵守设备规程和能量隔离要求。'},
 {ids:[118,119,120,121,122,123,125,127,128,220],image:'assets/curriculum/equipment-contexts.png',crop:1,reference:'https://elab.nefu.edu.cn/info/1049/1865.htm',reason:'加热与余温均可能造成灼伤或引燃风险，防护、取放、值守和收纳按设备与实验室要求执行。'},
 {ids:[131,132,133,139],image:'assets/curriculum/equipment-contexts.png',crop:3,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'激光风险与波长、功率和光路相关，应使用适配的防护与光路控制措施，不直视光束。图中设备仅为停止状态的情境示意。'},
 {ids:[144,145,146,147,149,150,151,153,155,156],image:'assets/curriculum/chemical-contexts.png',crop:3,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'个人防护用品应与当前风险匹配，保持完好并按要求使用；不能把普通衣物或外观相似的用品直接当作合格防护。'},
 {ids:[93,95,96,97,98],image:'assets/offline/biological.png',crop:null,reference:'https://shengkxy.lsnu.edu.cn/info/1067/2206.htm',reason:'生物实验遵守场所风险分级、准入和物品流转要求，按指定规程落实防护与清洁消毒，不自行扩大任务范围。'}
];
export const extraOriginalTopics=new Map(groups.flatMap(group=>group.ids.map(id=>['KN-'+String(id).padStart(3,'0'),group])));
const aliases=[['KN-004','KN-203'],['KN-023','KN-206'],['KN-035','KN-212'],['KN-042','KN-157','KN-063','KN-162'],['KN-043','KN-044','KN-045','KN-068'],['KN-053','KN-059'],['KN-090','KN-165'],['KN-009','KN-117'],['KN-086','KN-166'],['KN-040','KN-158'],['KN-041','KN-049','KN-227']];
export const originalKnowledgeAliases=new Map(aliases.flatMap(pair=>pair.map(id=>[id,pair[0]])));
