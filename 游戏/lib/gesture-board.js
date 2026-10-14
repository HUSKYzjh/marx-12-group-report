/* Pointer-first manipulation, with tap-to-place and keyboard equivalents. */
(function(root){
 'use strict';
 let cleanup=null;
 root.GestureBoard={
  cancel:function(){if(cleanup){cleanup();cleanup=null;}},
  // A stroke selects several finite resources. Motion is view-only; release or
  // the keyboard Apply control commits once. Coalesced/fast motion must not skip cells.
  paint:function(wrap,config){
   const previousCleanup=cleanup,chosen=new Set();let armed=false,drag=null,suppressUntil=0,cancelledPointer=null;
   const cellAt=node=>config.cells.find(cell=>cell.node.contains(node));
   function preview(){
    config.trigger.setAttribute('aria-pressed',String(armed));config.apply.disabled=!chosen.size;
    config.cells.forEach(cell=>{cell.node.toggleAttribute('data-paint-selected',chosen.has(cell.id));cell.node.toggleAttribute('data-paint-ready',armed&&cell.eligible);});
    config.onPreview([...chosen],armed,!!(drag?.direct&&drag.moved));
   }
   function clear(){const active=drag;drag=null;if(active&&wrap.hasPointerCapture(active.id))wrap.releasePointerCapture(active.id);chosen.clear();armed=false;preview();}
   function cancel(){if(drag){cancelledPointer=drag.id;suppressUntil=performance.now()+350;}clear();}
   const combinedCleanup=()=>{previousCleanup?.();cancel();};
   function begin(){previousCleanup?.();chosen.clear();armed=true;cleanup=combinedCleanup;preview();}
   function toggle(cell){if(!cell.eligible)return;if(chosen.has(cell.id))chosen.delete(cell.id);else if(chosen.size<config.capacity)chosen.add(cell.id);preview();}
   // Return the entry point along a segment (or null), preserving stroke order.
   function entry(from,to,r){
    let low=0,high=1;
    for(const [start,delta,min,max] of [[from.x,to.x-from.x,r.left,r.right],[from.y,to.y-from.y,r.top,r.bottom]]){
     if(delta===0){if(start<min||start>max)return null;continue;}
     const a=(min-start)/delta,b=(max-start)/delta;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));if(low>high)return null;
    }
    return low;
   }
   function stroke(from,to){
    config.cells.filter(cell=>cell.eligible&&cell.node.getClientRects().length).map(cell=>({cell,at:entry(from,to,cell.node.getBoundingClientRect())})).filter(hit=>hit.at!==null).sort((a,b)=>a.at-b.at).forEach(({cell})=>{if(chosen.size<config.capacity)chosen.add(cell.id);});preview();
   }
   function commit(){const ids=[...chosen];clear();if(ids.length)config.onCommit(ids);}
   wrap.addEventListener('pointerdown',function(e){
    if(e.button!==0)return;cancelledPointer=null;if(config.trigger.disabled)return;const source=config.trigger.contains(e.target),cell=cellAt(e.target);
    if(!source&&(!armed||!cell))return;
    e.preventDefault();e.stopImmediatePropagation();drag={id:e.pointerId,start:{x:e.clientX,y:e.clientY},last:{x:e.clientX,y:e.clientY},source,cell,moved:false,direct:source&&!armed};
    wrap.setPointerCapture(e.pointerId);(source?config.trigger:cell.node.querySelector('button'))?.focus({preventScroll:true});
   },true);
   wrap.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    if(!drag.moved&&Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)<=7)return;
    if(!drag.moved){drag.moved=true;if(!armed)begin();}
    const events=e.getCoalescedEvents?.()||[];
    for(const event of events.length?events:[e]){const to={x:event.clientX,y:event.clientY};stroke(drag.last,to);drag.last=to;}
   },true);
   wrap.addEventListener('pointerup',function(e){
    if(cancelledPointer===e.pointerId){cancelledPointer=null;suppressUntil=performance.now()+350;e.preventDefault();e.stopImmediatePropagation();return;}
    if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
    const current=drag;drag=null;suppressUntil=performance.now()+350;
    if(wrap.hasPointerCapture(e.pointerId))wrap.releasePointerCapture(e.pointerId);
    if(current.moved){stroke(current.last,{x:e.clientX,y:e.clientY});commit();}
    else if(current.source){if(armed)cancel();else begin();}
    else toggle(current.cell);
   },true);
   wrap.addEventListener('pointercancel',function(e){if(drag?.id===e.pointerId){e.stopImmediatePropagation();cancel();}},true);
   wrap.addEventListener('lostpointercapture',function(e){if(drag?.id===e.pointerId)cancel();},true);
   wrap.addEventListener('click',function(e){
    const source=config.trigger.contains(e.target),cell=cellAt(e.target);
    if((source||cell)&&e.detail>0&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
    if(!source&&(!armed||!cell))return;e.preventDefault();e.stopImmediatePropagation();
    if(source){if(!config.trigger.disabled){if(armed)cancel();else begin();}}else toggle(cell);
   },true);
   wrap.addEventListener('keydown',function(e){if(e.key==='Escape'&&(armed||drag)){e.preventDefault();e.stopImmediatePropagation();cancel();config.trigger.focus({preventScroll:true});}},true);
   config.apply.onclick=commit;config.cancel.onclick=()=>{cancel();config.trigger.focus({preventScroll:true});};
   preview();cleanup=combinedCleanup;return {cancel:cancel,refresh:preview};
  },
  // Bind existing art and spatial targets, rather than imposing a tray layout.
  // Acceptance is checked for pointer, tap and keyboard equally.
  bind:function(wrap,config){
   const pieces=config.pieces,targets=config.targets,hint=config.hint;
   let held=null,drag=null,ghost=null,suppressed=null;
   function clearDrag(){const ended=drag&&drag.moved?drag.piece.id:null;if(ghost)ghost.remove();ghost=null;drag=null;targets.forEach(t=>t.node.removeAttribute('data-hover'));if(ended!==null&&config.onDragEnd)config.onDragEnd(ended);}
   function clearHeld(){held=null;pieces.forEach(p=>p.node.setAttribute('aria-pressed','false'));}
   function cancelBinding(){clearDrag();clearHeld();}
   function activateBinding(){if(cleanup!==cancelBinding){if(cleanup)cleanup();cleanup=cancelBinding;}}
   function accepts(target,piece){return !!piece&&(!target.accepts||target.accepts(piece.id));}
   function arm(piece){activateBinding();clearHeld();held=piece;piece.node.setAttribute('aria-pressed','true');hint.textContent=piece.name+' → 放到哪里？';if(config.onPickup)config.onPickup(piece.id);}
   function dualTarget(piece){return held&&held.id!==piece.id?targets.find(t=>t.button===piece.node&&accepts(t,held)):null;}
   function hitAt(x,y){const under=document.elementFromPoint(x,y);return targets.filter(t=>under&&t.node.contains(under)).reduce((best,t)=>!best||best.node.contains(t.node)?t:best,null);}
   function place(target){
    if(!accepts(target,held)){hint.textContent=config.rejectMessage?config.rejectMessage(held&&held.id,target.id):'这里放不下，试试另一处。';return;}
    const id=held.id;clearDrag();clearHeld();hint.textContent=config.placedMessage||'草稿已改，营业后才结算。';config.onDrop(id,target.id);
   }
   targets.forEach(function(t){t.button.onclick=function(){if(held)place(t);else{hint.textContent=config.prompt;if(config.onInspect)config.onInspect(t.id);}};});
   pieces.forEach(function(piece){
    const packet=piece.node;packet.setAttribute('aria-pressed','false');packet.setAttribute('aria-label','拿起'+piece.name);packet.ondragstart=function(e){e.preventDefault();};
    packet.onclick=function(){if(suppressed===packet){suppressed=null;return;}const t=dualTarget(piece);if(t)place(t);else arm(piece);};
    packet.onpointerdown=function(e){if(e.button!==0)return;activateBinding();clearDrag();drag={id:e.pointerId,x:e.clientX,y:e.clientY,piece:piece,moved:false};packet.setPointerCapture(e.pointerId);};
    packet.onpointermove=function(e){
     if(!drag||drag.id!==e.pointerId)return;
     if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.moved=true;arm(piece);ghost=packet.cloneNode(true);ghost.className='piece-ghost '+(config.ghostClass||'calendar-ghost');ghost.removeAttribute('id');ghost.removeAttribute('data-calendar-piece');ghost.removeAttribute('data-freight-piece');ghost.removeAttribute('data-care-piece');ghost.removeAttribute('data-network-piece');ghost.removeAttribute('data-council-piece');ghost.removeAttribute('data-demand-piece');ghost.removeAttribute('data-preservation-piece');ghost.removeAttribute('data-preservation-probe-piece');ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);}
     if(!drag.moved)return;e.preventDefault();ghost.removeAttribute('data-assumption-piece');ghost.removeAttribute('data-automation-next-piece');ghost.removeAttribute('data-calendar-next-piece');ghost.removeAttribute('data-network-next-piece');ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
     const hit=hitAt(e.clientX,e.clientY);targets.forEach(t=>t.node.toggleAttribute('data-hover',t===hit&&accepts(t,held)));
     // Optional physical feedback only. Pickup and motion never commit state.
     if(config.onDragMove)config.onDragMove(piece.id,{x:e.clientX,y:e.clientY,target:hit&&accepts(hit,held)?hit.id:null});
    };
    packet.onpointerup=function(e){
     if(!drag||drag.id!==e.pointerId)return;
     const moved=drag.moved,hit=hitAt(e.clientX,e.clientY);clearDrag();
    if(moved){suppressed=packet;e.preventDefault();if(hit&&accepts(hit,held))place(hit);else{const rejected=held&&held.id;clearHeld();hint.textContent=hit&&config.rejectMessage?config.rejectMessage(rejected,hit.id):'没放进位置，回到原处。';}}else{const t=dualTarget(piece);if(t){suppressed=packet;place(t);}else arm(piece);}
    };
    packet.onpointercancel=function(){clearDrag();clearHeld();hint.textContent=config.prompt;};
   });
   wrap.onkeydown=function(e){if(e.key==='Escape'){if(drag&&drag.moved)suppressed=drag.piece.node;clearDrag();clearHeld();hint.textContent=config.prompt;}};
   cleanup=cancelBinding;return wrap;
  },
  // Persistent pieces move between actual regions. The caller owns their
  // model state; a hover or pickup never changes an allocation or pays money.
  mountPieces:function(parent,config){
   const wrap=document.createElement('div');wrap.className='piece-board';parent.appendChild(wrap);
   const hint=document.createElement('p');hint.className='piece-hint';hint.textContent=config.prompt;hint.setAttribute('role','status');wrap.appendChild(hint);
   const zones=document.createElement('div');zones.className='piece-zones';wrap.appendChild(zones);
   const targets=[],pieces=[];let held=null,drag=null,ghost=null,suppressClick=null;
   function clearDrag(){if(ghost)ghost.remove();ghost=null;drag=null;targets.forEach(t=>t.removeAttribute('data-hover'));}
   function clearHeld(){held=null;pieces.forEach(p=>p.setAttribute('aria-pressed','false'));}
   function cancelBinding(){clearDrag();clearHeld();}
   function activateBinding(){if(cleanup!==cancelBinding){if(cleanup)cleanup();cleanup=cancelBinding;}}
   function arm(piece){activateBinding();clearHeld();held=piece;piece.setAttribute('aria-pressed','true');hint.textContent=piece.dataset.pieceName+' → 选个安排。';}
   function place(target){
    if(!held)return;const id=held.dataset.piece;clearDrag();clearHeld();hint.textContent='已排好；营业后才结算。';config.onDrop(id,target);
   }
   config.targets.forEach(function(target){
    const zone=document.createElement('section');zone.className='piece-zone';zone.dataset.pieceTarget=target.id;
    const heading=document.createElement('button');heading.type='button';heading.className='piece-destination';heading.textContent=target.label;heading.setAttribute('aria-label','放到'+target.label);
    heading.onclick=function(){if(held)place(target.id);else {hint.textContent='先拿起一个小人，再选安排。';}};
    zone.appendChild(heading);const note=document.createElement('span');note.className='piece-terms';note.textContent=target.hint||'';zone.appendChild(note);
    if(root.StreetArt)root.StreetArt.decorateMoney(note);
    const content=document.createElement('div');content.className='piece-content';zone.appendChild(content);zone._content=content;
    const empty=document.createElement('span');empty.className='piece-empty';empty.textContent='＋';empty.setAttribute('aria-hidden','true');content.appendChild(empty);
    zones.appendChild(zone);targets.push(zone);
   });
   config.pieces.forEach(function(piece){
    const packet=document.createElement('button');packet.type='button';packet.className='piece-person';packet.dataset.piece=String(piece.id);packet.dataset.pieceName=piece.name;
    packet.setAttribute('aria-label','拿起'+piece.name);packet.setAttribute('aria-pressed','false');packet.innerHTML=piece.html||'';
    const label=document.createElement('span');label.textContent=piece.name;packet.appendChild(label);
    const zone=targets.find(t=>t.dataset.pieceTarget===piece.target);if(!zone)return;
    zone._content.appendChild(packet);zone.setAttribute('data-occupied','true');pieces.push(packet);
    packet.onclick=function(){if(suppressClick===packet){suppressClick=null;return;}arm(packet);};
    packet.onpointerdown=function(e){if(e.button!==0)return;activateBinding();clearDrag();drag={id:e.pointerId,x:e.clientX,y:e.clientY,piece:packet,moved:false};packet.setPointerCapture(e.pointerId);};
    packet.onpointermove=function(e){
     if(!drag||drag.id!==e.pointerId)return;
     if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){drag.moved=true;arm(packet);ghost=packet.cloneNode(true);ghost.removeAttribute('data-piece');ghost.removeAttribute('aria-label');ghost.className='piece-ghost';ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);}
     if(!drag.moved)return;e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
     const under=document.elementFromPoint(e.clientX,e.clientY),hit=under&&under.closest('[data-piece-target]');targets.forEach(t=>t.toggleAttribute('data-hover',t===hit));
    };
    packet.onpointerup=function(e){
     if(!drag||drag.id!==e.pointerId)return;
     const moved=drag.moved,under=document.elementFromPoint(e.clientX,e.clientY),hit=under&&under.closest('[data-piece-target]');clearDrag();
     if(moved&&hit&&targets.includes(hit)){suppressClick=packet;e.preventDefault();place(hit.dataset.pieceTarget);}else if(moved){suppressClick=packet;clearHeld();hint.textContent='没放进安排，回到原处。';}else arm(packet);
    };
    packet.onpointercancel=function(){clearDrag();clearHeld();hint.textContent=config.prompt;};
   });
   wrap.onkeydown=function(e){if(e.key==='Escape'){const focus=held;if(drag&&drag.moved)suppressClick=drag.piece;clearDrag();clearHeld();hint.textContent=config.prompt;if(focus)focus.focus();}};
   cleanup=cancelBinding;return wrap;
  },
  mount:function(parent,config){
   const wrap=document.createElement('div');wrap.className='gesture-board';parent.appendChild(wrap);
   const hint=document.createElement('p');hint.className='gesture-hint';hint.textContent=config.prompt;hint.setAttribute('role','status');wrap.appendChild(hint);
   const packet=document.createElement('button');packet.type='button';packet.className='gesture-packet';packet.dataset.gesturePacket='true';packet.setAttribute('aria-label','拿起'+config.packet.name);
   packet.innerHTML=config.packet.html||'';const caption=document.createElement('span');caption.textContent=config.packet.name;packet.appendChild(caption);wrap.appendChild(packet);
   if(root.StreetArt)root.StreetArt.decorateMoney(packet);
   const zones=document.createElement('div');zones.className='gesture-zones';wrap.appendChild(zones);
   let held=false,drag=null,ghost=null,suppressClick=false;const targets=[];
   function clear(){if(ghost)ghost.remove();ghost=null;drag=null;targets.forEach(function(t){t.removeAttribute('data-hover');});}
   function arm(){held=true;packet.setAttribute('aria-pressed','true');hint.textContent='点一个安排放下 · 键盘用 Tab、回车';}
   function commit(id){clear();held=false;packet.setAttribute('aria-pressed','false');hint.textContent='已放好。';config.onDrop(id);}
   config.targets.forEach(function(target){
    const zone=document.createElement('button');zone.type='button';zone.className='gesture-zone';zone.dataset.gestureTarget=target.id;
    zone.setAttribute('aria-label','放到'+target.label);if(config.selected===target.id)zone.setAttribute('data-selected','true');
    if(target.html){const art=document.createElement('span');art.innerHTML=target.html;art.className='gesture-zone-art';zone.appendChild(art);}
    const label=document.createElement('span');label.textContent=target.label;zone.appendChild(label);
    if(target.hint){const note=document.createElement('small');note.textContent=target.hint;zone.appendChild(note);}
    zone.onclick=function(){if(held)commit(target.id);else {hint.textContent='先拿起上面的'+config.packet.name+'，再放到这里。';packet.focus();}};
    zones.appendChild(zone);targets.push(zone);
   });
   packet.onclick=function(){if(suppressClick){suppressClick=false;return;}if(!drag)arm();};
   packet.onpointerdown=function(e){
    if(e.button!==0)return;clear();drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
    packet.setPointerCapture(e.pointerId);
   };
   packet.onpointermove=function(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){
     drag.moved=true;held=true;ghost=packet.cloneNode(true);ghost.removeAttribute('data-gesture-packet');ghost.removeAttribute('aria-label');ghost.setAttribute('aria-hidden','true');ghost.className='gesture-ghost';document.body.appendChild(ghost);
     packet.setAttribute('aria-pressed','true');hint.textContent='把它放进想试的位置。';
    }
    if(!drag.moved)return;e.preventDefault();ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    const under=document.elementFromPoint(e.clientX,e.clientY),hit=under&&under.closest('[data-gesture-target]');
    targets.forEach(function(t){t.toggleAttribute('data-hover',t===hit);});
   };
   packet.onpointerup=function(e){
    if(!drag||drag.id!==e.pointerId)return;
    const moved=drag.moved,under=document.elementFromPoint(e.clientX,e.clientY),hit=under&&under.closest('[data-gesture-target]');
    clear();if(moved&&hit&&targets.includes(hit)){suppressClick=true;e.preventDefault();commit(hit.dataset.gestureTarget);}else arm();
   };
   packet.onpointercancel=function(){clear();held=false;packet.setAttribute('aria-pressed','false');hint.textContent=config.prompt;};
   wrap.onkeydown=function(e){if(e.key==='Escape'){clear();held=false;packet.setAttribute('aria-pressed','false');hint.textContent=config.prompt;packet.focus();}};
   cleanup=clear;
   return wrap;
  }
 };
})(window);
