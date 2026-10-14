import {ownerMarkup,ownerEmotion} from './owner-art.mjs';
// Stable identities: changing job status removes work headwear, not the person.
export const CUSTOMER_LOOKS=['chef-white','chef-white','chef-white','chef-white','chef-striped','chef-striped','chef-striped','chef-striped','round-monocle','square-parted-hair','supplier'];
export const PEDESTRIAN_LOOKS=['衬衫领带','条纹上衣','背带裤','长外套','连帽衫','裙装','马甲','围巾','手提袋','棒球帽','眼镜开衫','毛线帽'];
function layer(atlas,name,index){const a=atlas[name],f=Object.values(a.frames)[index].frame;return `<svg x="0" y="0" width="120" height="140" viewBox="${f.x} ${f.y} ${f.w} ${f.h}" overflow="hidden"><image href="${a.image||'../wbwwb-source/'+name+'.png'}" width="${a.meta.size.w}" height="${a.meta.size.h}"/></svg>`;}
function clothes(id){
 // Both teams use the original plain white body; only their hats distinguish them.
 if(id<8)return '';
 return '<g stroke="#656762" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M48 99Q59 103 72 99L80 132 66 134 61 124 56 134 44 132Z" fill="#b7a587"/><path d="M49 100L59 116 71 100M58 116L59 132M47 122H54M66 121H75" fill="none"/></g>';
}
function headwear(id,hat){
 if(id<8)return `<image data-work-hat="toque" href="${hat}" x="27" y="10" width="66" height="49"/>${id>=4?'<path data-hat-stripe="black" d="M40 46Q60 43.8 79 46L79 50Q60 47.8 40 50Z" fill="#222"/>':''}`;
 return '<g data-work-hat="cap" stroke="#646762" stroke-width="2.5" stroke-linejoin="round"><path d="M33 53Q35 33 62 35Q82 34 85 51Z" fill="#a59578"/><path d="M32 52Q65 47 92 53L77 58 35 58Z" fill="#e6e6da"/></g>';
}
export function customerMarkup(atlas,id,{working=false,worried=false,history=[],hat='../bakery/chef-hat.svg',employer}={}){
 if(!Number.isInteger(id)||id<0||id>10)throw new RangeError('Unknown customer');
 const team=employer??(id<4?0:1),look=id<8&&working?(team===0?'chef-white':'chef-striped'):CUSTOMER_LOOKS[id],role=id<8?(working?(team===0?'你店里的员工':'隔壁的员工'):'暂时待业'):id===10?'原料商':id===8?'你的老板':'隔壁老板';
 let content;
 if(id===8||id===9){const mood=worried?{mood:'loss',streak:1,balance:0,label:'没买到面包'}:ownerEmotion(history,id-8);content=ownerMarkup(atlas,id-8,mood);}
 else content=`<svg class="customer-body" viewBox="20 10 84 130" aria-hidden="true">${layer(atlas,'body',0)}${clothes(id)}${layer(atlas,worried?'face_nervous':'face',worried?8:0)}${working||id===10?headwear(id<8?team*4:id,hat):''}${id===10?'<path d="M84 104Q92 100 99 106L105 132Q89 138 79 130Z" fill="#d4c3a0" stroke="#69665e" stroke-width="2.5"/><path d="M87 106L96 107" fill="none" stroke="#69665e" stroke-width="2"/>':''}</svg>`;
 return `<span class="street-person" data-person-id="${id}" data-look="${look}" data-working="${working}" data-worried="${worried}" role="img" aria-label="${role}${worried?'，没买成，有些为难':''}">${content}</span>`;
}

// The first two scenes use illustrative shoppers, not the named workers' wallets.
// Keep a shopper's outfit unchanged while wandering, entering and buying.
export function pedestrianMarkup(atlas,id,{worried=false}={}){
 if(!Number.isInteger(id)||id<0)throw new RangeError('Unknown pedestrian');
 const look=id%PEDESTRIAN_LOOKS.length;
 const coat='<path d="M47 99L73 99 80 132 67 134 61 124 56 134 44 132Z"';
 const outfits=[
  coat+' fill="#e6e3d8"/><path d="M49 100L60 110 72 100M60 111L58 121 62 125 66 120 63 111" fill="#8e9795"/>',
  coat+' fill="#e0dfd3"/><path d="M48 108H75M46 116H77M45 124H58M66 124H79" fill="none"/>',
  coat+' fill="#e8e6dc"/><path d="M49 100L50 115 48 131 57 133 61 123 66 133 77 131 72 115 71 100M51 110H71M55 115H67V123H55Z" fill="#9ca8a5"/>',
  '<path d="M48 98L72 98 84 134 63 136 42 133Z" fill="#b8b2a1"/><path d="M61 100V135M49 99L56 112 61 105 68 112 73 99M47 123H55M68 123H77" fill="none"/>',
  coat+' fill="#aab5b1"/><path d="M49 98Q61 91 73 98L66 110 56 110Z" fill="#e7e5dc"/><path d="M57 108V115M65 108V115M51 122Q61 117 72 122" fill="none"/>',
  '<path d="M50 99L71 99 69 112 82 133Q62 138 41 132L52 113Z" fill="#c7b4ab"/><path d="M50 113H70M53 122L49 133M65 122L69 134" fill="none"/>',
  coat+' fill="#eeeae0"/><path d="M49 100L60 113 72 100 77 127 62 130 46 127Z" fill="#9c9c93"/><path d="M61 114V130M51 122H56M67 122H72" fill="none"/>',
  coat+' fill="#d5d2c3"/><path d="M46 97Q62 103 77 96L75 104 62 108 59 124 51 123 54 106 45 104Z" fill="#a4aaa4"/>',
  coat+' fill="#c2b9a8"/><path d="M83 117Q91 112 101 117L102 134 82 134Z" fill="#e2d5bc"/><path d="M87 117Q87 107 96 117" fill="none"/>',
  coat+' fill="#b3bfba"/><path d="M35 54Q36 37 61 37Q82 37 84 53Z" fill="#aaa28e"/><path d="M35 53Q65 48 94 55L79 60 35 58Z" fill="#d7d4c4"/>',
  coat+' fill="#d7c8b6"/><path d="M61 100V133M50 101L61 112 72 101" fill="none"/><circle cx="51" cy="67" r="9" fill="none"/><circle cx="73" cy="67" r="9" fill="none"/><path d="M60 66H64" fill="none"/>',
  coat+' fill="#b7c0ba"/><path d="M36 50Q39 30 61 32Q81 32 85 51Z" fill="#b3a69c"/><path d="M35 49Q62 45 86 50L85 57Q60 52 36 57Z" fill="#d8cbbd"/><path d="M43 98Q61 105 77 98L76 106 60 109 57 123 50 122 53 108 43 106Z" fill="#b3a69c"/>'
 ];
 const clothing='<g data-outfit="'+look+'" stroke="#656762" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+outfits[look]+'</g>';
 // Hats and glasses sit above the facial sprite, just like crew headwear.
 const body=layer(atlas,'body',0)+layer(atlas,worried?'face_nervous':'face',worried?8:0)+clothing;
 return `<span class="street-person" data-shopper-id="${id}" data-look="pedestrian-${look}" data-worried="${worried}" role="img" aria-label="穿${PEDESTRIAN_LOOKS[look]}的行人${worried?'，没买成，有些为难':''}"><svg class="customer-body" viewBox="20 10 86 130" aria-hidden="true">${body}</svg></span>`;
}
