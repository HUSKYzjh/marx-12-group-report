(function(root){
 'use strict';
 function el(tag,text,parent){var n=document.createElement(tag);n.textContent=text||'';parent.appendChild(n);return n;}
 root.WeberPerspective={mount:function(parent,context){
  var technology=context==='technology';
  var panel=el('details','',parent);panel.className='street-bounds weber-perspective';
  panel.dataset.testid='weber-perspective';panel.dataset.context=context||'summary';
  el('summary',technology?'韦伯：机器更快，人更自由吗？':'换个视角：韦伯怎样理解资本主义？',panel);
  el('p','韦伯追问：为什么现代资本主义能够把获利组织成持续、可计算的事业？想赚钱古已有之，仅凭贪欲不足以解释这种变化。',panel);
  [
   ['可计算的经营','账簿、预算、合同和稳定的工序，使成本与收益更容易估算。这里的“理性”指行动有计划、手段适合目标，不等于结果公平或符合所有人的需要。'],
   ['制度让计算成为可能','企业与家庭账目相分离，产权、市场、雇佣劳动、法律和行政共同提供经营条件。机器不是独立起作用的；规则能否预期，也影响投资和生产。'],
   ['获利动机也有历史','某些禁欲新教伦理把职业劳动视为天职，鼓励自律、节俭和再投资。韦伯讨论文化与经济行为的联系，不是说新教单独创造资本主义。'],
   ['市场中的权力','雇主与劳动者、债权人与债务人、企业与国家，拥有的资源和选择并不相同。看懂交易，还要问谁能定条件、谁能拒绝；国家与市场也可能相互支撑。'],
   ['理性化与“铁笼”','组织可以越来越高效，个人却可能必须服从竞争、指标和岗位纪律。即使最初的宗教动机淡去，制度压力仍可能延续。“铁笼”是在提醒这种束缚，不是已经证明未来永远没有改变。']
  ].forEach(function(item){var p=el('p','',panel);el('strong',item[0]+'：',p);el('span',item[1],p);});
  var conclusion=el('p','',panel);el('strong','结论：',conclusion);
  el('span','现代资本主义依赖技术、制度和文化条件的结合；效率与可预测性提高，不自动等于自主空间扩大。',conclusion);
  if(technology){
   el('p','回到这台机器：产量、工时和工资更容易计算，但由谁设定目标？省下的时间归谁？人能否协商、拒绝或改变安排？这些问题不能由效率数字代答。',panel);
   el('p','AI可以辅助排班、记录和预测，也可能使考核与监督更细密。这是把韦伯视角用于今天的设计追问，不是韦伯本人对AI的预言，本实验也没有调用真实AI。',panel);
  }else{
   el('p','回看面包店：算得清收支，仍不能单凭账本决定怎样分配。马克思对产权与剩余价值的分析，和韦伯对计算、组织与文化的分析，提出了不同的问题；这里不把两者合成同一套理论。',panel);
  }
  var sources=el('details','',panel);el('summary','原文与概括边界',sources);
  el('p','以上是本作的教学概括，不是逐字引文。韦伯讨论的是现代西方理性企业资本主义的特定发展，不能理解成其他地区从未有商业或资本活动。视频的“完全数字化”在该段主要指资产计价、票据化和交易，不是今天的互联网数字化。',sources);
  [
   ['韦伯《新教伦理与资本主义精神》导论','https://en.wikisource.org/wiki/The_Protestant_Ethic_and_the_Spirit_of_Capitalism/Author%27s_Introduction'],
   ['职业、禁欲与“铁笼”相关原文','https://www.marxists.org/reference/archive/weber/protestant-ethic/ch05.htm']
  ].forEach(function(item){var p=el('p','',sources),a=el('a',item[0]+' ↗',p);a.href=item[1];a.target='_blank';a.rel='noreferrer';});
  return panel;
 }};
})(window);
