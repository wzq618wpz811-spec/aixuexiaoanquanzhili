import json,collections,sys,re
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]/'research/question-banks'
rows=json.loads((BASE/'questions.json').read_text(encoding='utf8'))
cpu=[r for r in rows if r['source']=='CPU2025'];groups=collections.defaultdict(list)
for r in cpu:groups[(r['category'],r['type'])].append(r)
selected={r['id']:r for r in cpu if r['category']=='实验室安全'}
for group in groups.values():
 for i in sorted(set([0,len(group)//3,2*len(group)//3,len(group)-1])):selected[group[i]['id']]=group[i]
selected=sorted(selected.values(),key=lambda r:int(r['number']))
(BASE/'cpu-selected.json').write_text(json.dumps([r['id'] for r in selected],ensure_ascii=False),encoding='utf8')
mode=sys.argv[1] if len(sys.argv)>1 else 'cpu';start=int(sys.argv[2]) if len(sys.argv)>2 else 0;end=int(sys.argv[3]) if len(sys.argv)>3 else start+40
chosen=selected if mode=='cpu' else [r for r in rows if r['source']==mode]
print(f'SOURCE {mode}; total {len(chosen)}; reading positions {start+1}..{min(end,len(chosen))}')
for r in chosen[start:end]:
 if mode=='cpu':print(f"{r['id']} / Q{r['number']} / {r['type']} / {r['category']}\n{r['stem']}\n{r['options']}\n原答案={r['answer']}\n")
 else:print(f"{r['id']} / 原题{r['number']}\n{r['body']}\n")
