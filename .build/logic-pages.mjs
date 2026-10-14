export function renderLogic(sl,d,t,h){
 if(d.kind!=='divider'&&d.page!==33)return false;
 const {tx,rect,line,edge,H,N}=h;
 const text=(s,x,y,w,hh=36,size=23,col=t.ink,bold=false,align='left')=>tx(sl,s,x,y,w,hh,size,col,bold,align);
 function node(a,b,x,y,w,hh,{size=24,bs=20,strong=false}={}){
  const q=rect(sl,x,y,w,hh,strong?t.light:t.panel,t.line,.65);
  if(b){text(a,x+15,y+10,w-30,32,size,t.accent,true);text(b,x+15,y+46,w-30,hh-50,bs,t.ink);}
  else text(a,x+14,y+(hh-size*1.2)/2,w-28,size*1.25+2,size,t.ink,true,'center');
  return q;
 }
 const parallel=(source,lanes,target)=>{
  const a=node(source[0],source[1],65,360,232,119);
  const b=node(target[0],target[1],959,360,256,119);
  for(let i=0;i<3;i++){
   const c=node(lanes[i],'',373,326+i*63,510,46,{size:21});
   edge(sl,a,c,t);edge(sl,c,b,t);
  }
 };
 if(d.kind==='divider'){
  tx(sl,['I','II','III','IV','V','VI'][d.section_index-1],64,55,230,122,94,t.accent,false,'left',N);
  text('第'+['一','二','三','四','五','六'][d.section_index-1]+'节',318,86,800,38,24,t.muted,true);
  tx(sl,d.title,318,145,875,105,48,t.ink,true,'left',H,'slide-heading');
  text(d.subtitle,65,260,1150,58,23,t.muted);
  switch(d.section_index){
   case 1:{
    const vals=[['结构性张力','生产依赖社会协作\n关键权利由资本支配'],['企业行为','竞争驱动扩产\n压缩本企业成本'],['供需张力','供给计划不断扩张\n购买力受分配制约'],['危机反馈','销售困难与裁员\n收入和需求再收缩']];
    const ns=vals.map((v,i)=>node(...v,65+i*301,344,247,131));
    const labels=['影响决策','汇成总量','需求未承接'];
    for(let i=0;i<3;i++){edge(sl,ns[i],ns[i+1],t);text(labels[i],267+i*301,317,145,25,17,t.accent,true,'center');}
    break;
   }
   case 2:
    parallel(['销售与就业承压','政策与企业\n共同调整需求'],['投资：增加当期订单，也形成未来产能','消费：收入支持购买，信贷伴随后续偿付','出口：拓展境外市场，受全球需求约束'],['缓和当期压力','新增产能、债务\n与外需仍受约束']);break;
   case 3:{
    const a=node('马克思：增殖动力','先行价值差／必要劳动缩短',65,326,465,78);
    const b=node('韦伯：组织条件','核算、法律、伦理与科层组织',65,422,465,78);
    const c=node('核算采用门槛','比较工资节约\n与设备、算力等成本',624,360,248,119);
    const e=node('选择技术路线','满足回报条件时\n替代部分人工',984,360,231,119);
    edge(sl,a,c,t);edge(sl,b,c,t);edge(sl,c,e,t);break;
   }
   case 4:
    parallel(['技术进步','扩大生产能力\n降低部分成本'],['投资：新产业、设备更新与未来产能','消费：降价潜力、工资变化与购买力','出口：数字交付、市场扩展与平台入口'],['共同检验','需求承接能力\n收益分配方式']);break;
   case 5:{
    const a=node('认知任务提效','辅助生成与推理\n部分流程自动化',65,360,232,119);
    const b=node('劳动侧：替代与新任务并存','需求增长、工时安排与收入分享',403,326,484,78);
    const c=node('能力侧：部署依赖关键资源','算力、能源、资金、许可与规则',403,422,484,78);
    const e=node('收入与权利','就业与消费\n接入与议价',987,360,228,119);
    edge(sl,a,b,t);edge(sl,a,c,t);edge(sl,b,e,t);edge(sl,c,e,t);break;
   }
   case 6:{
    const a=node('劳动收入与需求承压','',65,330,280,64,{size:22});
    const b=node('关键AI能力接入受限','',65,432,280,64,{size:22});
    const c=node('UBI：基本收入','与具体岗位分离的收入保障',410,322,397,82,{size:24});
    const e=node('公有AI：公共能力','公共资产、普惠接入与公共服务',410,424,397,82,{size:24});
    const f=node('实施与改革深度','财源、联盟与公共治理\n投资、使用和收益权',942,348,273,137,{size:24});
    edge(sl,a,c,t);edge(sl,b,e,t);edge(sl,c,f,t);edge(sl,e,f,t);break;
   }
  }
  text(d.bridge,65,516,1150,29,21,t.accent,true);
  text('全篇递进：矛盾 → 应对 → 动力与组织 → 技术传导 → AI → 制度回应',65,552,1150,23,16,t.muted,true);
  d.ribbon.forEach((s,i)=>{
   const x=65+i*195,on=i===d.section_index-1;
   rect(sl,x,583,172,61,on?t.accent:t.panel,on?t.accent:t.line,on?0:.6);
   text(s,x+8,590,156,51,20,on?'#211E19':t.muted,on,'center');
   if(i<5)text('→',x+174,600,19,27,20,t.muted,false,'center');
  });
  return true;
 }
 text(d.section,64,28,1100,27,16,t.accent,true);
 tx(sl,'科技扩大生产能力，收益与控制权决定社会结果',64,67,1152,90,37,t.ink,true,'left',H,'slide-heading');
 text('能力扩大提供缓和条件；新增收益转化为生活与劳动改善，需要相应的制度安排。',65,167,1150,57,23,t.accent);
 const a=node('新技术与AI','生产能力扩大\n部分成本降低',65,299,256,134,{size:27,bs:23});
 const b=node('降本收益向社会传递','降价、收入分享、工时改善与公共供给',430,234,473,112,{size:26,bs:21});
 const c=node('收益与控制权集中','收入损失未获补偿，能力接入受限',430,383,473,112,{size:26,bs:21});
 const e=node('缓和具体冲突','生活改善\n需求更稳定',1000,234,215,112,{size:25,bs:21});
 const f=node('可能加剧矛盾','需求受压\n依附关系增强',1000,383,215,112,{size:25,bs:21});
 edge(sl,a,b,t);edge(sl,a,c,t);edge(sl,b,e,t);edge(sl,c,f,t);
 const checks=[['生活改善','价格与公共服务'],['劳动受益','收入与自由时间'],['共同决定','投资、使用与分配权']];
 checks.forEach((v,i)=>{const x=65+i*408;rect(sl,x,531,335,72,t.light);text(v[0],x+15,540,305,29,23,t.accent,true);text(v[1],x+15,575,305,26,20,t.ink);});
 text('UBI支撑收入，公有AI扩展能力；改革深度取决于实际权利，缓和与加剧的效应也可能并存。',65,629,1150,29,20,t.accent,true);
 return true;
}
