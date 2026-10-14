/* Authored teaching montage. Sales assumptions are deliberately questioned at
 * the end; this is not a forecast or a complete economy. Shared with tests. */
(function(root){
  'use strict';
  var duration=18.4,roundLength=2.4;
  var checkpoints=[0,4.3,6.7,9.1,11.5,13.9,16.4,18.4];
  // Scripted comic escalation, not a random roll or an economic claim.
  var bossLines=['钱，钱，钱，太好了！','我还要更多，更多！','你在那看什么？过来应聘一下吧！','我们前景广阔，再招多些！','炉子翻倍，钱包也得跟上！','再买！再招！这回总够赚了吧？'];
  function clamp(x){return Math.max(0,Math.min(1,x));}
  function smooth(x){x=clamp(x);return x*x*(3-2*x);}
  // A symbolic money pile, not one drawing per monetary unit. Stable slots
  // prevent random flicker; only the newest coin in each stack fades in/out.
  function coinPile(cash){
    if(!Number.isFinite(cash)||cash<0)throw new RangeError('Pile cash must be finite and nonnegative');
    var growth=clamp((Math.log2(cash/8+1)-1)/6),coins=[];
    var heights=[3,6,10,15,20,24,18,13,9,5,2];
    heights.forEach(function(height,col){
      var amount=height*growth;
      for(var row=0;row<height;row++){
        var alpha=clamp(amount-row);if(!alpha)continue;
        var seed=(col*31+row*17)%19;
        coins.push({kind:'stack',x:-49+col*10.4+(seed%5-2)*.55,y:-5-row*5.3+(col%3-1)*1.2,
          width:17.5+seed%4,height:6+seed%3*.4,rotation:(seed%7-3)*.035,alpha:alpha,reveal:alpha});
      }
    });
    [-45,-23,4,28,49].forEach(function(x,i){
      coins.push({kind:'loose',x:x+(i%2?2:-1),y:i%2?0:-4,width:17+i%3,height:12+i%3,
        rotation:(i%3-1)*.24,alpha:clamp(cash/(3+i)),reveal:1});
    });
    return {growth:growth,height:Math.max(12,...coins.map(function(c){return -c.y+c.height/2;})),coins:coins};
  }
  function sample(seconds,wage){
    if(!Number.isInteger(wage)||wage<3||wage>7)throw new RangeError('Expansion wage must be 3–7');
    var time=Math.max(0,Math.min(duration,Number.isFinite(seconds)?seconds:0));
    var round=Math.min(5,Math.max(0,Math.floor((time-2)/roundLength)));
    var progress=time<2?0:clamp((time-2-round*roundLength)/roundLength);
    var before=Math.pow(2,round),count=time<2?1:before*2;
    var purchase=time<2?0:smooth(progress/.32),sales=time<2?0:smooth((progress-.45)/.45);
    var openingCash=15-wage,cashBefore=openingCash;
    for(var r=0;r<round;r++){var units=Math.pow(2,r+1);cashBefore+=units*(15-wage-4)-units;}
    var purchaseCost=time<2?0:before*2,receipts=time<2?0:count*15;
    var wages=time<2?0:count*wage,inputs=time<2?0:count*4;
    var cash=cashBefore-purchaseCost*purchase+(receipts-wages-inputs)*sales;
    var phase=time<2?'thought':progress<.38?'buy':progress<.62?'bake':'sell';
    if(time>=16.5)phase='question';
    return {time:time,round:round,count:count,previousCount:time<2?1:before,purchase:purchase,sales:sales,
      cash:cash,cashBefore:cashBefore,purchaseCost:purchaseCost,receipts:receipts,wages:wages,inputs:inputs,
      phase:phase,blur:smooth((time-16.5)/1.3),question:time>=18,complete:time>=duration,
      bossLine:time>=16.5?'':time<2?'我可以买更多的机器，赚更多钱。':bossLines[round],
      bossLineIndex:time>=16.5?null:time<2?-1:round,
      caption:''};
  }
  root.BakeryExpansionTimeline={duration:duration,checkpoints:checkpoints,sample:sample,coinPile:coinPile,bossLines:bossLines};
})(typeof window==='undefined'?globalThis:window);
