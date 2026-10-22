import json,re,hashlib,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'research/question-banks'
rows=[]
sheet=json.loads((BASE/'CPU2025.sheets.json').read_text(encoding='utf8'))[0]
for r in sheet['rows'][1:]:
 n=r['row'];c=r['cells'];rows.append(dict(id=f'CPU2025:{n}',source='CPU2025',locator=f"{sheet['name']}!D{n}:F{n}",number=c.get(f'A{n}'),type=c.get(f'B{n}'),category=c.get(f'C{n}'),stem=c.get(f'D{n}'),options=c.get(f'E{n}'),answer=c.get(f'F{n}')))
for id in ['NWU219','TSU200','QCU-M','QCU-G','JZCIT']:
 text=(BASE/(id+'.txt')).read_text(encoding='utf8')
 pat=r'(?m)^\s*(\d{1,4})\s*[、.．]\s*' if id!='NWU219' else r'(?m)^(?=\[(?:判断|单选|多选)题\])'
 starts=list(re.finditer(pat,text));section='';seq=0
 for i,m in enumerate(starts):
  b=text[m.end():starts[i+1].start() if i+1<len(starts) else len(text)].strip()
  if len(b)<8:continue
  seq+=1;num=m.group(1) if id!='NWU219' else str(seq)
  typem=re.search(r'\[([^\]]*题)\]',b);typ=typem.group(1) if typem else '未显式标注'
  answer=re.search(r'(?:标准答案|答案)\s*[：:]\s*([^\n）]+)',b)
  if id=='QCU-M':
   am=re.search(r'[（(]([A-Da-d]+)[）)]',b.split('\n')[0]);answer_text=am.group(1).upper() if am else None
   typ='多选' if answer_text and len(answer_text)>1 else '单选' if answer_text else typ
  else:answer_text=answer.group(1).strip() if answer else None
  if id=='TSU200':
   am=re.search(r'标准答案\s*[：:]\s*([\s正确错误]+)',b)
   answer_text=re.sub(r'\s+','',am.group(1)) if am else None
   typ='判断题'
  if id=='JZCIT':typ='选择题' if seq<=50 else '判断题' if seq<=70 else '填空题' if seq<=90 else '简答题'
  if id=='QCU-M' and re.search(r'A[、.．]\s*(正确|错误)',b) and re.search(r'B[、.．]\s*(正确|错误)',b):typ='判断语义，A/B作答'
  if id=='QCU-G' and re.search(r'\n对\s*\n错',b):typ='判断题'
  rows.append(dict(id=f'{id}:{seq}',source=id,locator=f'文本序位{seq} / 印刷题号{num}',number=num,type=typ,body=b,answer=answer_text))
for r in rows:
 t=r.get('stem') or r.get('body','');norm=re.sub(r'\s|\[[^\]]*题\]|（标准答案.*','',t)
 r['fingerprint']=hashlib.sha256(norm.encode()).hexdigest()
(BASE/'questions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
counts=collections.Counter(r['source'] for r in rows);cpu=[r for r in rows if r['source']=='CPU2025']
summary={'parsed_records':dict(counts),'cpu_types':dict(collections.Counter(r['type'] for r in cpu)),'cpu_categories':dict(collections.Counter(r['category'] for r in cpu)),'exact_normalized_unique':len(set(r['fingerprint'] for r in rows))}
(BASE/'index-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(summary,ensure_ascii=False,indent=2))
for s in counts:
 print('\nSOURCE',s)
 for r in [x for x in rows if x['source']==s][:2]:print(json.dumps(r,ensure_ascii=False))
