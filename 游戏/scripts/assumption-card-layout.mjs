import assert from 'node:assert/strict';

/** Inspect real layout without disabling hover, rewriting CSS or changing state. */
export async function checkAssumptionCardLayout(frame){
 const cards=await frame.locator('.assumption-group:visible .assumption-fork').evaluateAll(async buttons=>{
  await document.fonts.ready;
  return buttons.map(button=>{
   const preview=button.querySelector('.assumption-fork-play');
   const footer=button.querySelector('.assumption-fork-progress');
   return {height:button.offsetHeight,rowTop:button.parentElement.offsetTop,
    footerBottom:footer.offsetTop+footer.offsetHeight,
    hintHidden:preview.hidden,observed:!!button.querySelector('[data-branch-observation]'),
    hintID:preview.id,describedBy:button.getAttribute('aria-describedby'),
    width:button.clientWidth,contentWidth:button.scrollWidth,
    heightInside:button.clientHeight,contentHeight:button.scrollHeight};
  });
 });
 assert.equal(cards.length,2);
 assert(Math.abs(cards[0].height-cards[1].height)<=1,'both question cards must fill the same grid row');
 assert.equal(cards[0].rowTop,cards[1].rowTop,'two IFs stay beside each other');
 assert(Math.abs(cards[0].footerBottom-cards[1].footerBottom)<=1,'return prompts share a baseline');
 for(const c of cards){
  assert.equal(c.hintHidden,c.observed,'only an actual result replaces the visual action hint');
  assert(c.describedBy.split(' ').includes(c.hintID),'action stays explicitly described for screen readers');
  assert(c.contentWidth<=c.width+1&&c.contentHeight<=c.heightInside+1,'stretching must not clip the contents');
 }
 return cards.map(({height,hintHidden})=>({height,hintHidden}));
}
