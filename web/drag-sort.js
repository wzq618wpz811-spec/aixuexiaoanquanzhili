// Shared pointer + keyboard sorting. No grading or answer data in this component.
(()=>{
 let drag=null;
 function items(list){return [...list.querySelectorAll('[data-sort-value]')];}
 function finish(){if(!drag)return;const {list,item,pointerId,handle}=drag;item.classList.remove('is-dragging');try{handle.releasePointerCapture(pointerId);}catch{}drag=null;list.dispatchEvent(new CustomEvent('sequencechange',{bubbles:true,detail:{order:items(list).map(x=>Number(x.dataset.sortValue)),value:Number(item.dataset.sortValue)}}));}
 document.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-drag-handle]');if(!handle||handle.disabled)return;
  const item=handle.closest('[data-sort-value]'),list=handle.closest('[data-drag-list]');if(!item||!list)return;
  e.preventDefault();drag={item,list,handle,pointerId:e.pointerId};handle.setPointerCapture(e.pointerId);item.classList.add('is-dragging');
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const {item,list}=drag;const others=items(list).filter(x=>x!==item);
  const before=others.find(x=>e.clientY<x.getBoundingClientRect().top+x.getBoundingClientRect().height/2);
  list.insertBefore(item,before||null);
  if(e.clientY<70)window.scrollBy(0,-12);else if(e.clientY>innerHeight-70)window.scrollBy(0,12);
 },{passive:false});
 document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
 document.addEventListener('keydown',e=>{
  const handle=e.target.closest('[data-drag-handle]');if(!handle||handle.disabled||!['ArrowUp','ArrowDown'].includes(e.key))return;
  const item=handle.closest('[data-sort-value]'),list=handle.closest('[data-drag-list]'),siblings=items(list),index=siblings.indexOf(item),target=index+(e.key==='ArrowUp'?-1:1);if(target<0||target>=siblings.length)return;
  e.preventDefault();if(target<index)list.insertBefore(item,siblings[target]);else list.insertBefore(siblings[target],item);
  const value=Number(item.dataset.sortValue);list.dispatchEvent(new CustomEvent('sequencechange',{bubbles:true,detail:{order:items(list).map(x=>Number(x.dataset.sortValue)),value}}));
  document.querySelector('[data-sort-value="'+value+'"] [data-drag-handle]')?.focus();
 });
})();
