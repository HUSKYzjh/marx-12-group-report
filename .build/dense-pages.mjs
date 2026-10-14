export function renderDense(sl,d,t,h,data){
 const {tx,rect,line,edge,box,dot,F,H,applyChartFont}=h;
 const text=(s,x,y,w,hh=50,size=21,col=t.ink,bold=false,align='left')=>tx(sl,s,x,y,w,hh,size,col,bold,align);
 const title=(s,sub)=>{text(d.section,64,28,1100,27,16,t.accent,true);tx(sl,s,64,66,1152,78,34,t.ink,true,'left',H,'slide-heading');text(sub,65,154,1150,54,21,t.accent);};
 const band=(s,size=21)=>{rect(sl,64,611,1152,50,t.light);text(s,81,619,1118,40,size,t.ink,true);};
 const card=(a,b,x,y,w,hh,{size=25,bs=21,strong=false}={})=>{const q=rect(sl,x,y,w,hh,strong?t.light:t.panel,t.line,.7);text(a,x+15,y+11,w-30,36,size,t.accent,true);if(b)text(b,x+15,y+51,w-30,hh-55,bs);return q;};
 const node=(s,x,y,w,hh=64,sz=23,strong=false)=>box(sl,s,'',x,y,w,hh,t,{size:sz,strong});
 const none={style:'solid',fill:'none',width:0};
 switch(d.page){
 case 3:{
  title('社会共同生产一部手机，资本掌握关键决定权','基本矛盾：生产社会化与资本主义私人占有之间的矛盾');
  const rows=[['设计与系统','苹果：芯片、软件、产品'],['专业零部件','显示、存储、影像、材料'],['制造与组装','设备、工程师与一线劳动'],['物流与服务','运输、渠道、维修与售后']];
  const ns=rows.map((v,i)=>card(v[0],v[1],65+i*301,217,247,92,{size:23,bs:19}));for(let i=0;i<3;i++)edge(sl,ns[i],ns[i+1],t);
  text('共同基础：教育、科研、基础设施与跨企业分工，支撑上述全部环节。',65,319,1150,32,20,t.muted);
  text('iPhone 14 Pro Max · 128GB · 美国毫米波型号',65,369,744,31,23,t.ink,true);
  text('$1,099',65,412,253,58,42,t.accent,true);text('2022年发布时税前起售价',335,432,450,31,21);
  const w=744,a=w*474/1099;rect(sl,65,484,a,61,t.accent);rect(sl,65+a,484,w-a,61,t.gold);
  text('物料 $474 · 43.1%',73,500,a-16,32,22,'#FFF9EE',true,'center');text('其余 $625 · 56.9%',73+a,500,w-a-16,32,22,t.ink,true,'center');
  text('按物料估计上限计算。其余包含组装、研发、运输、销售、售后及利润，\n公开估计未逐项拆分；625美元不能视为净利润或剩余价值。',65,561,745,48,18,t.muted);
  rect(sl,846,369,1,226,t.line);
  [['投资权','产品、工厂、技术与采购投向'],['组织权','用工、工时、考核与承包规则'],['剩余处置权','分红、再投资与平台控制']].forEach((v,i)=>{const y=367+i*78;text(v[0],879,y,335,31,23,t.accent,true);text(v[1],879,y+34,335,39,20);});
  band('协作依赖整个社会，投资和剩余用途却由相应资本产权与公司治理结构决定。');return true;
 }
 case 5:{
  title('生产过剩与生活匮乏，来自需要和支付能力的分离','过剩是商品在既定价格下难以售出；仍有人需要粮食、住房与服务');
  text('假设收获50袋粮食，其中10袋没有按预期售出',65,219,1150,34,24,t.ink,true);
  const a=[['劳动者消费\n20袋',20,t.light,t.ink],['资本家消费\n5袋',5,t.gold,t.ink],['种子、饲料等\n投入15袋',15,'#CDBDA4',t.ink],['非意愿库存\n10袋',10,t.accent,'#FFF9EE']];let x=65;
  for(const [s,n,c,col] of a){const w=1150*n/50;rect(sl,x,269,w,75,c);text(s,x+6,282,w-12,56,n===5?17:22,col,true,'center');x+=w;}
  text('需要：人想获得生活资料。有效需求：愿意且能够按现行条件购买。上图为实物用途假设。',65,358,1150,31,20,t.muted);
  const ns=[['销售困难','库存、降价、回款变慢'],['减产与裁员','工资和上游订单减少'],['收入收缩','居民与企业削减支出'],['信用趋紧','贷款、投资进一步收缩']].map((v,i)=>card(v[0],v[1],65+i*301,408,247,96,{size:23,bs:19}));
  for(let i=0;i<3;i++)edge(sl,ns[i],ns[i+1],t);line(sl,[[1092,505],[1092,531],[188,531],[188,506]],t,{arrow:true});
  text('收入保障阻断消费收缩',65,551,337,45,21,t.accent,true);text('信用修复减轻集中偿债',472,551,337,45,21,t.accent,true);text('生产调整对接真实用途',880,551,337,45,21,t.accent,true);
  band('消化库存只是一个环节；持续恢复还依赖收入、信用与生产用途共同调整。');return true;
 }
 case 6:{
  title('分散扩张与购买力约束，在销售环节汇成过剩','企业各自按利润预期生产，市场事后检验这些计划能否同时实现');
  const rs=[['竞争：各家都想多卖','争市场、上设备、扩大份额；\n技术与信贷使多家企业同时扩张。'],['分配：产能快于支出','工资和保障未跟上产出；\n高收入者储蓄增加，其他支出未必补足。'],['时滞：今天建、明天卖','建设和销售跨期，信息不完整；\n乐观预期也可能随融资一起放大。']];
  const ns=rs.map((v,i)=>card(v[0],v[1],65,217+i*123,599,111,{size:23,bs:21}));
  const target=card('计划供给 ＞ 实际购买','预期价格下销售不足\n→ 非意愿库存、利润与回款承压\n→ 减产、失业和违约风险',811,274,404,185,{size:25,bs:22,strong:true});
  const hub=rect(sl,736,366,2,2,'none');for(const n of ns)edge(sl,n,hub,t,'right','left',{arrow:false});edge(sl,hub,target,t);
  text('需求也可能被补上',830,484,365,31,23,t.accent,true);text('利润消费、投资、政府购买和外需\n都能吸收产品；效果取决于规模、\n时点及与供给的匹配。',830,525,365,73,21);
  band('工资低于产值不足以证明危机；要检验总支出是否能够承接竞争推动的扩张。');return true;
 }
 case 14:{
  title('技术先行产生价值差，技术普及又消除价值差','个别价值低于社会价值，是超额剩余价值的条件；出售产品才能实现收益');
  const phases=[['率先采用',12,10,'差额2'],['同行跟进',11,10,'差额1'],['普遍采用',10,10,'差额0']];
  phases.forEach(([a,sv,iv,n],i)=>{let x=65+i*408;text(a,x,219,335,37,25,t.accent,true);text('单位价值（假设）',x,262,335,27,19,t.muted);text('社会',x,305,66,30,20);rect(sl,x+72,301,sv*18,34,t.gold);text(String(sv),x+80+sv*18,301,50,34,23,t.ink,true);text('个别',x,356,66,30,20);rect(sl,x+72,352,iv*18,34,t.accent);text(String(iv),x+80+iv*18,352,50,34,23,t.ink,true);text(n,x+72,402,232,41,29,t.accent,true);});
  line(sl,[[257,452],[1069,452]],t,{arrow:true});text('扩散使社会必要劳动时间下降，原有单位优势缩小',242,467,851,35,22,t.ink,true,'center');
  [['技术条件','效率优势超过新增采用成本'],['销售条件','质量、价格与实际销量可维持'],['竞争结果','领先者获益，同行被迫跟进']].forEach((v,i)=>{let x=65+i*408;text(v[0],x,523,335,29,23,t.accent,true);text(v[1],x,560,335,43,20);});
  band('个别资本追逐暂时优势，使技术更新成为持续竞争；局部多得与社会总量要分别核算。');return true;
 }
 case 15:{
  title('必要劳动缩短，同一劳动日提供更多剩余劳动','生活资料及其生产资料的生产率提高 → 生活资料价值下降 → 劳动力价值下降');
  text('8小时劳动日',65,219,434,35,25,t.ink,true);text('m′＝剩余劳动时间 ÷ 必要劳动时间',678,219,538,35,24,t.accent,true);
  const x=210,w=730;[['原来',4,4,'100%',276],['变化后',2,6,'300%',370]].forEach(([lab,n,s,p,y])=>{text(lab,65,y+18,137,36,23,t.muted,true);rect(sl,x,y,w*n/8,68,t.light);rect(sl,x+w*n/8,y,w*s/8,68,t.accent);text('必要 '+n+'小时',x+8,y+20,w*n/8-16,35,n===2?20:23,t.ink,true,'center');text('剩余 '+s+'小时',x+w*n/8+8,y+20,w*s/8-16,35,24,'#FFF9EE',true,'center');text(p,970,y+12,242,47,34,t.accent,true,'center');});
  text('每人剩余价值：4λ → 6λ，增加50%；剩余价值率：100% → 300%。',65,458,1150,35,23,t.accent,true);
  const vals=[['相对剩余价值','劳动日不变，必要劳动缩短。\n须经过必要生活资料的价值变化。'],['绝对剩余价值','必要劳动给定，延长工作日。\n例如4＋4小时 → 4＋6小时。'],['劳动强化','单位时间支出的劳动增加。\n与工具带来的生产率提高有别。']];
  vals.forEach((v,i)=>card(v[0],v[1],65+i*408,510,335,100,{size:23,bs:19}));
  text('算例保持生活标准、劳动强度和每小时新价值λ不变；社会总量还取决于就业人数。',65,630,1150,29,19,t.muted);return true;
 }
 case 16:{
  title('韦伯解释获利如何成为持续、可计算的经营','资本主义并非只有逐利欲望，还依赖可核算、可预期和可执行的经营秩序');
  const a=card('资本核算：比较投入与回报','企业与家庭收支分离；连续记录账目。\n投资据成本、风险与预期收益作比较。\n技术改造因此成为可反复计算的选择。',65,218,435,172,{size:23,bs:20});
  const b=card('制度条件：形成稳定预期','产权、合同、法律与市场秩序；\n形式自由的劳动雇佣及可交易资源。\n这些条件支持跨期投资与协作。',781,218,435,172,{size:23,bs:20});
  const c=card('伦理动机：纪律与积累','天职观、入世禁欲与自我约束；\n节制消费、持续工作、将收益再投资。\n解释历史联系，不能化约为单一原因。',65,426,435,172,{size:23,bs:20});
  const e=card('科层组织：执行不依赖个人','资格分工、层级职权、书面规则；\n人员更替后仍能监督与连续经营。\n也使组织依赖专业知识和管理者。',781,426,435,172,{size:23,bs:20});
  const center=rect(sl,548,350,184,110,t.accent);text('理性经营\n持续获利',562,373,156,66,24,'#FFF9EE',true,'center');edge(sl,a,center,t);edge(sl,b,center,t,'left','right');edge(sl,c,center,t);edge(sl,e,center,t,'left','right');
  band('马克思分析剩余劳动与占有；韦伯分析行动、制度和组织，二者在技术管理问题上相接。');return true;
 }
 case 17:{
  title('算法把目标算得更精确，目标本身仍须由人决定','形式合理性看计算与程序；实质合理性按安全、公平、生活等价值标准评价结果');
  card('配送平台的目标函数','降低每单成本、提高准时率和单量\n→ 拆分任务、预测时间、匹配订单\n→ 记录位置、等待、评分与接单行为',65,219,551,166,{size:25,bs:22});
  card('需要写入系统的保障约束','休息下限、安全缓冲与稳定报酬\n→ 限制连续工作、异常天气留出余量\n→ 保留拒单、人工复核与申诉渠道',665,219,551,166,{size:25,bs:22});
  const a=node('预测与调度',65,427,267,66,23),b=node('考核与奖惩',508,427,267,66,23),c=node('劳动节奏',949,427,267,66,23);edge(sl,a,b,t);edge(sl,b,c,t);
  text('谁选指标：只看速度，还是兼顾安全？',65,524,551,33,21,t.accent,true);text('谁能纠错：评价依据、数据争议与人工解释。',665,524,551,33,21,t.accent,true);
  text('同一技术可把节约时间转成更多订单，也可转成休息、培训与风险降低；结果取决于规则制定权。',65,568,1150,37,21);
  band('公共机构也需要透明、参与和问责；计算能力本身不能替代对社会目标的选择。');return true;
 }
 case 18:{
  title('资本按工资节约与新增成本，选择AI和自动化','可变资本v购买劳动力；不变资本c以生产资料形式转移已有价值');
  card('v的“可变”来自活劳动创造新价值','工资购买劳动力，活劳动创造v＋m。\n机器和材料随消耗转移原有价值；\n固定／流动资本是另一套分类。',65,219,551,159,{size:24,bs:21});
  card('企业采用技术的成本门槛','节约的工资 ＞ 新增折旧、服务与改造成本\n销售规模越大，固定成本越易分摊；\n质量、可靠性和磨合风险也影响选择。',665,219,551,159,{size:24,bs:21});
  text('单件相关成本（产量、质量及其他成本不变）',65,405,1150,33,23,t.accent,true);
  text('人工方案',65,458,162,33,23,t.ink,true);rect(sl,251,447,660,56,t.gold);text('工资 20元',271,463,619,34,23,t.ink,true);text('合计20',962,458,253,35,25,t.ink,true);
  text('自动化后',65,541,162,33,23,t.ink,true);rect(sl,251,530,264,56,t.gold);rect(sl,515,530,297,56,t.accent);text('工资 8元',266,546,234,33,23,t.ink,true);text('新增成本 9元',530,546,267,33,23,'#FFF9EE',true);text('合计17 · 节约3',868,541,347,35,25,t.accent,true);
  band(d.transition??'节约工资形成替代激励；社会就业和剩余价值总量，还受新任务、需求与劳动人数影响。');return true;
 }
 case 20:{
  title('技术投资创造产业机会，也会积累新的回报压力','技术性能、融资估值与可持续收入，是三个需要分别检验的信号');
  const vals=[['技术突破','降低成本或创造新用途'],['抢占先机','融资、采购与基础设施建设'],['集中投产','同向扩张，供给跨期释放']];
  const ns=vals.map((v,i)=>card(v[0],v[1],65+i*408,219,335,102,{size:24,bs:20}));edge(sl,ns[0],ns[1],t);edge(sl,ns[1],ns[2],t);
  card('1990年代末—2001年：信息通信投资','互联网和通信需求推动设备投入。\n部分通信设施随后闲置，局部又有短缺；\n应用有价值，不能保证每项投资按期回本。\n融资、建设时滞与配套条件共同影响利用。',65,367,552,221,{size:24,bs:21});
  const a=card('需求与互补条件到位','客户、网络、人才和付费能力形成\n→ 利用率提高 → 回款支持继续更新',718,367,498,99,{size:23,bs:19});
  const b=card('预期需求落空','利用率和价格低于预期\n→ 现金流承压 → 减值、债务与缩支',718,489,498,99,{size:23,bs:19});
  line(sl,[[1050,322],[1050,344],[687,344],[687,540]],t);line(sl,[[687,418],[717,418]],t,{arrow:true});line(sl,[[687,540],[717,540]],t,{arrow:true});
  band('检验新技术投资：用途、利用率、收入来源、长期运维和设备更新，须与性能一起核算。');return true;
 }
 case 21:{
  title('发电成本显著下降，生活改善仍要经过价格与分配','2010与2024年的全球加权平均LCOE：新建公用事业级项目，单位为2024美元/kWh');
  text('光伏 −90%　陆上风电 −70%　海上风电 −62%',65,217,733,40,23,t.accent,true);
  const ds=data.renewables;
  const ch=sl.charts.add('bar',{position:{left:65,top:284,width:728,height:276},categories:ds.categories,series:ds.series.map((s,i)=>({...s,fill:i?t.accent:t.gold})),hasLegend:false,barOptions:{direction:'column',grouping:'clustered',gapWidth:95},dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0.000',textStyle:{typeface:F,fontSize:18,fill:t.ink,bold:true}},xAxis:{textStyle:{typeface:F,fontSize:21,fill:t.ink},line:{fill:t.line,width:.7}},yAxis:{min:0,max:.5,majorUnit:.1,numberFormatCode:'0.0',textStyle:{typeface:F,fontSize:16,fill:t.muted},majorGridlines:{fill:t.line,width:.4},line:none},chartFill:'none',plotAreaFill:'none',chartLine:none,plotAreaLine:none});applyChartFont(ch,{fontFamily:F});
  rect(sl,85,261,21,12,t.gold);text('2010',116,255,124,27,18,t.muted);rect(sl,246,261,21,12,t.accent);text('2024',277,255,124,27,18,t.muted);
  text('LCOE：项目全寿命平均发电成本。两端年份比较，\n不能把发电侧降幅直接视为居民电费降幅。',84,559,707,49,19,t.muted);
  const a=card('① 技术与规模','设备效率、供应链、建设与融资',850,217,366,91,{size:23,bs:19});
  const b=card('② 系统与价格','电网、储能、调度、零售定价',850,342,366,91,{size:23,bs:19});
  const c=card('③ 实际生活','电费、工资、就业与公共服务',850,467,366,91,{size:23,bs:19});edge(sl,a,b,t,'bottom','top');edge(sl,b,c,t,'bottom','top');
  text('2024新增可再生装机中，91%\n的LCOE低于最廉价新建化石替代。',849,565,367,45,18,t.muted);
  band('降本可提高实际消费，也可降低必要生活资料价值；劳动者分享多少取决于价格和收入。');return true;
 }
 case 22:{
  title('数字交付扩大市场，收益沿平台与能力链重新分配','从货物运输转向远程提供软件、云服务和专业任务，市场边界与交易成本同时改变');
  text('4.25万亿美元',65,219,568,64,42,t.accent,true);text('2023年全球数字交付服务出口',65,290,568,37,24,t.ink,true);text('同比＋9.0%　｜　占货物与服务出口13.8%',65,340,568,43,22);
  text('包含云计算、流媒体、在线金融、远程咨询等。\n此项是跨境服务总额；国内增加值、企业利润\n和劳动者所得还要分别核算。',65,401,568,80,21,t.muted);
  text('收益归属取决于三项能力',65,517,568,34,24,t.accent,true);text('获得客户　｜　切换供应商　｜　决定价格与条款',65,560,568,43,21);
  const rs=[['客户入口','搜索、平台排名与客户关系'],['能力交付','模型、软件许可、API与云资源'],['结算与收入','抽成、支付、定价与跨境规则']];
  const ns=rs.map((v,i)=>card(v[0],v[1],716,219+i*124,500,97,{size:24,bs:21}));edge(sl,ns[0],ns[1],t,'bottom','top');edge(sl,ns[1],ns[2],t,'bottom','top');
  text('计算、许可和平台费用仍影响收入分配。',716,577,500,30,20,t.muted);
  band(d.transition??'数字服务创造交易机会；接入权与规则控制，影响谁能把生产能力转成持续收入。');return true;
 }
 case 24:{
  title('AI改变认知任务，能力展示与岗位变化之间仍有环节','发布说明、现场研究与就业统计，回答的是不同层次的问题');
  const timeline=[['2022.11','ChatGPT','对话式入口普及'],['2025.01','DeepSeek-R1','推理与开放权重'],['2026.10','OpenAI数学材料','719篇稿件／372组']];
  rect(sl,220,266,830,2,t.line);timeline.forEach((v,i)=>{let x=65+i*408;text(v[0],x,216,335,37,25,t.accent,true,'center');dot(sl,x+167,267,6,t);text(v[1],x,291,335,35,24,t.ink,true,'center');text(v[2],x,337,335,35,21,t.muted,false,'center');});
  text('客服研究：每小时解决问题数的增幅',65,394,626,37,24,t.accent,true);
  const ds=data.ai_productivity;const ch=sl.charts.add('bar',{position:{left:65,top:441,width:615,height:151},categories:ds.categories,series:[{name:'任务生产率增幅',values:ds.values,fill:t.accent}],hasLegend:false,barOptions:{direction:'bar',grouping:'clustered',gapWidth:115},dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0"%"',textStyle:{typeface:F,fontSize:23,fill:t.ink,bold:true}},xAxis:{textStyle:{typeface:F,fontSize:18,fill:t.ink},line:none},yAxis:{min:0,max:40,majorUnit:20,numberFormatCode:'0',textStyle:{typeface:F,fontSize:15,fill:t.muted},line:none,majorGridlines:{fill:t.line,width:.4}},chartFill:'none',plotAreaFill:'none',chartLine:none,plotAreaLine:none});applyChartFont(ch,{fontFamily:F});
  text('5,172名客服，分期上线；30%为约数，子群体包含在总体内。',65,601,628,40,18,t.muted);
  text('从任务能力到社会结果',740,394,476,37,25,t.accent,true);text('知识传播：新手更快获得成熟处理办法。\n流程重组：人工仍须核验、解释和负责。\n岗位变化：还取决于需求、工时与新任务。',740,444,476,89,22);
  text('数学稿件有不同验证状态；研究材料开放，\n与内部模型、算力和资产控制分属不同层次。',740,557,476,59,20,t.muted);return true;
 }
 case 26:{
  title('效率节约工时，需求扩张决定是否形成岗位减少','总工时 H＝任务量 Q / 效率 a；就业人数 N＝H / 人均工时 h');
  text('假设效率提高25%：H₁/H₀＝(Q₁/Q₀) / 1.25',65,218,752,39,24,t.accent,true);
  const xs=[0,10,25,40],ys=[80,88,100,112];const ch=sl.charts.add('scatter',{position:{left:65,top:310,width:722,height:232},hasLegend:false,scatterOptions:{style:'lineWithMarkers'},series:[{name:'原有总工时',xValues:[0,40],values:[100,100],line:{style:'dash',fill:t.line,width:1},marker:{symbol:'none'}},{name:'总工时指数',xValues:xs,values:ys,line:{fill:t.accent,width:3},marker:{symbol:'circle',size:8,fill:t.accent}}],xAxis:{min:0,max:40,majorUnit:10,numberFormatCode:'0"%"',textStyle:{typeface:F,fontSize:18,fill:t.muted},line:{fill:t.line,width:.7}},yAxis:{min:70,max:120,majorUnit:10,numberFormatCode:'0',textStyle:{typeface:F,fontSize:17,fill:t.muted},line:none,majorGridlines:{fill:t.line,width:.4}},chartFill:'none',plotAreaFill:'none',chartLine:none,plotAreaLine:none});applyChartFont(ch,{fontFamily:F});
  text('所需总工时（原来＝100）',83,277,620,28,20,t.ink,true);text('任务需求增幅',541,547,236,29,20,t.muted,false,'right');
  text('需求不变：工时−20%　｜　需求＋25%：工时不变',65,579,736,44,22,t.accent,true);
  card('同一效率，三种用法','裁员：工作向更少劳动者集中。\n缩时：人数保持，减少人均工时。\n扩张：新任务和新客户吸收能力。',850,219,366,178,{size:25,bs:21});
  card('分配会反过来改变需求','工资、降价和公共转移支持消费。\n岗位和收入缩减且补偿不足，\n可能让任务增长赶不上效率。',850,430,366,163,{size:25,bs:21});
  band('这里假设任务同质、质量不变；识别就业效应还须看劳动重组、收入分配和实际需求。');return true;
 }
 case 27:{
  title('成果可以传播，部署能力与决策权仍可能集中','把“开放”分解为具体权利，才能判断知识扩散是否改变资本控制');
  const a=[['成果可读','论文、报告、证明材料'],['模型可用','代码、权重、使用许可'],['能力可部署','算力、人才、数据与维护'],['重大事项可决定','投资、更新、接入与收益处置']];
  const ns=a.map((v,i)=>card(v[0],v[1],65,219+i*91,582,76,{size:23,bs:19}));
  text('DeepSeek-R1：扩大模型接入',711,219,505,38,24,t.accent,true);text('主要代码与权重按MIT许可开放；\n可自行部署并组织应用，仍须承担算力、\n运维和人才成本；衍生模型许可另核。',711,267,505,84,21);
  text('OpenAI数学材料：扩大成果获取',711,381,505,38,24,t.accent,true);text('公开稿件和部分验证材料，便于外部检查。\n其生产模型、推理资源和资产控制权，\n并不随材料公开一并转移。',711,429,505,85,21);
  text('公有AI要进一步回答：谁持有资产、\n谁可使用、谁有预算与规则的决定权。',711,550,505,57,21,t.accent,true);
  band('可读、可运行、可持续部署与共同决定，是四个不同层次；改革须落实到相应权利。');return true;
 }
 case 28:{
  title('算法重组管理权，自动化背后仍有持续劳动','标注、审核、纠错与设施维护支撑AI；记录、派单和奖惩又改变劳动的组织方式');
  card('被遮蔽的劳动环节','训练前：采集、清理、标注与授权。\n运行中：审核、纠错、人工接管。\n设施端：设备、能源、运维和安全。\n劳动分散在不同企业与地区。',65,219,389,211,{size:25,bs:21});
  text('两条理论线相接',65,461,389,34,24,t.accent,true);text('马克思：节约的劳动由谁占有？\n韦伯：谁制定、解释并执行规则？\n算法把经营目标写成持续的考核。',65,504,389,90,21);
  const a=card('记录','位置、时间、质量与评分',521,219,295,92,{size:24,bs:19}),b=card('分配','任务、路线、时限与接单',920,219,295,92,{size:24,bs:19}),c=card('评价','达标、报酬、拒单与违规',920,397,295,92,{size:24,bs:19}),e=card('反馈','奖惩再影响下一轮任务',521,397,295,92,{size:24,bs:19});edge(sl,a,b,t);edge(sl,b,c,t,'bottom','top');edge(sl,c,e,t,'left','right');edge(sl,e,a,t,'top','bottom');
  text('数据可查询\n可申请更正',537,332,118,52,18,t.accent,true);text('决定可解释\n可人工复核',1086,332,128,52,18,t.accent,true);
  text('2024欧盟平台工作指令',521,521,695,35,25,t.accent,true);text('算法透明、人工监督、自动决定的解释与复核；\n成效还须由各国落实、劳动者使用和执法来检验。',521,562,695,48,20);
  band(d.transition??'技术可以改善协调，也可以加强控制；关键是劳动者能否理解规则、纠错和参与。');return true;
 }
 case 30:{
  title('UBI与公有AI可能形成改革联盟，也会遇到利益阻力','收入保障与局部公共资产，可以同私人企业、雇佣劳动和市场竞争并存');
  const cols=[['劳动者','保障生活，降低对雇主的依赖。\n留出培训、转岗和协商的空间。','金额、物价与领取稳定性。'],['应用企业','获得可负担、可切换的AI能力；\n降低接入门槛，稳定消费市场。','使用费用、税负；\n与公共供给之间的竞争关系。'],['国家','支撑科研、教育和公共服务；\n缓冲需求冲击，减少技术依赖。','财源、运维能力；\n公开透明与实际问责。']];
  cols.forEach((v,i)=>{const x=65+i*408;text(v[0],x,219,335,39,29,t.accent,true);text(v[1],x,277,335,92,21);rect(sl,x,390,335,1,t.line);text('谈判焦点',x,411,335,31,22,t.accent,true);text(v[2],x,453,335,79,21);});
  rect(sl,65,546,1150,59,t.light);text('2021 Altman提案：以企业股权与土地税支持全民分享资本收益，属于资本主义内部改革设想。',82,558,1116,45,21,t.ink,true);
  text('形成条件：支持联盟能够组织起来；税负与公共竞争阻力可以协调；预算和治理能够持续执行。',65,628,1150,29,20,t.accent,true);return true;
 }
 case 31:{
  title('公共AI提供能力，基本收入把部分收益转成购买力','生产条件与收入分配需要分别安排，再通过服务、税收和消费连接起来');
  text('生产与服务流',65,215,894,29,21,t.accent,true);
  const a=card('公共AI','算力、模型和应用\n公共资产与接入规则',65,266,238,128,{size:25,bs:21});
  const b=card('企业／公共机构','组织生产与服务\n承担行业流程与责任',389,266,274,128,{size:25,bs:21});
  const c=card('居民生活','消费与公共服务\n更多选择与保障',749,266,229,128,{size:25,bs:21});edge(sl,a,b,t);edge(sl,b,c,t);
  text('资金回路',65,440,894,29,21,t.accent,true);
  const e=node('税收＋公共净收益',322,506,340,68,24),f=node('基本收入',749,506,229,68,24);edge(sl,b,e,t,'bottom','top');edge(sl,e,f,t);edge(sl,f,c,t,'top','bottom');
  line(sl,[[183,396],[183,540],[321,540]],t,{arrow:true});text('运营后可分配部分',65,590,321,28,18,t.muted);
  line(sl,[[862,396],[862,422],[525,422],[525,396]],t,{color:t.gold,arrow:true});text('消费形成订单',640,429,300,29,18,t.muted,true);
  rect(sl,1010,216,1,389,t.line);text('财政约束',1035,217,180,31,23,t.accent,true);text('净收益先扣运维、\n研发与必要更新；\n低价普惠与高额\n分红存在取舍。',1035,264,181,113,20);
  text('治理约束',1035,417,180,31,23,t.accent,true);text('预算公开、审计；\n使用者与劳动者\n参与规则制定；\n支持解释与申诉。',1035,462,181,113,20);
  band('公有强AI是未来制度情景；现阶段可从公共算力、开放模型与行业服务逐步建设。');return true;
 }
 case 33:{
  title('科技能够缓和物质约束，集中占有又会加剧矛盾','判断依据：新增生产能力怎样转成生活改善，关键决定权怎样变化');
  const cols=[['投资','新产业、设备与公共能力','同向扩张、资源瓶颈、未来回报不足'],['消费','降本、提高服务可及性','工资和岗位承压，收益分享不足'],['出口','扩大数字服务与跨境市场','全球需求约束，平台入口与许可集中']];
  cols.forEach((v,i)=>{const x=65+i*408;text(v[0],x,217,335,38,28,t.accent,true);text('缓和机制',x,269,335,29,21,t.accent,true);text(v[1],x,307,335,59,22,t.ink,true);text('加剧条件',x,389,335,29,21,t.accent,true);text(v[2],x,427,335,63,22);});
  rect(sl,65,526,1150,77,t.light);text('物质改善：产量、成本与服务　→　分配改善：收入、工时与保障　→　制度变化：投资、使用与收益权',83,541,1114,52,22,t.ink,true);
  text('UBI支持购买力，公有AI改变部分生产条件；改革深度要用实际权利检验，不能只看补贴或模型开放。',65,629,1150,30,20,t.accent,true);return true;
 }
 case 34:{
  title('剩余价值率、总量和利润率，反映不同关系','统一算例：25个全时劳动者、每天8小时、每小时新价值λ＝1；条件变化分别列明');
  const vals=[['原来','必要4h／剩余4h','v＝100　m＝100','m′＝100%','c＝300 → p′＝25%'],['必要劳动缩短','必要2h／剩余6h','v＝50　m＝150','m′＝300%','若c＝700 → p′＝20%'],['同时将人数减半','12.5个全时等价劳动者','v＝25　m＝75','m′＝300%','总量仅为原来的75%']];
  vals.forEach((v,i)=>{const x=65+i*408;text(v[0],x,219,335,37,25,t.accent,true);text(v[1],x,271,335,62,21);text(v[2],x,348,335,36,24,t.ink,true);text(v[3],x,402,335,49,32,t.accent,true);text(v[4],x,473,335,51,22,t.ink,true);});
  rect(sl,65,547,1150,61,t.light);text('m′＝m/v　　｜　M＝Nλ(T−tₙ)　　｜　p′＝m/(c＋v)',83,560,1114,39,26,t.ink,true);
  text('N为人数，T为劳动日，tₙ为必要劳动；假定强度、生活标准与λ不变，周转口径一致、按价值售出。',65,629,1150,29,19,t.muted);return true;
 }
 case 35:{
  title('韦伯把行动、制度、支配和分层联系起来分析','理想类型是比较工具；行动取向、组织规则与权力分布属于不同分析层次');
  const a=card('行动：理解意义','目的理性：比较手段与后果。\n价值理性：遵循被认定的价值。\n情感与传统：情绪、习惯也会导向行动。',65,219,551,164,{size:25,bs:21});
  const b=card('制度：形成可预期秩序','资本核算、产权、合同与雇佣劳动；\n形式合理性看计算和程序，\n实质合理性按价值标准评价结果。',665,219,551,164,{size:25,bs:21});
  const c=card('支配：解释命令何以有效','传统型、卡里斯玛型、法理型。\n科层制依靠职权、资格、层级和文书；\n提高连续性，也可能强化专业控制。',65,421,551,164,{size:25,bs:21});
  const e=card('分层：区分不同权力来源','阶级：市场机会与经济处境。\n身份群体：社会荣誉与生活方式。\n政党：争取组织化支配与影响力。',665,421,551,164,{size:25,bs:21});
  band('伦理与积累存在历史联系；“铁笼”揭示理性经营秩序也会反过来约束个人。');return true;
 }
 case 36:{
  title('基本收入要有持续财源，公共AI要有实际公共权利','年度预算：12Pb ≤ T＋D；P为人口、b为月金额、T为可用税收、D为可分配净收益');
  card('毛支出与净受益分别核算','100万人 × 每月1000元 × 12\n＝每年120亿元毛支出。\n再核算税收回收、原有保障的衔接，\n以及不同家庭的实际净受益。',65,219,551,180,{size:25,bs:22});
  card('公共AI净收益的计算','D＝经营收入−运维−研发−更新−必要再投资\n各扣除项避免重复，D也可能为负。\n低价普惠会减少可分红利润；\n资产估值与融资额不能直接发现金。',665,219,551,180,{size:25,bs:21});
  text('再分配怎样支持消费',65,430,551,35,25,t.accent,true);text('ΔC＝(c低−c高)X\n若边际消费倾向分别为0.9和0.5，\n净转移100，在其他条件不变时消费增加40。',65,481,551,103,22);
  text('公共所有怎样落实',665,430,551,35,25,t.accent,true);text('资产持有 → 接入规则 → 预算与更新决定\n公开审计 → 劳动者与使用者参与 → 可执行申诉\n现金受益与生产决策权，需要分别落实。',665,481,551,103,22);
  band('X为从高收入向低收入群体的净转移；这是一组条件模型，须再检验税基、供给和治理。',20);return true;
 }
 default:return false;
 }
}

