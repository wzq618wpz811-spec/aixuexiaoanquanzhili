"""Publish original template designs and provenance, not copied question banks."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'research/question-banks';DOC=ROOT/'docs/research';DOC.mkdir(parents=True,exist_ok=True)
def write(p,value):
 p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False,indent=2) if not isinstance(value,str) else value,encoding='utf8')
sources=json.loads((BASE/'manifest.json').read_text(encoding='utf8'))
for s in sources:
 if s['id'].startswith('SZIT-'):s['publisher']='szitu.edu.cn教务域名，发布单位署名未完成核验'
 if s['id']=='SHNU':s.update(status='downloaded_image_pdf',read_count=0,note='144页扫描PDF，文本抽取为空；未完成OCR，不计阅读数')
 if s['id']=='TSU200':s.update(extracted_items=195,note='标题称200题，正文标号缺182、188—191；不补造缺题')
 s['local_archive']='research/question-banks/'+s['id']+'.'+s['kind']
sources.append(dict(id='LZU',title='公开实验室安全题库PDF',publisher='兰州大学草地农业科技学院服务器',kind='pdf',url='https://caoye.lzu.edu.cn/caoyenew/upload/files/N20210708164726.pdf',pages=62,status='downloaded_and_sample_read',read_count=147,sha256=hashlib.sha256((BASE/'LZU.pdf').read_bytes()).hexdigest(),local_archive='research/question-banks/LZU.pdf',note='未确认编制者与现行版本；完整精读范围见lzu-reading.md'))
sources.extend([
 dict(id='SICAU',url='https://jdc.sicau.edu.cn/info/1621/3454.htm',status='blocked_captcha',read_count=0,note='附件需验证码，未下载，不计题目'),
 dict(id='NWU-XLS',url='https://lab.nwu.edu.cn/info/1146/1444.htm',status='blocked_captcha',read_count=0,note='XLS附件需验证码，未下载，不计题目'),
 dict(id='HRBEU',url='https://yt.hrbeu.edu.cn/2022/0520/c11253a292321/page.htm',status='failed_404',read_count=0),
])
write('docs/research/source-register.json',sources)
cpuids=json.loads((BASE/'cpu-selected.json').read_text(encoding='utf8'))
readlog={'date':'2026-10-09','purpose':'内容研究与模板设计，不是模型训练或已审定题库','total_source_records_close_read':651,'deduplication':'跨来源重复未从阅读工作量中剔除；不能称651个独立知识点或有效教学题','groups':[
 {'source':'CPU2025','count':164,'ids':cpuids,'method':'实验室类别68题全部阅读，其他8类别按三种原题型各取首/中段/末尾4条，共96条'},
 {'source':'QCU-M','count':100,'ids':[f'QCU-M:{i}' for i in range(1,101)],'method':'逐题阅读全文、选项与印刷答案'},
 {'source':'TSU200','count':80,'ids':[f'TSU200:{i}' for i in range(1,81)],'method':'正文第1—80题全文；其余只做结构扫描'},
 {'source':'NWU219','count':60,'ids':[f'NWU219:{i}' for i in range(81,141)],'method':'按正文出现次序81—140，非分节原题号，阅读全文与答案'},
 {'source':'JZCIT','count':100,'ids':[f'JZCIT:{i}' for i in range(1,101)],'method':'50选择、20判断、20填空、10简答；选择答案另有集中答案表'},
 {'source':'LZU','count':147,'ids':list(range(1,90))+list(range(403,406))+list(range(412,425))+list(range(1071,1113)),'method':'物理页1—3、16、52—56；重复412—416计一次；两处题号残缺保留疑问，详见子笔记'}]}
write('docs/research/read-log.json',readlog)

templates=[]
def add(id,name,interaction,knowledge,forms,slots,render,checks,refs,example,gate='可进入内容设计',priority='首批'):
 templates.append(dict(id=id,name=name,interaction=interaction,knowledge_kind=knowledge,source_forms=forms,required_slots=slots,visual_composition=render,qa_checks=checks,evidence_refs=refs,example_design=example,eligibility=gate,priority=priority,production_status='模板规格，非已接入在线自动生图',asset_policy=dict(character='按任务选择服装/PPE，不固定实验服和手套',text='型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字',reuse='背景/道具/角色/条件信息分层，关键行为变化须重审')))
add('T01','单行为情境判断','boolean_scene','visible_behavior',['判断','两选一'],['场景范围','可见行为','正误命题','答案依据','关键局部'],['一张局部清楚的情境图','一句判断陈述','正确/错误按钮'],['图片足以支持结论','禁止同时加入无关错误','保留原题否定与例外'],['CPU2025:434','TSU200:80'],'实验用手套触碰公共设备：图中明确手套使用背景与接触对象。')
add('T02','同场景对照选择','single_image_choice','behavior_contrast',['单选','判断改编'],['共同背景','唯一考查变量','2—4个选项','适用任务'],['等尺寸等画风的对照图','只有考查动作或部件改变'],['不以表情、红绿或画质泄题','PPE与具体设备匹配','改编后的答案映射独立保存'],['QCU-M:18','QCU-M:68','QCU-M:89'],'机械清屑工具或防护穿戴对比，保持人物与背景一致。')
add('T03','器材与标识识别','object_identification','object_or_symbol',['单选','填空改编'],['规范图或实物照片','名称标签','适用场景','图形标准版本'],['器材/标识近景','文字名称按钮或图文配对'],['安全标志不用自由生图重绘','同形不同功能须给铭牌','名称不可从颜色猜'],['JZCIT:4','JZCIT:42','NWU219:140'],'识别已核验的防护器材或警示标识；精确图形使用规范资源。')
add('T04','场景热点核查','hotspot_multi','spatial_observation',['多选','多个判断整合'],['场景','待查区域','可见事实','热点坐标','漏选误选规则'],['一张可放大场景图','直接点击区域','等价文字区域按钮'],['隐患必须可见或有明确状态标签','一处热点一条证据','不把未知状态当错误'],['TSU200:17','TSU200:57','TSU200:76','CPU2025:360'],'通道、插座周边、器材取用区域的可见遮挡核查。')
add('T05','任务检查清单','checklist_multi','independent_requirements',['多选','复合判断','简答要点'],['具体任务','独立检查项','并行关系','例外设备','依据'],['场景概览','任务与状态卡','勾选需完成项目'],['检查项目不强行排序','持续运行例外明确','不把一幅空房图当无人值守证据'],['CPU2025:425','CPU2025:456','QCU-M:86','TSU200:54'],'入室或离室核查，明确哪些设备需要持续运行。')
add('T06','设备状态与参数对照','parameter_board','hidden_state_or_threshold',['判断','单选','数值填空'],['设备型号','读数及单位','额定条件','状态信息','数值依据版本'],['设备简图','清楚的铭牌/读数板','选状态或范围'],['所有数值由程序排版','负荷、接地、无电状态不能靠外观','不泛化旧阈值'],['TSU200:2','TSU200:10','TSU200:19','QCU-M:78'],'用明确的额定信息与运行状态判断，图只负责定位部件。','设备与数值依据核验后启用')
add('T07','标签与记录找证据','evidence_inspection','document_evidence',['单选','多选','判断'],['标签/记录字段','有效性','主体与日期','需查证事实'],['容器或门牌图片','可读标签局部','点击缺失或冲突信息'],['化学性质来自已给信息','不让模型补造授权/检测合格','日期与主体必须对应'],['CPU2025:405','CPU2025:439','CPU2025:463','TSU200:70'],'检查模糊试剂标签或不完整责任记录。')
add('T08','分类与位置匹配','classification_map','category_or_compatibility',['单选','多选','判断','简答要点'],['对象标签','类别依据','容器/区域','相容性限制','例外'],['带文字标签的对象卡','目标区域图','点选匹配或分类'],['不靠液体颜色判断成分','化学相容性必须核验','分类不是操作混合演示'],['CPU2025:454','CPU2025:457','NWU219:88','NWU219:97'],'将已注明类别的废物或物品匹配到管理区域。','分类规则核验后启用')
add('T09','聊天与通知辨识','message_decision','social_information',['情境单选','情境判断','多选'],['发送方身份声明','渠道','消息内容','请求动作','核实线索'],['仿聊天/邮件界面','关键内容与链接域名','选择回复或下一行动'],['使用虚构身份与不可点击示例域名','头像不等于身份核实','聊天话术不直接抄长原题'],['CPU2025:207','CPU2025:248','CPU2025:538','CPU2025:585'],'退款、借款、账号异常通知等情境，核实信息比人物表情更重要。')
add('T10','条件变化决策','conditional_choice','first_action_or_exception',['首要行动单选','条件判断'],['当前条件','可见/不可见信息','行动选项','条件改变点'],['一个场景加条件卡','选择当前行动','必要时展开一条条件变化'],['不凭原单题编造完整事故程序','新增分支要另有依据','报警与撤离不可自动强排全序'],['CPU2025:403','CPU2025:447','QCU-M:7','QCU-M:12'],'遇到设备异常或未经许可的任务，依据明确条件选择处理方式。')
add('T11','案例证据拼图','case_evidence','multi_factor_reasoning',['长情境多选','案例简答'],['案例事实','事实来源','角色关系','关键证据','问题目标'],['场景/简短分镜','两至三张事实卡','勾选风险原因或防范要点'],['真实案例与题库虚构案例分别标注','不把多项正确内容改成单选','人物姓名前后不一致先修题'],['CPU2025:502','CPU2025:165','CPU2025:295'],'复杂校园情境拆成可读的事实，不把长题一口气塞到图片上。')
add('T12','路线与空间判断','spatial_route','location_or_direction',['情境单选','多选'],['准确平面图','当前位置','出口/通道状态','方向条件','问题边界'],['简化可读的平面示意','点击路线或位置'],['普通图片不能证明真实距离','地图方向与场景一致','疏散路线必须现场核验'],['CPU2025:302','CPU2025:521','CPU2025:527','TSU200:76'],'提供明确路口或通道图后再问位置/路径，不靠模糊透视猜。','空间依据核验后启用','后续')
add('T13','有依据的步骤拖排','drag_sequence','verified_precedence',['独立排序','顺序单选改编'],['完整原题','原始排列答案','现行流程依据','设备/人员范围','先后约束','并行与分支说明'],['3—5张步骤图卡','拖动手柄','键盘移动备选'],['缺完整原题或现行依据不出正式题','清单和首要行动不是全序','改变交互须新版本/分开统计'],['LZU:p55:q1103','NWU219:sequence-filter','TJU2019:competition'],'当前只用中性步骤占位演示拖动；已找到的专业顺序原题保持待审。','有原题且现行先后依据审核通过才启用','条件启用')
add('T14','职责与规则关系图','role_rule_map','abstract_role_or_rule',['概念单选','制度判断','简答'],['现行制度片段','角色职责','前提与例外','适用学校','学习目标'],['角色/机构关系示意','授权或手续卡','选对应主体或缺失环节'],['不能以服装年龄推断资格','图必须帮助理解关系','无视觉教学价值则退回设计，不发纯文字卡'],['TSU200:37','TSU200:41','TSU200:77','CPU2025:413'],'将准入、权限、报告对象做成关系图；法规记忆题不能仅加吉祥物装饰。','制度与职责已核验后启用','后续')
catalog={'version':'0.3-research','date':'2026-10-09','status':'source-grounded template specifications','read_log':'docs/research/read-log.json','rules':[
 'source_question_type 与 presentation_template 分开保存，不能改写原题身份',
 '先看考查知识和证据可见性，再选互动形式；不按题号随机分配模板',
 '原题有瑕疵先进入疑题，不让生图把错误固化',
 '文字可以提供条件、标签和记录，但不得仅在纯文字题旁加装饰图冒充视觉学习',
 '角色身份可复用，PPE、姿态和器材接触必须按任务约束',
 '不可视物性、资格、负荷、气味、时间状态必须由可读证据显式给出',
 '顺序卡片默认不参与自动发布，直到真实原题和现行先后依据齐全'
 ],'templates':templates}
write('config/card-templates.json',catalog)
lines=['# 安全题库视觉卡片模板规格','版本0.3，研究设计稿。以下14类是模板，不是已完成14种在线自动出题能力。','来源范围、阅读工作量与坏题发现见[题库研究](question-bank-study.md)。原始题型和呈现模板分别记录。','## 模板总表','| 编号 | 模板 | 考查内容 | 交互 | 优先级 |','|---|---|---|---|---|']
for t in templates:lines.append(f"| {t['id']} | {t['name']} | {t['knowledge_kind']} | {t['interaction']} | {t['priority']} |")
for t in templates:
 lines += [f"\n## {t['id']} {t['name']}",f"原题来源形式：{'、'.join(t['source_forms'])}。启用条件：{t['eligibility']}。",'必填槽位：'+'、'.join(t['required_slots'])+'。','画面结构：'+' → '.join(t['visual_composition'])+'。','设计示例：'+t['example_design'],'质量检查：'+'；'.join(t['qa_checks'])+'。','证据定位：'+', '.join(t['evidence_refs'])+'。']
lines += ['\n## 通用生图约束','先固定 knowledge_point、scope、visible_evidence、hidden_facts、correctness_basis、target_difference。角色参考只控制身份；服装与PPE由任务控制。背景、角色、道具、标签、状态层独立。正误选项在人物、背景、光照、细节密度上保持一致。','图中不绘正确/错误标记，不用表情暗示答案。题干所需的文字与数字由代码排版。输出后检查额外隐患、遮挡、部件错误、标签、动作可判性。','## 失败回退','缺依据、题干条件不充分、视觉信息不足或模型无法保证专业细节：进入疑题/内容设计队列。不得默认发布，也不得自动退回纯文字题。','## 数据契约','机器可读版本：[config/card-templates.json](../../config/card-templates.json)。每题记录原题定位、知识类型、可观察证据、必需条件、模板版本、改编原因和检查结果。']
write('docs/research/template-catalog.md','\n\n'.join(lines))
write('web/template-data.js','window.TEMPLATE_CATALOG = '+json.dumps(catalog,ensure_ascii=False)+';\n')
print(json.dumps({'read_records':651,'templates':len(templates),'source_entries':len(sources)},ensure_ascii=False))
