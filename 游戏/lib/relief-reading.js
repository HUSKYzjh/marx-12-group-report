/* The fourth act explains three responses; reading never runs an experiment. */
(function(root){
 'use strict';
 var closeCurrent=null;
 var content=RELIEF_READING; /* Content and archival captions share one source. */
 function el(tag,text,parent,cls){var n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);return n;}
 root.closeReliefReading=function(){if(closeCurrent)closeCurrent();};
 function openExplanation(id,opener,index){
  if(closeCurrent)closeCurrent(false);index=index||0;var item=content[id],page=item.pages[index],dialog=document.createElement('dialog');dialog.className='relief-explanation-dialog';dialog.dataset.reliefExplanation=id;dialog.dataset.step=index;dialog.setAttribute('aria-labelledby','relief-explanation-title');
  var top=el('div','',dialog,'relief-explanation-top'),context=el('div','',top,'relief-explanation-context'),heading=el('h2',item.title,context);heading.id='relief-explanation-title';
  var progress=el('span',(index+1)+' / '+item.pages.length,context,'relief-explanation-progress');progress.setAttribute('aria-label','第'+(index+1)+'页，共'+item.pages.length+'页');
  var close=el('button','×',top,'relief-explanation-close');close.type='button';close.setAttribute('aria-label','关闭解释');
  var body=el('div','',dialog,'relief-explanation-body');
  var figure=el('figure','',body,'relief-history-figure'),photo=el('img','',figure,'relief-history-photo');photo.src=TRUST_ASSETS.history[page.photo];photo.alt=page.caption;photo.dataset.photo=page.photo;
  var caption=el('figcaption',page.caption,figure),source=el('a','档案来源 ↗',caption);source.href='https://www.loc.gov/item/'+page.catalog+'/';source.target='_blank';source.rel='noopener noreferrer';
  el('h3',page.headline,body);el('p',page.text,body);
  var navigation=el('div','',dialog,'relief-explanation-navigation'),previous=el('button','← 上一步',navigation,'relief-explanation-previous'),next=el('button',index===item.pages.length-1?'返回三张药方':'下一步 →',navigation,'primary');previous.type=next.type='button';previous.disabled=index===0;
  var hostOverflow,disposed=false;document.body.appendChild(dialog);
  try{hostOverflow=parent.document.body.style.overflow;parent.document.body.style.overflow='hidden';}catch(err){}
  function place(){if(disposed)return;var offset=0,available=innerHeight;try{if(frameElement){var rect=frameElement.getBoundingClientRect();offset=Math.max(0,-rect.top);available=Math.max(120,Math.min(innerHeight-offset,parent.innerHeight-Math.max(0,rect.top)));}}catch(err){}dialog.style.maxHeight=Math.max(96,available-24)+'px';var imageHeight=Math.min(300,available*.42);photo.style.height=imageHeight+'px';var overflow=body.scrollHeight-body.clientHeight;if(overflow>0)photo.style.height=Math.max(80,imageHeight-overflow-2)+'px';dialog.style.top=offset+Math.max(12,(available-dialog.offsetHeight)/2)+'px';}
  function cleanup(restoreFocus){if(disposed)return;disposed=true;dialog.close();dialog.remove();try{if(hostOverflow!==undefined)parent.document.body.style.overflow=hostOverflow;parent.removeEventListener('scroll',place);parent.removeEventListener('resize',place);}catch(err){}window.removeEventListener('resize',place);if(closeCurrent===cleanup)closeCurrent=null;if(restoreFocus!==false&&opener&&opener.isConnected)opener.focus({preventScroll:true});}
  closeCurrent=cleanup;close.onclick=function(){cleanup();};previous.onclick=function(){openExplanation(id,opener,index-1);};next.onclick=function(){if(index===item.pages.length-1)cleanup();else openExplanation(id,opener,index+1);};dialog.addEventListener('cancel',function(e){e.preventDefault();cleanup();});photo.onload=place;
  dialog.addEventListener('click',function(e){var rect=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))cleanup();});
  dialog.showModal();close.focus({preventScroll:true});window.addEventListener('resize',place);try{parent.addEventListener('scroll',place,{passive:true});parent.addEventListener('resize',place);}catch(err){}place();requestAnimationFrame(place);
 }
 root.renderReliefReading=function(c){
  root.closeReliefReading();c.title('第四幕·资产阶级精英开出的药方','');
  var encounter=el('div','',c.readout,'remedy-encounter'),shelf=el('span','',encounter,'remedy-encounter-shelf');shelf.setAttribute('aria-hidden','true');
  ['bread','clothes','ovens','bread'].forEach(function(id){el('span','',shelf).innerHTML=StreetArt.icon(id);});el('p','如果又剩货了，听谁的？',encounter);
  var menu=el('div','',c.readout,'remedy-menu');menu.dataset.testid='relief-reading-menu';
  Object.keys(content).forEach(function(id){var item=content[id],card=el('button','',menu,'remedy-card');card.type='button';card.dataset.route=id;card.setAttribute('aria-label',item.title+'：查看解释');card.setAttribute('aria-haspopup','dialog');card.onclick=function(){openExplanation(id,card);};
   el('span',item.title,card,'remedy-card-title');el('span',item.promise,card,'remedy-card-promise');var art=el('span','',card,'remedy-card-art');art.setAttribute('aria-hidden','true');root.renderRemedyAdviser(art,id);el('span','查看解释 →',card,'remedy-card-progress');
  });
  var next=el('button','继续故事 →',c.controls,'primary');next.type='button';next.onclick=function(){c.send({type:'FINISH_RELIEF_READING'});};
 };
 window.addEventListener('pagehide',root.closeReliefReading);
})(window);
