export const sources = [
 {id:'engels',label:'恩格斯 · 基本矛盾',url:'https://www.marxists.org/archive/marx/works/1880/soc-utop/ch03.htm',text:'生产社会化与资本主义占有的矛盾，不等于“任何负面社会结果”的总称。'},
 {id:'marx',label:'马克思 · 劳动过程与价值',url:'https://www.marxists.org/archive/marx/works/1867-c1/ch07.htm',text:'劳动过程的一般技术条件与它的社会形式应当区分。游戏里的产品和货币账户不是价值量核算。'},
 {id:'mao',label:'毛泽东 · 社会主义社会矛盾',url:'https://fuwu.12371.cn/2013/08/19/ARTI1376892293655966_all.shtml',text:'社会主义社会仍有生产力与生产关系、经济基础与上层建筑的矛盾，性质与解决方式不能照搬旧社会。'},
 {id:'china',label:'中国宪法 · 基本经济制度',url:'https://www.stats.gov.cn/gk/tjfg/xgfxfg/202503/t20250312_1958942.html',text:'国家制度与企业具体运行是不同层级。中国不能因为存在私营企业或市场竞争就被列为资本主义国家。'},
 {id:'qje',label:'2025 · 生成式AI与客服生产率',url:'https://doi.org/10.1093/qje/qjae044',text:'正式论文研究5,172名客服人员，平均生产率提高约15%；不是全体劳动者效果，也不等于工资提高15%。'},
 {id:'metr',label:'2025 · METR开发任务公开数据',url:'https://github.com/METR/Measuring-Early-2025-AI-on-Exp-OSS-Devs',text:'本研究对246项任务的主要规格复算，AI许可组耗时增加约18.84%。这是特定开发任务，不是AI对所有工作无效。'},
 {id:'bls',label:'BLS · 非农商业部门生产率',url:'https://www.bls.gov/productivity/',text:'本研究保存的954条观测中，2019—2025年简单年均指数比较：生产率累计提高13.81%，实际小时报酬提高6.77%。不同价格口径意味着差额不全是劳动份额变化。'},
 {id:'uber',label:'2021 · 英国Uber判决',url:'https://supremecourt.uk/cases/uksc-2019-0029',text:'司机自有车辆与平台实际控制可以同时存在。涉案worker身份不等于全世界司机获得同一身份。'},
 {id:'injury',label:'2025 · 中国职业伤害保障办法',url:'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2025/art_369aa91977d641dc8ddcc1555e8f852b.html',text:'平台缴费与订单、职业伤害责任相连接；参保不是已经获得赔付，也不自动解决全部劳动关系认定。'},
 {id:'paid',label:'2025 · 北京实际待遇支付',url:'https://rsj.beijing.gov.cn/xwsl/spk/202511/t20251112_4278739.html',text:'发布会报告确认1.18万件、为7,700多名劳动者核定支付待遇。件数与人数不同，不能相除称赔付成功率。'},
 {id:'cms',label:'CMS · 基因治疗公共支付',url:'https://www.cms.gov/priorities/innovation/cgt-access-model-frequently-asked-questions',text:'公共支付协调可以改变可及性和风险分担，但参与地区所覆盖的人群不等于实际接受治疗人数，也不自动改变私人产品的所有权。'},
 {id:'board',label:'2021 · 德国董事会劳动者参与',url:'https://eml.berkeley.edu/~schoefer/schoefer_files/Labor_in_the_Boardroom_Final_QJE_Forthcoming.pdf',text:'利用部分企业三分之一代表席位义务变化的研究，未发现明确平均工资提升。这不是全部共同决定制度或社会所有权的实验。'},
 {id:'forest',label:'2026 · 采矿的矿区外森林损失',url:'https://www.nature.com/articles/s41586-026-10551-2',text:'研究表明评估不能只看矿坑。五年模型比率不能乘以全区域20年毁林面积，更不能全部归因于电动车。'},
 {id:'battery',label:'2026 · IEA电池路线变化',url:'https://www.iea.org/reports/global-ev-outlook-2026/electric-vehicle-batteries',text:'2025年LFP类超过全球新注册电动车电池容量的55%。不含两／三轮车，且不是汽车辆数或在用电池存量份额。'},
] as const;
export type SourceId=typeof sources[number]['id'];
export const institutionCards=[
 {title:'美国：政府购买私人企业的先进疗法',question:'有了公共医保支付，美国就变成社会主义国家了吗？',answer:'不是。',body:'公共支付能真实改善可及性，但购买私人产品不自动改变整个社会的生产资料所有制和剩余支配关系。政策效果与制度性质要分别判断。'},
 {title:'中国：平台劳动与职业伤害保障',question:'中国存在私营平台和用工矛盾，就能被归类为资本主义国家吗？',answer:'不能。',body:'中国的社会主义基本制度与具体企业关系不是一个层级。应研究制度怎样落实责任、保障劳动者，并核验实际赔付与成本归属；制度名称也不能替代效果证据。'},
 {title:'德国：劳动者参与企业治理',question:'劳动者获得部分代表席位，就等于拥有全部生产资料吗？',answer:'不等于。',body:'参与投资、协商工资、决定劳动过程、分享剩余与拥有生产资料是不同权利。某一项改革可以缓和冲突，却不意味着全部权利已同步转移。'},
];
