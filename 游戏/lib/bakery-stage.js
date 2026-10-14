/* Original WBWWB character art + authored kitchen SVGs. No WBWWB game logic. */
(function(root){
  'use strict';
  root.BakeryScene=function(textures){
    var self=this;
    self.graphics=new PIXI.Container();self.graphics.visible=false;self.graphics.y=-53;
    self.time=0;self.playing=false;self.width=960;self.mode='old';self.upgradeWage=5;self.upgradeCommitted=false;self.distributionTime=0;self.reduced=false;
    self.reactionRemaining=0;self.reactionKind=null;self.boundarySeen=null;
    function sprite(texture,parent){var s=new PIXI.Sprite(texture);s.anchor.set(.5,1);(parent||self.graphics).addChild(s);return s;}
    var oven=sprite(textures.oven),chef=new PIXI.Container();self.graphics.addChild(chef);
    var chefBody=_makeMovieClip('bakery_body',{anchorX:.5,anchorY:1});chefBody.gotoAndStop(0);chef.addChild(chefBody);
    var chefFace=_makeMovieClip('bakery_face',{anchorX:.5,anchorY:1});chefFace.gotoAndStop(0);chef.addChild(chefFace);
    // AngryPeep uses a one-third horizontal anchor, unlike the normal face.
    // Early closed-mouth frames avoid the original shouting sequence.
    var chefAngry=_makeMovieClip('bakery_angry',{anchorX:1/3,anchorY:1});chefAngry.gotoAndStop(3);chefAngry.visible=false;chef.addChild(chefAngry);
    var chefHat=sprite(textures.chefHat,chef);chefHat.position.set(0,-84);
    self.chef={graphics:chef,body:chefBody,face:chefFace,angry:chefAngry,hat:chefHat};
    var boss=_makeMovieClip('bakery_hatguy',{anchorX:.5,anchorY:1});self.graphics.addChild(boss);
    var driver=new PIXI.Container();self.graphics.addChild(driver);
    var body=_makeMovieClip('bakery_body',{anchorX:.5,anchorY:1});driver.addChild(body);body.gotoAndStop(0);
    var face=_makeMovieClip('bakery_face',{anchorX:.5,anchorY:1});driver.addChild(face);face.gotoAndStop(0);
    var truck=sprite(textures.truck);
    self.graphics.addChild(driver);
    var bread=Array.from({length:12},function(){return sprite(textures.bread);});
    var coins=Array.from({length:15},function(){var c=_makeMovieClip('iterated_coin',{scale:21/102});self.graphics.addChild(c);return c;});
    var labels=new PIXI.Container();labels.visible=false;self.graphics.addChild(labels);
    function label(text){var l=new PIXI.Text(text,{fontFamily:'WorkshopHand, Microsoft YaHei, sans-serif',fontSize:28,fill:0x555555});l.anchor.set(.5,.5);labels.addChild(l);return l;}
    var chefLabel=label('厨师'),bossLabel=label('老板');
    var labelCoins=[chefLabel,bossLabel].map(function(){var c=_makeMovieClip('iterated_coin',{anchorX:.5,anchorY:.5});labels.addChild(c);return c;});
    self.labels=labels;self.oven=oven;self.boss=boss;self.coins=coins;self.truck=truck;
    self.render=function(){
      var w=self.width,compact=w<=640,upgrade=self.mode==='upgrade';
      var s=BakeryTimeline.sample(self.time,{upgrade:upgrade,wage:self.upgradeWage,committed:self.upgradeCommitted,distributionSeconds:self.distributionTime});self.sample=s;
      s.reactionActive=upgrade&&self.reactionRemaining>0;s.reactionKind=s.reactionActive?self.reactionKind:null;
      s.previewWage=s.reactionActive?(self.reactionKind==='low'?2:8):self.upgradeWage;
      // The oven shares the title's centre; people and coin readouts balance
      // either side. The moving truck does not shift this stationary stage.
      var chefX=w*.28,bossX=w*.72,ovenX=w*.5,park=w*.84;
      var newOven=upgrade&&self.time>=.6;
      oven.texture=newOven?textures.newOven:textures.oven;
      oven.width=newOven?(compact?196:246):(compact?145:183);oven.height=oven.width*260/(newOven?310:240);oven.position.set(ovenX,278);
      oven.alpha=upgrade&&!self.reduced&&self.time<1.2?(self.time<.6?1-self.time/.6:(self.time-.6)/.6):1;
      // Keep the original head/body proportions; only the separate hat is new.
      var unhappy=upgrade&&s.complete&&self.upgradeWage<5;
      chefAngry.visible=unhappy;chefFace.visible=!unhappy;
      var hot=s.reactionActive&&s.reactionKind==='low';chefBody.tint=chefAngry.tint=hot?0xf16c60:0xffffff;
      chefAngry.gotoAndStop(hot?5:3);
      chef.scale.set(compact?1:1.15);chefFace.gotoAndStop(upgrade?(s.complete&&self.upgradeWage>5?6:0):(s.wages>0?6:0));
      var baking=s.phase==='bake'||s.phase==='produce';
      chef.position.set(chefX,282-(self.playing&&baking?Math.abs(Math.sin(s.time*5))*3:0));
      chef.rotation=baking?Math.sin(s.time*3)*.025:s.phase==='wages'?.035:0;
      if(hot&&!self.reduced)chef.rotation+=Math.sin(self.reactionRemaining*28)*.055;
      boss.scale.set(compact?1:1.15);boss.position.set(bossX,282);boss.rotation=s.phase==='pay'?Math.sin(s.time*5)*.025:0;
      if(s.reactionActive&&s.reactionKind==='high'&&!self.reduced)boss.rotation=Math.sin(self.reactionRemaining*18)*.035;
      var truckX=w+160+(park-w-160)*s.truckArrive-(park+220)*s.truckLeave;
      truck.width=compact?165:212;truck.height=truck.width*150/260;truck.position.set(truckX,455);
      var outside=s.storyTime>=4.8&&s.storyTime<9.95;
      driver.visible=s.truckArrive>0&&s.truckLeave<.97;body.visible=outside;
      driver.scale.set(outside?(compact?.55:.62):(compact?.16:.20));
      if(outside)driver.position.set(park+(bossX+46-park)*s.driverApproach+(park-bossX-46)*s.driverReturn,398-Math.abs(Math.sin(s.time*12))*3);
      else driver.position.set(truckX-truck.width*.285,455-truck.height*.375);
      driver.rotation=outside?Math.sin(s.time*10)*.04*(s.driverApproach<1||s.driverReturn>0?1:0):0;
      face.gotoAndStop(s.phase==='pay'?6:0);
      bread.forEach(function(b,i){
        if(i>=s.bread.length||i>=s.baked){b.visible=false;return;}
        var p=s.bread[i],fromX=ovenX+((i%4)-1.5)*30,fromY=327-Math.floor(i/4)*22;
        var toX=truckX+truck.width*.16+((i%4)-1.5)*20,toY=415-Math.floor(i/4)*18;
        b.width=compact?28:34;b.height=b.width*42/64;
        b.position.set(fromX+(toX-fromX)*p,fromY+(toY-fromY)*p-Math.sin(p*Math.PI)*65);
        b.rotation=Math.sin(p*Math.PI)*.15;b.visible=s.truckLeave<.97||p<1;
      });
      coins.forEach(function(c,i){
        if(i>=s.money.length){c.visible=false;return;}
        var coinBaseline=upgrade?354:326;
        var m=s.money[i],fromX=bossX+46,fromY=327,bossCoinX=bossX+((i%5)-2)*24,bossCoinY=coinBaseline-Math.floor(i/5)*25;
        if(i>=s.targetWage){var j=i-s.targetWage;bossCoinX+=(((j%5)-(i%5))*24)*s.balanceProgress;bossCoinY+=(Math.floor(i/5)-Math.floor(j/5))*25*s.balanceProgress;}
        var targetX=chefX+((i%5)-2)*24,targetY=coinBaseline-Math.floor(i/5)*25;
        c.visible=m.pay>0;
        c.position.set(fromX+(bossCoinX-fromX)*m.pay+(targetX-bossCoinX)*m.wage,
          fromY+(bossCoinY-fromY)*m.pay+(targetY-bossCoinY)*m.wage-Math.sin(m.pay*Math.PI)*34-Math.sin(m.wage*Math.PI)*70);
      });
      // Reveal the final split only after the truck has left and all five
      // wage coins have reached the chef. Replay hides both labels again.
      labels.visible=s.showBalances;
      chefLabel.text='厨师 · '+s.wages;bossLabel.text='老板 · '+s.boss;
      // Reuse the truck's vacated horizontal band, after its departure only.
      // Larger logical type offsets the canvas scale on narrow screens.
      var labelY=truck.y-truck.height/2;
      chefLabel.style.fontSize=bossLabel.style.fontSize=compact?40:28;
      [chefLabel,bossLabel].forEach(function(l,i){var diameter=compact?32:23,gap=5,center=i?bossX:chefX;l.position.set(center-(diameter+gap)/2,labelY);labelCoins[i].scale.set(diameter/102);labelCoins[i].position.set(center+l.width/2+gap/2,labelY);});
      if(self.onChange)self.onChange(s);
    };
    self.open=function(width,reduced,mode){self.width=width;self.time=0;self.reduced=reduced;self.mode=mode||'old';self.distributionTime=0;self.upgradeCommitted=false;self.upgradeQueued=false;self.reactionRemaining=0;self.reactionKind=null;self.boundarySeen=null;self.playing=!reduced;self.graphics.visible=true;self.render();};
    self.configureUpgrade=function(wage,committed,boundary,serial){
      if(self.upgradeCommitted!==committed)self.distributionTime=self.reduced&&committed?2.2:0;
      if(self.boundarySeen!==null&&serial!==self.boundarySeen&&boundary&&!committed&&self.time>=self.duration()){self.reactionKind=boundary;self.reactionRemaining=1.2;}
      self.boundarySeen=serial;self.upgradeWage=wage;self.upgradeCommitted=committed;self.render();
    };
    self.resize=function(width){self.width=width;self.render();};
    self.close=function(){self.graphics.visible=false;self.playing=false;};
    self.restart=function(reduced){self.time=0;self.reactionRemaining=0;self.playing=!reduced;self.distributionTime=reduced&&self.upgradeCommitted?2.2:0;self.render();};
    self.duration=function(){return self.mode==='upgrade'?BakeryTimeline.upgradeDuration:BakeryTimeline.duration;};
    self.seek=function(seconds){self.time=Math.max(0,Math.min(self.duration(),seconds));self.playing=false;self.render();};
    self.tick=function(delta){if(!self.graphics.visible)return;var dt=Math.min(delta/60,.05),changed=false,duration=self.duration();if(self.reactionRemaining>0){self.reactionRemaining=Math.max(0,self.reactionRemaining-dt);changed=true;}if(self.playing){self.time=Math.min(duration,self.time+dt);if(self.time>=duration)self.playing=false;changed=true;}if(self.mode==='upgrade'&&self.upgradeCommitted&&self.time>=duration&&self.distributionTime<2.2){self.distributionTime=Math.min(2.2,self.distributionTime+dt);changed=true;}if(changed)self.render();};
  };
})(window);
