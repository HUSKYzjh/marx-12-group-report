export function renderRestructure(sl,d,t,h,data){
 const {tx,rect,line,edge,box,F,H,N,applyChartFont}=h;
 const text=(s,x,y,w,hh=60,size=24,col=t.ink,bold=false,align='left')=>tx(sl,s,x,y,w,hh,size,col,bold,align);
 const title=(s,sub)=>{text(d.section,64,28,1100,27,16,t.accent,true);tx(sl,s,64,67,1152,90,37,t.ink,true,'left',H,'slide-heading');text(sub,65,167,1150,57,23,t.accent);};
 const band=(s,y=612,size=23)=>{rect(sl,64,y-10,1152,63,t.light);text(s,82,y,1116,51,size,t.ink,true);};
 const card=(a,b,x,y,w,hh,{size=27,bodySize=23,strong=false}={})=>{
  const q=rect(sl,x,y,w,hh,strong?t.light:t.panel,t.line,.7);
  text(a,x+17,y+12,w-34,38,size,t.accent,true);if(b)text(b,x+17,y+50,w-34,hh-55,bodySize,t.ink);return q;
 };
 const none={style:'solid',fill:'none',width:0};
 function trend(key,x,y,w,hh,{ymin,ymax,ystep,xmin,xmax,xstep,quarter=false,size=18,format='0',color=t.accent,events=[],labels=[]}={}){
  const ds=data[key];
  const xs=ds.categories.map(s=>quarter?Number(s.slice(0,4))+(Number(s.slice(-1))-1)/4:Number(s));
  const ch=sl.charts.add('scatter',{
   position:{left:x,top:y,width:w,height:hh},hasLegend:false,scatterOptions:{style:'lineWithMarkers'},
   // Labels belong to the complete series; the chart remains editable and is audited against the source values.
   series:[...events.map(v=>({name:'事件年份标记 '+v,xValues:[v,v],values:[ymin,ymax],line:{style:'dash',fill:t.line,width:1},marker:{symbol:'none'}})),{name:ds.unit,xValues:xs,values:ds.values,line:{style:'solid',fill:color,width:3.5},marker:{symbol:'circle',size:3,fill:color},dataLabels:{showValue:false},dataLabelOverrides:labels.map(({idx,text:label,position='top'})=>({idx,text:label,position,showValue:false,textStyle:{typeface:F,fontSize:20,fill:color,bold:true}}))}],
   xAxis:{min:xmin??xs[0],max:xmax??xs.at(-1),majorUnit:xstep??5,numberFormatCode:'0',position:'bottom',tickLabelPosition:'low',textStyle:{typeface:F,fontSize:size,fill:t.muted},line:{style:'solid',fill:t.line,width:.8}},
   yAxis:{min:ymin,max:ymax,majorUnit:ystep,numberFormatCode:format,position:'left',textStyle:{typeface:F,fontSize:size,fill:t.muted},line:none,majorGridlines:{style:'solid',fill:t.line,width:.4}},
   chartFill:'none',plotAreaFill:'none',chartLine:none,plotAreaLine:none
  });applyChartFont(ch,{fontFamily:F});return ch;
 }
 switch(d.kind){
 case 'divider':{
  const romans=['I','II','III','IV','V','VI'];
  tx(sl,romans[d.section_index-1],64,55,230,122,94,t.accent,false,'left',N);
  text('第'+['一','二','三','四','五','六'][d.section_index-1]+'节',318,86,800,38,24,t.muted,true);
  tx(sl,d.title,318,145,875,105,48,t.ink,true,'left',H,'slide-heading');
  text(d.subtitle,65,260,1150,69,25,t.muted);
  const ns=d.chain.map((s,i)=>box(sl,s,'',65+i*301,366,247,97,t,{size:26}));
  for(let i=0;i<3;i++)edge(sl,ns[i],ns[i+1],t);
  text('全篇论证',65,524,1100,28,18,t.muted,true);
  const labels=['资本主义\n基本矛盾','投资、消费\n与出口','技术扩大\n剩余价值','韦伯的\n组织解释','新技术\n与AI','UBI与\n公有AI'];
  labels.forEach((s,i)=>{
   const x=65+i*195,on=d.active_nodes.includes(i);
   rect(sl,x,574,172,63,on?t.accent:t.panel,on?t.accent:t.line,on?0:.6);
   text(s,x+10,582,152,53,20,on?'#211E19':t.muted,on,'center');
   if(i<5)text('→',x+174,591,19,30,20,t.muted,false,'center');
  });return true;}
 case 'apple':{
  title('一部苹果手机由社会协作生产，关键权利仍由资本支配','基本矛盾：生产社会化与资本主义私人占有之间的矛盾');
  text('iPhone 14 Pro Max · 128GB · 美国毫米波型号',65,228,790,35,25,t.ink,true);
  text('$1,099',65,273,295,66,46,t.accent,true);text('2022年发布时税前起售价',328,292,485,35,24,t.ink);
  const priceW=745,bomW=priceW*474/1099;
  rect(sl,65,354,bomW,73,t.accent);rect(sl,65+bomW,354,priceW-bomW,73,t.gold);
  text('物料估计  $474',78,369,bomW-24,46,25,'#FFF9EE',true,'center');
  text('其余差额  $625',82+bomW,369,priceW-bomW-34,46,25,t.ink,true,'center');
  text('按474美元上限估计计算：物料约占43.1%，其余约56.9%。',65,443,751,31,20,t.muted);
  text('差额覆盖组装、运输、研发、软件、销售、售后及利润等，\n各项未在该估计中拆分；625美元不能当作净利润。',65,491,751,64,23,t.ink);
  rect(sl,849,230,1,341,t.line);
  text('社会协作',879,229,334,36,27,t.accent,true);
  text('苹果：芯片与系统设计\n专业供应商：显示、影像、存储\n制造、组装、运输与销售劳动\n教育、科研与基础设施',879,282,336,129,22,t.ink);
  text('资本组织与占有',879,437,336,37,27,t.accent,true);
  text('产品与采购决策、品牌和平台，\n以及利润的分配与再投资，\n由相应资本产权和治理结构支配。',879,490,336,88,22,t.ink);
  band('共同参与生产，并不自动获得共同决定投资、劳动安排和剩余用途的权利。');return true;}
 case 'firms':{
  title('企业希望压低自身成本，又需要其他企业的员工购买','工资是单个企业的支出，也是社会消费能力的重要来源');
  const names=[['汽车企业','少付工资、扩大产量'],['手机企业','降低成本、争夺市场'],['食品企业','压缩开支、增加销量']];
  const ns=names.map((v,i)=>card(v[0],v[1],65+i*408,228,336,119,{size:27,bodySize:24}));
  edge(sl,ns[0],ns[1],t);edge(sl,ns[1],ns[2],t);
  text('普遍压低劳动收入 ＋ 其他需求未补上 → 共同市场承压',65,368,1150,40,27,t.accent,true);
  rect(sl,65,426,1150,177,t.light);
  text('Y＝C＋I＋G＋(X−M)',84,439,1120,45,33,t.accent,true);
  const terms=[['Y','国内生产总值'],['C','私人最终消费'],['I','私人总投资\n含固定与存货'],['G','政府消费与投资'],['X','货物与服务出口'],['M','货物与服务进口']];
  terms.forEach(([a,b],i)=>{let x=85+i*185;text(a,x,501,163,34,26,t.accent,true);text(b,x,545,163,54,21,t.ink);});
  text('采用美国NIPA式分组：政府投资计入G；转移支付经收入影响C。核算恒等式本身不是危机定理。',65,624,1150,42,20,t.muted);return true;}
 case 'why':{
  title('竞争扩张与购买力约束，使生产计划可能超过实际需求','企业分别按利润预期组织生产，销售结果才检验这些计划能否同时实现');
  const rows=[['竞争推动扩张','争夺市场、更新设备；\n企业可能同时押注同一机会。'],['分配限制购买力','工资和保障未随产出增长；\n高收入者增加储蓄，支出未必补足。'],['协调存在时滞','建设、投产和销售分属不同时间；\n信贷又能提前放大投入规模。']];
  const ns=rows.map((v,i)=>card(v[0],v[1],65,228+i*120,610,107,{size:25,bodySize:22}));
  const outcome=card('计划供给超过实际购买','商品不能按预期价格售出\n→ 非意愿库存、价格与利润承压\n→ 减产、失业及信用收缩',803,291,412,225,{strong:true,size:27,bodySize:24});
  const hub=rect(sl,746,401,2,2,'none');ns.forEach(n=>edge(sl,n,hub,t,'right','left',{arrow:false}));edge(sl,hub,outcome,t);
  band('利润消费、投资和政府支出也形成需求；是否出现过剩，要检验这些支出能否接住扩张。',612,23);return true;}
 case 'question':{
  text(d.section,64,28,1100,28,16,t.accent,true);
  tx(sl,'科学技术是缓和\n还是加剧了资本主义基本矛盾？',65,112,1130,145,48,t.ink,true,'left',H,'slide-heading');
  card('生产能力的一面','更多产品、更低成本、\n更广泛的协作与服务。',65,324,527,175,{size:31,bodySize:28});
  card('资本积累的一面','竞争优势、劳动替代、\n收益分配与控制权变化。',689,324,527,175,{size:31,bodySize:28});
  text('分析顺序',65,558,184,42,27,t.accent,true);
  text(d.transition??'需求怎样承接产出 → 技术怎样改变劳动 → 收益与决定权怎样分配',263,557,945,75,25,t.ink,true);return true;}
 case 'investment':{
  title('投资创造当期需求，新增产能仍须由未来需求承接','美国全社会固定资本形成总额：私人＋政府；不含存货和金融资产交易');
  text('万亿美元 · 2015年不变价',65,232,785,36,24,t.ink,true);
  trend('investment',65,285,776,291,{ymin:0,ymax:6,ystep:2,xstep:4,xmax:2025,events:[2009,2020],labels:[{idx:7,text:'3.43',position:'top'},{idx:9,text:'2.87',position:'bottom'},{idx:24,text:'5.02',position:'top'}]});
  text('2008—09金融危机',261,267,197,27,17,t.muted,true,'center');
  text('2020疫情',605,267,153,27,17,t.muted,true,'center');
  text('2007—2009年累计下降16.2%，随后恢复并继续扩张',85,575,756,30,21,t.accent,true);
  const vals=[['建设期','设备、工程和用工\n形成订单与收入'],['投产期','供给扩大\n需要新增客户和配套'],['回收期','销售与回款\n决定偿债和后续投资']];
  const ns=vals.map((v,i)=>card(v[0],v[1],894,232+i*123,321,103,{size:25,bodySize:21}));
  for(let i=0;i<2;i++)edge(sl,ns[i],ns[i+1],t,'bottom','top');
  band('2009年实际投资同比下降12.5%；危机后可以恢复，投资规模与有效用途仍须相互匹配。',612,23);return true;}
 case 'consumption':{
  title('消费能否持续，取决于稳定收入与偿债负担','收入保障支持购买力；信用提前支出，也带来后续还本付息');
  text('家庭债务偿付 / 可支配收入（%）',65,232,551,34,23,t.accent,true);
  text('实际个人消费支出（2007Q4＝100）',665,232,551,34,22,t.accent,true);
  trend('debt',65,280,551,253,{ymin:10,ymax:18,ystep:2,xmin:2007,xmax:2012.75,xstep:1,quarter:true,labels:[{idx:3,text:'15.85%',position:'top'},{idx:23,text:'11.75%',position:'top'}]});
  trend('consumption',665,280,551,253,{ymin:96,ymax:106,ystep:2,xmin:2007,xmax:2012.75,xstep:1,quarter:true,color:t.gold,labels:[{idx:9,text:'97.7',position:'bottom'},{idx:23,text:'103.6',position:'top'}]});
  text('峰值：2007Q4；包含房贷与消费债务。',80,541,536,28,18,t.muted);
  text('谷值：2009Q2；两图均为2007Q1—2012Q4。',680,541,536,28,18,t.muted);
  rect(sl,65,586,1150,75,t.light);
  text('收入保障',82,601,153,34,25,t.accent,true);
  text('工资、社保与税收转移 → 可支配收入 → 消费',254,595,941,31,23,t.ink,true);
  text('OECD：工作年龄人口基尼平均缩减约1/4（2014或最近年份），不是收入增幅。',254,632,941,25,18,t.muted);return true;}
 case 'trade':{
  title('出口扩大市场，全球衰退却会同时压缩外部需求','国际分工可以共同获益，各国却不能同时依靠净出口顺差');
  text('全球货物与服务实际出口',65,232,699,36,26,t.accent,true);
  text('万亿美元 · 2015年不变价',65,274,699,30,21,t.muted);
  trend('exports',65,320,699,247,{ymin:0,ymax:30,ystep:10,xstep:4,xmax:2025,events:[2009,2020],labels:[{idx:9,text:'15.90',position:'bottom'},{idx:20,text:'22.14',position:'bottom'},{idx:24,text:'27.01',position:'top'}]});
  text('2008—09金融危机',239,302,196,26,17,t.muted,true,'center');
  text('2020疫情',555,302,133,26,17,t.muted,true,'center');
  text('2009年 −9.6%　｜　2020年 −8.5%',85,567,667,35,24,t.accent,true);
  text('2024年货物与服务差额 / GDP',814,232,401,66,25,t.accent,true);
  const ch=sl.charts.add('bar',{
   position:{left:794,top:315,width:420,height:250},categories:data.balance.categories,
   series:[{name:'外贸差额占GDP（%）',values:data.balance.values,points:[{idx:0,fill:t.gold},{idx:1,fill:t.gold},{idx:2,fill:t.accent}],dataLabelOverrides:[0,1,2].map(idx=>({idx,showValue:true,position:'center',textStyle:{typeface:F,fontSize:24,fill:idx===2?'#FFF9EE':t.ink,bold:true}}))}],
   hasLegend:false,barOptions:{direction:'column',grouping:'clustered',gapWidth:95},
   dataLabels:{showValue:true,position:'center',numberFormatCode:'+0.0;-0.0;0',textStyle:{typeface:F,fontSize:24,fill:t.ink,bold:true}},
   xAxis:{tickLabelPosition:'low',textStyle:{typeface:F,fontSize:23,fill:t.ink},line:{style:'solid',fill:t.line,width:.7}},
   yAxis:{min:-4,max:6,majorUnit:2,numberFormatCode:'0',textStyle:{typeface:F,fontSize:17,fill:t.muted},line:none,majorGridlines:{style:'solid',fill:t.line,width:.4}},
   chartFill:'none',plotAreaFill:'none',chartLine:none,plotAreaLine:none});applyChartFont(ch,{fontFamily:F});
  text('单位：%；各国GDP分母不同，不直接相加。',813,572,400,50,18,t.muted);
  band('全球净出口金额加总约为零；扩大出口需要他国购买力，不能替代全球收入与需求。',612,23);return true;}
 case 'variable':{
  title('节约可变资本的竞争压力，推动AI与自动化替代部分人工','资本比较新增设备和服务成本，与能够节约的工资及实现的收益');
  card('不变资本 c','机器、原材料等生产资料\n把已有价值转移到产品。',65,230,551,145,{size:29,bodySize:25});
  card('可变资本 v','用于购买劳动力；活劳动\n创造的新价值可超过劳动力价值。',665,230,551,145,{size:29,bodySize:25});
  text('每件相关成本：产量、质量和其他成本不变的假设示例',65,408,1150,38,25,t.accent,true);
  const a=card('人工方案：20元','每件工资支出20元',65,464,399,104,{size:28,bodySize:23});
  const b=card('自动化方案：17元','工资8元 ＋ 新增折旧、算力、维护9元',565,464,651,104,{size:28,bodySize:23});edge(sl,a,b,t);
  band('单件节约3元形成替代激励；企业工资支出下降，不自动等于社会剩余价值总量上升。',612,23);return true;}
 default:return false;
 }
}
