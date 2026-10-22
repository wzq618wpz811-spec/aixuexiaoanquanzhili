import {escapeText as e,visualMarkup,answerMarkup} from './visual-pilot-render.mjs';
const $=s=>document.querySelector(s);
let data,cohort='calibration',type='all',mode='each',index=0,selections={},results={},busy=false;
const typeLabels={single:'单选',multi:'多选',judge:'判断',fill:'填空',short:'简答'};
async function api(route,body){const response=await fetch('/api/teacher/'+route,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});const result=await response.json();if(!response.ok){const error=new Error(result.error||'请求失败');error.status=response.status;throw error;}return result;}
function login(){
  $('#root').innerHTML='<section class="login"><h1>真实题视觉试验</h1><p>使用教师账户查看研究样例与原题对照。试答不写入演示学习记录。</p><form id="pilot-login"><label>教师密码<input id="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">进入研究预览</button><p class="error" id="login-error" role="alert"></p></form></section>';
  $('#pilot-login').addEventListener('submit',async event=>{event.preventDefault();try{await api('login',{password:$('#password').value});await start();}catch(error){$('#login-error').textContent=error.message;}});
}
async function start(){try{data=await api('visual-pilot');const requested=new URLSearchParams(location.search).get('question'),target=data.cards.find(c=>c.id===requested);if(target){cohort=target.cohort;index=data.cards.filter(c=>c.cohort===cohort).findIndex(c=>c.id===requested);}render();}catch(error){if(error.status===401)login();else $('#root').innerHTML=`<p class="error">${e(error.message)}</p>`;}}
function visible(){return data.cards.filter(c=>c.cohort===cohort&&(type==='all'||c.interaction===type));}
function selectedValid(card){const response=selections[card.id];return ['fill','short'].includes(card.interaction)?typeof response==='string'&&!!response.trim():card.interaction==='multi'?Array.isArray(response)&&response.length>0:Number.isInteger(response);}
function feedback(card){const r=results[card.id];if(!r)return '';const heading=r.grading==='self_review'?'简答对照 · 请核对自己的要点':r.grading==='unresolved'?'该表述尚未自动判定，请对照源答案':r.correct?'与本题参考答案一致':'与本题参考答案不同';return `<section class="feedback ${r.correct===null?'neutral':''}" aria-live="polite"><h3>${heading}</h3><p>${e(r.explanation)}</p>${r.correct===null?`<p>源答案：${e(r.answer)}</p>`:''}</section>`;}
function toolbar(){return `<div class="toolbar"><label>题组<select id="cohort"><option value="calibration" ${cohort==='calibration'?'selected':''}>首批设计 · 15题</option><option value="transfer" ${cohort==='transfer'?'selected':''}>补充适配 · 3题</option><option value="negative" ${cohort==='negative'?'selected':''}>疑题检查 · 6题</option></select></label><label>原作答语义<select id="type-filter"><option value="all">全部</option>${Object.entries(typeLabels).map(([key,label])=>`<option value="${key}" ${type===key?'selected':''}>${label}</option>`).join('')}</select></label><label>研究预览揭晓<select id="feedback-mode"><option value="each" ${mode==='each'?'selected':''}>逐题确认</option><option value="batch" ${mode==='batch'?'selected':''}>整组完成后</option></select></label><button id="reset-preview" type="button">重新试答</button></div>`;}
function render(){
  const cards=visible();index=Math.max(0,Math.min(index,cards.length-1));const card=cards[index];
  const intro=`<section class="intro"><h1>让画面提供解题证据。</h1><p>完整原题 → 保留作答语义 → 视觉蓝图 → 生图素材 → 研究审查</p><div class="stats"><span>15道首批样例</span><span>3道补充适配</span><span>6道疑题</span><span>${e(data.summary.realImagegenCalls)}次实际生图 / 编辑</span></div></section>`;
  const notice='<p class="notice">本页是预生成研究样例，可试答、放大画面和查看原题对照；未进入正式教学题库。简答保留开放回答，采用要点自评。</p>';
  let body='';
  if(cohort==='negative')body=`<section class="panel"><h2>发现疑问的原题</h2>${data.blocked.map(c=>`<article class="blocked-item"><h3>${e(c.title)}</h3><p>${e(c.source_ref)} · ${e(c.source_type)}</p>${c.issues.map(x=>`<p>${e(x.message)}</p>`).join('')}<button data-source="${c.id}" type="button">查看本地完整原题</button><div class="source" id="source-${c.id}"></div></article>`).join('')}</section>`;
  else if(!card)body='<section class="panel"><p>该筛选下没有样例。</p></section>';
  else{
    const allAnswered=cards.every(selectedValid),revealed=!!results[card.id];
    body=`<div class="layout"><article class="panel question" data-card-id="${card.id}" data-interaction="${card.interaction}"><div class="meta"><span class="chip">${e(card.template)}</span><span>${e(card.source_type)}</span><span>${e(card.source_ref)}</span></div><h2>${e(card.stem)}</h2>${card.conditions.length?`<details class="question-hint"><summary>需要一点提示？</summary>${card.conditions.map(c=>`<p>${e(c.text)}</p>`).join('')}</details>`:''}${visualMarkup(card)}<form id="answer-form">${answerMarkup(card,selections[card.id],revealed)}${feedback(card)}<div class="actions"><button type="button" id="prev" ${index===0?'disabled':''}>上一题</button><button class="primary" type="submit" id="confirm" ${revealed||busy||!selectedValid(card)?'disabled':''}>${mode==='each'?'确认并揭晓':'保存本题'}</button><button type="button" id="next" ${index===cards.length-1?'disabled':''}>下一题</button></div></form><p class="error" id="answer-error" role="alert"></p>${mode==='batch'?`<div class="actions"><button class="primary" id="submit-batch" ${!allAnswered||busy||cards.every(c=>results[c.id])?'disabled':''}>整组提交并揭晓</button><span class="progress">已答 ${cards.filter(selectedValid).length} / ${cards.length}</span></div>`:''}</article><aside class="panel side"><h3>题目与来源</h3><p>原题定位：${e(card.source_locator)}</p><p>原题型与改编交互分别保留。正误反转或A/B重排可在原题对照中核查。</p><div class="question-list">${cards.map((c,i)=>`<button data-index="${i}" class="${i===index?'current':''} ${selectedValid(c)?'answered':''} ${results[c.id]?'revealed':''}" aria-label="第${i+1}题${results[c.id]?'，已揭晓':''}">${i+1}</button>`).join('')}</div><button type="button" data-source="${card.id}">查看原题与改编对照</button><div class="source" id="source-${card.id}"></div><details><summary>素材制作记录</summary><div id="prompt-${card.id}"></div><button type="button" data-prompt="${card.id}">读取本题提示词</button></details><p style="margin-top:20px">本页设置不修改学校学习设置，试答结果不写入演示数据库。</p></aside></div>`;
  }
  $('#root').innerHTML=intro+toolbar()+notice+body;bind(card,cards);
}
function bind(card,cards){
  $('#cohort').addEventListener('change',event=>{cohort=event.target.value;index=0;render();});
  $('#type-filter').addEventListener('change',event=>{type=event.target.value;index=0;render();});
  $('#feedback-mode').addEventListener('change',event=>{mode=event.target.value;selections={};results={};render();});
  $('#reset-preview').addEventListener('click',()=>{selections={};results={};index=0;render();});
  document.querySelectorAll('[data-index]').forEach(button=>button.addEventListener('click',()=>{index=Number(button.dataset.index);render();}));
  if(card){
    $('#prev')?.addEventListener('click',()=>{index--;render();});$('#next')?.addEventListener('click',()=>{index++;render();});
    document.querySelectorAll('[name=choice]').forEach(input=>input.addEventListener('change',()=>{
      selections[card.id]=card.interaction==='multi'?[...document.querySelectorAll('[name=choice]:checked')].map(el=>Number(el.value)):Number(input.value);
      document.querySelectorAll('.answer-tile').forEach(tile=>tile.classList.toggle('selected',tile.querySelector('input').checked));
      $('#confirm').disabled=!selectedValid(card);
      if($('#submit-batch'))$('#submit-batch').disabled=!cards.every(selectedValid);
      if($('.progress'))$('.progress').textContent=`已答 ${cards.filter(selectedValid).length} / ${cards.length}`;
      document.querySelector(`[data-index="${index}"]`)?.classList.toggle('answered',selectedValid(card));
    }));
    $('[name=response]')?.addEventListener('input',event=>{selections[card.id]=event.target.value;$('#confirm').disabled=!selectedValid(card);if($('#submit-batch'))$('#submit-batch').disabled=!cards.every(selectedValid);});
    $('#answer-form')?.addEventListener('submit',async event=>{event.preventDefault();if(mode==='batch'){if(index<cards.length-1)index++;render();return;}await submit([card],mode);});
    $('#submit-batch')?.addEventListener('click',()=>submit(cards,'batch'));
  }
  document.querySelectorAll('[data-source]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.source,container=$('#source-'+id);
    try{const r=await api('visual-pilot/'+id+'/source');container.innerHTML=`<h3>源题原文（教师研究）</h3><pre>${e(r.source.original_text)}</pre><p>源答案：${e(r.source.answer_raw)}</p>${r.source.parser_repair?`<p>解析修复：${e(r.source.parser_repair)}</p>`:''}<p>映射：${e(JSON.stringify(r.answer_mapping||{}))}</p>${(r.design_notes||[]).length?`<h3>制作说明（教师）</h3>${r.design_notes.map(n=>`<p>${e(n.text)}</p>`).join('')}`:''}<a href="${e(r.source.url)}" target="_blank" rel="noopener">来源页面</a>${r.basis.map(b=>`<p><a href="${e(b.url)}" target="_blank" rel="noopener">${e(b.title)}</a><br>${e(b.locator)}</p>`).join('')}`;}catch(error){container.textContent=error.message;}
  }));
  document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',async()=>{const target=$('#prompt-'+button.dataset.prompt);try{const r=await api('visual-pilot/'+button.dataset.prompt+'/prompt');target.innerHTML=`<p>${r.online?'在线制作':'预生成复用 / 程序渲染'}</p>${r.requests.map(x=>`<p>${e(x.tool)} · ${e(x.kind)}</p><pre class="source">${e(x.prompt)}</pre>`).join('')}`;}catch(error){target.textContent=error.message;}}));
  document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
    const source=button.parentElement.querySelector('.composite-image');
    if(source)$('#zoom-content').replaceChildren(source.cloneNode(true));
    else $('#zoom-content').innerHTML=`<img src="/${e(button.dataset.zoom)}" alt="情境放大图">`;
    $('#zoom-dialog').showModal();
  }));
}
async function submit(cards,submissionMode){
  busy=true;$('#answer-error').textContent='';
  try{const r=await api('visual-pilot/evaluate',{mode:submissionMode,ids:cards.map(c=>c.id),responses:cards.map(c=>({id:c.id,response:selections[c.id]}))});if(r.results)for(const result of r.results)results[result.id]=result;busy=false;render();}
  catch(error){busy=false;$('#answer-error').textContent=error.message;}
}
$('#zoom-close').addEventListener('click',()=>$('#zoom-dialog').close());
await start();
