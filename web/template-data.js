window.TEMPLATE_CATALOG = {
  "version": "0.3-research",
  "date": "2026-10-09",
  "status": "source-grounded template specifications",
  "read_log": "docs/research/read-log.json",
  "rules": [
    "source_question_type 与 presentation_template 分开保存，不能改写原题身份",
    "先看考查知识和证据可见性，再选互动形式；不按题号随机分配模板",
    "原题有瑕疵先进入疑题，不让生图把错误固化",
    "文字可以提供条件、标签和记录，但不得仅在纯文字题旁加装饰图冒充视觉学习",
    "角色身份可复用，PPE、姿态和器材接触必须按任务约束",
    "不可视物性、资格、负荷、气味、时间状态必须由可读证据显式给出",
    "顺序卡片默认不参与自动发布，直到真实原题和现行先后依据齐全"
  ],
  "templates": [
    {
      "id": "T01",
      "name": "单行为情境判断",
      "interaction": "boolean_scene",
      "knowledge_kind": "visible_behavior",
      "source_forms": [
        "判断",
        "两选一"
      ],
      "required_slots": [
        "场景范围",
        "可见行为",
        "正误命题",
        "答案依据",
        "关键局部"
      ],
      "visual_composition": [
        "一张局部清楚的情境图",
        "一句判断陈述",
        "正确/错误按钮"
      ],
      "qa_checks": [
        "图片足以支持结论",
        "禁止同时加入无关错误",
        "保留原题否定与例外"
      ],
      "evidence_refs": [
        "CPU2025:434",
        "TSU200:80"
      ],
      "example_design": "实验用手套触碰公共设备：图中明确手套使用背景与接触对象。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T02",
      "name": "同场景对照选择",
      "interaction": "single_image_choice",
      "knowledge_kind": "behavior_contrast",
      "source_forms": [
        "单选",
        "判断改编"
      ],
      "required_slots": [
        "共同背景",
        "唯一考查变量",
        "2—4个选项",
        "适用任务"
      ],
      "visual_composition": [
        "等尺寸等画风的对照图",
        "只有考查动作或部件改变"
      ],
      "qa_checks": [
        "不以表情、红绿或画质泄题",
        "PPE与具体设备匹配",
        "改编后的答案映射独立保存"
      ],
      "evidence_refs": [
        "QCU-M:18",
        "QCU-M:68",
        "QCU-M:89"
      ],
      "example_design": "机械清屑工具或防护穿戴对比，保持人物与背景一致。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T03",
      "name": "器材与标识识别",
      "interaction": "object_identification",
      "knowledge_kind": "object_or_symbol",
      "source_forms": [
        "单选",
        "填空改编"
      ],
      "required_slots": [
        "规范图或实物照片",
        "名称标签",
        "适用场景",
        "图形标准版本"
      ],
      "visual_composition": [
        "器材/标识近景",
        "文字名称按钮或图文配对"
      ],
      "qa_checks": [
        "安全标志不用自由生图重绘",
        "同形不同功能须给铭牌",
        "名称不可从颜色猜"
      ],
      "evidence_refs": [
        "JZCIT:4",
        "JZCIT:42",
        "NWU219:140"
      ],
      "example_design": "识别已核验的防护器材或警示标识；精确图形使用规范资源。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T04",
      "name": "场景热点核查",
      "interaction": "hotspot_multi",
      "knowledge_kind": "spatial_observation",
      "source_forms": [
        "多选",
        "多个判断整合"
      ],
      "required_slots": [
        "场景",
        "待查区域",
        "可见事实",
        "热点坐标",
        "漏选误选规则"
      ],
      "visual_composition": [
        "一张可放大场景图",
        "直接点击区域",
        "等价文字区域按钮"
      ],
      "qa_checks": [
        "隐患必须可见或有明确状态标签",
        "一处热点一条证据",
        "不把未知状态当错误"
      ],
      "evidence_refs": [
        "TSU200:17",
        "TSU200:57",
        "TSU200:76",
        "CPU2025:360"
      ],
      "example_design": "通道、插座周边、器材取用区域的可见遮挡核查。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T05",
      "name": "任务检查清单",
      "interaction": "checklist_multi",
      "knowledge_kind": "independent_requirements",
      "source_forms": [
        "多选",
        "复合判断",
        "简答要点"
      ],
      "required_slots": [
        "具体任务",
        "独立检查项",
        "并行关系",
        "例外设备",
        "依据"
      ],
      "visual_composition": [
        "场景概览",
        "任务与状态卡",
        "勾选需完成项目"
      ],
      "qa_checks": [
        "检查项目不强行排序",
        "持续运行例外明确",
        "不把一幅空房图当无人值守证据"
      ],
      "evidence_refs": [
        "CPU2025:425",
        "CPU2025:456",
        "QCU-M:86",
        "TSU200:54"
      ],
      "example_design": "入室或离室核查，明确哪些设备需要持续运行。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T06",
      "name": "设备状态与参数对照",
      "interaction": "parameter_board",
      "knowledge_kind": "hidden_state_or_threshold",
      "source_forms": [
        "判断",
        "单选",
        "数值填空"
      ],
      "required_slots": [
        "设备型号",
        "读数及单位",
        "额定条件",
        "状态信息",
        "数值依据版本"
      ],
      "visual_composition": [
        "设备简图",
        "清楚的铭牌/读数板",
        "选状态或范围"
      ],
      "qa_checks": [
        "所有数值由程序排版",
        "负荷、接地、无电状态不能靠外观",
        "不泛化旧阈值"
      ],
      "evidence_refs": [
        "TSU200:2",
        "TSU200:10",
        "TSU200:19",
        "QCU-M:78"
      ],
      "example_design": "用明确的额定信息与运行状态判断，图只负责定位部件。",
      "eligibility": "设备与数值依据核验后启用",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T07",
      "name": "标签与记录找证据",
      "interaction": "evidence_inspection",
      "knowledge_kind": "document_evidence",
      "source_forms": [
        "单选",
        "多选",
        "判断"
      ],
      "required_slots": [
        "标签/记录字段",
        "有效性",
        "主体与日期",
        "需查证事实"
      ],
      "visual_composition": [
        "容器或门牌图片",
        "可读标签局部",
        "点击缺失或冲突信息"
      ],
      "qa_checks": [
        "化学性质来自已给信息",
        "不让模型补造授权/检测合格",
        "日期与主体必须对应"
      ],
      "evidence_refs": [
        "CPU2025:405",
        "CPU2025:439",
        "CPU2025:463",
        "TSU200:70"
      ],
      "example_design": "检查模糊试剂标签或不完整责任记录。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T08",
      "name": "分类与位置匹配",
      "interaction": "classification_map",
      "knowledge_kind": "category_or_compatibility",
      "source_forms": [
        "单选",
        "多选",
        "判断",
        "简答要点"
      ],
      "required_slots": [
        "对象标签",
        "类别依据",
        "容器/区域",
        "相容性限制",
        "例外"
      ],
      "visual_composition": [
        "带文字标签的对象卡",
        "目标区域图",
        "点选匹配或分类"
      ],
      "qa_checks": [
        "不靠液体颜色判断成分",
        "化学相容性必须核验",
        "分类不是操作混合演示"
      ],
      "evidence_refs": [
        "CPU2025:454",
        "CPU2025:457",
        "NWU219:88",
        "NWU219:97"
      ],
      "example_design": "将已注明类别的废物或物品匹配到管理区域。",
      "eligibility": "分类规则核验后启用",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T09",
      "name": "聊天与通知辨识",
      "interaction": "message_decision",
      "knowledge_kind": "social_information",
      "source_forms": [
        "情境单选",
        "情境判断",
        "多选"
      ],
      "required_slots": [
        "发送方身份声明",
        "渠道",
        "消息内容",
        "请求动作",
        "核实线索"
      ],
      "visual_composition": [
        "仿聊天/邮件界面",
        "关键内容与链接域名",
        "选择回复或下一行动"
      ],
      "qa_checks": [
        "使用虚构身份与不可点击示例域名",
        "头像不等于身份核实",
        "聊天话术不直接抄长原题"
      ],
      "evidence_refs": [
        "CPU2025:207",
        "CPU2025:248",
        "CPU2025:538",
        "CPU2025:585"
      ],
      "example_design": "退款、借款、账号异常通知等情境，核实信息比人物表情更重要。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T10",
      "name": "条件变化决策",
      "interaction": "conditional_choice",
      "knowledge_kind": "first_action_or_exception",
      "source_forms": [
        "首要行动单选",
        "条件判断"
      ],
      "required_slots": [
        "当前条件",
        "可见/不可见信息",
        "行动选项",
        "条件改变点"
      ],
      "visual_composition": [
        "一个场景加条件卡",
        "选择当前行动",
        "必要时展开一条条件变化"
      ],
      "qa_checks": [
        "不凭原单题编造完整事故程序",
        "新增分支要另有依据",
        "报警与撤离不可自动强排全序"
      ],
      "evidence_refs": [
        "CPU2025:403",
        "CPU2025:447",
        "QCU-M:7",
        "QCU-M:12"
      ],
      "example_design": "遇到设备异常或未经许可的任务，依据明确条件选择处理方式。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T11",
      "name": "案例证据拼图",
      "interaction": "case_evidence",
      "knowledge_kind": "multi_factor_reasoning",
      "source_forms": [
        "长情境多选",
        "案例简答"
      ],
      "required_slots": [
        "案例事实",
        "事实来源",
        "角色关系",
        "关键证据",
        "问题目标"
      ],
      "visual_composition": [
        "场景/简短分镜",
        "两至三张事实卡",
        "勾选风险原因或防范要点"
      ],
      "qa_checks": [
        "真实案例与题库虚构案例分别标注",
        "不把多项正确内容改成单选",
        "人物姓名前后不一致先修题"
      ],
      "evidence_refs": [
        "CPU2025:502",
        "CPU2025:165",
        "CPU2025:295"
      ],
      "example_design": "复杂校园情境拆成可读的事实，不把长题一口气塞到图片上。",
      "eligibility": "可进入内容设计",
      "priority": "首批",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T12",
      "name": "路线与空间判断",
      "interaction": "spatial_route",
      "knowledge_kind": "location_or_direction",
      "source_forms": [
        "情境单选",
        "多选"
      ],
      "required_slots": [
        "准确平面图",
        "当前位置",
        "出口/通道状态",
        "方向条件",
        "问题边界"
      ],
      "visual_composition": [
        "简化可读的平面示意",
        "点击路线或位置"
      ],
      "qa_checks": [
        "普通图片不能证明真实距离",
        "地图方向与场景一致",
        "疏散路线必须现场核验"
      ],
      "evidence_refs": [
        "CPU2025:302",
        "CPU2025:521",
        "CPU2025:527",
        "TSU200:76"
      ],
      "example_design": "提供明确路口或通道图后再问位置/路径，不靠模糊透视猜。",
      "eligibility": "空间依据核验后启用",
      "priority": "后续",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T13",
      "name": "有依据的步骤拖排",
      "interaction": "drag_sequence",
      "knowledge_kind": "verified_precedence",
      "source_forms": [
        "独立排序",
        "顺序单选改编"
      ],
      "required_slots": [
        "完整原题",
        "原始排列答案",
        "现行流程依据",
        "设备/人员范围",
        "先后约束",
        "并行与分支说明"
      ],
      "visual_composition": [
        "3—5张步骤图卡",
        "拖动手柄",
        "键盘移动备选"
      ],
      "qa_checks": [
        "缺完整原题或现行依据不出正式题",
        "清单和首要行动不是全序",
        "改变交互须新版本/分开统计"
      ],
      "evidence_refs": [
        "LZU:p55:q1103",
        "NWU219:sequence-filter",
        "TJU2019:competition"
      ],
      "example_design": "当前只用中性步骤占位演示拖动；已找到的专业顺序原题保持待审。",
      "eligibility": "有原题且现行先后依据审核通过才启用",
      "priority": "条件启用",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    },
    {
      "id": "T14",
      "name": "职责与规则关系图",
      "interaction": "role_rule_map",
      "knowledge_kind": "abstract_role_or_rule",
      "source_forms": [
        "概念单选",
        "制度判断",
        "简答"
      ],
      "required_slots": [
        "现行制度片段",
        "角色职责",
        "前提与例外",
        "适用学校",
        "学习目标"
      ],
      "visual_composition": [
        "角色/机构关系示意",
        "授权或手续卡",
        "选对应主体或缺失环节"
      ],
      "qa_checks": [
        "不能以服装年龄推断资格",
        "图必须帮助理解关系",
        "无视觉教学价值则退回设计，不发纯文字卡"
      ],
      "evidence_refs": [
        "TSU200:37",
        "TSU200:41",
        "TSU200:77",
        "CPU2025:413"
      ],
      "example_design": "将准入、权限、报告对象做成关系图；法规记忆题不能仅加吉祥物装饰。",
      "eligibility": "制度与职责已核验后启用",
      "priority": "后续",
      "production_status": "模板规格，非已接入在线自动生图",
      "asset_policy": {
        "character": "按任务选择服装/PPE，不固定实验服和手套",
        "text": "型号、数字、标签、姓名用HTML/SVG排版，不交给生图绘字",
        "reuse": "背景/道具/角色/条件信息分层，关键行为变化须重审"
      }
    }
  ]
};
