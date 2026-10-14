/* Reuses the credited WBWWB layers and our oven; gold and camera motion are
 * native vector choreography, not newly generated raster artwork. */
(function(root){
  'use strict';
  root.BakeryExpansionScene=function(textures){
    var self=this;self.graphics=new PIXI.Container();self.graphics.visible=false;
    self.world=new PIXI.Container();self.graphics.addChild(self.world);
    self.time=0;self.width=960;self.wage=5;self.playing=false;self.reduced=false;
    function sprite(texture,parent){var s=new PIXI.Sprite(texture);s.anchor.set(.5,1);parent.addChild(s);return s;}
    self.units=Array.from({length:64},function(){
      var group=new PIXI.Container();self.world.addChild(group);
      var oven=sprite(textures.newOven,group);oven.width=78;oven.height=78*260/310;oven.position.set(24,80);
      var chef=new PIXI.Container();group.addChild(chef);chef.position.set(-40,80);chef.scale.set(.55);
      var body=_makeMovieClip('bakery_body',{anchorX:.5,anchorY:1});body.gotoAndStop(0);chef.addChild(body);
      var face=_makeMovieClip('bakery_face',{anchorX:.5,anchorY:1});face.gotoAndStop(0);chef.addChild(face);
      var hat=sprite(textures.chefHat,chef);hat.position.set(0,-84);
      return {graphics:group,chef:chef,oven:oven};
    });
    var boss=_makeMovieClip('bakery_hatguy',{anchorX:.5,anchorY:1});self.graphics.addChild(boss);self.boss=boss;
    var gold=new PIXI.Container();self.graphics.addChild(gold);self.gold=gold;
    var stacks=new PIXI.Graphics();gold.addChild(stacks);
    var loose=Array.from({length:5},function(){var c=_makeMovieClip('iterated_coin',{anchorX:.5,anchorY:.5});gold.addChild(c);return c;});
    var flights=Array.from({length:4},function(){var c=_makeMovieClip('iterated_coin',{anchorX:.5,anchorY:.5});c.scale.set(13/102);self.graphics.addChild(c);return c;});
    var cashLabel=new PIXI.Text('',{fontFamily:'WorkshopHand, Microsoft YaHei, sans-serif',fontSize:18,fill:0x716031});cashLabel.anchor.set(.5,0);self.graphics.addChild(cashLabel);
    function layout(count){var compact=self.width<=640,cols=Math.min(8,Math.ceil(Math.sqrt(count))),rows=Math.ceil(count/cols);return {cols:cols,rows:rows,scale:Math.min(1.5,(self.width*(compact?.56:.62)-30)/(cols*124),310/(rows*112))};}
    function point(i,l){return {x:(i%l.cols-(l.cols-1)/2)*124,y:(Math.floor(i/l.cols)-(l.rows-1)/2)*112};}
    self.render=function(){
      var s=BakeryExpansionTimeline.sample(self.time,self.wage);self.sample=s;
      var w=self.width,compact=w<=640,from=layout(s.previousCount),to=layout(s.count),p=s.purchase;
      self.world.position.set(w*(compact?.24:.34),212);self.world.scale.set(from.scale+(to.scale-from.scale)*p);
      self.units.forEach(function(unit,i){unit.graphics.visible=i<s.count;if(!unit.graphics.visible)return;
        var b=point(i,to),a=i<s.previousCount?point(i,from):b;unit.graphics.position.set(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p);
        unit.graphics.alpha=i<s.previousCount?1:p;
        unit.chef.rotation=!self.reduced&&s.phase==='bake'?Math.sin(self.time*12+i)*.06:0;
        unit.oven.rotation=!self.reduced&&s.phase==='bake'?Math.sin(self.time*9+i)*.006:0;
      });
      boss.scale.set(compact?.72:.92);boss.position.set(w*.75,300);
      boss.rotation=!self.reduced&&s.phase==='sell'?Math.sin(self.time*8)*.025:0;
      var gx=w*.88,base=330,pile=BakeryExpansionTimeline.coinPile(s.cash);self.pile=pile;gold.position.set(gx,base);
      stacks.clear();var looseIndex=0;
      pile.coins.forEach(function(coin,i){
        if(coin.kind==='loose'){
          var c=loose[looseIndex++];c.position.set(coin.x,coin.y);c.scale.set(coin.width/102,coin.height/102);c.rotation=coin.rotation;c.alpha=coin.alpha;return;
        }
        var drop=!self.reduced&&s.sales>0&&s.sales<1?Math.sin(coin.reveal*Math.PI)*7:0,y=coin.y-drop;
        stacks.lineStyle(1.25,0x75633e,coin.alpha);stacks.beginFill(i%3===0?0xf1c654:0xf7d56c,coin.alpha);
        // Uneven elliptical rims: sideways coins, rather than dots in a cone.
        var rx=coin.width/2,ry=coin.height/2;
        for(var k=0;k<=16;k++){var angle=k*Math.PI/8,x=coin.x+Math.cos(angle)*rx;
          var edgeY=y+Math.sin(angle)*ry+Math.cos(angle)*coin.rotation*rx;
          if(!k)stacks.moveTo(x,edgeY);else stacks.lineTo(x,edgeY);
        }
        stacks.endFill();stacks.lineStyle(.8,0xfff1b6,coin.alpha*.8);stacks.moveTo(coin.x-rx*.6,y-1);stacks.lineTo(coin.x+rx*.45,y-1.3);
      });
      flights.forEach(function(c,i){var q=s.sales*1.4-i*.14;c.visible=!self.reduced&&s.sales>0&&s.sales<1&&q>0&&q<1;
        if(c.visible){c.position.set(w*.6+(gx-w*.6)*q,250+(base-pile.height*.6-250)*q-Math.sin(q*Math.PI)*55);c.rotation=q*1.4;}
      });
      cashLabel.text='留下的钱';cashLabel.style.fontSize=compact?26:18;cashLabel.position.set(gx,345);
      if(self.onChange)self.onChange(s);
    };
    self.open=function(width,reduced,wage){self.width=width;self.reduced=reduced;self.wage=wage;self.time=0;self.playing=!reduced;self.graphics.visible=true;self.render();};
    self.resize=function(width){self.width=width;self.render();};
    self.close=function(){self.graphics.visible=false;self.playing=false;};
    self.seek=function(time){self.time=Math.max(0,Math.min(BakeryExpansionTimeline.duration,time));self.playing=false;self.render();};
    self.restart=function(){self.time=0;self.playing=!self.reduced;self.render();};
    self.tick=function(delta){if(!self.graphics.visible||!self.playing)return;self.time=Math.min(BakeryExpansionTimeline.duration,self.time+Math.min(delta/60,.05));if(self.time>=BakeryExpansionTimeline.duration)self.playing=false;self.render();};
  };
})(window);
