/* Local reading UI. Report text stays separate from game state and transactions. */
(function(root){
 'use strict';
 function parse(text){
  const groups=[];let current=null;
  String(text||'').trim().split(/\n\s*\n/).filter(Boolean).forEach(function(block,index){
   const lines=block.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),first=lines[0];
   const preface=index===0&&lines.length>1&&first.length<=65&&!/[。；]$/.test(first),heading=preface||(index>0&&first.length<=65&&!/[。；]$/.test(first)&&!/^\[|^https?:/.test(first));
   if(heading){current={title:first,pages:[],preface};groups.push(current);lines.shift();}
   if(/^\[[A-Z]?\d+\]/.test(first)&&current&&!/来源/.test(current.title)){current={title:'来源与读取范围',pages:[],preface:false,synthetic:true};groups.push(current);}
   if(!current){current={title:'正文',pages:[],preface:false};groups.push(current);}
   lines.forEach(function(line){
    if(/^https?:\/\//.test(line)&&current.pages.length)current.pages[current.pages.length-1]+='\n'+line;
    else current.pages.push(line);
   });
  });
  return groups.filter(g=>g.pages.length);
 }
 function mount(parent,text,options){
  const groups=parse(text);options=options||{};
  (options.topics||[]).forEach(function(g){if(g.pages&&g.pages.length)groups.push({title:g.title,pages:g.pages.slice()});});
  if(options.sources&&options.sources.length)groups.push({title:'原始来源（逐条）',pages:options.sources.map(function(s){return [s.title,s.published?'发表 / 更新：'+s.published:'',s.note,s.locator?'定位：'+s.locator:'',s.access?'读取范围：'+s.access:'',s.url,s.numericUrl?'数值摘要：'+s.numericUrl:''].filter(Boolean).join('\n');})});
  const reader=document.createElement('section');reader.className='research-reader';reader.dataset.testid='research-reader';parent.appendChild(reader);
  // Original supplied prose is retained for read-only QA; never used as executable markup.
  reader.researchText=String(text||'');
  if(!groups.length)return reader;
  let topic=groups.findIndex(g=>!g.preface),page=0;if(topic<0)topic=0;
  function el(tag,words,box,cls){const n=document.createElement(tag);n.textContent=words||'';n.className=cls||'';box.appendChild(n);return n;}
  const label=el('label','按主题阅读',reader,'research-topic'),select=el('select','',label);select.setAttribute('aria-label','选择资料主题');
  groups.forEach(function(g,i){const option=el('option',g.preface?'报告信息':g.title,select);option.value=String(i);});
  const content=el('div','',reader,'research-current');content.setAttribute('aria-live','polite');content.setAttribute('aria-atomic','true');
  const controls=el('nav','',reader,'research-pagination');controls.setAttribute('aria-label','资料段落切换');
  const previous=el('button','← 上一段',controls,'secondary'),position=el('span','',controls,'research-position'),next=el('button','下一段 →',controls,'secondary');previous.type=next.type='button';
  function prose(box,words){
   const pattern=/https?:\/\/[^\s<>]+/g;let at=0,match;
   while((match=pattern.exec(words))){box.appendChild(document.createTextNode(words.slice(at,match.index)));let url=match[0],tail='';while(/[；。，）]$/.test(url)){tail=url.slice(-1)+tail;url=url.slice(0,-1);}const a=el('a','原始来源 ↗',box,'research-link');a.href=url;a.target='_blank';a.rel='noreferrer';a.setAttribute('aria-label','原始来源：'+url);if(tail)box.appendChild(document.createTextNode(tail));at=pattern.lastIndex;}
   box.appendChild(document.createTextNode(words.slice(at)));if(typeof StreetArt!=='undefined')StreetArt.decorateMoney(box);
  }
  function draw(){
   const g=groups[topic];select.value=String(topic);reader.dataset.topic=String(topic);reader.dataset.page=String(page);reader.dataset.pageCount=String(g.pages.length);content.replaceChildren();
   const h=el('h3',g.title,content);h.className='research-heading';h.hidden=g.title.length<=18;prose(el('p','',content,'research-paragraph'),g.pages[page]);
   position.textContent=(page+1)+' / '+g.pages.length;previous.disabled=page===0;next.disabled=page===g.pages.length-1;controls.hidden=g.pages.length===1;
  }
  select.onchange=function(){topic=Number(select.value);page=0;draw();};
  function move(delta,button){page+=delta;draw();if(button.disabled)(delta>0?previous:next).focus({preventScroll:true});}
  previous.onclick=function(){if(!previous.disabled)move(-1,previous);};next.onclick=function(){if(!next.disabled)move(1,next);};
  draw();return reader;
 }
 root.ResearchReader={parse,mount};
})(window);
