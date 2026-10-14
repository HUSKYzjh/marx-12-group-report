/* A fictional private bakery's permissions, not a model of all legal rights. */
(function(root){
 'use strict';
 const actions={operate:'开炉烤面包',schedule:'改明天的排班',invest:'决定添一台炉'};
 function allows(role,action){if(!['chef','owner'].includes(role)||!Object.hasOwn(actions,action))return null;return role==='owner'||action==='operate';}
 function mount(parent,diagram){
  let role='chef';const desk=document.createElement('div');desk.className='ownership-permissions';desk.dataset.testid='ownership-permissions';parent.appendChild(desk);
  function el(tag,text,box,cls){const n=document.createElement(tag);n.textContent=text;n.className=cls||'';box.appendChild(n);return n;}
  el('p','同一间厨房。换个身份，试着作主。',desk);
  const roles=el('div','',desk,'ownership-permission-roles'),roleButtons=[];
  ['chef','owner'].forEach(id=>{const b=el('button',id==='chef'?'我是厨师':'我是老板',roles,'secondary');b.type='button';b.dataset.permissionRole=id;b.setAttribute('aria-pressed',String(id===role));b.onclick=()=>{role=id;roleset();result.textContent='身份换了，炉子还是那一台。';delete result.dataset.allowed;};roleButtons.push(b);});
  const commands=el('div','',desk,'ownership-permission-actions');Object.entries(actions).forEach(([id,label])=>{const b=el('button',label,commands,'secondary');b.type='button';b.dataset.permissionAction=id;b.onclick=()=>{const yes=allows(role,id);result.dataset.allowed=String(yes);result.textContent=yes?(id==='operate'?'炉子开了。厨师也能操作它。':id==='schedule'?'排班改了。这家店的章程让老板拍板。':'老板决定添炉；真正购置仍要付钱，不是凭空变出机器。'):'你可以提出，但这家店的章程没有给厨师最终决定权。';};});
  const result=el('p','你每天用它。不等于你能决定它怎么用。',desk,'ownership-permission-result');result.setAttribute('role','status');
  function roleset(){desk.dataset.role=role;diagram.dataset.focusRole=role;roleButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.permissionRole===role)));}
  roleset();
  const limits=el('details','',desk,'street-bounds');el('summary','这里比较的是哪种权利？',limits);
  el('p','这是同一间私人雇佣面包店的权限演示，不执行真实排班或购买，不改变游戏账本。操作权、日常管理权和所有权不是一回事；受托管理也不等于拥有机器。',limits);
  el('p','现实中的劳动合同、集体协商、劳动法、股权和公司章程会约束决定权。老板不具有不受限制的权力。分得更多工资也不会自动取得产权；共同经营的具体规则可在后续分支比较。',limits);
  el('p','文稿线索：学院派Academia《资本主义的本质是什么？》约23—27分钟。从机器本身转向所有权、控制和组织关系。机器稿未逐句听校，不直接用其中的历史概括替代原典与研究。',limits);
  const a=el('a','查看视频 ↗',limits);a.href='https://www.bilibili.com/video/BV1Jt4y1B72f/';a.target='_blank';a.rel='noreferrer';
 }
 root.OwnershipPermissions={allows,mount};
})(window);
