/* Small authored pencil icons. No Unicode stand-ins or external requests. */
(function(root){
 'use strict';
 var paths={
  bread:'<path d="M4 22C3 8 11 4 20 5c11-2 17 5 16 17L5 26Z"/><path d="m11 11 4 7m5-9 4 7m4-6 3 5"/>',
  person:'<circle cx="20" cy="9" r="7"/><path d="m15 16-3 19h6l2-7 2 7h6l-3-19M14 19l-7 8m19-8 7 8"/>',
  cash:'<path d="m14 9-3-6 17 1-4 6C39 24 36 35 20 35 3 35 2 23 14 9Z"/><path d="M13 11h13"/><circle cx="20" cy="24" r="6"/>',
  clothes:'<path d="m13 7-10 9 6 7 5-4-1 16h15l-1-16 5 4 6-7-10-9c-3 7-11 7-15 0Z"/><path d="M13 10q7 10 15 0M15 31h11m-2-13h4v5h-4Zm-18 1 4 4m22-4-4 4" stroke-width="1.5"/>',
  cars:'<path d="m3 22 6-12h21l7 12v9H3Zm6-1h22m-11-9v9"/><path d="M19 24v5m6-4h3M4 26h3m27-1h3" stroke-width="1.5"/><circle cx="10" cy="31" r="4"/><circle cx="30" cy="31" r="4"/><circle cx="10" cy="31" r="1"/><circle cx="30" cy="31" r="1"/>',
  ovens:'<path d="M6 6h28v29H6Z"/><path d="M11 17h18v12H11Zm-1-6h3m5 0h3m5 0h3"/>',
  inputs:'<path d="m8 12-2-6 15 1-3 5c5 6 7 15 6 23H3C1 25 3 17 8 12Z"/><path d="M6 14h14m-7 5v10m0-6-4-3m4 6 4-4" stroke-width="1.5"/><path d="M27 14h9v21h-9Zm0 5h9m-9 10h9M29 12v-3h5v3"/>',
 };
 function coin(){return '<svg class="money-coin" viewBox="10 10 102 102" aria-hidden="true"><image href="/assets/trust/iterated_coin.png" width="128" height="128"/></svg>';}
 // Reuse the exact Trust coin frame from the preceding act, not a Unicode coin.
 // Replace text nodes only: wallet buttons and their handlers remain intact.
 function decorateMoney(container){
  var walker=document.createTreeWalker(container,4),nodes=[],node;
  while((node=walker.nextNode()))if(node.nodeValue.includes('枚')&&!node.parentElement.closest('.money-unit,svg,script,style'))nodes.push(node);
  nodes.forEach(function(node){var text=node.nodeValue,re=/([＋+−-]?\d+(?:[—–-]\d+)?\s*)?枚/g,fragment=document.createDocumentFragment(),from=0,match;
   // Keep the amount and its coin together when narrow screens wrap a line.
   while((match=re.exec(text))){fragment.appendChild(document.createTextNode(text.slice(from,match.index)));var unit=document.createElement('span');unit.className='money-unit';if(match[1])unit.appendChild(document.createTextNode(match[1]));var symbol=document.createElement('span');symbol.innerHTML=coin()+'<span class="money-spoken-unit">枚</span>';while(symbol.firstChild)unit.appendChild(symbol.firstChild);fragment.appendChild(unit);from=re.lastIndex;}
   fragment.appendChild(document.createTextNode(text.slice(from)));node.replaceWith(fragment);
  });
 }
 root.StreetArt={decorateMoney:decorateMoney,icon:function(kind){if(kind==='cash')return coin();return '<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+paths[kind]+'</svg>';}};
})(window);
