// Teaching animation, not an economic model. No original WBWWB story executes.
// Shared verbatim by the isolated classic-script stage and Node tests.
(function(root){
  'use strict';
  var firstActRate=.7;
  // Only compress the two driving windows; loading, payment and wage flights
  // retain their original local rhythm. The inverse clock keeps every layer in sync.
  function at(t,upgrade){var compressed=t<2.8?t:t<4.8?2.8+(t-2.8)*.45:t<10?t-1.1:t<12?8.9+(t-10)*.45:t-2.2;return compressed*(upgrade?1:firstActRate);}
  var duration=at(16,false),upgradeDuration=at(12,true);
  var captions=[
    {at:0,id:'bake',text:'清早，面包出炉了。'},
    {at:2.8,id:'arrive',text:''},
    {at:4.8,id:'load',text:''},
    {at:7.2,id:'pay',text:'这车面包，卖了10枚金币。'},
    {at:10,id:'depart',text:''},
    {at:12,id:'wages',text:'老板给厨师5枚金币。'},
    {at:14.8,id:'done',text:''},
  ];
  var upgradeCaptions=[
    {at:0,id:'upgrade',text:'换上了新的烤炉。'},
    {at:1.2,id:'produce',text:'烤出了更多面包。'},
    {at:2.8,id:'arrive',text:''},
    {at:4.8,id:'load',text:''},
    {at:7.2,id:'pay',text:'这次共卖了15枚金币。'},
    {at:10,id:'depart',text:''},
    {at:12,id:'choose',text:'这次，给厨师分多少？'},
  ];
  captions=captions.map(function(c){return {at:at(c.at,false),id:c.id,text:c.text};});
  upgradeCaptions=upgradeCaptions.map(function(c){return {at:at(c.at,true),id:c.id,text:c.text};});
  function clamp(v){return Math.max(0,Math.min(1,v));}
  function tween(t,start,seconds){var p=clamp((t-start)/seconds);return p*p*(3-2*p);}
  function sample(seconds,options){
    options=options||{};var upgrade=options.upgrade===true;
    var total=upgrade?15:10,targetWage=upgrade?(options.committed?options.wage:0):5;
    var sceneDuration=upgrade?upgradeDuration:duration;
    var elapsed=Math.max(0,Math.min(sceneDuration,Number.isFinite(seconds)?seconds:0));
    var clock=upgrade?elapsed:elapsed/firstActRate;
    var t=clock<2.8?clock:clock<3.7?2.8+(clock-2.8)/.45:clock<8.9?clock+1.1:clock<9.8?10+(clock-8.9)/.45:clock+2.2;
    if(elapsed>=sceneDuration)t=upgrade?12:16;
    t=Math.round(t*1e9)/1e9;
    var script=upgrade?upgradeCaptions:captions;
    var caption=script[0];script.forEach(function(c){if(elapsed>=c.at)caption=c;});
    var distributionTime=upgrade?(elapsed>=sceneDuration?options.distributionSeconds||0:0):Math.max(0,t-12);
    var wageStep=upgrade?.12:.32;
    var money=Array.from({length:total},function(_,i){return {pay:tween(t,7.2+i*(upgrade?.12:.18),upgrade?.12:.18),wage:i<targetWage?tween(distributionTime,i*wageStep,wageStep):0};});
    var paid=money.filter(function(m){return m.pay===1;}).length;
    var wages=money.filter(function(m){return m.wage===1;}).length;
    var truckArrive=tween(t,2.8,2),truckLeave=tween(t,10,2);
    return {time:elapsed,storyTime:t,duration:sceneDuration,phase:caption.id,caption:caption.text,complete:elapsed>=sceneDuration,
      paid:paid,wages:wages,boss:paid-wages,
      targetWage:targetWage,balanceProgress:tween(distributionTime,0,Math.max(.2,targetWage*wageStep)),
      showBalances:truckLeave===1&&wages===targetWage&&(!upgrade||options.committed===true&&distributionTime>=Math.max(.2,targetWage*wageStep)),
      truckArrive:truckArrive,truckLeave:truckLeave,
      baked:upgrade?Math.floor(12*tween(t,1.2,1.6)):8,
      driverApproach:tween(t,4.8,1.4),driverReturn:tween(t,9.2,.8),
      bread:Array.from({length:upgrade?12:8},function(_,i){return tween(t,4.8+i*(upgrade?.12:.18),.8);}),
      money:money,
    };
  }
  function captionFor(s,upgrade,committed){return upgrade&&committed&&s.complete?(s.showBalances?'':'老板把金币分给厨师。'):s.caption;}
  root.BakeryTimeline={duration:duration,upgradeDuration:upgradeDuration,captions:captions,upgradeCaptions:upgradeCaptions,at:at,sample:sample,captionFor:captionFor};
})(typeof window==='undefined'?globalThis:window);
