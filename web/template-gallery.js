const C=window.TEMPLATE_CATALOG;let filter='all',order=[2,0,1];const e=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const box=t=>`<div class="box">${t}</div>`,options=t=>`<div class="choice-row">${t.map(x=>`<span>${x}</span>`).join('')}</div>`;
const scene=spots=>`<div class="scene">场景与关键物件${spots?'<span class="spot" style="left:18%;top:20%">1</span><span class="spot" style="left:70%;top:55%">2</span>':''}</div>`;
function wire(t){switch(t.id){
case 'T01':return scene(false)+options(['正确','错误']);
case 'T02':return '<div class="pair">'+box('同场景 · 行为 A')+box('同场景 · 行为 B')+'</div>'+options(['A','B']);
case 'T03':return '<div class="pair">'+box('规范部件 / 标识')+box('规范部件 / 标识')+'</div>'+options(['名称甲','名称乙']);
case 'T04':return scene(true)+options(['区域 1','区域 2','区域 3']);
case 'T05':return box('具体任务与例外条件')+'<div class="board"><div class="label-row">□ 核查条件 A</div><div class="label-row">□ 核查条件 B</div><div class="label-row">□ 核查条件 C</div></div>';
case 'T06':return '<div class="pair">'+box('设备与部件图')+'<div class="board"><div class="label-row"><b>型号</b><span>明确型号</span></div><div class="label-row"><b>额定值</b><span>数值＋单位</span></div><div class="label-row"><b>状态</b><span>已给条件</span></div></div></div>'+options(['符合','不符合','信息不足']);
case 'T07':return box('容器 / 门牌 / 记录载体')+'<div class="board"><div class="label-row">主体 → 可读信息</div><div class="label-row">日期 → 可读信息</div><div class="label-row">依据 → 可读信息</div></div>';
case 'T08':return options(['带标签对象 A','带标签对象 B'])+'<div class="pair">'+box('区域甲')+box('区域乙')+'</div>';
case 'T09':return '<div class="chat">对方身份声明与请求</div><div class="chat">消息来源与域名线索</div><div class="chat right">选择下一行动</div>'+options(['核实','继续','报告']);
case 'T10':return box('当前场景＋决定性条件')+options(['行动 A','行动 B'])+box('条件改变后，再作判断');
case 'T11':return scene(false)+'<div class="pair">'+box('证据 1')+box('证据 2')+'</div>'+options(['因素 A','因素 B','因素 C']);
case 'T12':return '<div class="scene"><span style="position:absolute;left:10%;top:65%">当前位置</span><span style="font-size:40px">↗</span><span style="position:absolute;right:8%;top:12%">已核验出口</span></div>'+options(['路线 A','路线 B']);
case 'T13':return '<div class="order-list" data-drag-list>'+order.map((v,i)=>`<div class="order-item" data-sort-value="${v}"><span>${i+1} · 中性占位步骤${['甲','乙','丙'][v]}</span><button data-drag-handle aria-label="拖动步骤${['甲','乙','丙'][v]}，支持上下方向键">⠿</button></div>`).join('')+'</div><span class="sr-status" aria-live="polite">仅检验拖动手势，不是安全操作答案</span>';
case 'T14':return '<div class="pair">'+box('角色 / 资格')+box('任务 / 权限')+'</div>'+options(['关系 A','关系 B'])+box('现行制度依据');
}}
function render(){document.querySelector('#grid').innerHTML=C.templates.filter(t=>filter==='all'||t.priority===filter).map(t=>`<article class="template" id="${t.id}"><div class="template-head"><b>${t.id}</b><h2>${e(t.name)}</h2><span>${e(t.priority)}</span></div><div class="wireframe">${wire(t)}</div><p>${e(t.example_design)}</p><div>${t.source_forms.map(x=>`<span class="tag">${e(x)}</span>`).join('')}</div>${t.priority==='条件启用'?'<div class="gate">未核验真实步骤依据，不进入正式题库</div>':''}<details><summary>必填信息与检查</summary><p style="margin-top:10px">${t.required_slots.map(e).join(' · ')}</p><ul>${t.qa_checks.map(x=>`<li>${e(x)}</li>`).join('')}</ul><span>原题定位：${t.evidence_refs.map(e).join(' / ')}</span></details></article>`).join('');}
document.querySelector('#filters').addEventListener('click',ev=>{const b=ev.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('#filters button').forEach(x=>x.classList.toggle('active',x===b));render();});
document.addEventListener('sequencechange',ev=>{order=ev.detail.order;render();});render();
