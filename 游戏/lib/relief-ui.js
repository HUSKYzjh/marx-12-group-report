(function(root){
 'use strict';
 let timer=null,deskFocus=null,landedGroup=null,closeFuture=null;
 function el(tag,words,parent,cls){const n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function button(c,words,type,extra,cls){const b=el('button',words,c.controls,cls||'primary');b.type='button';b.onclick=function(){c.send(Object.assign({type:type},extra||{}));};return b;}
 root.renderReliefExperiment=function(c){
  return root.renderReliefReading(c);
 };
 root.cancelPrologueEnding=function(){if(timer!==null){clearTimeout(timer);timer=null;}if(closeFuture)closeFuture();};
 function showFuture(opener){
  if(closeFuture)closeFuture();
  const dialog=el('dialog','',document.body,'relief-explanation-dialog epilogue-future-dialog');dialog.dataset.testid='epilogue-future-dialog';dialog.setAttribute('aria-labelledby','epilogue-future-title');
  const top=el('div','',dialog,'relief-explanation-top'),heading=el('h2','后续真没有啦。实在做不完啦TAT',top);heading.id='epilogue-future-title';
  const close=el('button','×',top,'relief-explanation-close');close.type='button';close.setAttribute('aria-label','关闭提示');
  const body=el('div','',dialog,'relief-explanation-body'),message=el('p','可以关注我的',body),github=el('a','github',message);github.href=TRUST_ASSETS.author.profile;github.target='_blank';github.rel='noopener noreferrer';message.appendChild(document.createTextNode('：后续感兴趣可以继续提PR'));
  const author=el('a','',body,'epilogue-author');author.href=TRUST_ASSETS.author.profile;author.target='_blank';author.rel='noopener noreferrer';author.setAttribute('aria-label','HUSKYzjh 的 GitHub 主页');
  const avatar=el('img','',author);avatar.src=TRUST_ASSETS.author.avatar;avatar.alt='HUSKYzjh 的 GitHub 头像';avatar.width=avatar.height=56;el('span','HUSKYzjh ↗',author);
  const repository=el('a','开源仓库：feast-of-hunger ↗',body,'epilogue-repository');repository.setAttribute('aria-label','游戏开源仓库：feast-of-hunger ↗');repository.href=TRUST_ASSETS.author.repository;repository.target='_blank';repository.rel='noopener noreferrer';
  const back=el('button','好吧 TAT',dialog,'primary');back.type='button';let hostOverflow,disposed=false;
  try{hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(err){}
  function place(){if(disposed)return;let offset=0,available=innerHeight;try{if(frameElement){const rect=frameElement.getBoundingClientRect();offset=Math.max(0,-rect.top);available=Math.max(120,Math.min(innerHeight-offset,parent.innerHeight-Math.max(0,rect.top)));}}catch(err){}dialog.style.maxHeight=Math.max(96,available-24)+'px';dialog.style.top=offset+Math.max(12,(available-dialog.offsetHeight)/2)+'px';}
  function cleanup(){if(disposed)return;disposed=true;dialog.close();dialog.remove();try{if(hostOverflow!==undefined)parent.document.body.style.overflow=hostOverflow;parent.removeEventListener('scroll',place);parent.removeEventListener('resize',place);}catch(err){}window.removeEventListener('resize',place);if(closeFuture===cleanup)closeFuture=null;if(opener.isConnected)opener.focus({preventScroll:true});}
  closeFuture=cleanup;close.onclick=back.onclick=cleanup;dialog.addEventListener('cancel',function(e){e.preventDefault();cleanup();});dialog.addEventListener('click',function(e){const rect=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))cleanup();});
  dialog.showModal();close.focus({preventScroll:true});window.addEventListener('resize',place);try{parent.addEventListener('scroll',place,{passive:true});parent.addEventListener('resize',place);}catch(err){}place();requestAnimationFrame(place);
 }
 window.addEventListener('pagehide',root.cancelPrologueEnding);
 root.renderPrologueEnding=function(c){
  const p=c.state.prologue,beat=p.epilogueBeat;
  c.title('序章·尾声','');
  const scene=el('div','',c.readout,'prologue-epilogue');scene.dataset.beat=String(beat);
  const q=el('blockquote',c.state.epilogueQuote,scene,'epilogue-quote');el('cite',c.state.epilogueSource.title,q);
  const question=el('p','',scene,'epilogue-question');el('span','这就是结束了',question).hidden=beat<1;el('span','，吗？',question,'epilogue-doubt').hidden=beat<2;
  if(beat===3){const future=el('button','',c.controls,'primary epilogue-future-button');el('span','敬请期待后续章节，',future);el('span','或者现实...',future);future.type='button';future.setAttribute('aria-label','敬请期待后续章节，或者现实...');future.setAttribute('aria-haspopup','dialog');future.onclick=function(){showFuture(future);};}
  else{
   if(c.reduced)button(c,'下一句 →','EPILOGUE_NEXT',{expectedBeat:beat},'secondary');
   else timer=setTimeout(function(){timer=null;c.send({type:'EPILOGUE_NEXT',expectedBeat:beat});},c.state.epilogueDelays[beat]);
   button(c,'看完这一段','EPILOGUE_REVEAL',null,'secondary');
  }
  const source=el('details','',c.notes,'street-bounds');el('summary','引句与结局的边界',source);
  el('p','三张处方都可能增加订单，效果与代价取决于安排和后续条件，并非注定失败。这句诗表达情绪，不是历史必然终结的论证。',source);
  const a=el('a','核对原句 ↗',source);a.href=c.state.epilogueSource.url;a.target='_blank';a.rel='noreferrer';
 };
 root.renderPrologueAssumptions=function(c){
  c.title('如果换个条件？','');
  const s=c.state.prologue.assumptionDesk,wrap=el('div','',c.readout,'assumption-desk');wrap.dataset.revision=String(s.revision);wrap.dataset.selected=s.selected||'';
  function send(a,focus){deskFocus=focus;c.send({type:'ASSUMPTION_DESK',action:Object.assign({expectedRevision:s.revision},a)});}
  const speech=el(s.beat<3?'button':'p',c.state.assumptionDialogue[s.beat],wrap,'assumption-speech speech-bubble');speech.dataset.speaker=s.beat<3?'optimist':'questioner';speech.setAttribute('aria-live','polite');
  if(s.beat<3){speech.type='button';speech.dataset.deskSpeak='true';speech.setAttribute('aria-label','听听下一句话');el('span',' →',speech,'assumption-next');speech.onclick=function(){send({type:'SPEAK',expectedBeat:s.beat},'speech');};}else speech.tabIndex=-1;
  const debate=el('div','',wrap,'assumption-debate');
  function person(parent,happy){
   const b=TRUST_ASSETS.bakery;function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
   const p=el('span','',parent,'technology-peep');p.innerHTML=crop(b.body,b.bodyAtlas,'body0000')+crop(b.face,b.faceAtlas,happy?'face0006':'face0000');return p;
  }
  const optimist=el('div','',debate,'assumption-speaker');optimist.dataset.active=String(s.beat<3);person(optimist,true);el('small','“技术会解决！”',optimist);
  const desk=el('section','',debate,'assumption-table');desk.dataset.assumptionTarget='desk';
  const place=el('button',s.selected?'换个条件':'把条件放这里',desk,'assumption-destination');place.type='button';place.setAttribute('aria-label','放到实验桌');
  const chosen=el('div','',desk,'assumption-chosen');
  const questioner=el('div','',debate,'assumption-speaker');questioner.dataset.active=String(s.beat===3);person(questioner,false);el('small','“那就试试看。”',questioner);
  const tray=el('section','',wrap,'assumption-tray');tray.dataset.assumptionTarget='tray';
  const back=el('button','条件架 ↩',tray,'assumption-destination');back.type='button';back.setAttribute('aria-label','放回条件架');
  const rack=el('div','',tray,'assumption-rack'),pieces=[];
  const labels=Object.fromEntries(c.state.assumptions.map(function(item){return [item.id,item.label];}));
  const marks={needs:'<path d="M8 27v-8c0-7 24-8 24 0v8ZM10 28h20M15 14l-2 6m9-7-2 6M32 8q6-5 8 1q-1 5-8 7q-7-3-8-7q2-6 8-1"/>',labour:'<circle cx="13" cy="12" r="6"/><path d="M10 18L6 32h14l-3-14M27 25a10 10 0 1 0 20 0a10 10 0 1 0-20 0M37 19v7l5 2"/>',ownership:'<path d="M24 14a9 9 0 1 0-9 9l14 14 4-4-4-4 4-4-5-5ZM11 9l4 4"/>',boundaries:'<path d="M6 14l18 1-1 23-17-1ZM10 21h9m-9 5h8M30 10l13 1m-4-4 5 4-5 4M44 28H31m4-4-5 4 5 4"/>'};
  c.state.assumptions.forEach(function(item){
   if(s.selected===item.id){const vacancy=el('span','',rack,'assumption-vacancy');vacancy.setAttribute('aria-hidden','true');}
   const p=el('button','',s.selected===item.id?chosen:rack,'assumption-tag');p.type='button';p.dataset.assumptionPiece=item.id;
   const art=el('span','',p,'assumption-tag-art');art.innerHTML='<svg viewBox="0 0 50 45" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+marks[item.id]+'</svg>';
   el('span',labels[item.id],p);pieces.push({id:item.id,name:labels[item.id],node:p});
   if(s.selected===item.id&&landedGroup!==item.id)p.dataset.arrived='true';
  });landedGroup=s.selected;
  const prompt=s.selected?'选一条路，试试看。':'把一张条件放上桌：拖动或点选。';
  const hint=el('p',prompt,wrap,'assumption-hint');hint.setAttribute('role','status');
  GestureBoard.bind(wrap,{pieces:pieces,targets:[{id:'desk',node:desk,button:place},{id:'tray',node:tray,button:back}],hint:hint,prompt:prompt,placedMessage:'选一条路，试试看。',ghostClass:'assumption-ghost',onDrop:function(id,to){if(to==='tray'&&id!==s.selected){hint.textContent='这张条件已经在架上。';return;}const group=to==='desk'?id:null;if(group!==s.selected)send({type:'SELECT',group:group},id);else hint.textContent='条件已经在这里。';}});
  const list=el('div','',wrap,'prologue-assumptions');
  c.state.assumptions.forEach(function(item){
   const group=el('section','',list,'assumption-group');group.dataset.assumption=item.id;group.hidden=s.selected!==item.id;
   const premise=el('p','',group,'assumption-premise');el('small','刚才实验的条件',premise);el('span',item.title,premise);premise.setAttribute('aria-live','polite');
   const forks=el('div','',group,'assumption-forks');
   item.ifs.forEach(function(branch){
    const card=el('div','',forks,'assumption-if');card.dataset.if=branch.id;
    const play=button(Object.assign({},c,{controls:card}),'',['policy','prices'].includes(branch.id)?'OPEN_RULES':['concentration','sharing'].includes(branch.id)?'OPEN_OWNERSHIP':['space','services'].includes(branch.id)?'OPEN_NEEDS':'OPEN_TECHNOLOGY',{branch:branch.id},'assumption-fork');play.dataset.branch=branch.id;
    play.setAttribute('aria-label',branch.title+' →');play.setAttribute('aria-describedby','if-play-'+branch.id+' if-record-'+branch.id);el('span',branch.title,play,'assumption-fork-question');
    const preview=el('small',branch.play,play,'assumption-fork-play');preview.id='if-play-'+branch.id;
    const progress=c.state.assumptionProgress[branch.id];play.dataset.progress=progress.kind;
    const observed=c.state.assumptionObservations&&c.state.assumptionObservations[branch.id];
    // A completed trial supplies the visual preview. Keep the action description
    // available to assistive technology through its explicitly referenced ID.
    preview.hidden=!!observed;
    if(observed){
     const receipt=el('span','',play,'assumption-observation');receipt.id='if-observed-'+branch.id;receipt.dataset.branchObservation=branch.id;
     el('small','上次实际结果',receipt,'assumption-observation-label');
     el('small',observed.context,receipt,'assumption-observation-context');
     observed.facts.forEach(function(fact){const row=el('span','',receipt,'assumption-observation-fact');row.dataset.fact=fact.label;row.dataset.value=String(fact.value);el('span',fact.label,row);el('span',fact.value+fact.unit,row);});
     play.setAttribute('aria-describedby','if-play-'+branch.id+' '+receipt.id+' if-record-'+branch.id);
    }
    el('small',progress.label,play,'assumption-fork-progress').id='if-record-'+branch.id;
   });
   const why=el('details','',group,'assumption-connection');el('summary','这个条件改了什么？',why);el('p',item.scope,why);
   item.ifs.forEach(function(branch){el('p',branch.change+' '+branch.question,why);});
  });
  if(s.beat===3){const replay=el('button','再听听争论 ↺',wrap,'assumption-replay');replay.type='button';replay.onclick=function(){send({type:'REPLAY'},'speech');};}
  const model=el('details','',c.readout,'assumption-model');el('summary','这局为什么会积压？',model);
  const explanations=[];
  function explanation(title,cls){
   const entry=el('details','',model,cls);el('summary',title,entry);explanations.push(entry);
   entry.ontoggle=function(){if(entry.open)explanations.forEach(function(other){if(other!==entry)other.open=false;});};
   return entry;
  }
  const reasoning=c.state.assumptionReasoning;
  if(reasoning){
   ['relation','sale','feedback'].forEach(function(id){
    const item=reasoning[id],section=explanation(item.title,'assumption-reasoning');section.dataset.reasoning=id;
    const path=el('div','',section,'assumption-reasoning-path');path.setAttribute('role','group');path.setAttribute('aria-label',item.title);
    item.parts.forEach(function(words,i){if(i){const arrow=el('span',id==='relation'?'↔':'→',path,'assumption-reasoning-arrow');arrow.setAttribute('aria-hidden','true');}el('span',words,path,'assumption-reasoning-part');});
    if(id==='relation')el('p','资本主义社会基本矛盾：'+c.state.definition,section,'assumption-reasoning-definition');
    el('p',item.note,section,'assumption-reasoning-note');
    if(id==='relation'){
     el('p',reasoning.boundary,section,'assumption-reasoning-boundary');
     const source=el('p','定义与制度边界的原典：',section,'assumption-reasoning-source'),link=el('a',reasoning.source.title+' ↗',source);link.href=reasoning.source.url;link.target='_blank';link.rel='noreferrer';
    }
   });
  }
  const all=explanation('这局采用的八个假设','assumption-assumptions');
  el('p','实验适用条件，不是历史定律。',all,'small');
  root.ResearchReader.mount(all,'',{topics:[{title:'逐条核对假设',pages:c.state.modelAssumptions.map(function(words,i){return (i+1)+' / '+c.state.modelAssumptions.length+' · '+words;})}]});
  const parameters=explanation('参数、资金来源与经营规则','assumption-parameters');
  root.ResearchReader.mount(parameters,c.state.assumptionParameters);
  const note=el('p','教学情景，不是预测。',model,'small');note.dataset.testid='if-work-status';
  if(deskFocus){const focus=deskFocus==='speech'?speech:wrap.querySelector('[data-assumption-piece="'+deskFocus+'"]');deskFocus=null;if(focus)requestAnimationFrame(function(){if(focus.isConnected)focus.focus({preventScroll:true});});}
 };
})(window);
