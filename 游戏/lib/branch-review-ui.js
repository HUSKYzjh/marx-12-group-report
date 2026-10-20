(function(root){
 'use strict';
 function el(tag,text,parent,cls){var n=document.createElement(tag);n.textContent=text||'';n.className=cls||'';parent.appendChild(n);StreetArt.decorateMoney(n);return n;}
 root.renderBranchReview=function(c,t){
  if(!t||t.phase!=='conclusion')return;
  var review=c.state.branchReviews&&c.state.branchReviews[t.branch];if(!review)return;
  var wrap=document.createElement('section');wrap.className='branch-review';wrap.dataset.branchReview=t.branch;wrap.setAttribute('aria-label','实际回执对照');
  c.readout.prepend(wrap);
  var table=el('table','',wrap),caption=el('caption',review.previous?'两次实际结果':'上次实际结果',table);
  var head=el('tr','',el('thead','',table));el('th','观察什么',head);if(review.previous)el('th','前次',head);el('th','本次',head);
  var body=el('tbody','',table);
  review.latest.facts.forEach(function(fact,i){var row=el('tr','',body);row.dataset.reviewFact=fact.label;var label=el('th',fact.label,row);label.scope='row';if(review.previous)el('td',review.previous.facts[i].value+fact.unit,row).dataset.previous=String(review.previous.facts[i].value);el('td',fact.value+fact.unit,row).dataset.latest=String(fact.value);});
  var conditions=el('details','',wrap,'branch-review-conditions');el('summary','对照条件',conditions);
  if(review.previous)el('p','前次：'+review.previous.context+'。'+review.arrangements.previous,conditions);
  el('p','本次：'+review.latest.context+'。'+review.arrangements.latest,conditions);
  el('p','比较完整回执，未执行的改动不计入。两次可能改了多项条件，差额不能单独归因给一项。',conditions,'small');
  var production=t.branch==='sharing'&&(c.state.councilProductionTrials||[]);
  if(production&&production.length){
   var runs=production.slice(-2),extra=el('details','',wrap,'branch-production-review');el('summary','再看三班排班的结果',extra);
   var comparison=el('table','',extra),heading=el('tr','',el('thead','',comparison));el('th','观察什么',heading);runs.forEach(function(_,i){el('th',runs.length===1?'本次':i?'本次':'前次',heading);});
   var rows=el('tbody','',comparison);[['stock','剩下面包','个'],['wages','三班工资','枚'],['paidRest','带薪休息','次']].forEach(function(item){var row=el('tr','',rows);el('th',item[1],row).scope='row';runs.forEach(function(run){var value=item[0]==='stock'?run.stock.length:run[item[0]];el('td',value+item[2],row).dataset.productionFact=item[0];});});
   el('p','来自两次实际三班记录。分钱、表决和排班是分别发生的决定。',extra,'small');
  }
  var related=el('div','',c.controls,'branch-related');el('p',review.connection.question,related);
  var next=el('button',review.connection.label+' →',related,'secondary');next.type='button';next.dataset.relatedBranch=review.connection.next;
  next.onclick=function(){c.send({type:'OPEN_RELATED',branch:review.connection.next});};
 };
})(window);
