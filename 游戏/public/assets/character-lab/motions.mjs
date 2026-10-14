/** Asset recipes, NOT economic/behaviour rules. Original images stay unchanged.
 * Durations are preview timing; original games are tick-based and contextual.
 * The Canvas recipes below adapt frame sequences/poses, not the original games.
 */
export const WB_COMMIT = '7c68c7e44e66b5be95ebd07d22391de707090397';
export const TRUST_COMMIT = '6ec45d73befdb922bd40654dd1c1c903a953562f';
export const TRUST_HATS = [
  {frame:12,label:'红色帽'}, {frame:13,label:'蓝色帽'}, {frame:14,label:'深色帽'},
  {frame:15,label:'粉色帽'}, {frame:16,label:'黄色帽'}, {frame:17,label:'格纹帽'},
];
export const PROPS = [
  {id:'camera',label:'相机取景框',path:'../wbwwb-source/cam/cam.png',note:'透明取景框；可作为观察场景的构图参考。'},
  {id:'flash',label:'拍摄闪光',path:'../wbwwb-source/cam/cam-flash.png',note:'原作闪光层；仅展示静态原图，不播放闪烁。'},
  {id:'instructions',label:'相机操作提示',path:'../wbwwb-source/cam/cam-instructions.png',note:'此固定版本的提示图不是中文；正式中文页面需另做文字层。'},
  {id:'tv',label:'电视机',path:'../wbwwb-source/tv.png',note:'原作电视外框；屏幕内容可另行编排。'},
];
export const ATLASES = [
  { id:'trust', label:'Trust · 身体、表情与帽子', path:'../trust/iterated_peep', origin:'trust' },
  { id:'coin', label:'Trust · 金币', path:'../trust/iterated_coin', origin:'trust' },
  ...['body','body_red','face','face_angry','face_nervous','face_snobby','face_snobby_hmph',
    'hat','hatguy','hangry','happy_weirdo','helping','peace','lovehat','lover_shirt','lover_panic',
    'lovers_watching','candlelight'].map(id => ({ id, label:'WBWWB · '+id, path:'../wbwwb-source/'+id, origin:'wbwwb' })),
];
const trustSource = 'vendor/ncase-trust/js/sims/Iterated.js';
const wbSource = file => 'vendor/ncase-wbwwb/js/'+file+'.js';
const recipe = (id,label,group,seconds,loop,source,note) => ({id,label,group,seconds,loop,source,note});
export const MOTIONS = [
  recipe('trust-idle','站立／眨眼','trust',3,true,trustSource,'脸1／2；预览以固定间隔眨眼，原作是随机眨眼。'),
  recipe('trust-smile','满足的笑','trust',2,true,trustSource,'脸8是原作 Reward Face；不等于现实角色善恶。'),
  recipe('trust-laugh','疯狂大笑','trust',2,true,trustSource,'脸10（Temptation Face）＋连续蹦跳；笑不是多张嘴部帧循环。原作另配 evil_laugh 音效，本库不导入声音。'),
  recipe('trust-grin','咧嘴狂笑','trust',2,true,trustSource,'原图第11帧的夸张露齿脸；已核查的IteratedPeep没有用此帧触发笑声。本作加入摇晃与跳动作为预览，不冒充原版动作。'),
  recipe('trust-walk','走向前／返回','trust',3,true,trustSource,'身体位移与蹦跳分开；按原作 _animate2／_animate4 的方式重新编排预览。'),
  recipe('trust-worried','不满／低落','trust',2,true,trustSource,'脸7（Punishment Face）＋本作轻微低头姿态。不是原版独立的低头图集。'),
  recipe('trust-dizzy','跌倒后晕眩','trust',2.5,true,trustSource,'脸18—22循环；身体倾倒借鉴 _animate2_alt。这里只展示姿态，不播放绊倒剧情。'),
  recipe('trust-pay','拿钱／递出','trust',2.4,true,trustSource,'复用原金币、身体和表情图层；取钱—靠近—递出的时序为本作重编。'),
  recipe('wb-walk','走路／停步','wbwwb',3,true,wbSource('game/Peep'),'基础走路：旋转、跳动和压扁回弹共同作用；不是逐帧腿部动画。'),
  recipe('wb-happy','欢喜／招呼','wbwwb',1.5,true,wbSource('peeps/HappyWeirdoPeep'),'happy_weirdo的0—2帧；整个人物图形，不能再叠加通用身体。'),
  recipe('wb-nervous','不安／回头看','wbwwb',2.4,true,wbSource('peeps/NervousPeep'),'face_nervous的6—16帧，最后回到6；原作会随机停留，本预览采用确定时序。'),
  recipe('wb-shocked','突然吃惊','wbwwb',.8,false,wbSource('peeps/NervousPeep'),'face_nervous的17—22帧，到22停住。'),
  recipe('wb-calm','慢慢平静','wbwwb',.8,false,wbSource('peeps/NervousPeep'),'face_nervous的26—29帧，结束回到6。'),
  recipe('wb-panic','惊慌快跑','wbwwb',2,true,wbSource('peeps/PanicPeep'),'face的12帧；原版更快步频、更大摆幅。本库只展示奔跑，不导入暴力结局。'),
  recipe('wb-angry','逐渐生气','wbwwb',1,false,wbSource('peeps/AngryPeep'),'face_angry的0—10帧；身体颜色图层保留但不在此预览叠加。'),
  recipe('wb-shout','生气／喊话','wbwwb',1.6,true,wbSource('peeps/AngryPeep'),'face_angry的10—25帧循环；无声音。'),
  recipe('wb-smug','得意的神情','wbwwb',.8,false,wbSource('peeps/SnobbyPeep'),'face_snobby的9—14帧；脸的垂直锚点为1.25，与普通脸不同。'),
  recipe('wb-hmph','哼／转开脸','wbwwb',1.2,false,wbSource('peeps/SnobbyPeep'),'face_snobby的15—20帧；“hmph”文字层仅保留在原图集查看，不硬套中文剧情。'),
  recipe('wb-hat','戴上帽子','wbwwb',1.5,false,wbSource('peeps/NormalPeep'),'hat的0—15帧，到15停住；帽子、脸、身体为独立图层。'),
  recipe('wb-crazy-walk','夸张地走','wbwwb',1,true,wbSource('peeps/CrazyPeep'),'hangry的0—9帧＋大幅跳动；原作CrazyPeep是叫喊者，不是Trust的疯狂大笑。'),
  recipe('wb-crazy-shout','夸张地叫喊','wbwwb',1.2,true,wbSource('peeps/CrazyPeep'),'先10—19帧，随后16—19短循环；预览略去原作的有限重复计数和离场剧情。'),
  recipe('wb-help','伸手帮忙','wbwwb',5.55,false,wbSource('peeps/HelpingAnim'),'helping的0—110帧，到110停住；第70帧为扶起节点。原作接续离场，本预览不执行。'),
  recipe('wb-protest','举牌／集体表达','wbwwb',1.55,true,wbSource('peeps/ProtestAnim'),'peace的0—30帧循环；原图有英文标语，只用于素材预览，中文场景需另做文字层。'),
  recipe('wb-protest-shock','举牌者停住','wbwwb',1,false,wbSource('peeps/ProtestAnim'),'peace的31帧；原作beStunned动作。'),
];
const clamp = (x,min,max) => Math.max(min,Math.min(max,x));
const layer = (atlas,frame,anchorY=1) => ({atlas,frame,anchorX:.5,anchorY});
export function sampleMotion(id,seconds,options={}) {
  const motion = MOTIONS.find(m => m.id===id);
  if (!motion) throw new RangeError('Unknown motion: '+id);
  const time = Math.max(0,Number.isFinite(seconds)?seconds:0);
  const intensity = clamp(Number.isFinite(options.intensity)?options.intensity:1,0,1.5);
  const t = motion.loop ? time%motion.seconds : Math.min(time,motion.seconds);
  const progress = t/motion.seconds;
  const shape = options.shape===1?1:0;
  let x=0,y=0,rotation=0,sx=1,sy=1,flip=options.mirror?-1:1,scale=motion.group==='trust'?1:1.25;
  let layers;
  const cycle = (start,end,fps=20) => start + Math.floor(t*fps)%(end-start+1);
  const once = (start,end) => start+Math.min(end-start,Math.floor(progress*(end-start+1)));
  const walking = (speed,amplitude,angle,range=95) => {
    const phase = t*speed*Math.PI*2;
    y=-Math.abs(Math.sin(phase))*amplitude*intensity;
    rotation=Math.sin(phase)*angle*intensity;
    sx=1+.08*Math.cos(phase*2)*intensity;sy=1/sx;
    x=Math.sin(t/motion.seconds*Math.PI*2)*range;
    if(Math.cos(t/motion.seconds*Math.PI*2)<0) flip*=-1;
  };
  if(motion.group==='trust') {
    let face=1;
    if(id==='trust-idle') face=t>2.5&&t<2.65?2:1;
    if(id==='trust-smile') face=8;
    if(id==='trust-laugh') {face=10;y=-Math.abs(Math.sin(t*24))*6*intensity;}
    if(id==='trust-grin') {face=11;y=-Math.abs(Math.sin(t*16))*7*intensity;rotation=Math.sin(t*12)*.06*intensity;}
    if(id==='trust-walk') {x=Math.sin(progress*Math.PI*2)*90;y=-Math.abs(Math.sin(t*24))*6*intensity;}
    if(id==='trust-worried') {face=7;rotation=-.04*intensity;}
    if(id==='trust-dizzy') {face=cycle(18,22,15);rotation=.9*intensity;y=-5;}
    layers=[layer('trust',0,.95)];
    if(Number.isInteger(options.hat)&&options.hat>=12&&options.hat<=17) layers.push(layer('trust',options.hat,.95));
    layers.push(layer('trust',face,.95));
    if(id==='trust-pay') {x=Math.sin(progress*Math.PI)*60;layers.push({...layer('coin',0,.5),anchorX:.5,x:20+Math.sin(progress*Math.PI)*55,y:-50-Math.sin(progress*Math.PI)*45,scale:.55});}
  } else {
    let faceAtlas='face',face=0,anchor=1;
    if(id==='wb-walk') {walking(2,10,.1);face=t>2.7?2:0;}
    if(id==='wb-nervous') {faceAtlas='face_nervous';face=cycle(6,16,10);}
    if(id==='wb-shocked') {faceAtlas='face_nervous';face=once(17,22);}
    if(id==='wb-calm') {faceAtlas='face_nervous';face=progress>=1?6:once(26,29);}
    if(id==='wb-panic') {face=12;walking(4,15,.3,115);}
    if(id==='wb-angry'||id==='wb-shout') {faceAtlas='face_angry';face=id==='wb-angry'?once(0,10):cycle(10,25);}
    if(id==='wb-smug'||id==='wb-hmph') {faceAtlas='face_snobby';anchor=1.25;face=id==='wb-smug'?once(9,14):once(15,20);}
    layers=[layer('body',shape),{...layer(faceAtlas,face,anchor),anchorX:faceAtlas==='face_angry'?1/3:.5}];
    if(id==='wb-hat') {layers[1].frame=progress>=1?6:1;layers.unshift(layer('hat',once(0,15)));}
    if(id==='wb-happy') {layers=[{...layer('happy_weirdo',cycle(0,2,2)),anchorX:.35}];walking(1.5,20,0,40);}
    if(id==='wb-crazy-walk') {layers=[layer('hangry',cycle(0,9,10))];walking(2.4,20,0,65);}
    if(id==='wb-crazy-shout') layers=[layer('hangry',t<.5?10+Math.min(9,Math.floor(t*20)):16+Math.floor((t-.5)*20)%4)];
    if(id==='wb-help') {layers=[layer('helping',once(0,110))];scale=1.05;}
    if(id==='wb-protest'||id==='wb-protest-shock') {layers=[layer('peace',id==='wb-protest'?cycle(0,30):31)];scale=.9;}
  }
  return {id,time:t,progress,layers,x,y,rotation,sx:sx*flip,sy,scale};
}
