import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {artifact,canvas,runtime} from './project-runtime.mjs';
import {renderInformation} from './information-pages.mjs';
import {renderDense} from './dense-pages.mjs';
import {renderRestructure} from './restructure-pages.mjs';
import {refineLogic} from './logic-content.mjs';
import {renderLogic} from './logic-pages.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.dirname(HERE);
const {Presentation,PresentationFile,FileBlob}=artifact;
const {createCanvas}=canvas;
const LIB=runtime.helpers,PY=runtime.python;
const {finalizePresentation,applyPresentationChartFont}=await import(pathToFileURL(path.join(LIB,'artifact_tool_utils.mjs')).href);
const content=refineLogic(JSON.parse(await fs.readFile(path.join(HERE,'dense-content.json'),'utf8')));
const chartData=JSON.parse(await fs.readFile(path.join(HERE,'dense-charts.json'),'utf8'));
const rev=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]??'d1';
const sample=process.argv.find(a=>a.startsWith('--render='))?.split('=')[1]?.split(',').map(Number);
const dir=path.join(HERE,'roman-structure-'+rev),preview=path.join(dir,'预览');
await fs.mkdir(preview,{recursive:true});
const F='Microsoft YaHei',H='SimSun',N='Georgia';
const C={bg:'#F6F0E5',ink:'#302A24',accent:'#923D2C',light:'#E9DDC9',muted:'#746554',gold:'#B0905A',line:'#C2AD8D',panel:'#FBF8F1'};
const DC={...C,bg:'#171717',ink:'#F6EDDF',accent:'#D4B786',light:'#36332B',muted:'#C8BFAF',line:'#786C55',panel:'#242321',dark:true};
const ctx=createCanvas(16,16).getContext('2d'),audit=[];let active=0,uid=0;
const p=Presentation.create({slideSize:{width:1280,height:720}});
function tx(sl,value,x,y,w,h,size=26,color=C.ink,bold=false,align='left',font=F,name=''){
  const sh=sl.shapes.add({geometry:'textbox',name:name||'text-'+(++uid),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  sh.text=value;sh.text.style={typeface:font,fontSize:size,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0};
  ctx.font=`${bold?'bold ':''}${size}px "${font}"`;
  let lines=0;for(const row of String(value).split('\n')){let line='';for(const ch of row){if(line&&ctx.measureText(line+ch).width>w-2){lines++;line=ch;}else line+=ch;}lines++;}
  audit.push({page:active,text:value,x,y,w,h,size,font,lines,estimatedHeight:Math.round(lines*size*1.2),name});
  return sh;
}
function rect(sl,x,y,w,h,fill=C.light,line='none',lw=0,name=''){
  return sl.shapes.add({geometry:'rect',name:name||'shape-'+(++uid),position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width:lw}});
}
function dot(sl,x,y,r,t=C,empty=false){return sl.shapes.add({geometry:'ellipse',position:{left:x-r,top:y-r,width:r*2,height:r*2},fill:empty?t.bg:t.accent,line:{fill:t.accent,width:2}});}
function edge(sl,a,b,t=C,from='right',to='left',opts={}){
 const sh=sl.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{style:opts.dash?'dash':'solid',fill:opts.color??t.accent,width:opts.width??2},...(opts.arrow===false?{}:{tail:{type:'arrow',width:'med',length:'med'}})});
 sh.bringToFront();return sh;
}
function line(sl,points,t=C,opts={}){
 const nodes=points.map(([x,y])=>rect(sl,x-.5,y-.5,1,1,'none'));
 for(let i=0;i<nodes.length-1;i++)edge(sl,nodes[i],nodes[i+1],t,'right','left',{...opts,arrow:!!opts.arrow&&i===nodes.length-2});
}
function box(sl,title,body,x,y,w,h,t=C,{strong=false,size=28,bodySize=24,plain=false}={}){
 const sh=rect(sl,x,y,w,h,plain?'none':strong?t.accent:t.panel,plain?'none':t.line,plain?0:.65);
 const col=strong?(t.dark?C.ink:'#FFF9EE'):t.ink;
 if(body){tx(sl,title,x+20,y+15,w-40,40,size,col,true);tx(sl,body,x+20,y+63,w-40,h-70,bodySize,col);}
 else tx(sl,title,x+18,y+(h-size*1.2)/2,w-36,size*1.25+2,size,col,true,'center');
 return sh;
}
function badge(sl,label,x,y,w,t=C){rect(sl,x,y,w,34,t.light);tx(sl,label,x+8,y+4,w-16,28,19,t.ink,false,'center');}
function caption(sl,s,t=C,y=626){tx(sl,s,64,y,1152,38,23,t.accent,true);}
function roman(n){let s='';for(const [v,c] of [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=c;n-=v;}return s;}
function bg(sl,n,t){
 sl.background.fill=t.dark?'#121110':t.bg;
 if(t.dark){
  const arcade=sl.images.add({blob:new Uint8Array(readFileSync(path.join(ROOT,'素材','斗兽场-深色页底.png'))),contentType:'image/png',fit:'cover',position:{left:0,top:0,width:1280,height:720},alt:'原横向斗兽场拱廊上下翻转至页面上沿，右侧颜色较清晰；装饰性插画，非历史实景'});
  arcade.flipVertical=true;
  rect(sl,0,0,1280,225,'#121110/18');
  rect(sl,0,0,1280,225,{type:'gradient',gradientKind:'linear',angleDeg:90,stops:[{offset:0,color:'#121110/0'},{offset:48000,color:'#121110/25'},{offset:100000,color:'#121110'}]});
  rect(sl,0,0,760,225,{type:'gradient',gradientKind:'linear',angleDeg:0,stops:[{offset:0,color:'#121110'},{offset:45000,color:'#121110/82'},{offset:100000,color:'#121110/0'}]});
  rect(sl,0,225,1280,495,'#121110');
  return;
 }
 const file=n===1?'斗兽场-封面插画.png':'斗兽场-浅色页底.png';
 sl.images.add({blob:new Uint8Array(readFileSync(path.join(ROOT,'素材',file))),contentType:'image/png',fit:'cover',position:{left:0,top:0,width:1280,height:720},alt:'古罗马斗兽场主题装饰插画，非历史实景'});
 if(n!==1)rect(sl,0,0,1280,720,'#F7F2E9/40');
}
function head(sl,d,title,sub,t){
 tx(sl,d.section,64,30,1000,28,16,t.accent,true);
 tx(sl,title,64,77,1152,108,40,t.ink,true,'left',H,'slide-heading');
 if(sub)tx(sl,sub,65,190,1150,33,24,t.accent);
}
const foot={2:'恩格斯《反杜林论》；资本主义基本矛盾的理论概念',3:'遨游之舟（知乎）；《资本论》与视频观点的条件化整理',4:'马克思主义危机分析；B站《资本主义的本质是什么？》',5:'IMF财政政策说明；时间路径为机制示意',6:'OECD 2018；Federal Reserve History（2007—2009年危机）',7:'WTO，2010年发布口径：2009年世界货物贸易量',8:'FDR图书馆；WTO；Federal Reserve History；美国财政部',9:'马克思《资本论》第一卷：相对剩余价值；图为概念示意',10:'马克思《资本论》第一卷；8小时劳动日为条件示例',11:'韦伯《经济与社会》《新教伦理与资本主义精神》',12:'韦伯：形式与实质合理性、科层制；右侧为当代应用',13:'Ferguson，美联储，2001；马克思：剩余价值转化为资本',14:'IRENA 2025：2024年新增装机的LCOE比较；马克思：相对剩余价值',15:'WTO 2024年发布：2023年数字交付服务出口估计；非AI专属出口',16:'OpenAI；DeepSeek；Brynjolfsson等，QJE 2025（客服研究）',17:'IEA，Key Questions on Energy and AI，2026；全部数据中心',18:'B站《AI会带来赛博朋克，还是解放全人类？》；H＝Q/a为本报告条件模型',19:'DeepSeek-R1许可；WTO数字服务；相关B站文字稿',20:'马克思；韦伯；相关B站文字稿；欧盟理事会2024.10.14平台工作指令说明',21:'Altman，2021；OpenResearch；相关B站文字稿',22:'本文制度方案；财政与权利条件见附录A3',23:'APFC；OpenResearch 2024消费结果；ETH Zurich；英国政府2026',24:'综合前述理论与案例；完整链接见每页备注及配套来源文档',25:'马克思《资本论》第一卷；所有数值均为条件示例',26:'韦伯《经济与社会》《新教伦理与资本主义精神》',27:'本文条件模型；APFC、OpenResearch、韦伯等资料'};
function footer(sl,d,t){
 rect(sl,64,669,1152,1,t.line);tx(sl,d.footer??foot[d.legacy_page]??'',64,680,1080,22,13,t.muted);
 tx(sl,d.kind==='appendix'?'A'+(d.legacy_page-24):String(d.page).padStart(2,'0'),1145,676,71,28,16,t.ink,false,'right',N);
}
function rowText(sl,num,title,body,x,y,w,t=C){tx(sl,num,x,y,55,47,33,t.accent,false,'left',N);tx(sl,title,x+70,y,w-70,40,28,t.ink,true);tx(sl,body,x+70,y+48,w-70,69,24,t.muted);}

function firstHalf(sl,d,t){
  tx(sl,'马克思主义理论课程汇报',64,56,650,30,18,C.accent,true);
  tx(sl,'科学技术是缓和\n还是加剧了\n资本主义基本矛盾？',64,193,628,226,55,C.ink,true,'left',H,'slide-heading');
  tx(sl,'从投资、消费、出口到人工智能',68,464,650,44,29,C.accent);
  rect(sl,68,548,74,3,C.accent);tx(sl,'生产能力 · 收益分配 · 决策权',68,572,620,40,25,C.ink);
  tx(sl,'2026.10',68,657,300,30,17,C.muted,false,'left',N);return;
}

function energyChart(sl,t){
 tx(sl,'2030年预测约为2025年估计的2倍',789,288,426,31,21,t.accent,true);
 const ch=sl.charts.add('bar',{position:{left:785,top:326,width:420,height:276},categories:['2025（估计）','2030（预测）'],
  series:[{name:'全部数据中心用电',values:[485,950],points:[{idx:0,fill:t.accent},{idx:1,fill:t.gold+'/18',line:{style:'dash',fill:t.gold,width:2}}]}],
  hasLegend:false,barOptions:{direction:'column',grouping:'clustered',gapWidth:165},
  dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0',textStyle:{typeface:F,fontSize:26,fill:t.ink,bold:true}},
  xAxis:{textStyle:{typeface:F,fontSize:20,fill:t.ink},line:{fill:t.line,width:.8}},
  yAxis:{min:0,max:1100,majorUnit:500,numberFormatCode:'0',textStyle:{typeface:F,fontSize:16,fill:t.muted},majorGridlines:{fill:t.line,width:.4},line:{fill:'none',width:0}},
  chartFill:'none',plotAreaFill:'none',chartLine:{fill:'none',width:0},plotAreaLine:{fill:'none',width:0}});
 applyPresentationChartFont(ch,{fontFamily:F});
}
const layoutNames=['封面','协作与决定权网络','企业间工资与消费循环','需要与支付能力＋反馈环','投资跨期路径','收入与信用双路径','跨境订单与收入回路','历史政策时间线','技术扩散与价值差','等长劳动日比例图','理性经营的四个支撑','形式与实质合理性对照','投资扩张与需求分流','成本—价格—购买力','贸易扩展与入口控制','AI时间线＋工作效果','投资回路＋用电图','效率收益的两种路径','跨境服务分层图','隐藏劳动与算法循环','改革的潜在支持基础','公共生产与收入分配','制度实践双时间线','条件式结论','剩余价值率与总量','韦伯理论关系图','公共收益预算与治理'];
for(const d of content.slides){
 active=d.page;const t=d.kind==='divider'?DC:C;
 const sl=p.slides.add();bg(sl,d.page,t);
 const helpers={tx,rect,line,edge,box,dot,badge,energyChart,F,H,N,C,applyChartFont:applyPresentationChartFont};
 if(!renderLogic(sl,d,t,helpers)&&!renderDense(sl,d,t,helpers,chartData)&&!renderRestructure(sl,d,t,helpers,chartData)){if(!renderInformation(sl,{...d,page:d.legacy_page},t,helpers)){firstHalf(sl,d,t);}}
 const heading=audit.findLast(v=>v.page===d.page&&v.name==='slide-heading');if(heading)d.title=heading.text.replaceAll('\n','');
 if(d.page!==1)footer(sl,d,t);
 d.layout=d.layout??layoutNames[d.legacy_page-1];
 let notes=`${d.title}\n${d.minutes?`建议讲述时长：${d.minutes}分钟。`:'附录，按讨论需要使用。'}\n\n${d.notes}\n\n参考资料：\n`;
 for(const k of d.refs)notes+=`[${k}] ${content.sources[k].text}\n\n`;
 notes+='\n画面：古罗马斗兽场主题装饰插画；图表、文字和关系图使用可编辑对象。';
 sl.speakerNotes.text=notes;sl.speakerNotes.setVisible(true);
}
await fs.writeFile(path.join(dir,'text-geometry.json'),JSON.stringify(audit,null,2));
await fs.writeFile(path.join(dir,'content.json'),JSON.stringify(content,null,2));
const warnings=audit.filter(v=>v.estimatedHeight>v.h+3||v.x<0||v.y<0||v.x+v.w>1280||v.y+v.h>720);
await fs.writeFile(path.join(dir,'text-fit-warnings.json'),JSON.stringify(warnings,null,2));
console.log('TEXT_FIT_WARNINGS',warnings.length);warnings.forEach(w=>console.log(w.page,w.text.replaceAll('\n',' / '),w.estimatedHeight,w.h));
const candidate=path.join(dir,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
execFileSync(PY,[path.join(HERE,'deduplicate-pptx-media.py'),candidate],{stdio:'inherit'});
const finalPath=path.join(dir,'deliverable','科学技术与资本主义基本矛盾-古罗马斗兽场-信息深化与图形重绘版.pptx');
await fs.mkdir(path.dirname(finalPath),{recursive:true});
const result=await finalizePresentation({explicitTotalSlideCount:36,requiredNativeChartOwnerSlides:[9,10,11,21,24,25,26],requiredNativeTableOwnerSlides:[],
 materializeLiteralChartWorkbooks:true,workspaceDir:ROOT,candidatePath:candidate,finalPath,pythonExecutable:PY,
 integrityValidatorPath:path.join(LIB,'inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(LIB,'inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 fontPolicy:{basis:'design',families:[F,H,N]},verifyArtifactToolImport:true,receiptPath:path.join(dir,'validation.json')});
console.log('FINALIZED',result.byteCount);
const imp=await PresentationFile.importPptx(await FileBlob.load(finalPath));
for(let i=0;i<imp.slides.items.length;i++){
 if(sample&&!sample.includes(i+1))continue;
 const png=await imp.export({slide:imp.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(preview,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
 console.log('RENDERED',i+1);
}
console.log(JSON.stringify({finalPath,preview,slides:36,mainSlides:33,minutes:30}));
