(function(root){
 'use strict';
 let mount,frame,context;
 root.renderBattleAct=function(c){
  context=c;mount=document.getElementById('battle-mount');mount.hidden=false;
  if(frame)return;
  frame=document.createElement('iframe');frame.id='prologue-battle';frame.title='第二幕：面包店对决';
  frame.style.cssText='width:100%;height:900px;border:0;display:block';
  const saved=JSON.stringify(c.snapshot||null).replace(/</g,'\\u003c');
  frame.srcdoc=BATTLE_DOCUMENT.replace('/*BATTLE_SNAPSHOT*/null',function(){return saved;});
  mount.appendChild(frame);
 };
 root.closeBattleAct=function(){
  if(frame){frame.remove();frame=null;}
  if(mount)mount.hidden=true;context=null;
 };
 window.addEventListener('message',function(event){
  if(!frame||event.source!==frame.contentWindow||!context||event.data?.app!=='feast-battle')return;
  const data=event.data;
  if(data.type==='save')context.send({type:'SAVE_BATTLE',snapshot:data.snapshot});
  if(data.type==='complete')context.send({type:'FINISH_BATTLE'});
  if(data.type==='sandbox')context.send({type:'OPEN_STREET_SANDBOX'});
  if(data.type==='height'&&Number.isFinite(data.height)){
   const height=Math.max(400,Math.min(6000,data.height));
   if(frame.style.height!==height+'px'){frame.style.height=height+'px';context.height();}
  }
  if(data.type==='error'){mount.setAttribute('aria-label','对战暂时加载失败，可以刷新重试；第一幕记录不变。');}
 });
})(window);
