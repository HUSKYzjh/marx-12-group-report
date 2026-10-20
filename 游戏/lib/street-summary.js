(function(root){
 'use strict';
 root.renderStreetSummary=function(c){
  function el(tag,text,parent){var n=document.createElement(tag);n.textContent=text||'';(parent||c.readout).appendChild(n);StreetArt.decorateMoney(n);return n;}
  c.title('第三幕·卖不掉的面包','');
  var gains=el('p');gains.className='street-summary-gains';el('strong','劳动分工提高生产效率，市场竞争推动改进，自由贸易扩大交换范围',gains);
  var panels=el('div');panels.className='street-summary-panels';
  function diagram(privateOwnership){
   var art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('viewBox','0 0 400 270');art.setAttribute('role','img');art.setAttribute('aria-label',privateOwnership?'两位厨师共同使用烤炉生产。老板拿着产权钥匙，拥有店和机器，并决定工资、用工和设备投资。':'面包店依靠其他工厂，员工的钱又流向其他店');
   art.dataset.diagram=privateOwnership?'private-ownership':'social-production';
   function frame(src,atlas,name,x,y,w,h){var f=atlas.frames[name].frame;return '<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+[f.x,f.y,f.w,f.h].join(' ')+'" overflow="hidden" aria-hidden="true"><image href="'+src+'" width="'+atlas.meta.size.w+'" height="'+atlas.meta.size.h+'"/></svg>';}
   function chef(x){var a=TRUST_ASSETS.bakery;return '<g data-role="worker">'+frame(a.body,a.bodyAtlas,'body0000',x,105,60,70)+frame(a.face,a.faceAtlas,'face0000',x,105,60,70)+'<image href="'+a.chefHat+'" x="'+(x+3)+'" y="85" width="55" height="41"/></g>';}
   if(privateOwnership){
    art.innerHTML='<g fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 69Q130 65 236 70L242 193Q132 200 15 194Z" stroke-dasharray="5 6"/></g>'+
     '<text x="130" y="54" text-anchor="middle" fill="#666" font-size="19">工人使用</text>'+chef(26)+chef(86)+
     '<image data-role="owned-machine" href="'+TRUST_ASSETS.bakery.newOven+'" x="155" y="85" width="82" height="108"/>'+
     '<path d="M139 150h15m-5-5 5 5-5 5" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 4"/>'+
     '<g data-role="owner">'+frame(TRUST_ASSETS.bakery.hat,TRUST_ASSETS.bakery.hatAtlas,'hatguy0000',293,63,82,96)+'</g>'+
     '<path d="M252 10Q320 6 395 11L395 47H338l-7 16-5-16H251Z" fill="#fff" stroke="#666" stroke-width="1.8" stroke-linejoin="round"/>'+
     '<text x="324" y="34" text-anchor="middle" fill="#555" font-size="18">店、机器归我</text>'+
     '<text x="271" y="93" text-anchor="middle" fill="#555" font-size="18">拥有</text>'+
     '<g data-relation="ownership" fill="none" stroke="#555" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M298 121Q266 112 235 121m8-7-8 7 9 5"/><path data-symbol="property-key" d="M282 135a7 7 0 1 0 14 0a7 7 0 1 0-14 0m1 3-17 13m5-4 4 5m1-9 4 5"/></g>'+
     '<text x="335" y="179" text-anchor="middle" fill="#555" font-size="18">老板</text>'+
     '<g data-relation="control" fill="none" stroke="#555" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M335 186v23H74v11m-5-5 5 5 5-5M200 209v11m-5-5 5 5 5-5M326 209v11m-5-5 5 5 5-5"/></g>'+
     [ ['工资','定工资',74],['用工','定用工',200],['投资','添机器',326] ].map(function(item){return '<g data-decision="'+item[0]+'"><path d="M'+(item[2]-53)+' 225q54-3 106 0v32q-55 3-106 0Z" fill="#fff" stroke="#777" stroke-width="1.5"/><text x="'+item[2]+'" y="247" text-anchor="middle" fill="#555" font-size="18">'+item[1]+'</text></g>';}).join('');
   }else{
    art.innerHTML='<g transform="translate(0 40)"><path d="M60 100Q145 25 210 95Q275 20 340 100M340 145Q195 190 60 145" fill="none" stroke="#888" stroke-width="2" stroke-dasharray="5 6"/><image href="'+TRUST_ASSETS.street.clothes+'" x="18" y="65" width="88" height="88"/><image href="'+TRUST_ASSETS.bakery.newOven+'" x="160" y="60" width="92" height="100"/><image href="'+TRUST_ASSETS.street.cars+'" x="293" y="65" width="92" height="88"/><image href="'+TRUST_ASSETS.coin+'" x="102" y="139" width="24" height="24"/><image href="'+TRUST_ASSETS.coin+'" x="261" y="139" width="24" height="24"/></g>';
   }
   return art;
  }
  var ownershipArt;
  [['生产社会化','生产靠别家，生意靠彼此的顾客。'],['生产资料的资本主义私人占有','工人一起做，老板决定怎么做。']].forEach(function(item,i){var panel=el('section','',panels),art=diagram(i===1);el('h2',item[0],panel);panel.appendChild(art);el('p',item[1],panel);if(i===1)ownershipArt=art;});
  var conclusion=el('p','生意连成一张网，老板各打各的算盘。');conclusion.className='street-conclusion';
  var surplus=el('p','“过剩”：按现价卖不掉，不是人人都吃够。');surplus.className='street-summary-definition';
  var extra=el('details');extra.className='scene-supplement';el('summary','再想一步：小实验与说明',extra);
  var entry=el('details','',extra);entry.className='ownership-permission-entry';el('summary','换个身份，试试谁能作主',entry);var mounted=false;entry.ontoggle=function(){if(entry.open&&!mounted){mounted=true;root.OwnershipPermissions.mount(entry,ownershipArt);}};
  root.WeberPerspective.mount(extra,'summary');
  root.ValueJourney.mount(extra);
  var limits=el('details','',extra);limits.className='street-bounds';el('summary','这局的条件',limits);
  ['第二幕观察固定与波动客流，第三幕另开六家厂商的相互依赖实验。','第三幕有6家厂商、20人；厂商自行投资和用工，工资、采购和消费在真实账户间流转。','老板、工人和待业者都尝试购买基本面包；额外购买有上限，不能靠“无限想买”清空库存。','降薪、裁员是可试的招数。也可以不选，游戏会照样算账。','这条街暂时没有政府采购、借钱和国外客人。一次剩货不能证明全面危机，更不能证明必然崩溃。','本局描绘私人雇佣企业，不能直接用来解释社会主义国家。'].forEach(function(words){el('p',words,limits);});
  var source=el('p','情节依据遨游之舟的回答改编；原文作者保留著作权。',limits);var link=el('a','原文 ↗',source);link.href='https://www.zhihu.com/question/264895929/answer/1906437501';link.target='_blank';link.rel='noreferrer';
  var concepts=el('details','',limits);el('summary','分工、交换、积累：不是同一件事',concepts);var conceptsMounted=false;
  concepts.ontoggle=function(){if(concepts.open&&!conceptsMounted){conceptsMounted=true;root.ResearchReader.mount(concepts,'',{topics:[
   {title:'分工为什么更快？',pages:['和面、整形、烘烤各有人专做，可能练得更熟，也少了来回换工具的时间；专门工具还可能进一步省力。斯密《国富论》第一篇第一章用熟练、节省转换时间和机器改良说明分工的效率来源。','这是生产怎样组织的问题，不是工资怎样分的问题。分工需要衔接，缺料或等工也会拖慢；生产效率提高并不能单独证明收入分配公平。文稿约5:44—6:42提供追问，本段另核对原典。\nhttps://www.econlib.org/library/Smith/smWN.html?chapter_num=4']},
   {title:'市场协调与资本积累',pages:['面包换衣服，解决的是各家产品怎样交换。预付钱买机器、雇人、卖货，再把经营所得的一部分投入生产，问的是资本怎样扩大。交换和积累相互联系，却不是同一问题；有市场交换也不能单凭这一点判定社会制度。','后面的“用途与回款”让你比较：卖出鸡蛋是为了买晚饭，还是预付资金为了回收更多钱？增殖是目标，不是保证；钱留着不用也不等于已经扩大再生产。参照《资本论》第一卷第四章，积累还须考察剩余价值再转为资本。\nhttps://www.marxists.org/archive/marx/works/1867-c1/ch04.htm']},
   {title:'工资、余额与利润',pages:['第一幕的15枚是这车面包的收款，不是净利润；给厨师5枚，也不表示剩下10枚全归老板消费。工资是付给劳动者的钱，企业还要支付原料、机器等成本。不同实验的账目范围分别写在细账里。','新炉提高产量，不自动改写工资约定或产权。比较技术收益时，要分别看劳动者收入、工时、实际销量和企业利润；不能把面包数或账面余额直接当作马克思的剩余价值。这也是2021年文稿约9:33—15:07、23—27分钟引出的分配与权力问题。\nhttps://www.bilibili.com/video/BV1Jt4y1B72f/']}
  ]});}};
  var next=el('button','还有什么办法？ →',c.controls);next.type='button';next.className='primary';next.onclick=function(){c.send({type:'SHOW_RELIEF'});};
 };
})(window);
