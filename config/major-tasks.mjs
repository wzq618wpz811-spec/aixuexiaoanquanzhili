// Each major gets a concrete assignment and different task material, not a renamed room.
const lines=`化学|试剂标签逐项核验|试剂编号与有效期卡
应用化学|清洗剂配方资料比对|清洗剂成分说明
化学生物学|荧光探针资料整理|探针样本编码表
化学工程与工艺|反应单元风险记录|工艺单元检查单
制药工程|制剂生产批记录核对|制剂批次流转卡
能源化学工程|储能材料测试资料交接|电解质样品登记单
材料科学与工程|拉伸试样追溯登记|试样批号与尺寸记录
材料化学|涂层样片台账复核|涂层配制来源卡
高分子材料与工程|聚合物样品收存登记|聚合物样品标签
冶金工程|金属试片编号复核|炉次与金相试片表
机械工程|车间机床点检资料整理|机床点检记录
机械设计制造及其自动化|夹具借用与归还核查|夹具借用单
过程装备与控制工程|压力装置检验资料核验|装置检验编号卡
车辆工程|制动台架实验材料归档|制动台架工况记录
能源与动力工程|换热实验测试资料交接|换热器测点记录
新能源科学与工程|光伏测试文件汇总|组件测试编码表
电气工程及其自动化|配电柜检修记录核对|断电确认记录
智能电网信息工程|负荷数据访问权限核验|负荷曲线导出单
自动化|传感器标定材料归档|传感器标定记录
机器人工程|机械臂训练区点检|机械臂区域检查单
电子信息工程|电路板测试批次登记|电路板测试编号卡
通信工程|信道测试日志交接|信道测量日志
微电子科学与工程|晶圆样片追溯登记|晶圆批次位置卡
光电信息科学与工程|光学元件借用记录|光学元件编号单
集成电路设计与集成系统|版图文件版本核验|版图版本发布记录
计算机科学与技术|课程代码仓库权限检查|仓库访问成员表
软件工程|缺陷日志发布前核查|含令牌的应用日志
网络工程|校园网拓扑资料交接|设备地址与拓扑图
物联网工程|传感设备接入清单核验|设备序列号与密钥表
人工智能|图像训练集授权核验|人脸图像授权记录
信息安全|渗透演练范围核查|授权目标主机清单
数据科学与大数据技术|数据集导出前核验|含用户标识的数据表
土木工程|混凝土试件送检记录|试件龄期与编号表
给排水科学与工程|水样采样链条核对|水样采样点记录
道路桥梁与渡河工程|桥梁模型监测数据交接|应变测点编号表
建筑学|模型工作室资料借阅|建筑模型部件清单
城乡规划|社区访谈地图成果整理|居民访谈位置底图
安全工程|隐患整改资料闭环核对|隐患整改复核单
采矿工程|矿山模拟设备点检|模拟设备联锁记录
矿物加工工程|选矿样品追溯登记|矿样成分与来源单
地质学|岩石薄片借用核验|岩样产地编号卡
资源勘查工程|钻孔样品台账交接|钻孔深度样段记录
测绘工程|地形测量成果授权检查|控制点坐标文件
遥感科学与技术|遥感影像许可范围核验|遥感影像授权说明
交通运输|运输排班资料脱敏|司机联系方式排班表
交通工程|路口视频调研资料管理|含车牌的观测视频
航空航天工程|风洞模型测试资料归档|模型载荷工况记录
飞行器设计与工程|结构样件借用清点|机翼样件编号单
武器系统与工程|仿真课程文件权限核查|教学模型访问记录
核工程与核技术|仪器使用资格资料核验|仪器培训与预约单
纺织工程|织物测试样品流转|织物样本批次记录
服装设计与工程|试衣调研照片授权核查|试衣参与者照片
轻化工程|纸张助剂样品标签核对|助剂样品流向记录
包装工程|包装跌落测试资料交接|包装样件测试记录
印刷工程|油墨试样与文件管理|油墨编号及印样单
食品科学与工程|食品检测样品接收|食品样本追溯卡
食品质量与安全|留样记录完整性复核|食品留样交接单
生物科学|培养物观察记录整理|培养物编码记录
生物技术|样本编码与实验记录核对|细胞样本编码表
生态学|野外样方调查资料归档|样方物种观测表
生物工程|发酵批次记录核验|发酵批次观察日志
环境工程|废水监测样品交接|废水采样链条单
环境科学|空气采样数据来源核查|空气采样位置记录
临床医学|模拟病例教学资料脱敏|含身份信息的模拟病例
口腔医学|口腔模型借用与记录|牙模编号借用记录
预防医学|健康问卷数据授权核验|健康调查问卷明细
基础医学|切片教学资料追溯|组织切片来源卡
护理学|护理模拟用品点检|模拟用品交接记录
医学检验技术|检验样本登记信息核对|样本接收编码单
医学影像技术|教学影像资料访问核查|带身份字段的教学影像
药学|药品信息卡来源核验|药品教学资料目录
药物制剂|制剂样品批号交接|制剂样品流转记录
中药学|药材标本来源追溯|药材产地采集卡
农学|种子样本追溯登记|种子批号及来源表
园艺|育苗观察资料交接|苗圃植株观察记录
植物保护|病害标本接收记录|病害样本来源单
动物科学|饲料试样接收资料核对|饲料试样编号卡
林学|林木样本采集记录整理|林木样本采集位置表
动物医学|动物病例教学资料管理|模拟动物病例记录
物理学|光学仪器借用资料核验|光学仪器预约单
应用物理学|传感器实验结果交接|传感器测量原始记录
数学与应用数学|数学建模数据引用核查|模型外部数据来源表
信息与计算科学|数值计算作业版本核验|程序输入数据清单
统计学|抽样调查数据脱敏|含受访者标识的样本表
经济学|家庭消费调研资料管理|住户消费访谈明细
金融学|模拟交易账户资料核查|模拟账户持仓明细
财政学|财政支出分析材料整理|部门预算分析底稿
国际经济与贸易|贸易单证课程资料交接|订单与收货地址明细
法学|模拟案件卷宗借阅|当事人身份信息卷宗
知识产权|作品授权证据归集|图片使用许可记录
社会学|社区访谈匿名化核查|社区访谈原始录音
社会工作|服务对象档案权限核查|服务对象联系记录
政治学与行政学|公共政策访谈资料整理|政策访谈意见底稿
思想政治教育|社会实践访谈材料归档|实践访谈授权表
教育学|课堂观察记录授权核验|课堂观察原始记录
学前教育|幼儿园见习影像权限核查|见习儿童影像资料
小学教育|学生作业样本匿名展示|含学生姓名的作业样本
教育技术学|学习平台日志导出核验|学习行为账号日志
心理学|课程心理量表数据管理|匿名编码量表原始记录
应用心理学|模拟咨询案例资料管理|模拟咨询访谈笔记
汉语言文学|口述文学采录资料整理|口述访谈录音授权单
英语|双语语料引用许可核查|翻译语料来源清单
日语|日语口语录音授权检查|口语练习录音样本
新闻学|新闻采访素材使用核查|采访对象原始录音
网络与新媒体|短视频发布前素材核验|含路人肖像的短视频
历史学|历史文献摘录出处核对|档案摘录出处记录
考古学|考古教学标本借用|教学陶片编号借用单
文物与博物馆学|藏品图像使用许可核验|藏品图像授权记录
哲学|研讨资料引用范围核查|未公开研讨会记录
管理科学|运营调度模型数据核查|仓库订单调度明细
工商管理|校园市集经营调研交接|商户访谈与成本明细
会计学|报销凭证与账簿复核|含收款账号的凭证
财务管理|现金预算底稿访问核查|付款计划及收款账号
市场营销|消费者问卷发布前核查|含手机号的购买意向表
人力资源管理|模拟招聘档案访问核查|候选人简历与评价表
电子商务|店铺订单导出前核验|含电话地址的订单明细
行政管理|办事服务反馈资料整理|办事人员联系记录
公共事业管理|公共服务问卷数据交接|社区服务反馈明细
图书馆学|特殊馆藏借阅权限核查|馆藏限制借阅卡
档案学|档案复制件流转核对|带复制限制的档案件
旅游管理|研学行程资料权限核查|含证件号的报名信息
音乐学|音乐采样授权范围核查|演奏录音使用许可
戏剧影视文学|剧本素材引用许可核验|未公开访谈剧本素材
美术学|展览作品图像授权核查|作品照片使用许可
视觉传达设计|海报素材授权比对|字体与图像许可清单
环境设计|空间测绘影像权限核查|含住户信息的室内照片
体育教育|体测教学记录展示核查|含学生身份的体测表
运动训练|训练视频使用权限核查|运动员训练影像资料`;
export const taskProfiles=new Map(lines.split('\n').map(line=>{const [major,task,item]=line.split('|');return [major,{task,item}]}));
export const families={
 business:{title:'经营与管理',steps:['核对原始材料','登记分析数据','编制汇总稿','归档移交'],objects:['材料名称','使用范围','复核人'],destinations:['受限档案柜','课程共享架','待核验材料台','待批准处置箱'],scene:'equipment-manual',workflow:['blue mascot examining paper source records with a magnifier at a desk','blue mascot entering checked paper records into a desktop computer','blue mascot composing a summary document on a laptop beside neatly grouped source papers','blue mascot placing a closed document folder in a locking archive cabinet'],places:['locked metal filing cabinet with closed folders','open classroom shelf with neat folders','inspection desk with a shallow tray of envelopes and a magnifier','closed archive box next to an unused paper shredder']},
 digital:{title:'计算与数据',steps:['核对访问授权','提取指定数据','处理工作副本','提交版本回执'],objects:['数据名称','授权用途','提交人'],destinations:['受限服务器区','授权共享终端','待核验介质台','备份保留柜'],scene:'computer-security',workflow:['blue mascot checking an authorization clipboard beside a closed laptop','blue mascot at a desktop exporting a small table to an external disk','blue mascot reviewing a spreadsheet copy on a large monitor with unmarked rows','blue mascot handing an enclosed disk carrier and a blank receipt to orange mascot at a service desk'],places:['closed server rack with a visible physical lock','classroom display terminal showing a blank shared folder interface','unplugged USB media beside a magnifying glass on inspection desk','closed external drive carriers on a backup storage shelf']},
 humanities:{title:'文献与公共服务',steps:['核查借阅权限','查阅指定材料','记录引用出处','办理归还回执'],objects:['资料名称','使用范围','借阅人'],destinations:['专管档案柜','指定阅览桌','归还服务台','待修复材料箱'],scene:'training',workflow:['blue mascot checking a library card against a blank permission tablet at a counter','blue mascot reading an open source book at a clear reading desk','blue mascot writing citation notes on a blank notebook beside a source book','blue mascot handing a closed archive box to orange mascot at a return counter'],places:['locked archive cabinet full of closed archive boxes','reading table with one open book and a task lamp','library service counter with return tray','closed conservation box with a resting soft conservation brush']},
 media:{title:'传播与创作',steps:['核验素材许可','整理授权素材','编辑工作副本','提交发布审查'],objects:['素材名称','许可范围','提交人'],destinations:['限制素材柜','授权展示屏','待核验素材台','返还器材柜'],scene:'computer-security',workflow:['blue mascot matching a camera memory card to a blank copyright permission document','blue mascot organizing a camera, memory card case and printed contact sheets on a desk','blue mascot editing a project on a computer with a neutral timeline interface and blank thumbnail blocks','blue mascot handing a closed portfolio and a tablet to orange mascot at a review desk'],places:['locked cabinet containing memory card cases and portfolios','classroom presentation screen with an empty gallery interface','workbench with camera card cases and magnifying glass','equipment locker containing a camera in a fitted case']},
 chemical:{title:'化学与材料',steps:['核对物料标识','查阅安全资料','登记本次交接','按确认方案收存'],objects:['物料信息','交接范围','复核人'],destinations:['确认收存柜','交接登记台','待鉴别暂存台','待接收处置箱'],scene:'chemical-storage',workflow:['blue mascot in lab coat and goggles inspecting the BLANK label on a SEALED reagent bottle without opening it','blue mascot in lab coat reading a blank safety handbook beside one sealed bottle','blue mascot in lab coat completing a blank clipboard record beside a sealed bottle on a tray','blue mascot in lab coat placing a SEALED bottle carrier inside a closed glass storage cabinet, no mixing'],places:['glass-front cabinet with sealed bottles on separate trays','clear lab handover desk with closed bottle carrier and clipboard','empty inspection desk holding one closed sample carrier and a magnifier','rigid closed collection carrier on a designated receiving stand, no dumping or waste pouring']},
 biological:{title:'生命与医学教学',steps:['核对样本编码','登记接收信息','移交封闭载体','核对接收回执'],objects:['样本资料','接收范围','接收人'],destinations:['确认保存柜','指定观察台','待核验接收台','待交接载体架'],scene:'biological',workflow:['blue mascot in lab coat and goggles matching a CLOSED sample tube rack to an identification card','blue mascot in lab coat writing a blank receiving record beside a CLOSED tube rack','blue mascot in lab coat passing a CLOSED sample carrier to orange mascot in lab coat across a clean counter','blue mascot in lab coat checking a blank receipt against a CLOSED sample carrier, no sample handling'],places:['closed teaching sample storage cabinet with enclosed carriers','clean observation desk holding a closed teaching model rack','receiving counter with one closed carrier and a blank checklist','shelf holding one closed hard-shell teaching carrier awaiting handover']},
 engineering:{title:'工程与设备',steps:['查阅作业说明','完成停机点检','登记检查结果','交接设备状态'],objects:['设备资料','点检范围','点检人'],destinations:['确认可用工具架','借还交接台','待检修隔离台','专管钥匙柜'],scene:'mechanical',workflow:['blue mascot in fitted sage workwear and clear goggles reading an open blank manual beside a CLOSED stationary benchtop lathe, NO gloves','blue mascot in fitted sage workwear examining the OUTSIDE of a fully closed stationary lathe with a flashlight, hands outside machine, NO gloves','blue mascot in fitted sage workwear recording inspection findings on a blank clipboard beside a closed stationary device','blue mascot in fitted sage workwear handing an equipment key and blank status clipboard to orange mascot at an equipment service counter'],places:['neat wall-mounted tool rack with stored tools','equipment borrowing desk with closed tool case and blank form','unpowered closed equipment on a repair bench surrounded by a simple physical rope boundary','locked key cabinet with a few keys inside']}
};
export function familyFor(m){
 if(/临床医学|预防医学|医学影像技术|药学$/.test(m.name))return 'digital';
 if(/护理学|口腔医学/.test(m.name))return 'clinical';
 if(/医学|生物|农学|食品/.test(m.scenario))return 'biological';
 if(/化学|化工|材料|环境实验/.test(m.scenario))return 'chemical';
 if(/机械|电气|电子电工|物理实验/.test(m.scenario))return 'engineering';
 if(/新闻|媒体|设计|音乐|美术|戏剧|服装/.test(m.name))return 'media';
 if(/公共阅览|法学|产权|教育|心理|社会|政治|行政|公共事业|旅游/.test(m.name+' '+m.scenario))return 'humanities';
 if(/计算机|数学|统计|测绘|遥感/.test(m.scenario+' '+m.name))return 'digital';
 return 'business';
}
families.clinical={title:'医学模拟教具',steps:['查阅教具使用清单','核对教学模型编号','登记模拟用品借还','交接封闭教具箱'],objects:['教具名称','使用范围','接收人'],destinations:['确认可用教具柜','借还登记台','待检查教具台','待归还载体架'],scene:'first-aid',workflow:['blue mascot in plain sage nursing simulation scrubs, NO goggles and NO gloves, reading a blank teaching supplies handbook next to a clean unpowered nursing training mannequin, no patient','blue mascot in sage simulation scrubs matching an identification card to a clean plastic dental teaching model and closed training supplies box, no patient or clinical treatment','blue mascot in sage simulation scrubs filling a blank teaching equipment borrowing clipboard beside a CLOSED clean training kit','blue mascot in sage simulation scrubs handing a CLOSED clean teaching equipment carrier to orange mascot in cream simulation scrubs at a teaching supplies counter'],places:['closed clean training equipment cabinet containing unpowered mannequin parts and teaching models','teaching supplies counter with closed clean kit and blank borrowing form','inspection desk holding clean plastic dental model and a magnifying glass','shelf with CLOSED clean teaching equipment carriers awaiting return']};
