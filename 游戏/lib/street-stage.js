/* A persistent street. Original WBWWB people, authored shop drawings.
 * Every moving coin/product is sampled from a committed ledger, never income.
 */
(function(root){
 'use strict';
 root.StreetScene=function(textures,dom){
  var self=this;self.graphics=new PIXI.Container();self.graphics.visible=false;
  self.overlay=document.createElement('div');self.overlay.className='street-hotspots';self.overlay.hidden=true;dom.appendChild(self.overlay);
  self.time=8;self.duration=8;self.playing=false;self.speed=2;self.serial=null;self.game=null;self.width=960;self.reduced=false;self.selected=null;self.trace=false;
  var background=new PIXI.Graphics(),links=new PIXI.Graphics();self.graphics.addChild(background,links);
  var shops=new PIXI.Container(),actors=new PIXI.Container(),goods=new PIXI.Container();self.graphics.addChild(shops,actors,goods);
  var people={},positions={},items=[],labels={},oven,ovenCounts={},shopArt={},panels={},teamLabels={},oldWorld=null,visits={},money=StreetPresentation;
  self.entrance=1;
  // The camera transition changes presentation only; it never runs a day or
  // moves a coin. All six firms already exist in the freshly reset economy.
  self.reveal=function(progress){
   self.entrance=Math.max(0,Math.min(1,progress));self.overlay.inert=self.entrance<1;
   var order=['bakery','rival','clothes','ovens','cars','inputs'];
   function opacity(id){var i=order.indexOf(id),start=id==='bakery'?.68:.16+i*.065;return Math.max(0,Math.min(1,(self.entrance-start)/.25));}
   Object.keys(shopArt).forEach(function(id){shopArt[id].alpha=opacity(id);});
   Object.keys(people).forEach(function(id){var p=self.game&&self.game.world.people.find(function(p){return p.id===id;});people[id].c.alpha=opacity(p?(p.owner||p.job||'inputs'):'inputs');});
   Array.from(frameLayer.children).forEach(function(n){n.style.opacity=String(opacity(n.dataset.firm||'inputs'));});
  };
  self.auto=false;self.autoWait=0;self.autoPending=false;
  self.inspector=new StreetInspector({getGame:function(){return self.game;},onOpen:function(){self.auto=false;self.autoWait=0;self.autoPending=false;self.selected=null;bubble.hidden=true;reaction.hidden=true;self.finish();},onPerson:function(id){self.selected=id;self.trace=true;self.thought(id,true);var actor=people[id];if(actor)actor.button.focus({preventScroll:true});}});
  var frameLayer=document.createElement('div');frameLayer.className='street-districts';self.overlay.appendChild(frameLayer);
  function text(words,x,y,size,parent){var t=new PIXI.Text(words,{fontFamily:'WorkshopHand, Microsoft YaHei, sans-serif',fontSize:size,fill:0x555555,align:'center'});t.anchor.set(.5,.5);t.position.set(x,y);(parent||shops).addChild(t);return t;}
  function sprite(texture,parent){var s=new PIXI.Sprite(texture);s.anchor.set(.5,1);(parent||goods).addChild(s);return s;}
  function person(id,chef,boss){
   var c=new PIXI.Container(),body,face,hat,helmet,nervous,worry;actors.addChild(c);
   if(boss){body=_makeMovieClip('bakery_hatguy',{anchorX:.5,anchorY:1});body.gotoAndStop(0);c.addChild(body);}
   else{body=_makeMovieClip('bakery_body',{anchorX:.5,anchorY:1});body.gotoAndStop(0);face=_makeMovieClip('bakery_face',{anchorX:.5,anchorY:1});face.gotoAndStop(0);nervous=_makeMovieClip('bakery_nervous',{anchorX:.5,anchorY:1});nervous.gotoAndStop(8);nervous.visible=false;c.addChild(body,face,nervous);}
   if(boss){worry=new PIXI.Graphics();worry.lineStyle(3,0x555555);worry.moveTo(-13,-88);worry.lineTo(-3,-93);worry.moveTo(6,-93);worry.lineTo(15,-89);worry.visible=false;c.addChild(worry);}
   if(chef){hat=sprite(textures.chefHat,c);hat.position.set(0,-84);}
   var button=document.createElement('button');button.type='button';button.className='street-person';button.setAttribute('aria-label','查看'+id+'的心声');button.onclick=function(){self.selected=id;self.trace=false;self.thought(id);};self.overlay.appendChild(button);
   var outfit=new PIXI.Graphics();c.addChild(outfit);outfit.lineStyle(2.4,0x666666);outfit.beginFill(0xfafafa);
   if(id.indexOf('clothes')===0){outfit.moveTo(-9,-48);outfit.lineTo(-16,-8);outfit.lineTo(17,-8);outfit.lineTo(9,-48);outfit.endFill();outfit.drawRoundedRect(-7,-29,15,10,2);outfit.moveTo(-13,-49);outfit.lineTo(-14,-28);outfit.moveTo(13,-49);outfit.lineTo(14,-23);for(var j=0;j<4;j++){outfit.moveTo(10,-44+j*5);outfit.lineTo(14,-44+j*5);}}
   if(id.indexOf('cars')===0||id.indexOf('ovens')===0){outfit.drawRoundedRect(-12,-37,25,24,3);outfit.endFill();outfit.moveTo(-12,-37);outfit.lineTo(-15,-51);outfit.moveTo(13,-37);outfit.lineTo(15,-51);outfit.drawRect(-5,-32,10,8);helmet=new PIXI.Graphics();c.addChild(helmet);helmet.lineStyle(2.4,0x666666);helmet.beginFill(0xffffff);helmet.moveTo(-28,-93);helmet.bezierCurveTo(-27,-126,27,-126,29,-93);helmet.lineTo(-28,-93);helmet.endFill();helmet.moveTo(-33,-92);helmet.lineTo(34,-92);helmet.moveTo(-2,-113);helmet.lineTo(-2,-95);}
   if(id.indexOf('inputs')===0){outfit.moveTo(-15,-50);outfit.lineTo(-3,-32);outfit.lineTo(-7,-9);outfit.lineTo(-17,-13);outfit.lineTo(-15,-50);outfit.moveTo(15,-50);outfit.lineTo(3,-32);outfit.lineTo(7,-9);outfit.lineTo(17,-13);outfit.lineTo(15,-50);outfit.endFill();}
   var prop=new PIXI.Graphics();c.addChild(prop);
   return people[id]={c:c,body:body,face:face,nervous:nervous,worry:worry,hat:hat,helmet:helmet,outfit:outfit,prop:prop,button:button};
  }
  function portraitBounds(actor){
   // Container bounds respect trimmed atlas frames and visible expressions.
   // Individual sprite bounds include the original transparent frame padding.
   return actor.c.getLocalBounds();
  }
  function syncPeople(game){var changed=false,ids=game.world.people.map(function(p){return p.id;});Object.keys(people).forEach(function(id){if(ids.indexOf(id)<0){people[id].c.destroy({children:true});people[id].button.remove();delete people[id];changed=true;}});
   ids.forEach(function(id){if(!people[id]){person(id,/^(bakery|rival|available)-/.test(id),id.endsWith('-owner'));changed=true;}});return changed;
  }
  var bubble=document.createElement('div');bubble.className='street-thought speech-bubble';bubble.hidden=true;bubble.setAttribute('role','dialog');bubble.setAttribute('aria-label','心声与购物');self.overlay.appendChild(bubble);
  var reaction=document.createElement('div');reaction.className='street-reaction speech-bubble';reaction.hidden=true;reaction.setAttribute('role','status');reaction.setAttribute('aria-live','polite');self.overlay.appendChild(reaction);var reactionSerial=null;
  function positionReaction(){var actor=people[(reaction.dataset.firm||'rival')+'-owner'];if(!actor||reaction.hidden)return;var w=self.overlay.clientWidth,h=self.overlay.clientHeight,bw=reaction.offsetWidth,bh=reaction.offsetHeight,x=actor.c.x/self.width*w,y=(actor.c.y-95*actor.c.scale.y)/self.height*h;
   var left=Math.max(bw/2+8,Math.min(w-bw/2-8,x));reaction.style.left=left+'px';reaction.style.top=Math.max(4,Math.min(h-bh-4,y-bh-12))+'px';reaction.style.setProperty('--reaction-tail',Math.max(16,Math.min(bw-16,x-left+bw/2))+'px');
  }
  function showReaction(){var report=self.game.report,decision=report&&(report.firmDecisions||[])[0];if(!decision&&report&&report.rivalDecision)decision=Object.assign({firm:'rival'},report.rivalDecision);
   if(!decision||self.inspector.isOpen()||['social','private','overproduction','limits'].includes(self.game.phase)){reaction.hidden=true;return;}
   if(reactionSerial!==self.game.serial){reactionSerial=self.game.serial;reaction.innerHTML='';reaction.dataset.kind=decision.kind;reaction.dataset.firm=decision.firm;
    var words=document.createElement('p');words.textContent={'price-cut':'先便宜一点，总得试试吧。','wage-cut':'剩这么多……工资先少给一枚。',layoff:'还是卖不动……少雇一个吧。',hire:'又卖起来了！这个空缺补回来。','wage-rise':'生意恢复了，工资加回一枚。',expand:'机器更多，生意也会更多吧！'}[decision.kind];reaction.appendChild(words);
    var close=document.createElement('button');close.type='button';close.className='street-close';close.textContent='×';close.setAttribute('aria-label',decision.firm==='rival'?'关闭邻店发言':'关闭老板发言');close.onclick=function(){reaction.hidden=true;reaction.dataset.dismissed=String(self.game.serial);};reaction.appendChild(close);StreetArt.decorateMoney(reaction);
   }
   reaction.hidden=reaction.dataset.dismissed===String(self.game.serial)||Boolean(self.selected);positionReaction();
  }
  function positionBubble(){var actor=people[self.selected];if(!actor||bubble.hidden)return;var w=self.overlay.clientWidth,h=self.overlay.clientHeight,bw=bubble.offsetWidth,bh=bubble.offsetHeight,x=actor.c.x/self.width*w,y=(actor.c.y-45*actor.c.scale.y)/self.height*h;
   var above=y>=bh+36;var top=above?y-bh-30:y+30;top=Math.max(4,Math.min(h-bh-4,top));
   bubble.style.left=Math.max(bw/2+8,Math.min(w-bw/2-8,x))+'px';bubble.style.top=top+'px';bubble.dataset.side=above?'above':'below';
  }
  self.thought=function(id,trace){
   if(!self.game)return;var p=self.game.world.people.find(function(p){return p.id===id;});if(!p)return;
   if(trace!==undefined)self.trace=trace;trace=self.trace;
   bubble.innerHTML='';var words=document.createElement('p');
   var fired=!p.job&&(self.game.report&&self.game.report.dismissed.includes(id)||self.game.story&&self.game.story.dismissed.includes(id));
   var extras=p.shopping?p.shopping.items.slice(1):[],breadWish=p.shopping&&p.shopping.items[0];
   var affordable=self.game.world.firms.filter(function(f){return f.id==='bakery'||f.id==='rival';}).some(function(f){return p.cash+money.ownerFunds(p,self.game.world)>=f.price;});
   var decision=self.game.report&&self.game.report.rivalDecision;
   var ownDecision=self.game.report&&(self.game.report.firmDecisions||[]).find(function(d){return d.firm===p.owner;});
   words.textContent=p.owner==='rival'&&decision?(decision.kind==='wage-cut'?'面包剩着，先把工资从'+decision.oldWage+'枚降到'+decision.wage+'枚吧。':'降了工资，货还是剩着。先少雇一个人吧。'):p.job==='rival'&&decision&&decision.kind==='wage-cut'?'面包卖不掉，工资也少了一枚。':fired?(affordable?'这轮没领工资，先用积蓄买面包吧。':'工资停了，今天的钱不够买面包。'):self.game.world.round===0?'面包得先买，其他的看看钱包。':p.bread===0?(breadWish?breadWish.outcome==='stock':affordable)?'想买面包，店里却没货。':'肚子饿了，钱包却没跟上。':extras.some(function(i){return i.kind==='car'&&i.outcome==='money';})?'饭有了，车再慢慢攒。':extras.some(function(i){return i.outcome==='money';})?'先吃饱，新衣服再攒攒。':extras.some(function(i){return i.outcome==='stock';})?'吃的有了，别的等补货。':extras.length?'吃的有了，想要的也买到了。':'今天先吃饱，别的下次再说。';bubble.appendChild(words);reaction.hidden=true;
   if(ownDecision)words.textContent={'price-cut':'货还剩着，便宜一点试试。','wage-cut':'工资先少给一枚，店里的钱得撑住。',layoff:'货还是剩着，先少雇一个人。',hire:'生意回来了，把空缺补上。','wage-rise':'卖得稳了，工资加回一枚。',expand:'多添一台机器，总能多卖一点吧。'}[ownDecision.kind];
   var balance=document.createElement('p');balance.className='street-person-balance';var amount=document.createElement('span');amount.textContent='现在有 '+money.whole(p.cash)+' 枚';balance.appendChild(amount);bubble.appendChild(balance);if(p.cash%100){var change=document.createElement('p');change.className='street-wallet-lines';change.textContent='旧存档零钱单独保留，不计入可用金币。';bubble.appendChild(change);}
   var plan=p.shopping,heading=document.createElement('p');if(plan&&self.game.world.round===0){plan=JSON.parse(JSON.stringify(plan));plan.items[0].price=Math.min(self.game.price*100,self.game.world.firms.find(function(f){return f.id==='rival';}).price);}heading.className='street-shopping-heading';heading.textContent=plan?(self.game.world.round===0?'开门后想买':'第'+plan.round+'天想买'):'明天先试着买一个面包';bubble.appendChild(heading);
   if(p.owner){var company=document.createElement('p');company.className='street-wallet-lines';company.textContent='下轮店内可代付：'+money.whole(money.ownerFunds(p,self.game.world))+'枚';bubble.insertBefore(company,heading);}
   if(plan){var list=document.createElement('ul');list.className='street-shopping-list';plan.items.forEach(function(item){var row=document.createElement('li');row.dataset.kind=item.kind;row.dataset.outcome=item.outcome;row.innerHTML=StreetArt.icon(item.kind==='car'?'cars':item.kind);var name=document.createElement('span');name.textContent={bread:'面包',clothes:'衣服',car:'汽车'}[item.kind]+' · '+(item.price%100?'旧价已归档':money.whole(item.price)+'枚');row.appendChild(name);var result=document.createElement('span');result.className='street-shopping-result';result.textContent=item.outcome==='planned'?(item.kind==='bread'?'先买一个':'打算看看'):item.outcome==='bought'?'买到 '+item.quantity+(item.kind==='clothes'?'件':item.kind==='car'?'辆':'个'):item.outcome==='money'?'钱不够':'店里没货';row.appendChild(result);list.appendChild(row);});bubble.appendChild(list);}
   else{var legacy=document.createElement('p');legacy.className='street-wallet-lines';legacy.textContent=self.game.world.round?'这轮旧存档没记下心愿，下轮就会显示。':'其他商品的心愿会在营业时确定。';bubble.appendChild(legacy);}
   if(plan&&plan.items[0].wantedQuantity){var breadResult=bubble.querySelector('.street-shopping-list li[data-kind="bread"] .street-shopping-result');breadResult.textContent='想买'+plan.items[0].wantedQuantity+'个 · '+breadResult.textContent;}
   var wallet=document.createElement('button');wallet.type='button';wallet.className='street-wallet secondary';wallet.textContent=trace?'收起账本':'看钱包 →';wallet.onclick=function(){self.thought(id,!self.trace);};bubble.appendChild(wallet);
   if(trace){var entries=(self.game.report?self.game.report.transactions:[]).filter(function(t){return t.from===id||t.to===id;});var list=document.createElement('p');list.className='street-wallet-lines';list.textContent=entries.length?entries.map(function(t){return (t.to===id?'＋':'−')+money.amount(t.amount)+' '+({wage:'工资',bread:'面包',clothes:'衣服',car:'汽车',severance:'安置款','owner-budget':'消费预算','owner-purchase':'店内代付'}[t.kind]||t.kind);}).join(' · '):'本轮还没有付款记录。';bubble.appendChild(list);}
   var close=document.createElement('button');close.type='button';close.className='street-close';close.textContent='×';close.setAttribute('aria-label','关闭心声');close.onclick=function(){bubble.hidden=true;self.selected=null;self.trace=false;};bubble.appendChild(close);StreetArt.decorateMoney(bubble);bubble.hidden=false;positionBubble();
  };
  function geometry(width,game){
   var visible=dom.clientWidth||width,ratio=visible/width,k=Math.min(1,ratio);
   // Shrink the drawing and its spacing together; touch targets stay 44px.
   var density=.72+.28*Math.max(0,Math.min(1,(visible-320)/280)),pitch=Math.max(44,52*density),step=64*density;
   var business=Math.max(130,140*k)*density,ownBusiness=Math.max(145,165*k)*density;
   var otherCount=game?Math.max.apply(null,game.world.firms.filter(function(f){return f.id!=='bakery';}).map(function(f){return f.workers.length;})):1,ownCount=game?game.world.firms[0].workers.length:2;
   var team=Math.max(90*density,Math.ceil(otherCount/Math.max(1,Math.floor(250*ratio/pitch)))*step+24*density),ownTeam=Math.max(90*density,Math.ceil(ownCount/Math.max(1,Math.floor(350*ratio/pitch)))*step+24*density),second=20*density+business+22*density+team+42*density;
   var waiting=game?game.world.people.filter(function(p){return !p.job&&!p.owner;}).length:2,cols=Math.max(1,Math.floor((visible-32)/Math.max(44,50*density))),bottom=second+Math.max(ownBusiness+22*density+ownTeam,business+22*density+team);
   return {ratio:ratio,density:density,pitch:pitch,step:step,business:business,ownBusiness:ownBusiness,team:team,ownTeam:ownTeam,second:second,bottom:bottom,cols:cols,height:bottom+40*density+Math.max(1,Math.ceil(waiting/cols))*step+24*density};
  }
  self.heightFor=function(width,game){var geo=geometry(width,game||self.game);return Math.ceil(geo.height/geo.ratio);};
  function layout(){
   self.stockSerial=null;
   var w=self.width,geo=geometry(w,self.game),h=self.heightFor(w),ratio=geo.ratio,stretch=1/ratio,compact=ratio<.7;
   self.ratio=ratio;self.stretch=stretch;self.density=geo.density;self.personPitch=geo.pitch;self.waitingStep=geo.step;self.artScale=ratio>1?1/ratio:Math.max(1,Math.min(1.6,.55/ratio));self.actorBoost=ratio>1?1/ratio:Math.max(1,Math.min(1.8,.48/ratio));
   self.artScale*=geo.density;self.actorBoost*=geo.density;
   self.overlay.dataset.density=geo.density.toFixed(3);
   self.overlay.classList.toggle('street-compact',compact);
   self.overlay.style.setProperty('--street-data-size',ratio<.5?'11px':compact?'12px':'14px');
   self.overlay.style.setProperty('--street-icon-size',ratio<.5?'14px':compact?'17px':'21px');
   self.overlay.style.setProperty('--street-title-size',ratio<.5?'11px':compact?'13px':'15px');
   var boxes={clothes:[20,20*geo.density,250,0],ovens:[355,20*geo.density,250,0],cars:[690,20*geo.density,250,0],bakery:[305,geo.second,350,0],rival:[20,geo.second,250,0],inputs:[690,geo.second,250,0]};
   Object.keys(boxes).forEach(function(id){boxes[id][1]*=stretch;boxes[id][3]=((id==='bakery'?geo.ownBusiness:geo.business)+22*geo.density+(id==='bakery'?geo.ownTeam:geo.team))*stretch;});
   positions={};frameLayer.innerHTML='';panels={};
   shops.removeChildren().forEach(function(c){c.destroy({children:true});});ovenCounts={};shopArt={};background.clear();background.lineStyle(1.5,0xdddddd,.6);
   Object.keys(boxes).forEach(function(id){var b=boxes[id],own=id==='bakery',business=(own?geo.ownBusiness:geo.business)*stretch,teamTop=b[1]+business+22*geo.density*stretch;
    positions[id]={x:b[0]+b[2]*(own?.32:.42),y:b[1]+(own?geo.ownBusiness*.57:geo.business*.57)*stretch,box:b,shopHeight:business,teamTop:teamTop,teamHeight:b[3]-business-22*geo.density*stretch};
    function frame(kind,y,height){var n=document.createElement('div');n.className='street-zone '+kind+(own?' street-own':'');n.dataset.firm=id;n.style.cssText='left:'+b[0]/w*100+'%;top:'+y/h*100+'%;width:'+b[2]/w*100+'%;height:'+height/h*100+'%;';frameLayer.appendChild(n);return n;}
    var store=frame('street-shop',b[1],business),caption=document.createElement('span');caption.className='street-zone-title';caption.textContent={bakery:'我们的面包店',rival:'另一家面包店',clothes:'服装店',cars:'车厂',ovens:'烤炉厂',inputs:'原料和仓储'}[id];store.appendChild(caption);labels[id]=caption;
    var inspect=document.createElement('button');inspect.type='button';inspect.className='street-shop-hit';inspect.dataset.firm=id;inspect.setAttribute('aria-label','查看'+caption.textContent+'的经营账本');inspect.title='点店看经营账本';inspect.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';inspect.onclick=function(){self.inspector.open(id,inspect);};store.appendChild(inspect);
    var metric=document.createElement('div');metric.className='street-firm-metrics';metric.dataset.firm=id;metric.setAttribute('aria-label',caption.textContent+'的数据');
    var values=[];[id==='bakery'||id==='rival'?'bread':id,'person','cash'].forEach(function(icon,index){var cell=document.createElement('span');cell.innerHTML=StreetArt.icon(icon);cell.title=id==='inputs'&&index===0?'待售原料（份），4份一包':['待售库存，含之前未卖出的产品','在册员工人数','公司现金余额，不是利润'][index];var output=document.createElement('output');cell.appendChild(output);metric.appendChild(cell);values.push(output);});store.appendChild(metric);panels[id]=values;
    var team=frame('street-team',teamTop,positions[id].teamHeight),tag=document.createElement('span');tag.className='street-zone-title';tag.textContent=own?'我们的厨师':'员工';team.appendChild(tag);teamLabels[id]=tag;
   });
   var waitingFrame=document.createElement('div');waitingFrame.className='street-zone street-waiting';waitingFrame.style.cssText='left:2%;width:96%;top:'+(geo.bottom+40*geo.density)/geo.height*100+'%;height:'+(geo.height-geo.bottom-50*geo.density)/geo.height*100+'%;';frameLayer.appendChild(waitingFrame);
   var waitingTag=document.createElement('span');waitingTag.className='street-zone-title';waitingFrame.appendChild(waitingTag);self.waitingTag=waitingTag;self.waitingTop=(geo.bottom+40*geo.density)/ratio;self.waitingCols=geo.cols;
   Object.keys(positions).forEach(function(id){var p=positions[id],group=new PIXI.Container();group.name='street-shop-'+id;shopArt[id]=group;shops.addChild(group);
    var texture=id==='bakery'||id==='rival'?textures.newOven:id==='ovens'?textures.emptyOven:id==='clothes'?textures.clothesShop:id==='cars'?textures.carFactory:textures.inputsShop;
    var s=sprite(texture,group);s.name=id==='ovens'?'empty-oven':id==='bakery'||id==='rival'?'working-oven':id+'-detail';
    var size=id==='bakery'?102:id==='rival'||id==='ovens'?82:id==='cars'?96:90;
    var previousWidth=Math.min(size*self.artScale,p.box[2]*.6-8/self.ratio);
    // Neighboring shop signs are 12% larger. Keep their visual centers fixed;
    // the narrow-screen cap still leaves room for the owner and the numbers.
    s.width=Math.min(size*self.artScale*(id==='bakery'?1:1.12),p.box[2]*(id==='bakery'?.6:.64)-8/self.ratio);s.height=s.width*260/310;
    var centerOffset=(s.width-previousWidth)*260/310/2;
    s.position.set(p.x,p.y+(['clothes','cars','inputs'].includes(id)?8*self.artScale:0)+centerOffset);if(id==='bakery')oven=s;
    if(id==='bakery'||id==='rival')ovenCounts[id]=text('×1',p.x+54*self.artScale,p.y-35*self.artScale,Math.max(16,9/self.ratio),group);
   });
   self.height=h;self.base={};
   Object.keys(people).forEach(function(id){var sector=id.split('-')[0],p=positions[sector]||positions.bakery,b=p.box,x=b[0]+b[2]*.5,y=p.teamTop+88*stretch;
    if(sector==='bakery'||sector==='available'){b=positions.bakery.box;var slot=id==='bakery-0'?0:id==='bakery-1'?1:id==='available-0'?2:3;x=b[0]+b[2]*(.14+slot*.24);y=positions.bakery.teamTop+102*stretch;}
    if(id.endsWith('-owner')){x=b[0]+b[2]*.82;y=p.y;}
    self.base[id]={x:x,y:y};var o=people[id];o.c.scale.set(.49*self.actorBoost);o.c.position.set(x,y);
   });
   self.render();
  }
  function origin(id){if(people[id])return {x:people[id].c.x,y:people[id].c.y-35};var sector=id.split('-')[0],p=positions[sector];return p?{x:p.x,y:p.y-20}:{x:self.width*.5,y:self.height*.83};}
  function addTransfer(t,i,total){var obj;
   if(t.kind==='bread'){obj=sprite(textures.bread);obj.width=27;obj.height=18;}
   else if(t.kind==='new-oven'||t.kind==='replacement'){obj=sprite(textures.emptyOven);obj.width=65;obj.height=55;}
   else{obj=_makeMovieClip('iterated_coin',{scale:19/102});goods.addChild(obj);}
   var product=t.kind==='bread'||t.kind==='new-oven'||t.kind==='replacement',start=i/Math.max(1,total)*5+.4,duration=1.2,route=visits[t.from],leg=route&&route.stops.findIndex(function(s){return s.firm===t.to&&s.kind===t.kind;});
   if(leg>=0){var clock=money.timing(route.stops.length,route.index);start=clock.start+(leg+.6)*clock.span;duration=Math.min(.35,clock.span*.35);}
   items.push({obj:obj,t:t,start:start,duration:duration,product:product});
  }
  self.update=function(game,width,reduced){
   var entered=!self.graphics.visible,changed=self.serial!==game.serial,first=self.serial===null;
   if(self.autoPending&&!changed&&game.message){self.auto=false;self.autoPending=false;}
   if(changed){oldWorld=self.game?self.game.world:game.world;self.autoPending=false;}
   self.game=game;var rosterChanged=syncPeople(game);if(self.selected&&!people[self.selected]){self.selected=null;self.trace=false;bubble.hidden=true;}self.graphics.visible=true;self.overlay.hidden=false;self.reduced=reduced;
   if(entered){self.time=8;self.playing=false;}
   if(self.width!==width||entered||rosterChanged||Math.abs((dom.clientWidth||width)/width-self.ratio)>.001||self.height!==self.heightFor(width)){self.width=width;layout();}
   if(changed){self.serial=game.serial;self.duration=game.report&&game.report.management?3:8;self.time=first||entered||reduced||!game.report?8:0;self.playing=!first&&!entered&&!reduced&&Boolean(game.report);
    items.forEach(function(i){i.obj.destroy();});items=[];visits={};
    game.world.people.forEach(function(p,index){visits[p.id]={index:index,stops:money.visits(p,game.world,game.report)};});
    var tx=game.report?game.report.transactions:[],chosen=[],seen={};
    tx.forEach(function(t){var key=t.kind==='wage'||t.kind==='owner-purchase'?t.from+':'+t.kind:t.kind==='bread'?t.to:t.kind;if(!seen[key]&&['wage','inputs','bread','clothes','car','new-oven','replacement','severance','owner-purchase'].includes(t.kind)){seen[key]=true;chosen.push(t);}});
    chosen.slice(0,18).forEach(function(t,i){addTransfer(t,i,Math.min(chosen.length,18));});
   }
   if(['social','private','overproduction','limits'].includes(game.phase)){self.time=8;self.playing=false;}
   self.render();if(self.selected)self.thought(self.selected);self.inspector.refresh();
  };
  self.render=function(){
   if(!self.game)return;var game=self.game,f=game.world.firms.find(function(f){return f.id==='bakery';}),t=self.time,phase=game.phase;
   document.body.dataset.streetRound=game.world.round;document.body.dataset.streetPhase=phase;document.body.dataset.streetAnimating=String(self.playing);document.body.dataset.streetBeat=game.story?game.story.beat:'sandbox';
   labels.bakery.textContent='我们的面包店';oven.alpha=f.working===0&&game.world.round?.55:1;
   var displayed=t>=8?game.world:oldWorld;displayed.firms.forEach(function(firm){if(ovenCounts[firm.id])ovenCounts[firm.id].text='×'+firm.machines;var values=[firm.stock,firm.workers.length,money.whole(firm.cash)];panels[firm.id].forEach(function(node,i){if(node.textContent!==String(values[i]))node.textContent=String(values[i]);node.setAttribute('aria-label',['待售库存','在册员工','可用整枚金币'][i]+' '+values[i]);if(i===2)node.title=firm.cash%100?'旧存档零钱保留；这里只计可用整枚金币。':'可用整枚金币，不是利润。';});});
   var homeCells={};
   game.world.firms.forEach(function(firm){var p=positions[firm.id],b=p.box,cols=Math.max(1,Math.min(firm.workers.length,Math.floor(b[2]*self.ratio/self.personPitch))),rows=Math.ceil(firm.workers.length/cols);
    teamLabels[firm.id].textContent=(firm.id==='bakery'?'我们的厨师':'员工')+' · '+firm.workers.length+'人';teamLabels[firm.id].title='每个小人对应一名在册员工；可分别点开钱包。';
    firm.workers.forEach(function(id,index){var count=Math.min(cols,firm.workers.length-Math.floor(index/cols)*cols);
     var rowHeight=(p.teamHeight-24*self.density/self.ratio)/rows;
     homeCells[id]={x:b[0]+b[2]*(index%cols)/count+6/self.ratio,y:p.teamTop+16*self.density/self.ratio+Math.floor(index/cols)*rowHeight,width:b[2]/count-12/self.ratio,height:rowHeight};
     var actor=people[id];actor.button.dataset.firm=firm.id;actor.button.dataset.person=id;
     if(actor.hat===undefined&&(firm.id==='bakery'||firm.id==='rival')&&!id.endsWith('-owner')){actor.hat=sprite(textures.chefHat,actor.c);actor.hat.position.set(0,-84);}
    });
   });
   var waiting=game.world.people.filter(function(p){return !p.job&&!p.owner;});self.waitingTag.textContent='待业 · '+waiting.length+'人（全街 '+game.world.people.length+'人）';
   links.clear();
   if(phase==='social'){links.lineStyle(2.5,0x888888,.75);['ovens','inputs','clothes','cars','rival'].forEach(function(id){var p=positions[id],b=positions.bakery;links.moveTo(p.x,p.y);links.bezierCurveTo(p.x,self.height*.35,b.x,self.height*.8,b.x,b.y);});}
   if(phase==='private'){Object.keys(positions).forEach(function(id){var b=positions[id],keyX=b.x+(id==='bakery'?95:0),keyY=b.y-(id==='bakery'?125:95);links.lineStyle(3,0x555555);links.drawCircle(keyX,keyY,8);links.moveTo(keyX+8,keyY);links.lineTo(keyX+32,keyY);links.lineTo(keyX+32,keyY+8);links.moveTo(keyX+25,keyY);links.lineTo(keyX+25,keyY+6);links.lineStyle(2,0x888888,.7);links.moveTo(keyX,keyY);links.lineTo(b.x,b.y-45);});}
   Object.keys(people).forEach(function(id){var o=people[id],p=game.world.people.find(function(p){return p.id===id;}),base=self.base[id],fired=p&&!p.job&&!p.owner;
    o.c.visible=true;o.button.hidden=false;if(!p.job)o.button.dataset.firm=p.owner||'waiting';o.button.dataset.person=id;
    // Headwear follows the current job, not the person's original ID.
    var cooking=p.job==='bakery'||p.job==='rival';
    if(o.hat){o.hat.visible=cooking;o.hat.position.set(0,-84);o.hat.rotation=0;}
    if(o.helmet)o.helmet.visible=p.job==='cars'||p.job==='ovens'||Boolean(p.owner);
    o.button.dataset.headwear=cooking&&o.hat?'chef':o.helmet&&o.helmet.visible?'helmet':'none';
    var worried=visits[id]&&money.worried(t,visits[id].stops,visits[id].index);
    o.button.dataset.mood=worried?'worried':'normal';
    if(o.face){o.face.visible=!worried;o.face.gotoAndStop(fired?0:p&&p.bread>1?6:0);o.nervous.visible=Boolean(worried);}
    if(o.worry)o.worry.visible=Boolean(worried);
    o.prop.clear(); // Carried goods are not part of the standing portrait.
    var portrait=portraitBounds(o),footOffset=portrait.y+portrait.height,centerOffset=portrait.x+portrait.width/2;
    var idleCell=null;
    if(fired){var idleIndex=waiting.findIndex(function(p){return p.id===id;}),idleCount=Math.min(self.waitingCols,waiting.length-Math.floor(idleIndex/self.waitingCols)*self.waitingCols),idleWidth=self.width*.96/idleCount;
     idleCell={x:self.width*.02+idleWidth*(idleIndex%self.waitingCols)+6/self.ratio,y:self.waitingTop+(16*self.density+Math.floor(idleIndex/self.waitingCols)*self.waitingStep)/self.ratio,width:idleWidth-12/self.ratio,height:54*self.density/self.ratio};}
    var cell=homeCells[id]||idleCell;
    if(cell){var fit=money.fitPerson(portrait,cell,.49*self.actorBoost);o.c.scale.set(fit.scale);if(homeCells[id])base=self.base[id]={x:fit.x,y:fit.y};}
    o.c.x=base.x;o.c.y=base.y;o.c.rotation=0;
    var leave=self.playing&&game.report&&game.report.dismissed.includes(id)?Math.min(1,t/2):1;
    if(fired){var exit=money.fitPerson(portrait,idleCell,.49*self.actorBoost);o.c.x=base.x+(exit.x-base.x)*leave;o.c.y=base.y+(exit.y-base.y)*leave;}
    else if(self.playing&&game.report&&game.report.hired.includes(id)){o.c.x+=(self.width*.98-base.x)*(1-Math.min(1,t/2));}
    else if(o.hat){o.hat.position.set(0,-84);o.hat.rotation=0;}
    o.prop.clear();
    o.button.dataset.visitState='home';delete o.button.dataset.visitFirm;delete o.button.dataset.visitOutcome;
    if(self.playing&&!self.reduced){o.c.y-=Math.abs(Math.sin(t*6))*2;
     var route=visits[id],stops=route?route.stops.map(function(s){return Object.assign({point:money.counter(positions[s.firm],route.index)},s);}):[],home={x:o.c.x+centerOffset*o.c.scale.x,y:o.c.y+footOffset*o.c.scale.y},sample=money.trip(t,home,stops,route?route.index:0),shopping=sample.visit;
     if(sample.state!=='home'){o.c.x=sample.x-centerOffset*o.c.scale.x;o.c.y=sample.y-footOffset*o.c.scale.y;o.button.dataset.visitState=sample.state;
      if(shopping){o.button.dataset.visitFirm=shopping.firm;o.button.dataset.visitOutcome=shopping.outcome;}
      if(sample.state==='walk'||sample.state==='return'){o.c.y-=Math.abs(Math.sin(t*10))*2;o.c.rotation=Math.sin(t*8)*.03;}
      var carried=sample.state==='counter'&&shopping&&shopping.bought?shopping:stops.slice(0,Math.max(0,sample.leg)).filter(function(s){return s.bought;}).slice(-1)[0];
      if(carried){shopping=carried;var pg=o.prop;pg.lineStyle(2.5,0x666666);pg.beginFill(0xffffff);
       if(shopping.kind==='bread'){pg.drawRoundedRect(19,-37,24,30,3);pg.drawEllipse(31,-39,8,6);pg.moveTo(24,-27);pg.lineTo(37,-27);}
       if(shopping.kind==='clothes'){pg.moveTo(-15,-47);pg.lineTo(-26,-34);pg.lineTo(-17,-28);pg.lineTo(-13,-34);pg.lineTo(-13,-10);pg.lineTo(13,-10);pg.lineTo(13,-34);pg.lineTo(17,-28);pg.lineTo(26,-34);pg.lineTo(15,-47);pg.bezierCurveTo(7,-37,-7,-37,-15,-47);}
       if(shopping.kind==='car'){pg.moveTo(-53,-10);pg.lineTo(-32,-42);pg.lineTo(30,-42);pg.lineTo(48,-10);pg.lineTo(59,-10);pg.lineTo(59,13);pg.lineTo(-53,13);pg.lineTo(-53,-10);pg.endFill();pg.drawCircle(-30,13,10);pg.drawCircle(34,13,10);}
       pg.endFill();
      }
     }
    }
    o.button.style.left=(o.c.x+centerOffset*o.c.scale.x)/self.width*100+'%';o.button.style.top=(o.c.y+(portrait.y+portrait.height/2)*o.c.scale.y)/self.height*100+'%';
    o.button.dataset.feetX=String((o.c.x+centerOffset*o.c.scale.x)*self.ratio);o.button.dataset.feetY=String((o.c.y+footOffset*o.c.scale.y)*self.ratio);
   });
   items.forEach(function(i){var u=Math.max(0,Math.min(1,(t-i.start)/i.duration)),from=origin(i.product?i.t.to:i.t.from),to=origin(i.product?i.t.from:i.t.to);i.obj.visible=t>=i.start&&u<1;
    i.obj.position.set(from.x+(to.x-from.x)*u,from.y+(to.y-from.y)*u-Math.sin(u*Math.PI)*40);i.obj.rotation=i.product?Math.sin(u*Math.PI)*.1:0;
   });
   // Result stock is drawn from the ledger, not decorative perpetual growth.
   if(self.stockSerial!==game.serial){if(self.stockLayer)self.stockLayer.destroy({children:true});self.stockLayer=new PIXI.Container();self.graphics.addChild(self.stockLayer);self.stockSerial=game.serial;
    game.world.firms.filter(function(firm){return firm.id==='bakery'||firm.id==='rival';}).forEach(function(firm){var p=positions[firm.id];for(var j=0;j<Math.min(firm.stock,6);j++){var loaf=sprite(textures.bread,self.stockLayer);loaf.width=18*self.artScale;loaf.height=12*self.artScale;loaf.position.set(p.x-30+j%3*20,p.y+19-Math.floor(j/3)*12);}if(firm.stock)text('剩 '+firm.stock,p.x+60,p.y+14,Math.max(18,10/self.ratio),self.stockLayer);});
   }self.stockLayer.visible=t>=7;
   self.reveal(self.entrance);
   if(self.onChange)self.onChange({playing:self.playing,complete:t>=8,time:t});
   if(self.selected)positionBubble();showReaction();
  };
  self.tick=function(delta){if(!self.graphics.visible)return;var dt=Math.min(delta/60,.05);if(self.playing){self.time=Math.min(self.duration,self.time+dt*self.speed);if(self.time===self.duration){self.time=8;self.playing=false;}self.render();}
   if(self.auto&&self.time>=8&&!self.autoPending&&!document.hidden&&self.onRound){self.autoWait+=dt*self.speed;if(self.autoWait>=1.2){self.autoWait=0;self.autoPending=true;self.onRound();}}
  };
  self.toggle=function(){if(self.time<8){self.playing=!self.playing;self.render();}};
  self.finish=function(){self.time=8;self.playing=false;self.render();};
  self.close=function(){if(self.closeBriefing)self.closeBriefing();self.inspector.close(false);self.reveal(1);self.graphics.visible=false;self.overlay.hidden=true;self.playing=false;self.auto=false;self.autoWait=0;self.autoPending=false;bubble.hidden=true;reaction.hidden=true;self.selected=null;};
 };
})(window);
