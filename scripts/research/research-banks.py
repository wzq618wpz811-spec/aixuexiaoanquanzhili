"""Public question-bank acquisition and read-only extraction; never writes evidence DB."""
import json, hashlib, re, sys, io, zipfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import requests, fitz
from lxml import html, etree

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'research'/'question-banks'
OUT.mkdir(parents=True,exist_ok=True)
SOURCES=[
 dict(id='CPU2025',title='江苏省第十四届大学生安全知识竞赛题库',publisher='中国药科大学保卫处',kind='xlsx',url='https://bwc.cpu.edu.cn/_upload/article/files/75/d8/1239abdf4e0bbd1b09672d7e6bc1/2a9f2049-c568-4537-a21a-447ef824a63e.xlsx',page='https://bwc.cpu.edu.cn/7e/16/c8022a228886/page.htm'),
 dict(id='SZIT-G',title='实验室安全知识题库 通识类',publisher='苏州工业园区职业技术学院教务处',kind='pdf',url='https://jwc.szitu.edu.cn/storage/files/通识类安全知识.pdf'),
 dict(id='SZIT-M',title='实验室安全知识题库 机械建筑类',publisher='苏州工业园区职业技术学院教务处',kind='pdf',url='https://jwc.szitu.edu.cn/storage/files/机械建筑类安全知识.pdf'),
 dict(id='SHNU',title='大学生安全教育习题集',publisher='上海师范大学保卫处公开文件',kind='pdf',url='https://bwch.shnu.edu.cn/_upload/article/files/ea/1b/fab6b9664b8fbe85dba0ba23de53/ad99f691-15ed-4127-9ed1-d19faf2d2509.pdf'),
 dict(id='NWU219',title='实验室安全考试 219道题',publisher='西北大学生命科学学院',kind='html',url='https://skjxsf.nwu.edu.cn/ksdh/sysaqks.htm'),
 dict(id='TSU200',title='实验室安全试题库 200道',publisher='泰山学院化学相关学院',kind='html',url='https://chem.tsu.edu.cn/2019/0622/c445a48906/page.htm'),
 dict(id='QCU-M',title='金工实习安全教育题库',publisher='青岛城市学院实验室管理中心',kind='html',url='https://lab.qcuwh.edu.cn/info/1004/1736.htm'),
 dict(id='QCU-G',title='实验室安全知识题库 理工类',publisher='青岛城市学院实验室管理中心',kind='html',url='https://lab.qcuwh.edu.cn/info/1004/1738.htm'),
 dict(id='JZCIT',title='实验室安全知识考试题库',publisher='焦作工贸职业学院',kind='html',url='https://www.jzcit.edu.cn/2024/0627/c1136a18429/page.htm'),
]
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def read_xlsx(content):
 z=zipfile.ZipFile(io.BytesIO(content));strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  s=etree.fromstring(z.read('xl/sharedStrings.xml'));strings=[''.join(e.itertext()) for e in s]
 rels=etree.fromstring(z.read('xl/_rels/workbook.xml.rels'));mapping={e.get('Id'):e.get('Target') for e in rels}
 workbook=etree.fromstring(z.read('xl/workbook.xml'));sheets=[]
 for sheet in workbook.findall('.//m:sheet',NS):
  target=mapping[sheet.get('{'+NS['r']+'}id')];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  data=etree.fromstring(z.read(target));rows=[]
  for row in data.findall('.//m:sheetData/m:row',NS):
   vals={}
   for c in row.findall('m:c',NS):
    val=c.find('m:v',NS);typ=c.get('t');v=val.text if val is not None else ''
    if typ=='s':v=strings[int(v)] if v else ''
    elif typ=='inlineStr':v=''.join(c.find('m:is',NS).itertext())
    if v!='':vals[c.get('r')]=v
   if any(vals.values()):rows.append({'row':int(row.get('r')),'cells':vals})
  sheets.append({'name':sheet.get('name'),'rows':rows})
 return sheets
def fetch(s):
 s=dict(s);raw=OUT/(s['id']+'.'+s['kind'])
 try:
  if raw.exists():content=raw.read_bytes();s['cached']=True
  else:
   r=requests.get(s['url'],timeout=(12,45),headers={'User-Agent':'Mozilla/5.0'});r.raise_for_status();content=r.content;raw.write_bytes(content);s['http_status']=r.status_code;s['final_url']=r.url
  s['sha256']=hashlib.sha256(content).hexdigest();s['bytes']=len(content)
  if s['kind']=='pdf':
   d=fitz.open(stream=content,filetype='pdf');pages=[p.get_text() for p in d];s['pages']=len(pages)
   (OUT/(s['id']+'.pages.json')).write_text(json.dumps(pages,ensure_ascii=False),encoding='utf8');text='\n'.join(f'\n=== PDF PAGE {i+1} ===\n{t}' for i,t in enumerate(pages))
  elif s['kind']=='xlsx':
   sheets=read_xlsx(content);s['sheets']=[{'name':x['name'],'nonempty_rows':len(x['rows'])} for x in sheets]
   (OUT/(s['id']+'.sheets.json')).write_text(json.dumps(sheets,ensure_ascii=False,indent=2),encoding='utf8')
   text='\n'.join('SHEET '+x['name']+'\n'+'\n'.join('ROW '+str(r['row'])+' '+json.dumps(r['cells'],ensure_ascii=False) for r in x['rows']) for x in sheets)
  else:
   doc=html.fromstring(content);etree.strip_elements(doc,'script','style','noscript',with_tail=False)
   nodes=doc.xpath('//*[contains(@class,"v_news_content") or contains(@class,"wp_articlecontent")]')
   target=nodes[0] if nodes else doc
   text='\n'.join(x.strip() for x in target.itertext() if x.strip())
  (OUT/(s['id']+'.txt')).write_text(text,encoding='utf8');s['characters']=len(text);s['status']='extracted';s['captured_at']=datetime.now(timezone.utc).isoformat()
 except Exception as e:s['status']='failed';s['error']=str(e)
 return s
if __name__=='__main__':
 ids=set(sys.argv[1:]);sources=[s for s in SOURCES if not ids or s['id'] in ids]
 with ThreadPoolExecutor(max_workers=4) as ex:
  results=list(ex.map(fetch,sources))
 (OUT/'manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(results,ensure_ascii=False,indent=2))
