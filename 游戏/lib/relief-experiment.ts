import {reliefAccount, type ReliefRoute} from './crisis-model.ts';

export const RELIEF_PHASES=['ready','improved','stress','compare','done'] as const;
export type ReliefPhase=typeof RELIEF_PHASES[number];
/** Independent, constant-price output index, not the street's coins or bread. */
export function reliefFrame(route:ReliefRoute|null,phase:ReliefPhase,sustained:boolean){
 const r=route?reliefAccount(route,sustained):null;
 const next=r&&['stress','compare','done'].includes(phase);
 const output=next?r.nextOutput:50;
 const demand=next?r.nextDemand:r&&phase==='improved'?r.demand:40;
 return {output,demand,sold:Math.min(output,demand),unsold:Math.max(0,output-demand),period:next?2:1};
}

// Quotation checked against the fifth chapter, not a newly composed sentence.
export const EPILOGUE_QUOTE='好一似食尽鸟投林，落了片白茫茫大地真干净。';
export const EPILOGUE_SOURCE={title:'《红楼梦》第五回 · 收尾：飞鸟各投林',url:'https://www.gushiwen.cn/mingju/juv_bb9334891e9c.aspx',checked:'2026-10-04'};
// Delay after the preceding beat. “吗？” is later, not part of the first line.
export const EPILOGUE_DELAYS=[2200,2600,1000] as const;

/** Disclosed teaching conditions, not premises that define capitalism itself. */
export const PROLOGUE_REASONING={
 relation:{title:'先分清关系',parts:['许多人协作生产','生产资料由资本所有者占有'],note:'有没有剩货，不是判断这种关系是否存在的开关。'},
 sale:{title:'再看为什么卖不掉',parts:['有人需要','有钱并愿意买','实际成交'],note:'产品超过工资，不等于一定卖不掉。老板消费、投资、公共购买和外部买家也要算；信用能改变当期付款能力，还要看偿还。'},
 feedback:{title:'最后看反馈会不会加深',parts:['降薪或裁员','有人少领钱','下一轮少买'],note:'只有其他购买、收入或降价没有补足时，这条反馈才会压低销路。竞争压力取决于本局的成本和对手规则，不是每家企业都必然走同一条路。'},
 boundary:'几轮积压不等于全面危机，更不能证明必然崩溃。分红、共同经营或公共采购不自动改变一个国家的制度性质；社会主义国家不能直接套用这间私人企业的结论。',
 source:{title:'恩格斯《社会主义从空想到科学的发展》第三部分',url:'https://www.marxists.org/chinese/engels/1880/03.htm'},
} as const;
export const PROLOGUE_MODEL_ASSUMPTIONS=[
 '两店对战先用外部订单练习固定需求与波动需求；追钱阶段才改用11人的封闭街区。可选六店实验另有20人，独立开账，不继承演示金币。',
 '两店街区每人每天最多买一个面包；六店实验先尝试第一份，再递减额外购买意愿。住房、医疗和照护不能直接套用面包的上限。',
 '支付必须有资金来源；工人、老板与投资者都是买家。销售回款不等于利润。',
 '产出受设备与人手共同限制。新版两店对战的售价当天调整；添炉、升级、招工、解聘和工资调整次日生效。保留的旧版记录仍按旧规则结算；延迟、效率比例都不是行业定律。',
 '本局是私人雇佣企业，各家老板掌握机器与经营决定。分红、工资和表决权不是同一种权利。',
 '两店对手按公开脚本行动；六店企业按库存与资金自动调整。竞争压力取决于这些规则，不证明不降薪的企业一定倒闭。',
 '第二幕暂不含政府购买、信用和国外市场。第四幕分别解释消费、投资和出口怎样缓解需求压力，以及它们的条件与局限；不要求进行政策试验。',
 '库存、保管成本、保质期和轮数依实验而定。只有买家当期支付与需求确实不足时才出现卖不掉；工资之外仍有老板消费与投资等需求。',
] as const;

export const PROLOGUE_ASSUMPTIONS=[
 {id:'needs',label:'顾客要什么？',title:'吃饱以后，不会无限买面包。',scope:'两店街区每人每天最多买一份；可选六店实验的额外购买意愿递减。不是说人的一切需要都有固定上限。',ifs:[
  {id:'space',title:'如果要建一座太空城市？',play:'拼图纸，装船交货',change:'住房、能源、运输和储备的需求会大增。',question:'新增需要由谁出钱？订单能持续多久？产能增长又归谁控制？'},
  {id:'services',title:'如果缺的不是面包，而是照护？',play:'排人手，把凭证交给人',change:'商品积压，可以与医疗、教育、养老服务不足同时存在。',question:'钱和人手能转去满足这些需要吗？不能用“面包吃饱了”推论所有需求都消失。'},
 ]},
 {id:'labour',label:'工作怎么做？',title:'招人，只能从这条街现有的人里找。',scope:'工资街区11人，可选六店实验20人；失业者还在街上，招聘不凭空增加顾客。',ifs:[
  {id:'automation',title:'如果AI和机器人接下大部分工作？',play:'交出任务，再安排每个人',change:'不增加人，也可能多生产；工资来源却可能减少。',question:'谁拥有机器？失去工资的人靠什么购买？替代任务不等于已经消灭整个职业。'},
  {id:'time',title:'如果新机器换来少上一天班？',play:'挪走工作日，翻翻工资约定',change:'同样产出，可以由更短工时或新任务来完成。',question:'工资能保住吗？收益如何分？就业数量、工作时长与工资不能混为一件事。'},
 ]},
 {id:'ownership',label:'机器归谁？',title:'机器归各家老板，决定各自做。',scope:'第二幕描绘私人雇佣企业；不是所有国家、所有组织的通用制度。',ifs:[
  {id:'concentration',title:'如果技术只握在少数平台手里？',play:'接线、搬资料，换一份约定',change:'许多人共同创造的数据和知识，可能被少数所有者控制。',question:'许可费、入口和算法由谁决定？集中控制会怎样改变协作、议价与分配？'},
  {id:'sharing',title:'如果大家分享机器带来的收益？',play:'分金币、投票，再排三班',change:'同一项技术，可以配合不同的产权、分配和公共服务安排。',question:'在资本主义国家是缓和矛盾，还是改变其根基？社会主义国家不能直接套用同一基本矛盾。'},
 ]},
 {id:'boundaries',label:'买卖怎么改？',title:'实验暂不包括所有买家和所有规则。',scope:'第二幕暂不含政府购买、信贷和国外市场；设备价格、保管成本与保质期是教学设定，不是现实行业参数。',ifs:[
  {id:'policy',title:'如果食堂来买剩下的面包？',play:'分预算、签单，交货收款',change:'公共预算既能接住需要，也可能购买归私人所有的新设备；信用还要看后续收入。',question:'同一笔钱花在哪里，谁得到产品、谁拥有设备、谁承担风险？不能把所有政策都概括成“只会拖延”。'},
  {id:'prices',title:'如果冷柜让面包留到明天？',play:'接插头，挪价签，过一夜',change:'保存技术可以减少损失；是否继续做新货、售价与收入仍会改变结果。',question:'少浪费、卖得掉、赚得到是不是一回事？保存旧货不自动少做新货，也不自动改变私人占有。'},
 ]},
] as const;
