(function(root){
 'use strict';
 const sources=[
  {title:'美联储历史：次贷危机',url:'https://www.federalreservehistory.org/essays/subprime-mortgage-crisis',note:'住房贷款、打包转售、抵押物与再融资，及危机对实体经济的传导。已读取正文；不据此宣称单一成因。'},
  {title:'美联储历史：大衰退及其后',url:'https://www.federalreservehistory.org/essays/great-recession-and-its-aftermath',note:'核对2006住房活动转折、2007金融压力、2008秋加剧、2009经济与就业后果。指数口径的房价峰值不同，不混为一个精确日期。'},
  {title:'Bernanke 2010年证词：触发因素与脆弱性',url:'https://www.federalreserve.gov/newsevents/testimony/bernanke20100902a.htm',note:'核对短期融资、杠杆、信用收缩及证券化的收益和风险；这是证词作者的分析，不代表所有研究结论。'},
  {title:'B站文稿：危机中的获利与信贷化',url:'https://www.bilibili.com/video/BV1Jt4y1B72f/',note:'依据用户提供机器文字稿约30:38—34:43提炼问题。未逐句听校；“做空进一步掏空整个经济”和资本分类的强断言不直接用作模型定律。'}
 ];
 const names={h0:'家庭甲',h1:'家庭乙',h2:'家庭丙',h3:'家庭丁',originator:'发贷机构',seller:'卖房人',investor:'出资者',saver:'短期出借者',fund:'信贷机构',employers:'家庭雇主',homebuyer:'房屋买家',service:'处置服务方',treasury:'公共账户',bakery:'面包店',w0:'厨师甲',w1:'厨师乙',w2:'厨师丙',trader:'看跌交易者',insurer:'保护卖方'};
 const topics=[
  {title:'历史：2008不是突然的一天',pages:[
   '美国住房与信贷扩张在危机前已持续多年。2006年前后住房活动转弱；2007年房贷相关损失和融资压力显现，美国经济于2007年12月进入衰退。2008年秋金融动荡与经济收缩加剧。',
   '2008年9月雷曼兄弟破产，AIG随后获得支持。经济活动于2009年中触底，并不意味着家庭生活立即复原：失业率从不足5%升至10%，复苏中的就业与住房损失仍持续。该失业率为历史资料中的美国全国数据，不是本实验的人数比例。',
   '住房市场下行通过建筑活动、家庭财富和消费、金融机构放贷与企业市场融资影响实体经济。本实验只操作其中“房贷损失或短期融资受阻→信用收紧→面包店少开工”这一条，不声称完整复演美国或全球危机。'
  ]},
  {title:'这本小账怎么运转？',pages:[
   '所有人物、金币、房屋和参数都是教学假设，不是真实历史金额。本局不接主线账本、不写存档。4户家庭各有5枚首付，发贷机构有80枚；每户借20、付25买房。贷款从已有现金转出，不模拟商业银行创造存款。房子已经存在，不把房价上涨算成新建产出。',
   '信贷机构购入80枚房贷组合的可转让凭证，出资者先垫10或30枚，另借短钱70或50枚。为便于追踪，凭证代表整组房贷的收益权，不另设分层、担保链与受托账户；底层债权只算一次。出售后原发贷机构收回80枚，但本金义务没有消失，付款对象变为信贷机构。现实证券化不必然失败。',
   '本期每户收到收入8或2枚，先付1枚利息，再付最多3枚本金。收入不足时出现欠付，不是房价一跌就自动违约。收入下降是玩家选择的外部条件，不宣称其历史上唯一由技术替代引起。房价从25变为15，仅改抵押物处置价；按约还款时，房贷债权仍按剩余本金记账。',
   '欠付家庭若未获补助，在本实验的处置节点出售抵押房屋，收15、付服务费1，其余偿债；不够的本金核销，超出的返还家庭。这是假设的无追索处置合同，不代表美国各州法律，也不代表迟付一期就会现实失房。家庭失去产权，未模拟其之后的租住与福利安排。',
   '偿付前“估计资本”用预计回收额计资产；实际处置后才记真实核销。账面资本＝现款＋贷款资产－借款负债。房屋报价下跌不是等额现金消失；到期借款付不出是流动性缺口，不自动等于资不抵债。实际银行还会计提拨备、估值证券并受监管，本实验没有覆盖全部规则。',
   '若短期出借者不续借，本期要求返还20枚本金；剩余借款继续存在。先还到期借款，若仍欠付或资本不足8枚，暂停新的企业贷款；否则最多给面包店8枚。8枚资本门槛是游戏规则，不是现实法定比例。面包店原有4枚，每位厨师工资4枚，最多3人。实际借款和实际发薪逐笔转账，不凭按钮出现就宣布就业被救回。',
   '四户家庭使用相同参数，未模拟地区、收入和贷款产品差异。负资本机构未进行完整破产清算，短期债权人仍持有剩余债权，不能把资本缺口当作他已经实现的损失。未估算资产贱卖、挤兑外溢、救助股权稀释比例与未来回收；这些是实验边界，不是不存在。'
  ]},
  {title:'救助不是同一种钱',pages:[
   '周转贷款：公共账户借出20枚，机构增加现金，同时增加20枚负债。它不填补资本损失；本实验只向估计资本为正的机构提供。没有计算下一期贷款利息与偿还，不能把20枚当作最终财政损失。',
   '注资：公共账户用20枚认购机构股权，机构资本增加，公共账户取得股权资产，不是无偿送钱。它可能恢复企业放贷，但不自动取消家庭的房贷或归还房子。股权将来的回收和政策净成本未模拟。',
   '家庭补助：从公共账户既有20枚中支付本期欠付额，最多8枚；家庭随即补还本金。它可阻止本实验的抵押处置，却不保证解除独立的短期融资压力。资金来源为本局预置的公共预算，不模拟新增税收、发债或央行发行。',
   '这三种是假想工具对照，不是对2008所有真实方案的绩效估计。历史上有流动性贷款、担保、资产购买、资本支持和住房援助等不同工具，额度、付款、资产回收与净成本须分别查证。本作未估计的真实财政净成本不填数字。'
  ]},
  {title:'有人看跌，为什么会赚钱？',pages:[
   '本局可选择一个假想信用保护合约：交易者先付1枚给卖方；若房贷实际处置出现本金损失，卖方另付5枚，否则不赔。损益分别为赚4或亏1，付款对手方有既有20枚，不从面包店工资账扣钱。两方合计现金不变。',
   '此合约只示意信用保护的支付关系，不是普通借券卖空，也不是实际2008合约的报价与规模。真实交易涉及保证金、定价、对手方和连锁风险。本局没有把合约获利设为家庭违约的原因；“有人赚了”不能单独证明他造成危机，亦不能说这笔收益等额掏空了实体经济。'
  ]},
  {title:'回到科技与基本矛盾',pages:[
   '技术能扩大生产和改善用途，但产品卖出仍需支付能力；信用可安排跨期支出，也会留下偿付关系。金融产品设计、交易技术与生产技术不是同一件事。本例不把2008年归因于AI，更不能用一条房贷链证明资本主义必然自动崩溃。',
   '这里继续追问：相互依赖的生产、消费和融资，为什么由分散主体按各自的收益与风险决策？风险和救助成本由谁承担？这是联系生产社会化与资本主义私人占有的分析入口，不以“存在贷款”本身替代基本矛盾的定义；本例也不直接代指社会主义国家。'
  ]}
 ];
 function mount(parent){
  const entry=document.createElement('details');entry.className='mortgage-entry';entry.dataset.testid='mortgage-entry';parent.appendChild(entry);
  const label=document.createElement('summary');label.textContent='2008：房贷出事，面包店为什么少开工？';entry.appendChild(label);
  let ready=false;entry.ontoggle=function(){if(!entry.open||ready)return;ready=true;build(entry);entry.scrollIntoView?.({block:'start'});};return entry;
 }
 function build(parent){
  let page=0,config={capital:10,shock:'stable',rollover:true,policy:'none',protection:false},comparison=null;
  const desk=document.createElement('section');desk.className='mortgage-lab';desk.dataset.testid='mortgage-lab';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';box.appendChild(n);if(root.StreetArt)root.StreetArt.decorateMoney(n);return n;}
  function button(text,id,fn,box,active){const b=el('button',text,box||desk,'secondary');b.type='button';b.dataset.mortgageAction=id;if(active!==undefined)b.setAttribute('aria-pressed',String(active));b.onclick=function(){const oldPage=page,oldConfig=config;fn();draw();let target=desk.querySelector('[data-mortgage-action="'+id+'"]');if(target?.closest?.('details:not([open])'))target=null;(target||desk.querySelector('h3')).focus({preventScroll:true});if(page!==oldPage||(page===4&&config!==oldConfig))desk.scrollIntoView?.({block:'start'});};return b;}
  function facts(box,rows){const list=el('dl','',box,'mortgage-facts');rows.forEach(function(row){const cell=el('div','',list);el('dt',row[0],cell);el('dd',row[1],cell);});}
  function house(box,lost,preview){const icon=el('span','',box,'mortgage-house');icon.setAttribute('role','img');icon.setAttribute('aria-label',preview?'待售房屋，家庭还未购买':lost?'家庭已失去房屋产权':'家庭拥有的房屋');icon.innerHTML='<svg viewBox="0 0 72 76" aria-hidden="true"><g fill="white" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 31 34 5l32 26-5 2v37L10 71V31M27 70V48h18v22M17 33h12v10H17Zm29 0h12v10H46Z"/></g>'+(lost?'<path d="m12 12 50 50M62 12 12 62" fill="none" stroke="#888" stroke-width="2" stroke-dasharray="4 4"/>':'')+'</svg>';}
  function homes(box,a,preview){const row=el('div','',box,'mortgage-homes');a.mortgages.forEach(function(m){const cell=el('div','',row);house(cell,m.homeOwner==='homebuyer',preview);el('span','家庭'+['甲','乙','丙','丁'][m.id],cell);});}
  function chef(box,id,employed){const a=root.TRUST_ASSETS.bakery,frame=a.bodyAtlas.frames.body0000.frame,face=a.faceAtlas.frames[employed?'face0000':'face0001']?.frame||a.faceAtlas.frames.face0000.frame;
   const p=el('span','',box,'mortgage-chef');p.setAttribute('role','img');p.setAttribute('aria-label','厨师'+(id+1)+(employed?'：本期领到工资4枚':'：本期未获排班，工资0'));
   const layer=(src,atlas,f)=>'<svg x="0" y="12" width="60" height="70" viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'"><image href="'+src+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';
   p.innerHTML='<svg viewBox="0 0 60 86" aria-hidden="true">'+layer(a.body,a.bodyAtlas,frame)+layer(a.face,a.faceAtlas,face)+(employed?'<image href="'+a.chefHat+'" x="3" y="0" width="54" height="35"/>':'')+'</svg>';
  }
  function change(key,value,label){if(config[key]===value)return;comparison={before:root.MortgageLabModel.run(config),label};config={...config,[key]:value};page=4;}
  function policies(box){const row=el('div','',box,'mortgage-actions');[['none','先不干预'],['liquidity','借20，先周转'],['equity','用20认购股权'],['households','补家庭欠款，最多8']].forEach(item=>button(item[1],item[0],()=>{if(page===4)change('policy',item[0],'应对方式');else{config={...config,policy:item[0]};page=4;}},row,page===4?config.policy===item[0]:undefined));}
  function institution(box){const icon=el('span','',box,'mortgage-institution');icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 90 80"><g fill="white" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 24 43 5l38 19-73 2ZM12 29h65M17 31v34m13-34v34m25-34v34m14-34v34M9 68h72l3 7H6Z"/><path d="M37 39h12v18H37Z"/></g></svg>';}
  function consequence(a){
   const route=el('div','',desk,'mortgage-route');route.setAttribute('role','group');route.setAttribute('aria-label','从家庭还款到厨师工资的实际联系');
   const paid=a.mortgages.reduce((n,m)=>n+m.paid,0),nodes=[],detail=el('section','',desk,'mortgage-route-detail');detail.hidden=true;detail.setAttribute('aria-live','polite');
   function node(id,title,metric,art,inspect){const b=button('',id,()=>{},route);b.className='mortgage-route-node';b.setAttribute('aria-label',title+'：'+metric+'。查看账目');b.setAttribute('aria-expanded','false');art(b);el('span',title,b,'mortgage-route-title');el('strong',metric,b);nodes.push(b);b.onclick=function(){const open=b.getAttribute('aria-expanded')!=='true';nodes.forEach(n=>n.setAttribute('aria-expanded','false'));detail.replaceChildren();detail.hidden=!open;if(open){b.setAttribute('aria-expanded','true');inspect(detail);}};}
   function arrow(amount){const edge=el('div','',route,'mortgage-route-edge');edge.dataset.flow=amount?'paid':'blocked';edge.setAttribute('aria-hidden','true');el('span',amount?'→':'⊣',edge);if(amount)el('i','',edge,'mortgage-travel-coin');}
   node('trace-family','4户家庭','还款 '+paid+' / 16',b=>{house(b,a.homesLost>0);el('small',a.homesLost?a.homesLost+'户失去房屋':'4户保住房屋',b);},d=>{facts(d,[['本期收入合计',(config.shock==='income'?8:32)+'枚'],['家庭原先支付',a.snapshots.assessment.mortgages.reduce((n,m)=>n+m.paid,0)+'枚'],[a.familySupport?'补助后总还款':'本期还款合计',paid+'枚']]);el('p',a.homesLost?'欠付未补齐，抵押房屋按本局合同被处置。':a.familySupport?'公共账户补了本期欠款；房贷本金还没全部还完。':'本期按约还款。房子报价和还款能力不是一回事。',d);});
   arrow(paid);
   node('trace-fund','信贷机构','放贷 '+a.businessLoan+' / 8',institution,d=>{const c=a.creditDecision;facts(d,[['放贷前现款',c.cashBefore+'枚'],['资本 / 本局门槛',c.capital+' / '+c.minimumCapital+'枚'],['到期款仍缺',c.fundingGap+'枚']]);el('p',c.reasons.length?c.reasons.map(r=>({capital:'资本不足，暂停新放贷。',funding:'先还到期款，尚有缺口。',cash:'规则允许放贷，但现款不够8枚。'}[r])).join(' '):'本局放贷条件满足，实际借出8枚。',d);});
   arrow(a.businessLoan);
   node('trace-bakery','面包店','开工 '+a.jobs+' / 3',b=>{const image=el('img','',b,'mortgage-route-oven');image.src=root.TRUST_ASSETS.bakery.newOven;image.alt='';},d=>{facts(d,[['店里原有','4枚'],['实际借到',a.businessLoan+'枚'],['实际工资合计',(4*a.jobs)+'枚']]);el('p','每人需4枚工资。钱到了店里，才能实际排班发薪。',d);});
   const people=el('div','',desk,'mortgage-payroll');for(let i=0;i<3;i++){const person=el('div','',people);chef(person,i,i<a.jobs);el('span',i<a.jobs?'领到4枚':'没排上班',person);}
  }
  function compare(a){if(!comparison)return;const b=comparison.before,box=el('section','',desk,'mortgage-comparison');box.setAttribute('aria-live','polite');el('p','只换了'+comparison.label+' · 上次 → 这次',box);facts(box,[['实际开工',b.jobs+' → '+a.jobs+'人'],['失去房屋',b.homesLost+' → '+a.homesLost+'户'],['公共账户付出',b.publicSpent+' → '+a.publicSpent+'枚']]);}
  function alternatives(){const d=el('details','',desk,'mortgage-notes');el('summary','只换一个条件，再试试',d);const row=el('div','',d,'mortgage-actions');
   button(config.capital===10?'机构改为自己垫30':'机构改为自己垫10','change-capital',()=>change('capital',config.capital===10?30:10,'机构出资'),row);
   button(config.rollover?'短钱不再续借':'短钱恢复续借','change-rollover',()=>change('rollover',!config.rollover,'续借条件'),row);
   if(config.shock==='income')button('收入恢复，房价仍低','change-income',()=>change('shock','price','家庭收入'),row);
   else if(config.shock==='price')button('收入减少，房价不变','change-income',()=>change('shock','income','家庭收入'),row);
   else button('只让房价下跌','change-price',()=>change('shock','price','房屋报价'),row);
  }
  function notes(){const d=el('details','',desk,'mortgage-notes');el('summary','历史、条件与来源',d);let loaded=false;d.ontoggle=function(){if(d.open&&!loaded){loaded=true;root.ResearchReader.mount(d,'',{topics,sources});}};}
  function ledger(a,key){const state=a.snapshots[key],d=el('details','',desk,'mortgage-notes');el('summary','逐笔查账',d);
   a.entries.slice(0,state.entries).forEach(e=>el('p',e.why+'：'+names[e.from]+' → '+names[e.to]+' · '+e.amount+'枚',d));
   facts(d,[['机构现款',state.cash.fund+'枚'],['贷款资产（本金）',state.bookAssets+'枚'],['短期借款',state.funding+'枚'],['公共贷款负债',state.publicLoan+'枚'],['账面资本',state.bookEquity+'枚']]);
   el('p','全局现金合计仍为'+a.total+'枚。债权、房价和现金不是同一项。',d);
  }
  function draw(){
   const a=root.MortgageLabModel.run(config),key=['opening','homes','pool','assessment','bakery'][page],s=a.snapshots[key];desk.replaceChildren();desk.dataset.page=String(page);
   if(page===0)el('small','独立实验 · 重新开账',desk,'mortgage-status');
   const h=el('h3',['先买一套房。','房子买到了，房贷卖给谁？','房贷转手了，钱从哪来？','房价跌了，就一定还不上吗？','面包店没买房贷，也被牵进来了。'][page],desk);h.tabIndex=-1;
   if(page===0){homes(desk,s,true);facts(desk,[['每户首付','5枚'],['每户借款','20枚'],['一套房','25枚']]);button('贷款买房 →','buy',()=>page=1);}
   if(page===1){homes(desk,s);el('p','接手的信贷机构要凑80枚。自己多垫，还是多借？',desk,'mortgage-message');el('div','家庭 → 每期还款 → 房贷凭证持有者',desk,'mortgage-flow');
    const row=el('div','',desk,'mortgage-actions');[['30','自己垫30，借50'],['10','自己垫10，借70']].forEach(item=>button(item[1],item[0],()=>{config={...config,capital:Number(item[0])};page=2;},row));
    const d=el('details','',desk,'mortgage-notes');el('summary','如果有人提前看跌？',d);el('p','先付1；房贷实际损失时获赔5。',d);button(config.protection?'✓ 已买信用保护':'试买信用保护','protection',()=>config={...config,protection:!config.protection},d,config.protection);
   }
   if(page===2){el('div','出资者 ＋ 短期出借者 → 信贷机构 → 发贷机构',desk,'mortgage-flow');facts(desk,[['房贷资产','80枚'],['自己垫的',config.capital+'枚'],['借来的',s.funding+'枚']]);
    el('p','借来的钱先到期，家庭却慢慢还。',desk,'mortgage-message');const row=el('div','',desk,'mortgage-actions');[['stable','照常：收入8，房价25'],['price','只跌房价：收入8，房价15'],['income','收入也少：收入2，房价15']].forEach(item=>button(item[1],item[0],()=>{config={...config,shock:item[0]};page=3;},row));
    const d=el('details','',desk,'mortgage-notes');el('summary','换个融资条件',d);button(config.rollover?'短钱续借：本期不催还':'短钱不续：本期还20','rollover',()=>config={...config,rollover:!config.rollover},d,config.rollover);
   }
   if(page===3){homes(desk,s);facts(desk,[['每户本期应付','4枚'],['每户实际付',s.mortgages[0].paid+'枚'],['机构现款',s.cash.fund+'枚'],['估计资本',s.estimatedEquity+'枚']]);
    el('p',config.shock==='income'?'收入不够，先帮家庭，还是帮机构？':config.shock==='price'?'房价跌了，家庭仍在按约还款。':'家庭按时还款，先看机构的账。',desk,'mortgage-message');
    if(!config.rollover)el('p','20枚今天到期，不能续借。',desk,'mortgage-message');policies(desk);el('small','公共账户现有20枚。',desk,'mortgage-status');
   }
   if(page===4){el('small','机构垫'+config.capital+'枚 · '+(config.shock==='income'?'家庭收入2枚':'家庭收入8枚')+' · '+({none:'不干预',liquidity:'周转贷款',equity:'认购股权',households:'家庭补助'}[config.policy]),desk,'mortgage-status');consequence(a);
    const line=a.jobs<3?(a.creditLoss?'房贷损失压薄资本，面包店也借不到钱。':'房贷照还，短钱接不上，面包店也少开工。'):a.homesLost?'店开起来了，家庭却失去了房子。':a.publicSpent?'家庭和店都保住了。公共账户付出了什么？':config.shock==='price'?'房价跌了，这条资金链仍接得上。':'这次按约还款，面包店照常开工。';el('p',line,desk,'mortgage-message');
    if(!a.eligible)el('p','周转贷款未发放：估计资本已不足，借钱不能补亏损。',desk,'mortgage-message');
    compare(a);
    const detail=el('details','',desk,'mortgage-notes');el('summary','谁承担了什么？',detail);facts(detail,[['房贷实际本金损失',a.creditLoss+'枚'],['到期资金缺口',a.fundingGap+'枚'],['机构账面资本',s.bookEquity+'枚'],['公共账户付出',a.publicSpent+'枚'],['公共资产入账成本',a.publicAssetCost+'枚']]);el('p','贷款按本金、股权按认购成本列示，不是市值或可回收额。最终净成本未计算。',detail);
    if(config.protection)el('p','看跌合约：'+(a.protectionGain>0?'赚'+a.protectionGain:'亏'+(-a.protectionGain))+'枚；款项在交易者与保护卖方之间支付。',detail);
    const retry=el('details','',desk,'mortgage-notes');el('summary','同一局，换个应对',retry);policies(retry);alternatives();
    button('重新开局 ↺','restart',()=>{page=0;comparison=null;config={capital:10,shock:'stable',rollover:true,policy:'none',protection:false};});
   }
   if(page>0)ledger(a,key);notes();
  }
  draw();return desk;
 }
 root.MortgageLab={mount,sources,topics};
})(window);
