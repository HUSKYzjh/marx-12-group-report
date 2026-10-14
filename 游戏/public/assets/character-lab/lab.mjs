import {ATLASES,MOTIONS,TRUST_HATS,PROPS,sampleMotion,WB_COMMIT,TRUST_COMMIT} from './motions.mjs';
import {loadArt,drawMotion,drawAtlasFrame} from './render.mjs';
const $=id=>document.getElementById(id);
const state={motion:'trust-grin',time:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,mode:'motions',shape:0,hat:-1,mirror:false,intensity:1,speed:1,atlas:'trust',frame:11};
window.__characterLab={state,sample:null,ready:false};
let art,last=null;
function render(){
  if(!art)return;
  const motion=MOTIONS.find(m=>m.id===state.motion);
  const sample=sampleMotion(state.motion,state.time,state);
  window.__characterLab.sample=sample;
  drawMotion($('stage'),art,sample);
  $('stage').setAttribute('aria-label',motion.label+' · '+(motion.group==='trust'?'Trust':'WBWWB'));
  $('time').value=sample.progress;$('time-output').value=sample.time.toFixed(2)+'秒';
  $('play').textContent=state.playing?'暂停':'播放';
}
function selectMotion(id){
  state.motion=id;state.time=0;last=null;$('motion').value=id;
  const m=MOTIONS.find(m=>m.id===id);$('motion-note').textContent=m.note;
  $('shape-label').hidden=m.group==='trust'||['wb-help','wb-protest','wb-protest-shock','wb-happy','wb-crazy-walk','wb-crazy-shout'].includes(id);
  $('hat-label').hidden=m.group!=='trust';
  $('source').href=m.group==='trust'?`https://github.com/ncase/trust/blob/${TRUST_COMMIT}/js/sims/Iterated.js`:`https://github.com/ncase/wbwwb/blob/${WB_COMMIT}/`+m.source.replace('vendor/ncase-wbwwb/','');
  render();
}
function atlasRender(){
  if(!art)return;const a=art.get(state.atlas);
  state.frame=Math.min(state.frame,a.frames.length-1);$('frame').max=a.frames.length-1;$('frame').value=state.frame;
  $('frame-output').value=`${state.frame} / ${a.frames.length-1}`;
  $('frame-prev').disabled=state.frame===0;$('frame-next').disabled=state.frame===a.frames.length-1;
  $('atlas-note').textContent=`${a.label} · ${a.frames.length}帧。帧号从0开始；原图包含空白层，空白不是加载失败。此视图按图集原坐标查看；特殊锚点见动作试演。`;
  drawAtlasFrame($('atlas-stage'),art,state.atlas,state.frame,{shape:state.shape,compose:$('compose').checked});
}
function setTab(mode){state.mode=mode;last=null;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===mode)));for(const name of ['motions','atlas','gallery','props'])$(name+'-panel').hidden=name!==mode;if(mode==='atlas')atlasRender();render();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
document.querySelectorAll('[data-motion]').forEach(b=>b.onclick=()=>{selectMotion(b.dataset.motion);state.playing=true;render();});
for(const group of ['trust','wbwwb']){const g=document.createElement('optgroup');g.label=group==='trust'?'信任的进化':'We Become What We Behold';MOTIONS.filter(m=>m.group===group).forEach(m=>g.append(new Option(m.label,m.id)));$('motion').append(g);}
ATLASES.forEach(a=>$('atlas').append(new Option(a.label,a.id)));
TRUST_HATS.forEach(h=>$('hat').append(new Option(h.label,String(h.frame))));
$('motion').onchange=()=>selectMotion($('motion').value);
$('play').onclick=()=>{state.playing=!state.playing;last=null;render();};
$('restart').onclick=()=>{state.time=0;state.playing=true;last=null;render();};
$('time').oninput=()=>{state.time=Number($('time').value)*MOTIONS.find(m=>m.id===state.motion).seconds;state.playing=false;last=null;render();};
$('shape').onchange=()=>{state.shape=Number($('shape').value);render();atlasRender();};
$('hat').onchange=()=>{state.hat=Number($('hat').value);render();};
$('speed').onchange=()=>{state.speed=Number($('speed').value);};
$('intensity').oninput=()=>{state.intensity=Number($('intensity').value);render();};
$('mirror').onclick=()=>{state.mirror=!state.mirror;$('mirror').setAttribute('aria-pressed',String(state.mirror));render();};
$('atlas').onchange=()=>{state.atlas=$('atlas').value;state.frame=0;atlasRender();};
$('frame').oninput=()=>{state.frame=Number($('frame').value);atlasRender();};
$('frame-prev').onclick=()=>{state.frame--;atlasRender();};$('frame-next').onclick=()=>{state.frame++;atlasRender();};$('compose').onchange=atlasRender;
document.addEventListener('visibilitychange',()=>{last=null;});
function tick(now){
  if(last!==null&&state.playing&&state.mode==='motions'&&!document.hidden){state.time+=Math.min(.05,(now-last)/1000)*state.speed;const m=MOTIONS.find(m=>m.id===state.motion);if(!m.loop&&state.time>=m.seconds){state.time=m.seconds;state.playing=false;}render();}
  last=now;requestAnimationFrame(tick);
}
try{
  art=await loadArt();
  const propFigures=await Promise.all(PROPS.map(async prop=>{
    const figure=document.createElement('figure');const link=document.createElement('a');link.href=prop.path;link.target='_blank';link.rel='noopener noreferrer';
    const img=new Image();img.src=prop.path;img.alt=prop.label;await img.decode();link.append(img);
    const caption=document.createElement('figcaption');const label=document.createElement('strong');label.textContent=prop.label;
    const note=document.createElement('p');note.textContent=prop.note;caption.append(label,note);figure.append(link,caption);return figure;
  }));
  $('props').append(...propFigures);
  for(const m of MOTIONS){const b=document.createElement('button');b.type='button';b.className='sample';const c=document.createElement('canvas');c.width=240;c.height=200;c.setAttribute('aria-hidden','true');const label=document.createElement('strong');label.textContent=m.label;const origin=document.createElement('small');origin.textContent=m.group==='trust'?'THE EVOLUTION OF TRUST':'WE BECOME WHAT WE BEHOLD';b.append(c,label,origin);b.onclick=()=>{setTab('motions');selectMotion(m.id);state.playing=true;render();window.scrollTo({top:0,behavior:'instant'});};$('gallery').append(b);drawMotion(c,art,sampleMotion(m.id,m.seconds*.55));}
  selectMotion(state.motion);atlasRender();window.__characterLab.ready=true;document.body.dataset.ready='true';requestAnimationFrame(tick);
}catch(err){$('error').hidden=false;$('error').textContent='素材加载失败：'+err.message;console.error(err);}
