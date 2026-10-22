"""Bind the actual asset revisions to the recorded Codex visual inspection.

This script attaches receipts; it does NOT perform computer vision or expert review.
"""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
receipt_path=ROOT/'docs/research/visual-pilot-observations-v2.json'
if not receipt_path.is_file():
    raise SystemExit('Missing recorded review input: '+str(receipt_path)+'; restore genuine receipts before binding. No configuration was written.')
path=ROOT/'config/visual-pilot.json'
pilot=json.loads(path.read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'docs/research/visual-pilot-generation.json').read_text(encoding='utf-8'))
assets={x['path'].removeprefix('prototype/').removeprefix('web/'):x for x in manifest['items']}
revision_receipts=json.loads(receipt_path.read_text(encoding='utf-8'))
receipts={x['card_id']:x for x in revision_receipts['cards']}
descriptions={
    'vp01': ['蓝色手套包覆手指并握住听筒；听筒贴近耳部、电话线连向底座。'],
    'vp02': ['食指手套触及键盘按键，手指、袖口和按键未相互遮挡。'],
    'vp04': ['刷柄由蓝色毛绒裸手握住，刷毛接触铁屑，手与铁屑分开。','灰色手套手指直接进入铁屑堆，刷子已移除。','嘴唇收拢朝铁屑吹气，轻微气流线提供动作证据，双手离开铁屑。','三幅均保持同一身份、工装、护目镜、台面和背景；动作所需头部、手部与局部阴影差异保留。'],
}
for card in pilot['cards']:
    if card['interaction']=='blocked':continue
    visual=card['visual']
    filenames=[visual['image']] if visual['kind']=='image' else visual['images'] if visual['kind']=='paired' else []
    card['assets']=[]
    for filename in filenames:
        a=assets[filename]
        actual=hashlib.sha256((ROOT/'web'/filename).read_bytes()).hexdigest()
        assert actual==a['sha256'],filename
        card['assets'].append({'path':filename,'sha256':actual,'production':'built-in imagegen actual output','review_method':'Codex查看本地实际图像，非独立盲审，非专业安全审定'})
    if card['id'] in receipts:
        receipt=receipts[card['id']]
        assert card['assets']==receipt['assets'],card['id']+' actual output changed; re-inspect before attaching a receipt'
        descriptions[card['id']]=receipt['descriptions']
    if visual['kind']=='diagram':
        visual['evidence_ids']=[e['id'] for e in card['evidence'] if e['carrier']=='diagram']
    card['observations']=[]
    for i,e in enumerate(card['evidence']):
        if e['carrier'].startswith('H') or e['carrier'].startswith('message:') or e['carrier']=='diagram':continue
        subset=card['assets'] if e['carrier']=='group' else [card['assets'][int(e['carrier'].split(':')[1])]] if e['carrier'].startswith('option:') else card['assets']
        card['observations'].append({'evidence_id':e['id'],'status':'observed','description':descriptions[card['id']][i],'method':'Codex实际查看生成图片；本轮未实施独立视觉模型盲审','asset_hashes':[{'path':a['path'],'sha256':a['sha256']} for a in subset]})
    if visual['kind']=='paired':
        visual['composite']={'base_image':visual['images'][0],'method':'SVG clipPath composition; original files are not modified','region_polygon':[[.18,0],[.72,0],[.74,.55],[.77,.75],[.80,.97],[.20,.98],[.15,.68],[.15,.30]],'region_version':2}
        card['comparison_review']={'status':'passed','scope':'method_only','method':'三幅实际图像并列观察；另有程序像素差异分析，仅用于发现漂移','allowed_changes':['清理工具与手的接触方式','动作必要的手套、嘴形、头位和局部阴影'],'not_guaranteed':'区域外像素完全一致；专业器材细节无需由此证明'}
        card['comparison_review']['repair']='原始吹气编辑图出现区域外变化；渲染时固定共同底图，以SVG动作区覆盖变体。首个区域边界留下耳部残影，第二版区域包含完整头部与相关姿态，最终浏览器截图复查。'
    card['online_generation']=False
    reviewed=[card['source_ref'],card['source_type'],card['source_archive_sha256'],card['template'],card['interaction'],card['adapted'],card['answer_mapping'],card['conditions'],card['required_condition_ids'],card['evidence'],card['visual'],card['basis'],card['assets'],card['critical_regions']]
    card['semantic_review']['blueprint_fingerprint']=hashlib.sha256(json.dumps(reviewed,ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()

path.write_text(json.dumps(pilot,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Attached actual asset hashes and recorded visual observations; no online vision or expert approval claimed.')
