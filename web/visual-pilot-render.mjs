export const escapeText = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function visualMarkup(card){
  const v=card.visual;
  if(v.kind==='image'){
    const img=`<img src="/${escapeText(v.image)}" alt="${escapeText(v.alt)}" width="1536" height="1024">`;
    const f=v.focus;
    const frame=f?`<div class="image-crop" style="aspect-ratio:${f[2]*1536}/${f[3]*1024};--image-width:${100/f[2]}%;--image-left:${-100*f[0]/f[2]}%;--image-top:${-100*f[1]/f[3]}%">${img}</div>`:img;
    return `<figure class="pilot-image ${f?'focused-image':''}">${frame}<button type="button" data-zoom="${escapeText(v.image)}">放大观察</button></figure>`;
  }
  if(v.kind==='paired')return '';
  throw new Error('此题缺少可展示的生图素材');
}
export function pairedImageMarkup(card,index){
  const v=card.visual;
  if(index===0||!v.composite)return `<img src="/${escapeText(v.images[index])}" alt="${escapeText(v.alts[index])}" width="1536" height="1024">`;
  const points=v.composite.region_polygon.map(([x,y])=>`${x*1536},${y*1024}`).join(' '),id='scene-clip-'+card.id+'-'+index;
  return `<svg class="composite-image" viewBox="0 0 1536 1024" role="img" aria-label="${escapeText(v.alts[index])}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><polygon points="${points}"/></clipPath></defs><image href="/${escapeText(v.composite.base_image)}" width="1536" height="1024"/><image href="/${escapeText(v.images[index])}" width="1536" height="1024" clip-path="url(#${id})"/></svg>`;
}
export function answerMarkup(card,selection,disabled=false){
  const d=disabled?'disabled':'';
  if(card.interaction==='fill')return `<label class="open-answer">填写答案<input name="response" type="text" maxlength="3000" autocomplete="off" value="${escapeText(selection||'')}" ${d}></label>`;
  if(card.interaction==='short')return `<label class="open-answer">用自己的话回答<textarea name="response" rows="5" maxlength="3000" ${d}>${escapeText(selection||'')}</textarea></label>`;
  return `<fieldset class="answer-options ${card.visual.kind==='paired'?'image-options':''}"><legend>${card.interaction==='multi'?'请选择所有符合项':'请选择一项'}</legend>${card.options.map((o,i)=>{
    const selected=card.interaction==='multi'?selection?.includes(i):selection===i;
    const image=card.visual.kind==='paired'?`${pairedImageMarkup(card,i)}<button type="button" data-zoom="${escapeText(card.visual.images[i])}" data-zoom-option="${i}" aria-label="放大选项${String.fromCharCode(65+i)}">放大</button>`:'';
    return `<div class="answer-tile ${selected?'selected':''}">${image}<label><input type="${card.interaction==='multi'?'checkbox':'radio'}" name="choice" value="${i}" ${selected?'checked':''} ${d}><span>${String.fromCharCode(65+i)} · ${escapeText(o)}</span></label></div>`;
  }).join('')}</fieldset>`;
}
