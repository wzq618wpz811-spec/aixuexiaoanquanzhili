"""Build a traceable, local research batch. Never opens the teaching database."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / 'research/question-banks'
OUT = ROOT / 'research/visual-pilot'
OUT.mkdir(parents=True, exist_ok=True)
ROWS = {r['id']: r for r in json.loads((ARCHIVE / 'questions.json').read_text(encoding='utf-8'))}
SOURCES = {r['id']: r for r in json.loads((ROOT / 'docs/research/source-register.json').read_text(encoding='utf-8'))}
BASIS = {
    'gloves': {'title': '上海科技大学免疫化学研究所实验室安全管理规范', 'url': 'https://siais.shanghaitech.edu.cn/_upload/article/files/32/4e/eb1ca7f64eee9df4b45cf92e7c2e/d8c28874-3dc7-4c60-a80c-53dc89218bbc.pdf', 'locator': '2020年11月修订，个人防护用品章，3.7手部防护第6项', 'supports': '避免作业手套接触电话、电脑等清洁表面；任务防护按风险选择'},
    'workshop': {'title': '天津城建大学钳工安全操作规程', 'url': 'https://cetc.tcu.edu.cn/info/1264/1331.htm', 'locator': '第4项', 'supports': '铁屑清除使用工具，不直接手拿或用嘴吹'},
    'lab': {'title': '苏州科技大学材料科学与工程学院实验室安全管理规范', 'url': 'https://clxy.usts.edu.cn/info/1088/1716.htm', 'locator': '2022-11-07，第一、二、五、八、十条', 'supports': '标签清晰、任务防护、禁止饮食、责任信息、废弃物分类与委托处置'},
    'fire': {'title': '上海科技大学实验室消防管理规范', 'url': 'https://ehs.shanghaitech.edu.cn/xfaq/list.htm', 'locator': '4.1、4.2、4.3', 'supports': '电气周边与可燃物、通道管理、操作规程、禁止擅离、必要电源例外'},
    'anti-fraud': {'title': '中国政府网：同学们，这份反诈小贴士请查收', 'url': 'https://app.www.gov.cn/govdata/gov/202201/05/480387/article.html', 'locator': '远离网络圈套、培养良好的支付习惯', 'supports': '可疑链接、核验域名、保护账号密码、谨慎求证转账要求'},
    'ebike': {'title': '中山大学生命科学学院：严禁电动自行车及电瓶进入实验室充电的通知', 'url': 'https://lifesciences.sysu.edu.cn/zh-hans/node/4358', 'locator': '网页2020-09-03；通知署期2020-08-31，实验室与工作室充电要求', 'supports': '实验室及工作室不得为电动车与电池充电；跨校正式采用仍核验本校现行规则'},
}


def parse_source(ref):
    r = ROWS[ref]
    s = SOURCES[r['source']]
    original = r.get('body') or r['stem']
    answer = r['answer']
    repair = None
    if r['source'] == 'CPU2025':
        stem = r['stem']
        options = r['options'].split('|')
    elif r['source'] == 'QCU-M':
        parts = re.split(r'\n(?=[A-D][、.．])', original)
        stem = re.sub(r'[（(][A-D]+[）)]', '', parts[0]).strip()
        options = [re.sub(r'^[A-D][、.．]\s*', '', p).strip() for p in parts[1:]]
    elif r['source'] == 'TSU200':
        stem = original.split('（标准答案')[0].strip().rstrip('')
        options = ['正确', '错误']
    else:
        stem = original.split('答案：')[0].strip()
        if r['type'] == '选择题':
            parts = re.split(r'\n(?=[A-D]\.\s*\n)', stem)
            stem = parts[0].strip()
            options = [re.sub(r'^[A-D]\.\s*', '', p).replace('\n', '').strip() for p in parts[1:]]
            text = (ARCHIVE / 'JZCIT.txt').read_text(encoding='utf-8')
            table = re.search(r'选择题答案：\s*([A-D\s]+)', text).group(1)
            letters = re.sub(r'\s', '', table)
            assert len(letters) == 50
            answer = letters[int(r['number']) - 1]
            repair = '从原网页集中50题答案表按原编号取答案，不把原索引null认作缺答案'
        else:
            answer = original.split('答案：', 1)[1].split('\n')[0].strip()
            options = []
            if answer != r['answer']:
                repair = '保留答案中的括号及括号后正文；原索引在右括号处截断'
    if r['source'] == 'CPU2025' and r['type'] == '判断题':
        options = ['正确', '错误']
        index = 0 if answer == 'Y' else 1
    elif r['source'] == 'TSU200':
        index = 0 if answer == '正确' else 1
    elif r['type'] in ['填空题', '简答题']:
        index = answer
    else:
        indices = [ord(c) - ord('A') for c in re.findall(r'[A-D]', answer or '')]
        index = indices if r['type'] in ['多选题', '多选'] else indices[0] if indices else None
    raw_path = ROOT / s['local_archive']
    assert hashlib.sha256(raw_path.read_bytes()).hexdigest() == s['sha256'], ref
    return {'ref': ref, 'locator': r['locator'], 'number': r['number'], 'type': r['type'], 'type_inference': '源网页未逐题标注，按选项和答案推定作答语义' if r['source'] == 'QCU-M' else '原文件栏目或题型列', 'stem': stem, 'options': options, 'answer_raw': answer, 'answer': index, 'original_text': original, 'indexed_record': r, 'parser_repair': repair, 'url': s.get('page', s['url']), 'title': s['title'], 'archive_sha256': s['sha256']}


CARDS = []
SNAPSHOTS = []


def add(ref, title, template, stem, visual, evidence, conditions, basis, explanation, *, options=None, answer=None, interaction=None, cohort='calibration', risks=None, mapping=None, critical=None):
    src = parse_source(ref)
    SNAPSHOTS.append(src)
    kind = interaction or ('multi' if src['type'] in ['多选', '多选题'] else 'fill' if src['type'] == '填空题' else 'short' if src['type'] == '简答题' else 'judge' if '判断' in src['type'] else 'single')
    card = {
        'id': f'vp{len(CARDS) + 1:02}', 'version': 1, 'title': title, 'cohort': cohort,
        'source_ref': ref, 'source_type': src['type'], 'source_locator': src['locator'], 'source_number': src['number'],
        'source_url': src['url'], 'source_archive_sha256': src['archive_sha256'],
        'template': template, 'template_version': '0.3', 'interaction': kind,
        'adapted': {'stem': stem, 'options': options if options is not None else src['options'], 'answer': src['answer'] if answer is None else answer, 'explanation': explanation},
        'answer_mapping': mapping or {'mode': 'identity', 'source_to_adapted': list(range(len(src['options'])))},
        'visual': visual, 'conditions': conditions,
        'required_condition_ids': [c['id'] for c in conditions],
        'evidence': [{'id': f'E{i+1}', 'fact': fact, 'carrier': carrier, 'required': True} for i, (fact, carrier) in enumerate(evidence)],
        'basis': [dict(BASIS[b], id=b, verification='官方正文已读，限本题条件；未作跨校制度全面审定', checked_at='2026-10-09') for b in basis],
        'semantic_review': {'actor': 'Codex内容设计审查', 'method': '逐题读取原文、源选项和源答案；核对改编与外部规则正文', 'status': 'passed' if not risks else 'needs_review', 'risks': risks or [], 'preserved_conditions': True},
        'critical_regions': critical or [], 'assets': [], 'observations': [],
        'online_generation': False, 'publication': 'research_only',
    }
    CARDS.append(card)
    return card


def facts(items):
    return [{'id': key, 'text': text, 'provenance': provenance} for key, text, provenance in items]


add('CPU2025:434', '作业手套与电话', 'T01', '实验还没结束，小安戴着本次实验使用的手套接电话。这样做可以吗？',
    {'kind': 'image', 'image': 'assets/visual-pilot/scene-01.png', 'alt': '实验台旁，戴蓝色手套的手握电话听筒贴近耳部'},
    [('手套与电话听筒直接接触', 'image'), ('作业手套仍未更换', 'H1')],
    facts([('H1', '当前实验尚未结束；角色仍戴着本次实验作业手套。', '原题正在进行实验与防护手套条件的明示')]),
    ['gloves'], '实验作业手套不应接触电话这类清洁表面，应按实验室要求脱下或更换后再接听。', critical=[{'id':'contact','box':[0.20,0.31,0.18,0.29]}])
add('TSU200:80', '作业手套与电脑', 'T01', '小安刚做完实验，没换手套就操作共用电脑。这样做符合要求吗？',
    {'kind': 'image', 'image': 'assets/visual-pilot/scene-02.png', 'alt': '戴手套的食指按在共用电脑键盘上'},
    [('手套食指与键盘按键接触', 'image'), ('实验作业手套未经更换', 'H1')],
    facts([('H1','角色刚在实验区作业，尚未更换该作业手套；电脑为共用电脑。','为原题实验防护手套与电脑对象补明语义，不猜污染性质')]),
    ['gloves'], '实验作业手套不用于接触共用电脑等清洁表面。原题是禁止跨区接触的判断命题，此处改为判断画面行为，正误方向反转并独立保存。',
    answer=1, mapping={'mode':'proposition_reversal','source_to_adapted':[1,0]}, critical=[{'id':'contact','box':[0.49,0.66,0.13,0.23]}])
add('CPU2025:432', '空房间与充电', 'T01', '即使实验室空余位置很多，也可以把电动自行车放在室内充电。这个说法对吗？',
    {'kind':'diagram','scene':'ebike','alt':'实验室平面示意，空余空间中电动车通过充电器连接墙面插座'},
    [('车辆、充电器与插座连接关系', 'diagram'), ('空间属于实验室而不是室外停车区', 'H1')],
    facts([('H1','本图为实验室室内；只考充电场所，不表示电池类型或电气负荷。','原题实验室与空间较大条件')]),
    ['ebike'], '较大空余空间不能替代对充电场所的管理要求；图示不推断负荷、电池质量或事故必然发生。')
add('QCU-M:18', '铁屑清理的三种动作', 'T02', '清理工作台面上的铁屑，应采用哪种方法？',
    {'kind':'paired','images':['assets/visual-pilot/scene-03.png','assets/visual-pilot/scene-04.png','assets/visual-pilot/scene-05.png'], 'alts':['用刷子接触并清理台面铁屑','戴手套的手直接聚拢铁屑','嘴部朝向铁屑吹气']},
    [('工具接触铁屑且手与铁屑分离', 'option:0'), ('手套直接接触铁屑', 'option:1'), ('嘴部与铁屑方向形成吹气动作', 'option:2'), ('同一工作台和铁屑对象', 'group')],
    facts([('H1','仅比较台面铁屑清理方式，图中没有正在运行的机床。','缩小画面到原题工作台面，避免增加设备运行状态')]),
    ['workshop'], '使用合适工具清理；戴手套直接捡拾和用嘴吹都不能替代工具清扫。图像只用于识别动作，不能作为机床操作规程。',
    options=['用工具清扫','戴手套用手清理','用嘴吹'], critical=[{'id':'contact','box':[0.31,0.50,0.37,0.39]}])
add('TSU200:17', '插座周边', 'T04', '图中纸箱和纸张紧靠墙面插座堆放。这种摆放是否符合要求？',
    {'kind':'diagram','scene':'socket','alt':'纸箱与纸张堆在墙面插座紧邻位置，未标示实际距离'},
    [('插座与纸制物品的位置关系', 'diagram')], [], ['fire'], '电气设施周边不应堆放可燃杂物；本题判断位置关系，不从图中比例计算安全距离。', answer=1, mapping={'mode':'proposition_reversal','source_to_adapted':[1,0]})
add('TSU200:57', '走廊旁的杂物', 'T04', '实验室走廊里，如图这样堆放杂物，只要还能走过去就符合要求。对吗？',
    {'kind':'diagram','scene':'corridor','alt':'实验室外走廊一侧有箱物，旁边仍留空余通行区域'},
    [('箱物占用走廊一侧、另一侧仍可见空余', 'diagram'), ('按该场地规则禁止自行堆放', 'H1')],
    facts([('H1','采用本题来源场地的走廊管理规则，不包括另行审批的特殊场地安排。','源题学校范围明示；不同学校可能有审批例外')]),
    ['fire'], '源题条件下，仍能通行不能作为自行堆物的理由；不同场地的特殊审批安排须另行核验，本图不能证明实际净宽。')
add('TSU200:76', '逃生通道', 'T04', '图示逃生通道的出口处被箱物挡住。这种状态符合通道要求吗？',
    {'kind':'diagram','scene':'exit','alt':'通道平面图，标注出口，箱物横跨出口前的通行区域'},
    [('箱物覆盖出口前通行路径', 'diagram'), ('路径明确为逃生通道', 'diagram')], [], ['fire'], '逃生通道应保持畅通。这里只判断图示阻挡关系，不把教学平面图当现场疏散图。', answer=1, mapping={'mode':'proposition_reversal','source_to_adapted':[1,0]})
add('CPU2025:425', '入室准备是清单', 'T05', '准备开展一项实验，应按本次任务要求完成哪些入室准备？请选择所有符合项。',
    {'kind':'diagram','scene':'preparation','alt':'实验任务与规程、防护服鞋、个人防护用品、食品四个对象的中性示意'},
    [('任务规程、着装、防护用品与食品是独立对象', 'diagram'), ('装备必须与本次任务对应', 'H1')],
    facts([('H1','具体防护服、鞋与个人防护用品按本次任务要求选择，不固定为一套通用装备。','原选项合适与齐全，结合任务防护依据')]),
    ['lab'], '了解任务规程、穿着合适衣鞋并检查所需防护用品是独立准备项；食品不能带入实验室食用。这是多选清单，不具有题目规定的唯一先后顺序。')
add('CPU2025:455', '实验行为边界', 'T05', '在实验过程中，哪些行为属于禁止行为？请选择所有符合项。',
    {'kind':'diagram','scene':'conduct','alt':'数据记录、饮食吸烟、步骤修改、离开岗位四类行为对象的中性示意'},
    [('四类行为分别呈现，没有顺序箭头', 'diagram'), ('修改步骤和离岗均为未经许可', 'H1')],
    facts([('H1','按原题考查“擅自修改”和“擅自离岗”，不把批准调整等同于擅自行为。','原题擅自限定词')]),
    ['lab','fire'], '禁止饮食吸烟、擅自修改步骤和擅自离岗；如实记录数据不是禁止行为。多个正确选项分别保留。')
add('CPU2025:463', '模糊标签', 'T07', '排查易燃液体试剂时发现了图中这瓶。凭经验猜出它是什么，就可以继续使用。对吗？',
    {'kind':'diagram','scene':'label','alt':'封闭试剂瓶，标签名称行被擦损遮蔽，其他外观不提示成分'},
    [('名称字段无法辨认', 'diagram'), ('排查对象为易燃液体试剂瓶', 'H1')],
    facts([('H1','本题已知排查对象为易燃液体试剂瓶，但标签中的具体名称无法辨认。','源题易燃液体条件；不能从瓶色猜性质')]),
    ['lab'], '无法确认名称的试剂不能凭经验继续使用，应依管理要求核查和处理。演示瓶不呈现液体颜色、气味或虚构成分。')
add('TSU200:70', '责任门牌', 'T07', '实验室门口的责任信息牌应显示安全责任人的姓名和联系方式。对吗？',
    {'kind':'diagram','scene':'doorplate','alt':'门口的信息牌，与责任人和应急联系字段关联'},
    [('信息牌与实验室门口关联', 'diagram'), ('责任人与联系字段清楚可读', 'diagram')],
    facts([('H1','牌中的人员和联系方式均为虚构教学信息，正式学校应配置实际有效信息。','改编示例不披露真实个人资料')]),
    ['lab'], '责任信息应可查询并保持有效。样例只考字段作用，不把虚构电话号码作为真实应急联系方式。')
add('JZCIT:85', '标签对象填空', 'T07', '观察瓶身标签：实验室里的哪类物品应标明这些信息？请填空。',
    {'kind':'diagram','scene':'label-fields','alt':'封闭容器与名称、浓度、危险性质三个空白字段关联，不显示物品类别答案'},
    [('容器与三个标签字段对应', 'diagram')], [], ['lab'], '源题对象为化学药品。保留填空作答，接受已列明的“化学药品”“化学试剂”作为本次研究等价表述，不改成选择。')
add('CPU2025:207', '站外转账优惠', 'T09', '小王看到这段购物对话，心想：“万一被骗，还能向网店索赔，照做也没关系。”他的判断对吗？',
    {'kind':'chat','channel':'购物私信','messages':[{'sender':'店家','text':'这套衣服直接汇款到我的银行账户，还能再打九折。'},{'sender':'买家','text':'如果出了问题，我还能向网店投诉索赔吧？'}]},
    [('站外银行转账请求与折扣诱因', 'message:0'), ('索赔推理没有提供收款身份核验', 'message:1')],
    facts([('H1','身份、交易与对话均为教学改编；不展示真实账号，不预断最终是否被骗。','原题购买衣服、银行汇款、九折与索赔理由')]),
    ['anti-fraud'], '可能投诉并不能证明站外收款可靠或损失必定追回；需要谨慎核验并使用符合平台规则的交易渠道。')
add('CPU2025:538', '自称教师的邮件', 'T09', '收到图示邮件后，这些线索可能对应哪类网络攻击？',
    {'kind':'chat','channel':'电子邮件','messages':[{'sender':'自称班主任','text':'请访问下面的网站，用你的真实姓名注册。'},{'sender':'邮件内容','text':'school-check.example.invalid/register'}]},
    [('发送者自称教师但身份未核验', 'message:0'), ('陌生域名与实名注册请求', 'message:1')],
    facts([('H1','域名为不可点击的虚构示例；这里只判断“可能属于”，不是已证实的攻击结果。','原题身份声明、陌生链接、真实姓名与可能限定')]),
    ['anti-fraud'], '冒充可信身份，引导访问陌生网站并提交信息，是钓鱼邮件的可能线索；不能把“自称”当作已核验身份。')
add('CPU2025:585', '异常登录短信', 'T09', '收到图示短信后，直接访问其中链接并输入密码，就能解决账号安全问题。对吗？',
    {'kind':'chat','channel':'陌生短信','messages':[{'sender':'陌生号码','text':'账号异常登录，请点击下面的链接验证。'},{'sender':'短信链接','text':'account-check.example.invalid/verify'},{'sender':'对方请求','text':'请输入账号密码完成验证。'}]},
    [('异常登录话术', 'message:0'), ('消息链接与输入密码请求', 'message:1')], [], ['anti-fraud'], '短信声明不能证明链接可信。应通过已知官方渠道核验，避免在可疑链接页面输入密码。')
add('QCU-M:9', 'A/B不等于正误固定顺序', 'T10', '可以自行拆卸或移动机床上的安全防护装置。这个说法对吗？',
    {'kind':'diagram','scene':'guard','alt':'机床的防护罩与装置主体关联，图示不演示拆卸操作'},
    [('防护装置与机床关联', 'diagram'), ('变更未经许可', 'H1')], facts([('H1','仅判断自行变更行为，不涉及获准维护或停机检修操作。','原题任意限定')]),
    ['workshop'], '原题选项A表示正确，但源命题是不得任意拆移；本改编把命题反转，因此答案是错误。字母与命题方向必须分别处理。',
    answer=1, mapping={'mode':'proposition_reversal','source_to_adapted':[1,0]}, cohort='transfer')
add('QCU-M:10', '熟练不代表授权', 'T10', '操作已经很熟练，即使指导老师尚未同意，也可以自行开机。对吗？',
    {'kind':'diagram','scene':'permission','alt':'熟练操作记录与老师同意状态分别显示，未把外貌或穿着作为授权证据'},
    [('熟练与授权是两个不同字段', 'diagram'), ('老师尚未同意', 'H1')], facts([('H1','本次开机尚未取得指导老师同意。','原题未经指导老师同意')]),
    ['workshop'], '源题A是错误、B是正确；熟练程度不能替代许可。本卡使用正确/错误按钮重新映射，不能把答案A直接转为正确。',
    options=['正确','错误'], answer=1, mapping={'mode':'option_reorder','source_to_adapted':[1,0]}, cohort='transfer')
add('JZCIT:95', '废弃物管理链路', 'T08', '图中废弃物已经确认类别。应怎样分别收集和交接处理？请用自己的话回答。',
    {'kind':'diagram','scene':'waste','alt':'不同类别废物对应分开的收集容器，再连接管理交接与处置节点；不展示混合或倒入操作'},
    [('分类对象与独立收集容器对应', 'diagram'), ('收集、交接、处置是管理关系，不是自行操作教程', 'diagram')],
    facts([('H1','只讨论已分类确认的废物管理关系，不涉及未知物分类判断或任何混合处理。','原题分类、单独收集与专业机构条件')]),
    ['lab'], '对照要点：分类收集；有害废物单独管理并交给相应专业机构；普通废物进入指定收集渠道。简答不以关键词命中自动判满分，也不将自评写成考试分数。',
    cohort='transfer')

# Revision 2: physical scenes replace all hand-drawn diagrams and text-only chats.
# Production notes stay in the source comparison; essential hidden facts live in
# the question sentence. A separate hint is opt-in and reserved for complex tasks.
REVISIONS = {
    'vp03': ('lab-ebike-v2', '实验室内，电动自行车通过充电器连接墙面插座', [('车辆、充电器与插座的完整连接关系', 'image')]),
    'vp05': ('socket-clutter-v2', '墙面插座紧邻堆放的纸箱和纸张', [('插座与纸制物品的位置关系', 'image')]),
    'vp06': ('corridor-clutter-v2', '实验室走廊一侧堆有箱物，另一侧仍有可走区域', [('箱物占用走廊一侧，另一侧仍留有通行区域', 'image')]),
    'vp07': ('exit-clutter-v2', '安全出口前的通行区域被箱物横向挡住', [('箱物挡住出口前的通行路径', 'image'), ('门上方可见安全出口文字', 'image')]),
    'vp08': ('lab-preparation-v2', '规程册、衣鞋、防护用品与食品分开放置', [('任务规程、衣鞋、防护用品与食品四组候选物品', 'image')]),
    'vp09': ('lab-conduct-v2', '四个实验情境：写记录、饮食、改步骤、离开岗位', [('记录数据、饮食、改步骤与离开岗位四类行为', 'image')]),
    'vp10': ('damaged-label-v2', '封闭棕色玻璃瓶，瓶身纸标签严重磨损，字迹不可辨认', [('瓶身名称字迹被实际磨损，无法辨认', 'image')]),
    'vp11': ('lab-doorplate-v2', '实验室门旁的责任信息牌，含责任人和校内分机教学示例', [('责任信息牌附着于实验室门旁', 'image'), ('牌面责任人和联系字段清楚可读', 'image')]),
    'vp12': ('reagent-label-v2', '封闭玻璃瓶标签写有名称乙醇、浓度75%、危险性质易燃', [('名称、浓度与危险性质直接印在瓶身标签上', 'image')]),
    'vp13': ('shopping-transfer-v2', '衣服旁的手机购物对话，店家要求个人账户转账并提出九折优惠', [('店家要求转到个人银行账户并以折扣吸引买家', 'image'), ('买家提出出问题后向网店索赔的想法', 'image')]),
    'vp14': ('phishing-mail-v2', '电脑邮件界面，发件人自称班主任，要求在陌生网站实名注册', [('发件人自称班主任，身份未核验', 'image'), ('陌生域名和真实姓名注册请求', 'image')]),
    'vp15': ('suspicious-sms-v2', '手机陌生短信，称账号异常并要求打开链接输入密码', [('账号异常登录的短信话术', 'image'), ('陌生链接和输入账号密码的要求', 'image')]),
    'vp16': ('machine-guard-v2', '停止运转的机床及附着于主轴区域的透明防护罩', [('实际防护罩与机床的安装关系', 'image')]),
    'vp17': ('machine-permission-v2', '停止的机床旁有本次开机记录，训练已完成但老师同意未取得', [('纸质记录分列训练完成与老师同意状态', 'image'), ('本次开机尚未取得老师同意', 'image')]),
    'vp18': ('waste-management-v2', '有害废弃物与普通废弃物两个独立封闭容器，旁有空白交接记录', [('不同类别对应相互独立的收集容器', 'image'), ('分类容器旁有待填写的交接记录', 'image')]),
}
STEM_FACTS = {
    'vp01': '实验还没结束，小安戴着本次实验使用的手套',
    'vp02': '小安刚做完实验，没换手套就操作共用电脑',
    'vp03': '实验室',
    'vp08': '按本次任务要求',
    'vp09': '擅自',
    'vp10': '易燃液体试剂',
    'vp16': '自行',
    'vp17': '指导老师尚未同意',
    'vp18': '废弃物已经确认类别',
}
FOCUS = {
    'vp10': [.26, .01, .48, .98],
    'vp12': [.27, .01, .46, .98],
    'vp13': [.17, .01, .37, .98],
}
for card in CARDS:
    card['version'] = 2
    if card['id'] in REVISIONS:
        asset, alt, evidence = REVISIONS[card['id']]
        card['visual'] = {'kind': 'image', 'image': f'assets/visual-pilot/{asset}.png', 'alt': alt}
        if card['id'] in FOCUS:
            card['visual']['focus'] = FOCUS[card['id']]
        card['evidence'] = [{'id': f'E{i+1}', 'fact': fact, 'carrier': carrier, 'required': True} for i, (fact, carrier) in enumerate(evidence)]
    for condition in card['conditions']:
        condition['placement'] = 'teacher_note'
    excerpt = STEM_FACTS.get(card['id'])
    if excerpt:
        if card['id'] == 'vp09':
            assert any(excerpt in option for option in card['adapted']['options'])
            placement = 'options'
        else:
            assert excerpt in card['adapted']['stem'], card['id']
            placement = 'stem'
        condition = card['conditions'][0]
        condition['placement'] = placement
        condition['student_text'] = excerpt
        if card['id'] in REVISIONS and card['id'] not in ['vp17']:
            card['evidence'].append({'id': f'E{len(card["evidence"])+1}', 'fact': condition['text'], 'carrier': condition['id'], 'required': True})
    card['required_condition_ids'] = [c['id'] for c in card['conditions'] if c['placement'] != 'teacher_note']
    card['semantic_review']['checked_at'] = '2026-10-10'
    card['semantic_review']['method'] = '重新核对完整原题、选项与答案；必要前提移入题干或选项；制作说明只保留在教师对照'

BLOCKS = [
    ('QCU-M:96','题干与源答案冲突','source_answer_conflict','答案ABC包含未经许可擅离岗位，不能把它画为正确行为。'),
    ('JZCIT:8','集中答案表错配','source_answer_conflict','集中答案为C，但C是短袖T恤；源答案与防护装备题意冲突。'),
    ('JZCIT:10','单选不唯一','single_not_unique','集中答案为B，吸烟和吃东西均可成立，不能直接按单选发布。'),
    ('CPU2025:456','持续运行例外缺失','missing_scope_exception','关闭水电气的笼统要求未限定必要持续运行设备；先补场景与学校依据。'),
    ('JZCIT:71','任务装备条件不足','missing_activity_scope','括号后源答案已恢复，但把实验服、眼镜、手套作为通用入室要求仍缺具体任务。'),
    ('JZCIT:74','容器要求过度泛化','source_scope_conflict','原答案笼统禁止玻璃或易碎容器，缺少化学品与容器适配任务条件。'),
]
for ref,title,code,reason in BLOCKS:
    src=parse_source(ref);SNAPSHOTS.append(src)
    CARDS.append({'id':f'vp{len(CARDS)+1:02}','version':1,'title':title,'cohort':'negative','source_ref':ref,'source_type':src['type'],'source_locator':src['locator'],'source_number':src['number'],'source_url':src['url'],'source_archive_sha256':src['archive_sha256'],'template':'BLOCK','interaction':'blocked','adapted':None,'conditions':[],'evidence':[],'assets':[],'observations':[],'basis':[],'semantic_review':{'actor':'Codex内容设计审查','method':'完整原题与源答案比对','status':'needs_review','risks':[{'code':code,'message':reason}],'preserved_conditions':False},'publication':'research_only','online_generation':False})

payload={'schema_version':2,'batch':'visual-pilot-2026-10-10-v2','production_status':'research_only','method':'真实原题人工改编＋内置imagegen预生成观察素材＋规则检查；必要背景在题干，制作说明仅教师可见；未接入应用在线AI','cards':CARDS}
(ROOT/'config/visual-pilot.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'source-snapshots.json').write_text(json.dumps(SNAPSHOTS,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'cards':len(CARDS),'calibration':sum(c['cohort']=='calibration' for c in CARDS),'transfer':sum(c['cohort']=='transfer' for c in CARDS),'negative':len(BLOCKS),'source_types':sorted(set(c['source_type'] for c in CARDS))},ensure_ascii=False))
