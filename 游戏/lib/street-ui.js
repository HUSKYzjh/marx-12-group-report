/* Short, staged controls. Definitions appear only after the street experiment. */
(function(root){
 'use strict';
 root.renderStreetUI=function(c){
  var g=c.game,f=g.world.firms.find(function(f){return f.id==='bakery';}),r=g.report,money=StreetPresentation,explaining=['social','private','overproduction','limits'].includes(g.phase);
  function el(tag,words,cls,parent){var n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';(parent||c.controls).appendChild(n);StreetArt.decorateMoney(n);return n;}
  function send(type,extra){c.send(Object.assign({type:type},extra||{}));}
  function button(words,type,extra,parent,cls){var b=el('button',words,cls||'secondary',parent);b.type='button';b.dataset.streetAction=type;if(extra&&extra.delta!==undefined)b.dataset.delta=extra.delta;b.onclick=function(){send(type,extra);};return b;}
  function decisions(){
   if(!r||!(r.firmDecisions||[]).length)return;
   var line=el('div','','street-firm-decisions',c.readout);line.setAttribute('aria-label','本轮各店调整');
   r.firmDecisions.forEach(function(d){var label={'price-cut':'降价','wage-cut':'降薪',layoff:'裁一人',hire:'补一人','wage-rise':'加薪',expand:'扩产'}[d.kind],b=el('button',StreetLedger.names[d.firm]+' · '+label+' ↗','secondary',line);b.type='button';b.onclick=function(){c.scene.inspector.open(d.firm,b);};});
  }
  function campaign(){
   var beat=g.campaign.beat,choosing=beat==='decide',terminal=['insolvent','closed'].includes(beat);
   c.scene.auto=false;c.scene.autoPending=false;
   var captions={opening:'做出来了，就得卖出去。',expand:'生意不错，再添一台炉？',lead:'人手和炉子到齐了。',rival:'邻店老板：“我也添炉！”',others:'其他老板：“我们也扩大一点。”',pressure:'机器更多了，街上还是这些人。',decide:r&&r.stock?'面包剩着，你打算怎么办？':r&&r.accounts&&r.accounts.netProfit<0?'卖完了，却没赚到钱。':'这轮好转了。下一轮呢？',insolvent:'店破产了：变卖设备，也还不清欠款。',closed:'店门关了，工资也停了。'};
   c.title('第二幕·面包卖给谁？',captions[beat]);
   if(beat==='opening')el('p','点店看账，点人看钱包。','street-inspect-hint',c.readout);
   var result=el('div','','street-story-result',c.readout);
   if(r&&!r.management)[['出炉',r.produced],['卖出',r.sold],['库存',r.stock]].forEach(function(pair){var cell=el('span','','',result);el('span',pair[0],'',cell);el('strong',String(pair[1]),'',cell);});
   if(terminal&&g.campaign.solvency){var proof=el('div','','street-solvency',c.readout),s=g.campaign.solvency;[['现金',s.cash],['欠款',s.arrears],['设备变卖价',s.resale],['还差',s.shortfall]].forEach(function(pair){var line=el('div','','shop-ledger-row',proof);el('span',pair[0],'',line);el('strong',pair[1]+'枚','',line);});}
   if(g.message&&(!r||!r.management))el('p',g.message,'street-message',c.readout);
   if(choosing){
    var knobs=el('div','','street-knobs');
    function knob(label,value,type,min,max,unit,aria){var group=el('div','','street-knob',knobs);el('span',label,'',group);var minus=button('−',type,{delta:-1},group);minus.setAttribute('aria-label','减少'+aria);minus.disabled=value<=min;el('output',value+unit,'',group);var plus=button('＋',type,{delta:1},group);plus.setAttribute('aria-label','增加'+aria);plus.disabled=value>=max;}
    knob('工资',g.wage,'WAGE',3,7,' 枚','每人每轮工资');knob('售价',g.price,'PRICE',1,Math.min(4,g.wage),' 枚','每个面包售价');
    knob('开工',g.shifts,'SHIFTS',0,Math.min(f.workers.length,f.machines),' 人','开工人数');
    if(f.workers.length)button('少雇一位厨师…','PREVIEW_LAYOFF');
    if(g.layoffPreview){var preview=el('div','','street-layoff');el('p','安置款 5枚。下轮少付'+g.wage+'枚工资。','',preview);button('确认少雇一位','LAYOFF',{},preview);button('算了，先不裁','CANCEL_LAYOFF',{},preview);}
    var invest=el('details','','street-extra-actions');el('summary','再扩产？','',invest);button('再添一台炉','BUY_OVEN',{},invest);button('招一位厨师','HIRE',{},invest);
   }
   var actions=el('div','','street-guided-actions');
   if(beat==='opening')button('开门营业 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='expand')button('添炉、招人 →','STORY_EXPAND',{},actions,'primary');
   if(beat==='lead')button('多做些，再开门 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='rival')button('看看邻店怎么做 →','STORY_COMPETE',{},actions,'primary');
   if(beat==='others')button('再看看其他老板 →','OTHERS_FOLLOW',{},actions,'primary');
   if(beat==='pressure'||choosing)button(choosing?'照这样，开一天 →':'全街一起开门 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='insolvent')button('变卖设备，关门 →','CLOSE_SHOP',{},actions,'primary');
   if(beat==='closed'){var home=c.ending('回家 →');if(home)home.dataset.streetAction='SHOW_ENDING';}
   var run=actions.querySelector('[data-street-action="ROUND"]');if(run)run.id='street-run';
   var transport=el('div','','street-transport'),pause=el('button','暂停','secondary',transport),skip=el('button','看结算','secondary',transport);pause.type=skip.type='button';pause.id='street-pause';skip.id='street-finish';pause.onclick=function(){c.scene.toggle();};skip.onclick=function(){c.scene.finish();};
   c.scene.onChange=function(sample){result.hidden=!sample.complete||!r||r.management;c.controls.querySelectorAll('[data-street-action]').forEach(function(b){var t=b.dataset.streetAction,d=Number(b.dataset.delta);b.disabled=!sample.complete||(t==='WAGE'?(d<0?g.wage<=3:g.wage>=7):t==='PRICE'?(d<0?g.price<=1:g.price>=Math.min(4,g.wage)):t==='SHIFTS'?(d<0?g.shifts<=0:g.shifts>=Math.min(f.workers.length,f.machines)):false);});pause.hidden=skip.hidden=sample.complete;pause.textContent=sample.playing?'暂停':'继续播放';};
   decisions();installStreetBriefing(c);
  }
  function guided(){
   c.scene.auto=false;c.scene.autoPending=false;
   var beat=g.story.beat,rival=g.world.firms.find(function(f){return f.id==='rival';}),step={opening:1,expand:2,lead:2,rival:3,pressure:3,adjust:4,layoff:5,review:5}[beat];
   var captions={opening:'做出来了，就得卖出去。',expand:r&&r.stock?'多做了，却没卖完。':'都卖完了！再添一台炉？',lead:'炉和人手到了，再开一天。',rival:'邻店老板：“我也添炉！”',pressure:g.story.pressureRounds?f.stock?'两家都剩货了。':'邻店开始剩货了。':'炉子多了，街上还是这些人。',adjust:'换个办法，再试一天。',layoff:g.story.dismissed.length?'厨师：“明天没工资了……”':'老板：“少雇一人，少付一份工资？”',review:g.story.dismissed.length?'少雇之后，顾客的钱也少了。':'这一轮，面包卖完了吗？'};
   c.title('第二幕·面包卖给谁？',captions[beat]);
   if(beat==='opening')el('p','点店看账，点人看钱包。','street-inspect-hint',c.readout);
   var track=el('ol','','street-story-track',c.readout);track.setAttribute('aria-label','本幕的五步');
   ['开门','扩产','跟进','想办法','用工'].forEach(function(name,i){var li=el('li',name,'',track);li.dataset.status=i+1<step?'done':i+1===step?'current':'later';if(i+1===step)li.setAttribute('aria-current','step');});
   var result=el('div','','street-story-result',c.readout);
   if(r&&!r.management){
    [['出炉',r.produced],['卖出',r.sold],['库存',r.stock]].forEach(function(pair){var cell=el('span','','',result);el('span',pair[0],'',cell);el('strong',String(pair[1]),'',cell);});
    var previous=beat==='review'&&g.story.comparison;
    if(previous)el('p','调整前卖出 '+previous.sold+' → 这轮 '+r.sold,'street-story-comparison',result);
    else if(beat==='layoff')el('p',r.stock?'这次还没卖完。':r.cashChange<0?'卖完了，店里的钱却少了。':'这次卖完了，店里的钱也多了。','street-story-line',result);
   }
   var receipt=r&&r.management&&/^(\d+枚付给烤炉厂|邻店花\d+枚|岗位解除了)/.test(g.message);
   if(g.message&&!receipt)el('p',g.message,'street-message',c.readout);
   if(beat==='adjust'||beat==='layoff'){
    var knobs=el('div','','street-knobs');
    function knob(label,value,type,min,max){var group=el('div','','street-knob',knobs);el('span',type==='WAGE'?'工资':'售价','',group);var minus=button('−',type,{delta:-1},group);minus.setAttribute('aria-label','减少'+label);minus.disabled=value<=min;el('output',value+' 枚','',group);var plus=button('＋',type,{delta:1},group);plus.setAttribute('aria-label','增加'+label);plus.disabled=value>=max;}
    knob('每人每轮工资',g.wage,'WAGE',3,7);knob('每个面包售价',g.price,'PRICE',1,Math.min(4,g.wage));
   }
   if(beat==='layoff'){
    if(f.workers.length)button('少雇一位厨师…','PREVIEW_LAYOFF');
    if(g.layoffPreview){var preview=el('div','','street-layoff');el('p','安置款 5枚。下轮少付'+g.wage+'枚工资，少做6个面包。','',preview);button('确认少雇一位','LAYOFF',{},preview);button('算了，先不裁','CANCEL_LAYOFF',{},preview);}
   }
   var actions=el('div','','street-guided-actions');
   if(beat==='opening')button('开门营业 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='expand')button('添炉、招人 →','STORY_EXPAND',{},actions,'primary');
   if(beat==='lead')button('多做些，再开门 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='rival')button('看看邻店怎么做 →','STORY_COMPETE',{},actions,'primary');
   if(beat==='pressure')button(g.story.pressureRounds?'再开一天 →':'两家一起开门 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='adjust')button('用这个办法，开一天 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='layoff')button(g.story.dismissed.length?'再开一天，看看影响 →':'先不裁，再开一天 →','ROUND',{expectedRound:g.world.round},actions,'primary');
   if(beat==='review'){button('回看这条街 →','EXPLAIN',{},actions,'primary');if(r&&r.rivalDecision&&r.rivalDecision.kind==='wage-cut')button('看看邻店降薪后的一天 →','ROUND',{expectedRound:g.world.round},actions);else if(rival.rivalPolicy&&rival.rivalPolicy.pressureDays&&!rival.rivalPolicy.laidOff)button('再开一天，看看邻店 →','ROUND',{expectedRound:g.world.round},actions);button('换个办法再试','STORY_REPEAT');button('继续自由经营','STORY_SANDBOX');}
   var run=actions.querySelector('[data-street-action="ROUND"]');if(run)run.id='street-run';
   if(g.message&&(!r||!r.management)&&beat!=='review')button('继续自由经营','STORY_SANDBOX');
   var transport=el('div','','street-transport');var pause=el('button','暂停','secondary',transport);pause.type='button';pause.id='street-pause';pause.onclick=function(){c.scene.toggle();};var skip=el('button','看结算','secondary',transport);skip.type='button';skip.id='street-finish';skip.onclick=function(){c.scene.finish();};
   c.scene.onChange=function(sample){
    result.hidden=!sample.complete||!r||r.management;
    c.controls.querySelectorAll('[data-street-action]').forEach(function(b){var type=b.dataset.streetAction,delta=Number(b.dataset.delta);b.disabled=!sample.complete||(type==='WAGE'?(delta<0?g.wage<=3:g.wage>=7):type==='PRICE'?(delta<0?g.price<=1:g.price>=Math.min(4,g.wage)):false);});
    pause.hidden=skip.hidden=sample.complete;pause.textContent=sample.playing?'暂停':'继续播放';
   };
  }
  if(c.economyAct&&explaining){renderStreetContradiction(c);return;}
  if(g.campaign&&!explaining){campaign();return;}
  if(g.story&&!explaining){guided();decisions();if(g.tutorial)installStreetBriefing(c);return;}
  c.title('第二幕·面包卖给谁？',explaining?'':g.phase==='intro'?'做出来了，就得卖出去。':g.phase==='own'?'我家的钱，要靠外面的客人来。':g.phase==='neighbors'?'别家也看见了你的办法。':'想多赚一点，你会怎么做？');
  if(explaining){
   c.scene.auto=false;
   var words={social:['各家的生产，已经连在一起。','生产社会化'],private:['一起做，不等于一起决定。','生产资料的资本主义私人占有'],overproduction:f.stock?['卖不掉，不等于没人需要。','生产过剩']:['这次没有出现积压。','生产过剩，不是注定的结局。'],limits:['生产连在一起，决定却各自做。','生产社会化与资本主义私人占有之间的矛盾']}[g.phase];
   el('p',words[0],'street-conclusion',c.readout);el('p',words[1],'street-concept',c.readout);
   if(g.phase==='social')el('p','做面包，要靠别家的炉子和原料。工资，又走进别家的柜台。','small',c.readout);
   if(g.phase==='private')el('p','炉子归老板。工资、投资和用工，由各家老板分别决定。','small',c.readout);
   if(g.phase==='overproduction')el('p',f.stock?'这个价钱下，买家买不了这么多。':r&&r.produced===0&&r.sold===0?'没开工，不等于人人买得起。':'换个工资、售价或产量，也可能卖完。','small',c.readout);
   if(g.phase==='limits'){
    var bounds=el('details','','street-bounds',c.readout);el('summary','实验边界','',bounds);
    el('p','买家不只有工人；本局没有模拟政府、信贷和国外市场。','small',bounds);
    el('p','各店不一定都降薪。一次剩货不等于全面危机，也不证明必然崩溃。','small',bounds);
    el('p','私人雇佣企业街区，不能直接代指社会主义国家。','small',bounds);
    c.ending('继续看煤矿父女的故事 →');
   }else button('再看一层 →','NEXT',{},c.controls,'primary');
   button('重试上一轮','RETRY');return;
  }
  if(c.economyAct)renderStreetEvidence(c);
  var metrics=el('div','','street-metrics street-icon-key',c.readout);metrics.id='street-metrics';
  if(!c.economyAct){var begin=button('重新开门','BEGIN_CAMPAIGN',{},c.controls,'primary');begin.onclick=function(){if(!g.world.round||root.confirm('重新开始第二幕？本幕营业记录会重开，其他幕的选择保留。'))send('BEGIN_CAMPAIGN');};}
  [['bread','库存'],['person','员工'],['cash','余额']].forEach(function(item){var cell=el('span','','',metrics);cell.innerHTML=StreetArt.icon(item[0]);el('span',item[1],'',cell);});
  metrics.title='产品数字是尚未卖出的库存，人数是在册员工；余额是公司现金，不是利润。';
  if(g.message)el('p',g.message,'street-message',c.readout);
  if(g.world.round===0)el('p','点店看账，点人看钱包。','street-inspect-hint',c.readout);
  if(r&&!r.management&&r.stock===0&&r.cashChange<0)el('p','都卖完了，余额反而少了。','street-hint',c.readout);
  var knobs=el('div','','street-knobs');
  function knob(label,value,type,step,min,max){var group=el('div','','street-knob',knobs);el('span',type==='WAGE'?'工资':'售价','',group);var minus=button('−',type,{delta:-step},group);minus.setAttribute('aria-label','减少'+label);minus.disabled=value<=min;el('output',String(value)+' 枚','',group);var plus=button('＋',type,{delta:step},group);plus.setAttribute('aria-label','增加'+label);plus.disabled=value>=max;}
  knob('每人每轮工资',g.wage,'WAGE',1,3,7);knob('每个面包售价',g.price,'PRICE',1,1,Math.min(4,g.wage));
  if(c.economyAct){
   var invest=el('div','','street-investment-actions');
   var expand=button('添炉＋招工','EXPAND_STREET',{},invest);expand.disabled=g.world.round<1||f.machines>=4;expand.dataset.disabled=String(expand.disabled);expand.title='自付烤炉款，招一位街上的待业者；下次营业多一个班次。';
   var follow=button('如果同行也扩产','FOLLOW_EXPANSION',{},invest);follow.disabled=g.world.round<1;follow.dataset.disabled=String(follow.disabled);follow.title='条件实验：同行按各自资金与现有人手投资，不替他们垫钱。';
   var response=el('div','','street-response-choice');el('span','降薪的对照条件','',response);
   [['none','只改本店'],['cut','如果别家也降薪']].forEach(function(pair){var b=button(pair[1],'RESPONSE',{value:pair[0]},response);b.setAttribute('aria-pressed',String(g.response===pair[0]));});
  }
  var businessActions=el('div','','street-business-actions');
  var run=button('营业一轮 →','ROUND',{expectedRound:g.world.round},businessActions,'primary');run.id='street-run';
  var continuous=el('button',c.scene.auto?'停止营业':'持续营业','primary',businessActions);continuous.type='button';continuous.id='street-continuous';continuous.setAttribute('aria-pressed',String(c.scene.auto));
  c.scene.onRound=function(){send('ROUND',{expectedRound:g.world.round});};
  continuous.onclick=function(){c.scene.auto=!c.scene.auto;c.scene.autoWait=0;continuous.textContent=c.scene.auto?'停止营业':'持续营业';continuous.setAttribute('aria-pressed',String(c.scene.auto));if(c.scene.auto&&c.scene.time>=8&&!c.scene.autoPending){c.scene.autoPending=true;c.scene.onRound();}};
  var transport=el('div','','street-transport',businessActions);
  var pause=el('button','暂停','secondary',transport);pause.type='button';pause.id='street-pause';pause.onclick=function(){c.scene.toggle();};
  var speedLabel=el('label','','street-speed',transport),speedOutput=el('output',c.scene.speed+'×','',speedLabel),slider=el('input','','',speedLabel);slider.type='range';slider.min='1';slider.max='4';slider.step='.5';slider.value=String(c.scene.speed);slider.setAttribute('aria-label','营业速度');slider.oninput=function(){c.scene.speed=Number(slider.value);speedOutput.textContent=slider.value+'×';};
  var skip=el('button','看结算','secondary',transport);skip.type='button';skip.id='street-finish';skip.onclick=function(){c.scene.finish();};
  if(g.phase==='own'&&r)button('再看看别家 →','NEXT',{},c.controls,'primary');
  if(['neighbors','manage'].includes(g.phase)){
   if(g.phase==='neighbors')button('继续经营 →','NEXT',{},c.controls,'primary');
  }
  if(g.phase==='manage'){
   // Keep this screen about selling bread, not an optional management menu.
   // Expansion and dismissal remain in their specific guided story steps.
   if(g.message.indexOf('这轮工资和原料还差')===0&&g.shifts>0)button('少开一班，再试试','SHIFTS',{delta:-1});
   if(f.stock)el('p','剩 '+f.stock+' 个。调一调售价，再看看。','street-hint',c.readout);
   if(!c.economyAct||g.world.round>=2&&r&&!r.management)button(c.economyAct?'收摊：看看矛盾在哪里 →':'回看这条街 →','EXPLAIN',{},c.controls,'primary');
   else el('p','再开一天，比较各家怎样互相影响。','street-hint',c.readout);
  }
  decisions();
  if(g.checkpoint)button('重试上一轮','RETRY');
  c.scene.onChange=function(sample){
   continuous.textContent=c.scene.auto?'停止营业':'持续营业';continuous.setAttribute('aria-pressed',String(c.scene.auto));
   c.controls.querySelectorAll('[data-street-action]').forEach(function(b){if(sample.complete){if(b.dataset.disabled==='true'){b.disabled=true;return;}var type=b.dataset.streetAction,delta=Number(b.dataset.delta);b.disabled=type==='WAGE'?(delta<0?g.wage<=3:g.wage>=7):type==='PRICE'?(delta<0?g.price<=1:g.price>=Math.min(4,g.wage)):false;}else b.disabled=true;});
   pause.hidden=skip.hidden=sample.complete;pause.textContent=sample.playing?'暂停':'继续播放';
  };
  if(g.tutorial)installStreetBriefing(c);
 };
})(window);
