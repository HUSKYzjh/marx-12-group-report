// Presentation only: opening a category never submits a business decision.
export function courseMenu(moves){
 const groups=[{id:'price',label:'改售价',moves:[]},{id:'equipment',label:'换烤炉',moves:[]},{id:'staff',label:'调人手',moves:[]}],direct=[];
 for(const move of moves){
  if(move.id==='hold'){direct.push(move);continue;}
  const group=move.id.startsWith('price-')?groups[0]:['buy','expand','upgrade','more','less'].includes(move.id)?groups[1]:groups[2];
  group.moves.push(move);
 }
 if(groups[2].moves.some(m=>m.id.startsWith('wage-')))groups[2].label=groups[2].moves.some(m=>['hire','fire'].includes(m.id))?'人手与工资':'调工资';
 if(moves.some(m=>m.id==='expand'))groups[1].label='扩产与烤炉';
 return {groups:groups.filter(g=>g.moves.length),direct};
}
export function shortMoveLabel(move){
 return {'price-up':'涨价 1 枚','price-down':'降价 1 枚',buy:'添一台炉',expand:'添炉＋招工',upgrade:'换成快炉',hire:'招一人',fire:'少雇一人','wage-up':'工资加 1 枚','wage-down':'工资减 1 枚',hold:'照常营业 →'}[move.id]||move.name;
}
