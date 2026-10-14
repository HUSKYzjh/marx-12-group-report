(function(root){
 'use strict';
 let focusId=null,executed=null,borrowingOpen=false,repaymentFocus=null,singlesOpen=false,incomeDay=1,incomeFocus=null;
 root.resetPublicDemandPresentation=function(){focusId=null;executed=null;borrowingOpen=false;repaymentFocus=null;singlesOpen=false;incomeDay=1;incomeFocus=null;};
 const names=['阿面','小麦','团团','圆圆','阿青','阿蓝'];
 function el(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 function send(c,a){c.send({type:'RULES',action:{type:'DEMAND',action:a}});}
 function action(c,text,a,parent,cls){const b=el('button',text,parent,cls||'secondary');b.type='button';b.onclick=()=>{if(['RETRY','SHARED_BEGIN','REPLAN'].includes(a.type)){root.resetPublicDemandPresentation();}executed=a.type;send(c,a);};return b;}
 function peep(happy){const b=TRUST_ASSETS.bakery;function crop(url,atlas,key){const f=atlas.frames[key].frame;return '<svg viewBox="'+(f.x+24)+' '+(f.y+34)+' 72 108" aria-hidden="true"><image href="'+url+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
  return '<span class="technology-peep">'+crop(b.body,b.bodyAtlas,'body0000')+crop(happy?b.face:b.nervous,happy?b.faceAtlas:b.nervousAtlas,happy?'face0000':'face_nervous0008')+'</span>';
 }
 function paper(){return '<svg viewBox="0 0 38 46" fill="white" stroke="#777" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 3l25 1 4 36-28 2ZM12 12h13m-13 7h14m-13 7h8"/></svg>';}
 function shelf(){return '<svg viewBox="0 0 180 62" fill="none" stroke="#777" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M8 14h162m-159 0 3 41m151-41-3 41M13 38h151m-145 17h138"/></svg>';}
 function owner(){const b=TRUST_ASSETS.bakery,f=b.hatAtlas.frames.hatguy0000.frame;return '<svg viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'" aria-hidden="true"><image href="'+b.hat+'" width="'+b.hatAtlas.meta.size.w+'" height="'+b.hatAtlas.meta.size.h+'"/></svg><svg class="demand-key" viewBox="0 0 40 36" fill="none" stroke="#777" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16 16l15 15 4-4m-11-7 4-4"/></svg>';}
 root.renderPublicDemand=function(c,t){
  const s=t.demand,a=c.state.demandAccount,last=a.periods[a.periods.length-1],wrap=el('div','',c.readout,'public-demand');wrap.dataset.step=s.step;wrap.dataset.day=String(s.day);wrap.dataset.revision=String(s.revision);wrap.dataset.testid='demand-board';
  const hints={fund:s.day===1?(s.sharedBudget?'拿一叠钱，划过想支持的人。也可以先换炉子。':'先借一点，还是多发一点？把凭证交到人手里。'):s.loanPaid.some(Boolean)?'第二天了。先看剩下的钱，再翻欠条。':'今天仍要吃饭。这点预算，先留给谁？',repay:'欠条翻面了。拖回贷款方，能还多少还多少。',deliver:s.sharedBudget?'先配好面包，再把托盘送到食堂。':'把面包配到采购单，再把整张单交给食堂。',result:'钱花到哪里，谁得到了什么？'};
  const hint=el('p',hints[s.step],wrap,'demand-hint');hint.setAttribute('role','status');
  const probe=s.step==='result'?c.state.demandExploration:null;
  const pieces=[],targets=[];
  const incomeCells=[],dateButtons=[];let brush,brushStatus,brushActions,brushApply,brushCancel,brushConfig,brushController,incomeSingles;
  incomeDay=Math.max(incomeDay,s.day);wrap.dataset.incomeEditor=String(singlesOpen);
  const availableRolls=s.income.filter(x=>x===null).length;
  const plannedFor=(person,day)=>s.income.filter(x=>x?.person===person&&x.day===day).length;
  function chooseIncomeDay(day){root.GestureBoard.cancel();incomeDay=day;dateButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.incomeDay)===day)));if(brushConfig){brushConfig.cells.forEach(cell=>{cell.eligible=plannedFor(cell.id,day)<2;});brushController.refresh();}}
  function target(id,node,button,accepts){node.dataset.demandTarget=id;targets.push({id,node,button,accepts});}
  function piece(id,name,parent,cls){const b=el('button','',parent,cls);b.type='button';b.dataset.demandPiece=id;pieces.push({id,name,node:b});return b;}
  wrap.dataset.shared=!!s.sharedBudget;
  wrap.dataset.loans=s.loans.some(Boolean);
  const balances=el('div','',wrap,'demand-balances');(s.sharedBudget?[['公共预算',a.publicFund],['店里',a.firm],['贷款方',a.lender]]:[['店里',a.firm],['食堂预算',a.publicFund],['贷款方',a.lender],['外部雇主',a.employer]]).forEach(pair=>{const p=el('span','',balances);el('small',pair[0],p);el('strong',pair[1]+'枚',p);});
  if(!s.sharedBudget)action(c,'试试同一笔公共预算 ↺',{type:'SHARED_BEGIN'},wrap,'text-button');
  if(s.sharedBudget&&s.step!=='fund'){const dates=el('div','',wrap,'demand-dates');[1,2].forEach(day=>{const n=el('span',(day===1?'今天':'明天')+(day===s.day?' · 正在这里':''),dates);n.dataset.current=day===s.day;});}
  function machineOrder(parent){const b=piece('machine','给面包店换炉子的采购单',parent,'demand-machine-order');const img=el('img','',b);img.src=TRUST_ASSETS.bakery.newOven;img.alt='新烤炉';img.draggable=false;el('span','换炉子 · 12枚',b);el('small','明天做18个',b);}
  function note(i,parent,repay){const b=piece((repay?'due:':'loan:')+i,(repay?names[i]+'的到期欠条':names[i]+'的借款凭证'),parent,'demand-note');b.innerHTML=paper();el('span',names[i],b);el('span',repay?'还3枚':'借2枚',b);el('small',repay?'本金2＋利息1':'明天还3枚',b);b.dataset.side=repay?'back':'front';return b;}
  function rolls(to,parent){if(s.step!=='fund')return;s.income.forEach((x,i)=>{if(s.incomePaid&&s.incomePaid[i]?.day===1)return;if(to===null?x!==null:!x||x.person!==to.person||x.day!==to.day)return;const b=piece('income:'+i,'第'+(i+1)+'组增收款',parent,'demand-roll');b.innerHTML=StreetArt.icon('cash');el('span','2枚',b);});}
  if(s.step==='fund'||s.step==='repay'){
   const sources=el('div','',wrap,'demand-sources');
   if(!s.sharedBudget||s.step==='repay'||s.day===1){let bankParent=sources;
    if(s.sharedBudget&&s.step==='fund'){bankParent=el('details','',sources,'demand-borrowing');el('summary','钱不够，先借一点？',bankParent);bankParent.open=borrowingOpen;bankParent.ontoggle=()=>{if(!bankParent.isConnected)return;borrowingOpen=bankParent.open;if(!bankParent.open)root.GestureBoard.cancel();};}
    const bank=el('section','',bankParent,'demand-source lender'),bt=el('button',s.step==='repay'?'把到期欠条交回来':'贷款方 · 没签就没借',bank,'demand-destination');bt.type='button';target('lender',bank,bt,id=>s.step==='repay'?id.startsWith('due:'):id.startsWith('loan:'));
    const bankNotes=el('div','',bank,'demand-packets');if(s.step==='fund'&&s.day===1)s.loans.forEach((yes,i)=>{if(!yes)note(i,bankNotes,false);});bankNotes.hidden=s.step==='repay';
   }
   if(s.step==='fund'){
    const employer=el('section','',sources,'demand-source employer'),returnDesk=el('div','',employer,'demand-income-return'),et=el('button',s.sharedBudget?'公共预算 · 未付款可以收回':'雇主的增收款 · 两天共24枚',returnDesk,'demand-destination');et.type='button';target('employer',returnDesk,et,id=>id.startsWith('income:')||id==='machine');
    const dates=el('div','',employer,'demand-income-dates');el('span','现在第'+s.day+'天 · 要排哪天？',dates);[1,2].filter(day=>day>=s.day).forEach(day=>{const b=el('button','第'+day+'天',dates);b.type='button';b.dataset.incomeDay=String(day);b.setAttribute('aria-pressed',String(day===incomeDay));b.onclick=()=>chooseIncomeDay(day);dateButtons.push(b);});
    const meal=el('div','',employer,'demand-income-need'),bread=el('img','',meal);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='面包';bread.draggable=false;el('span','2枚/个 · 吃够两份要4枚',meal);meal.dataset.price='2';meal.dataset.need='2';
    const brushRow=el('div','',employer,'demand-income-brush-row');brush=el('button','',brushRow,'demand-income-brush');brush.type='button';brush.dataset.incomeBrush='true';brush.disabled=!availableRolls;
    brush.innerHTML='<svg viewBox="0 0 76 55" fill="#fffef8" stroke="#777" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M10 16l54-5 4 35-54 5ZM6 10l54-4 4 35-54 5ZM4 6l53-3 4 35-53 4Z"/><circle cx="32" cy="22" r="8" fill="#e8c875"/><path d="M32 17v10"/></svg>';
    el('span',availableRolls?'拿一叠 · 还有'+availableRolls+'份':'这叠已排完',brush);brush.setAttribute('aria-label','拿起一叠增收款');
    brushStatus=el('p','每人一份2枚，划过后松手。签好才发钱。',brushRow,'demand-income-brush-status');brushStatus.setAttribute('role','status');
    brushActions=el('div','',employer,'demand-income-brush-actions');brushApply=el('button','就给这些人安排 →',brushActions,'secondary');brushCancel=el('button','放回去 ↩',brushActions,'secondary');brushApply.type=brushCancel.type='button';
    incomeSingles=el('details','',employer,'demand-income-singles');el('summary','逐张安排或收回',incomeSingles);incomeSingles.open=singlesOpen;incomeSingles.ontoggle=()=>{if(!incomeSingles.isConnected)return;singlesOpen=incomeSingles.open;wrap.dataset.incomeEditor=String(singlesOpen);if(!singlesOpen)root.GestureBoard.cancel();};
    const singlePool=el('div','',incomeSingles,'demand-packets');rolls(null,singlePool);
    const pool=el('div','',employer,'demand-packets');pool.hidden=!(s.sharedBudget&&s.day===1&&!s.machineDraft);if(!pool.hidden)machineOrder(pool);
   }
  }
  if(s.sharedBudget&&s.step!=='repay'){const bakery=el('section','',wrap,'demand-bakery'),bt=el('button','',bakery,'demand-destination');bt.type='button';const equipment=el('span','',bt,'demand-owned-equipment'),boss=el('span','',equipment,'demand-owner');boss.innerHTML=owner();const oven=el('img','',equipment);oven.src=a.machine?TRUST_ASSETS.bakery.newOven:TRUST_ASSETS.bakery.oven;oven.alt=a.machine?'公共预算购置、归老板的新烤炉':'原来的烤炉';el('span','老板的面包店',bt);target('bakery-asset',bakery,bt,id=>id==='machine'&&s.day===1&&s.step==='fund');if(s.day===1&&s.step==='fund'&&s.machineDraft)machineOrder(bakery);el('small',a.machine?'炉子归老板。工资仍是每人1枚。':s.machineDraft?'采购单已放好，签字才花公共预算。':'今天做12个。',bakery);if(s.step==='fund'){
   const preview=el('p','今天安排要付'+a.plannedCost+'枚 · 预算现有'+a.available+'枚',wrap,'demand-budget-preview');preview.dataset.short=!a.canFund;if(!a.canFund)el('small','这笔钱不够。收回一张未付款的凭证再签。',preview);
  }}
  // These receipts come from executed payments, not unsigned notes or draft income.
  const repaymentArea=el('section','',wrap,'demand-repayment-area');repaymentArea.hidden=!a.repayments.length;repaymentArea.setAttribute('role','status');repaymentArea.setAttribute('aria-atomic','true');
  const afterBalances=wrap.querySelector('.demand-sources')||wrap.querySelector('.demand-bakery');if(afterBalances)wrap.insertBefore(repaymentArea,afterBalances);
  function showRepayment(person,animate){
   const receipt=a.repayments.find(r=>r.person===person);if(!receipt)return;
   repaymentFocus=person;repaymentArea.replaceChildren();repaymentArea.dataset.person=String(person);repaymentArea.dataset.amount=String(receipt.amount);
   repaymentArea.dataset.walletBefore=String(receipt.walletBefore);repaymentArea.dataset.walletAfter=String(receipt.walletAfter);repaymentArea.dataset.debt=String(receipt.debtAfter);repaymentArea.dataset.animate=String(!!animate);
   el('small','第二天 · 还款这一刻',repaymentArea,'demand-repayment-title');
   const route=el('div','',repaymentArea,'demand-repayment-route'),from=el('div','',route,'demand-repayment-wallet');from.innerHTML=peep(receipt.walletAfter>=2);el('strong',names[person]+'的钱包',from);el('span',receipt.walletBefore+'枚 → '+receipt.walletAfter+'枚',from);
   const flow=el('div','',route,'demand-repayment-flow');el('span','实际还了'+receipt.amount+'枚',flow);const coins=el('div','',flow,'demand-repayment-coins');coins.setAttribute('aria-hidden','true');for(let i=0;i<receipt.amount;i++){const coin=el('span','',coins);coin.innerHTML=StreetArt.icon('cash');coin.style.setProperty('--coin-delay',(i*100)+'ms');}el('span','⟶',flow,'demand-repayment-arrow');
   const bank=el('div','',route,'demand-repayment-bank');bank.innerHTML=paper();el('strong','贷款方收到',bank);el('span','+'+receipt.amount+'枚',bank);
   el('p',receipt.debtAfter?'还欠'+receipt.debtAfter+'枚 · “钱包空了，欠条还没空。”':receipt.walletAfter>=2?'还清了 · “欠条先下班，我还得吃饭。”':'还清了 · “账清了，肚子可没清。”',repaymentArea,'demand-repayment-debt');
   el('small','贷款方现在有'+a.lender+'枚 · '+names[person]+'现在有'+a.wallets[person]+'枚',repaymentArea,'demand-repayment-current');
  }
  if(a.repayments.length){const chosen=a.repayments.find(r=>r.person===repaymentFocus)||a.repayments[a.repayments.length-1];showRepayment(chosen.person,executed==='REPAY');}
  const people=el('div','',wrap,'demand-people');for(let i=0;i<6;i++){
   const cell=el('section','',people,'demand-person');cell.dataset.person=String(i);
   const portrait=s.step==='fund'?el('button','',cell,'demand-income-person'):cell;if(s.step==='fund'){portrait.type='button';portrait.dataset.incomePerson=String(i);portrait.setAttribute('aria-label','选择'+names[i]+'安排增收');portrait.onclick=()=>{hint.textContent=names[i]+'现在有'+a.wallets[i]+'枚，想吃2个面包。先拿增收款，再选择这个人。';StreetArt.decorateMoney(hint);};incomeCells.push({id:i,node:portrait,eligible:plannedFor(i,incomeDay)<2});}
   portrait.innerHTML=peep(s.step==='fund'&&s.day===1||last.purchases[i]+last.provided[i]>=2);el('strong',names[i]+' · '+a.wallets[i]+'枚',portrait);if(s.step!=='fund')el('small',s.step==='repay'?'欠'+a.debt[i]+'枚':'买了'+last.purchases[i]+'，领了'+last.provided[i],portrait);
   if(s.step==='fund'){
    const schedule=el('div','',cell,'demand-income-schedule');[1,2].filter(day=>day>=s.day&&plannedFor(i,day)>0).forEach(day=>{const mark=el('small','第'+day+'天待发 '+plannedFor(i,day)*2+'枚',schedule);mark.dataset.incomePendingDay=String(day);mark.dataset.amount=String(plannedFor(i,day)*2);});
    if(s.day===1){const loan=el('div','',cell,'demand-pocket loan-pocket'),lb=el('button','借款',loan,'demand-destination');lb.type='button';target('loan:'+i,loan,lb,id=>id==='loan:'+i);if(s.loans[i])note(i,loan,false);}
    [1,2].filter(day=>day>=s.day).forEach(day=>{const pocket=el('div','',cell,'demand-pocket income-pocket'),ib=el('button',day===s.day?'今天增收':'明天增收',pocket,'demand-destination');ib.type='button';target('income:'+i+':'+day,pocket,ib,id=>id.startsWith('income:'));rolls({person:i,day},pocket);});
   }
   if(s.day===2&&s.reviewed[i]){const stamp=el('button',a.debt[i]?'还了'+last.repaid[i]+'枚 · 还欠'+a.debt[i]+'枚':'还清了 · 看钱流',cell,'demand-stamp');stamp.type='button';stamp.dataset.repaymentPerson=String(i);stamp.setAttribute('aria-label','查看'+names[i]+'的实际还款');stamp.onclick=()=>{showRepayment(i,false);repaymentArea.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};}
   if(s.step==='repay'&&s.loanPaid[i]&&!s.reviewed[i])note(i,cell,true);
   if(s.step==='deliver'){
    const capacity=Math.floor(a.publicFund/2)-s.orders.filter(Boolean).length;
    const order=el('section','',cell,'demand-order'),ot=el('button',last.provided[i]?'已收货':last.purchases[i]>=2?'已经吃够了':!s.orders[i]&&capacity<1?'预算不够了':'食堂采购单',order,'demand-destination');ot.type='button';target('order:'+i,order,ot,id=>id.startsWith('bread:')&&!last.provided[i]&&last.purchases[i]<2&&(capacity>=1||s.orders.includes(id.slice(6))));
    if(s.orders[i]){const filled=piece('order:'+i,'给'+names[i]+'的已配货采购单',order,'demand-filled-order');filled.innerHTML=paper();const bread=el('img','',filled);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='已配货，尚未交货';bread.draggable=false;el('span','交给食堂 →',filled);breadPiece(s.orders[i],order);}
    else el('small',last.provided[i]?'预算付了2枚':last.purchases[i]>=2?'不用再买':'收1个，付2枚',order);
   }
  }
  if(s.step==='fund'){
   // Keep the actual recipients beside the money, not behind the machine/store.
   const parent=incomeSingles.parentNode;parent.insertBefore(people,incomeSingles);
   const budget=wrap.querySelector('.demand-budget-preview');if(budget)parent.insertBefore(budget,incomeSingles);
  }
  function breadPiece(id,parent){const b=piece('bread:'+id,'面包'+id,parent,'demand-bread');const img=el('img','',b);img.src=TRUST_ASSETS.bakery.bread;img.alt='面包';img.draggable=false;}
  if(s.step==='fund'){const b=action(c,'签好，去买今天的面包 →',{type:'FUND',expectedRevision:s.revision},wrap,'primary');b.disabled=!a.canFund;}
  if(s.step==='repay'){const b=action(c,'去买今天的面包 →',{type:'SHOP',expectedRevision:s.revision},wrap,'primary');b.disabled=s.loanPaid.some((yes,i)=>yes&&!s.reviewed[i]);}
  if(s.step==='deliver'){
   const goods=el('section','',wrap,'demand-goods'),gb=el('button','店里剩下'+a.stock+'个',goods,'demand-destination');gb.type='button';target('stock',goods,gb,id=>id.startsWith('bread:'));const loaves=el('div','',goods,'demand-loaves');a.inventory.filter(id=>!s.orders.includes(id)).forEach(id=>breadPiece(id,loaves));
   if(s.sharedBudget&&s.orders.some(Boolean)){const tray=piece('tray','已经配好的'+s.orders.filter(Boolean).length+'份面包托盘',wrap,'demand-tray');tray.innerHTML='<svg viewBox="0 0 180 60" fill="none" stroke="#777" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M9 35q75 11 160 0l-9 17H19ZM20 34l5-12h130l7 12"/></svg>';const filled=el('span','',tray,'demand-tray-loaves');s.orders.filter(Boolean).forEach(()=>{const loaf=el('img','',filled);loaf.src=TRUST_ASSETS.bakery.bread;loaf.alt='';loaf.draggable=false;});el('span','装好'+s.orders.filter(Boolean).length+'份 · 尚未交货',tray);}
   const canteen=el('section','',wrap,'demand-canteen'),cb=el('button','',canteen,'demand-destination');cb.type='button';cb.innerHTML=shelf();el('span',a.publicFund<2?'食堂预算用完了':'食堂收货架 · 交货才付钱',cb);target('canteen',canteen,cb,id=>(id==='tray'||id.startsWith('order:'))&&a.publicFund>=2);el('small','今天已收到'+last.publicSold+'个',canteen);
   el('p','第'+s.day+'天 · 私人买了'+last.privateSold+'个，食堂买了'+last.publicSold+'个',wrap,'demand-result');const next=action(c,s.day===1?'收店，过到明天 →':'收店，看两天的结果 →',{type:'NEXT',expectedRevision:s.revision},wrap,'primary');next.disabled=s.orders.some(Boolean);
  }
  if(probe){
   hint.textContent='挪一张凭证，回到同一起点试试。旧账不会被改掉。';
   const result=el('section','',wrap,'demand-person-story');result.dataset.person=String(probe.focusPerson);
   const question=el('h3',probe.question,result);question.dataset.testid='demand-question';
   const portrait=el('div','',result,'demand-probe-person');portrait.innerHTML=peep(probe.personDays[1].bought+probe.personDays[1].provided>=2);el('strong',probe.name,portrait);
   const dates=el('div','',result,'demand-probe-dates');const pockets=[];
   probe.personDays.forEach(p=>{
    const day=el('section','',dates,'demand-probe-day');day.dataset.probeDay=String(p.day);
    const dt=el('button',p.day===1?'今天':'明天',day,'demand-destination');dt.type='button';
    target('probe-income:'+p.day,day,dt,id=>id.startsWith('probe-income:')&&probe.editSlot?.day!==p.day&&s.run.income.filter(x=>x?.person===probe.focusPerson&&x.day===p.day).length<2);
    const meal=el('div','',day,'demand-probe-meal');for(let i=0;i<p.bought+p.provided;i++){const bread=el('img','',meal);bread.src=TRUST_ASSETS.bakery.bread;bread.alt='实际吃到的面包';bread.draggable=false;}if(!p.bought&&!p.provided)el('span','没买到',meal);el('small','自己买'+p.bought+' · 食堂给'+p.provided,day);
    el('span','收店还剩'+p.walletAfterShopping+'枚',day);el('small','当日支持款共'+p.income+'枚',day,'demand-probe-income');
    if(p.day===2&&probe.repayment)el('small','先还'+probe.repayment.amount+'枚 → 手里'+probe.repayment.walletAfter+'枚'+(probe.repayment.debtAfter?' · 仍欠'+probe.repayment.debtAfter+'枚':''),day,'demand-probe-repaid');
    const pocket=el('div','',day,'demand-probe-slip');pockets.push(pocket);
   });
   if(probe.editRoll!==null){const parent=probe.editSlot?pockets[probe.editSlot.day-1]:el('div','',result,'demand-probe-unused');const slip=piece('probe-income:'+probe.editRoll,probe.name+'的一份支持款',parent,'demand-probe-paper');slip.innerHTML=paper();el('span','一份支持款 · 2枚',slip);el('small',probe.editWasPaid?'上次付在这天 · 可以挪':'上次没用 · 试着放一天',slip);}
   if(probe.comparison){const comparison=el('p',probe.comparison.text,result,'demand-probe-comparison');comparison.dataset.comparison=probe.comparison.kind;}
   wrap.insertBefore(result,hint);action(c,'沿用安排，再摆一摆 ↺',{type:'REPLAN',expectedRevision:s.revision},c.controls);
  }
  root.GestureBoard.bind(wrap,{pieces,targets,hint,ghostClass:'demand-ghost',prompt:probe?'把这份支持款放到今天或明天，重新试一次。':hints[s.step],placedMessage:'草稿已改，签好或交货后才付款。',onInspect:id=>{hint.textContent=id.startsWith('probe-income:')?'这是同一起点的新安排，不倒改已付的钱。':id==='canteen'?'配好采购单，再送到收货架。仅把面包放在单上不收钱。':id==='lender'?'第一天借2，第二天应还3。欠款不是现金。':id.startsWith('income:')?(s.sharedBudget?'每人每天最多加4金币，与采购和购炉共用公共预算。':'每人每天最多加4金币，来自雇主原有资金。'):id.startsWith('order:')?'先看这个人缺不缺面包，再配货。已经吃够的单不能多买。':hints[s.step];},onDrop:(id,to)=>{
   focusId=id;if(id.startsWith('probe-income:')){root.resetPublicDemandPresentation();incomeFocus=probe.focusPerson;send(c,{type:'REPLAN_INCOME',roll:Number(id.slice(13)),to:{person:probe.focusPerson,day:Number(to.slice(13))},expectedRevision:s.revision});}
   else if(id==='tray'){executed='DELIVER_BATCH';send(c,{type:'DELIVER_BATCH',expectedRevision:s.revision});}
   else if(id==='machine')send(c,{type:'MACHINE',enabled:to==='bakery-asset'});
   else if(id.startsWith('loan:'))send(c,{type:'LOAN',person:Number(id.slice(5)),enabled:to!=='lender'});
   else if(id.startsWith('income:')){const v=to.split(':');send(c,{type:'INCOME',roll:Number(id.slice(7)),to:to==='employer'?null:{person:Number(v[1]),day:Number(v[2])}});}
   else if(id.startsWith('due:')){executed='REPAY';repaymentFocus=Number(id.slice(4));send(c,{type:'REPAY',person:repaymentFocus,expectedRevision:s.revision});}
   else if(id.startsWith('bread:'))send(c,{type:'MATCH',bread:id.slice(6),person:to==='stock'?null:Number(to.slice(6))});
   else if(id.startsWith('order:')){executed='DELIVER';send(c,{type:'DELIVER',person:Number(id.slice(6)),expectedRevision:s.revision});}
  }});
  if(s.step==='fund'){
   brushConfig={trigger:brush,apply:brushApply,cancel:brushCancel,capacity:availableRolls,cells:incomeCells,onPreview:(ids,active,directStroke)=>{
    brushActions.hidden=!active||directStroke;brushStatus.textContent=active?'第'+incomeDay+'天 · 已选'+ids.length+'人，排'+ids.length*2+'枚。'+(directStroke?'松手排好。':'选择后确认。'):availableRolls?'每人一份2枚，划过后松手。签好才发钱。':'这叠已排完。展开逐张安排，可收回没付的钱。';StreetArt.decorateMoney(brushStatus);
   },onCommit:ids=>{incomeFocus=ids.at(-1);send(c,{type:'INCOME_GROUP',people:ids,day:incomeDay,expectedRevision:s.revision});}};
   brushController=root.GestureBoard.paint(wrap,brushConfig);
  }
  if(focusId){const n=wrap.querySelector('[data-demand-piece="'+focusId+'"]');if(n){if(s.step==='fund'&&focusId.startsWith('income:')){incomeSingles.open=true;singlesOpen=true;wrap.dataset.incomeEditor='true';}n.focus({preventScroll:true});n.dataset.arrived='true';}focusId=null;}
  if(incomeFocus!==null){wrap.querySelector('[data-income-person="'+incomeFocus+'"]')?.focus({preventScroll:true});incomeFocus=null;}if(executed){wrap.dataset.executed=executed;executed=null;}
  if(s.step==='result'){
   if(!probe){const r=el('div','',wrap,'demand-summary');el('p','两天卖出'+a.periods.reduce((n,p)=>n+p.sold,0)+'个 · 剩'+a.stock+'个 · 还欠'+a.debtTotal+'枚',r,'relief-caption');action(c,'回到同一起点，换个安排 ↺',{type:'RETRY'},c.controls);}
   if(a.canConclude)action(c,'谁付款，谁承受下一期？ →',{type:'CONCLUDE'},c.controls,'primary');
  }
  const comparisons=el('div','',wrap,'demand-comparisons');(c.state.demandTrials||[]).slice(-3).forEach(p=>el('span',(p.sharedBudget?(p.machine?'公共买炉':'未买炉'):'旧独立预算')+' · 卖'+p.periods.reduce((n,x)=>n+x.sold,0)+'个 · 公共支出'+(32-p.publicFund)+'枚 · 剩'+p.stock+'个 · 欠'+p.debtTotal+'枚',comparisons));
  const book=el('details','',wrap,'street-bounds');el('summary','账本与假设',book);
  if(probe){book.dataset.demandBook='true';[balances,repaymentArea,wrap.querySelector('.demand-dates'),wrap.querySelector('.demand-bakery'),people,comparisons].filter(Boolean).forEach(n=>book.appendChild(n));action(c,'回到同一起点，换个安排 ↺',{type:'RETRY'},book,'text-button');}
  el('p','独立两天：六人各有2枚，企业40枚、公共预算32枚、贷款方40枚、外部雇主24枚，合计148枚。普通炉每期做12个，工资6枚、原料6枚；每人想吃2个，每个2枚。已经支付的收入、交货和还款不可撤回。',book);
  el('p','增收凭证每组2枚，两天合计最多24枚，每人每天最多4枚。第一天能借每人2枚，第二天先领收入，再归还本金2枚与利息1枚；不足的保留为欠款。这里不模拟银行创造货币；贷款与增收都从现有账户真实转出。',book);
  if(s.sharedBudget)el('p','新情景的增收款、食堂采购与购炉共用现有32枚公共预算，不再从外部雇主24枚付款；其他雇主的存款仍属于他们，不可自动挪用。增收款这里只代表已有财政资金转给个人，不另造工作或人口。第一天可花12枚公共采购新炉，钱付给合并供应商，设备归私人面包店；第一天已产的12个不倒改，第二天产18个、工资仍6枚、原料9枚。没有技术进步必然替代就业或压低工资的预设。',book);
  el('p','这两天里，供应商只收货款，不再把钱用于额外发薪或购物；贷款方也不继续放贷。没有模拟投资带来的其他就业和再消费，不能据此断言现实投资只会增加剩货。',book);
  el('p','公共食堂每期为六人各补最多1个，只有当他没吃够且预算还有2枚时才能采购。面包配单仍是草稿，收货架收到后才向企业付2枚，并记这个人的实际领取。明天的增收凭证不预先付钱，也不是有资金保证的承诺；今天采购后，明天可能需要收回未付款安排。私人购买与公共领取不重复计数。不考虑税、完整财政制度、设备折旧、过期和库存费，只看两期。',book);
  el('p','现在企业'+a.firm+'枚、食堂'+a.publicFund+'枚、贷方'+a.lender+'枚、雇主'+a.employer+'枚、原料商'+a.supplier+'枚、六人合计'+a.wallets.reduce((n,w)=>n+w,0)+'枚。总现金'+a.moneyAfter+'枚；另欠'+a.debtTotal+'枚，不能把债权再次算成现金。',book);
  el('p','重试是同起点的独立反事实，不连续补钱。沿用上次安排只复制未付款的贷款、增收与购炉草稿，不自动还款、重发钱或交货。食堂采购须重新配单并实际交货；只改一个条件且实际采购对象和日期相同，才作单因素对照。比较至少两个真正完成的不同安排，不必点完预设模式。公共服务和收入支持可能改善结果，借款也可能按时还；不证明救助必失败或改变了生产资料占有，也不把公共采购自动当成社会主义制度。',book);
 };
})(window);
