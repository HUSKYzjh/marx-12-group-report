// Two acts, with external uncertainty introduced before income feedback.
export function coursePart(state){
 if(state.mode==='steady')return {id:'upper',title:'第二幕（上）· 需求固定',phase:'赚钱的算盘',note:'每天12位顾客，先算本店的成本、销量和收益。'};
 if(state.mode==='waves'||state.externalOnly&&state.mode==='done')return {id:'lower',title:'第二幕（下）· 需求不确定',phase:'客流波动',note:'另起36枚。昨天的客流，不能保证今天的销量。'};
 return {id:'lower',title:'第二幕（下）· 需求不确定',phase:'第二步 · 收入与购买力',note:'再起36枚。工资是本店的成本，也是顾客的收入。'};
}
