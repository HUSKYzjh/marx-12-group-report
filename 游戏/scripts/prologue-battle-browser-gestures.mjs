import assert from 'node:assert/strict';
/** Open only the category containing the requested action, using its real control. */
export async function chooseBattleMove(frame,id,press=locator=>locator.click()){
 const move=frame.locator(`[data-move="${id}"]`);
 for(const detail of await move.locator('xpath=ancestor::details').all())if(await detail.getAttribute('open')===null)await press(detail.locator(':scope>summary'));
 await press(move);
}
/** Read every opening guide page using its real navigation controls. */
export async function readOpeningGuide(frame,press=locator=>locator.click()){
 await frame.locator('#opening-guide[open]').waitFor();
 while(await frame.locator('#opening-next').isVisible())await press(frame.locator('#opening-next'));
 await press(frame.locator('#opening-start'));
}
/** Play the actual nested battle; no snapshots or reducer calls are injected. */
export async function completeBattle(page,frame,key,{onCheckpoint=async()=>{}}={}){
 await frame.locator('#prologue-battle').waitFor();
 const battle=await(await frame.locator('#prologue-battle').elementHandle()).contentFrame();
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).battle,key);
 await battle.locator('[data-move="hold"]').waitFor();
 await readOpeningGuide(battle);
 const play=async move=>{
  await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).battle,key);
  const turn=Number(await battle.locator('#turn').innerText()),mode=await battle.locator('body').getAttribute('data-mode');
  await page.waitForFunction(({key,turn,mode})=>{const s=JSON.parse(localStorage.getItem(key)).battle.state;return s.mode===mode&&s.world.day===turn-1;},{key,turn,mode});
  const day=turn-1;
  await chooseBattleMove(battle,move);
  await page.waitForFunction(({key,day})=>JSON.parse(localStorage.getItem(key)).battle.state.world.day===day+1,{key,day});
  await battle.waitForFunction(()=>!document.querySelector('#restart').disabled);
 };
 for(let i=0;i<3;i++){await play('hold');await battle.locator('#advance').click();}
 assert.equal((await saved()).state.world.shops[0].cash,57);
 await onCheckpoint('steady',battle,(await saved()).state);
 await battle.locator('#next-scene').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='waves',key);
 for(let i=0;i<5;i++){await play(i===2?'upgrade':'hold');await battle.locator('#advance').click();}
 await onCheckpoint('waves',battle,(await saved()).state);
 if((await saved()).state.externalOnly)return battle;
 await battle.locator('#next-scene').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='social',key);
 for(const move of ['wage-down','price-down','hold','hold','hold','hold','hold','hold','hold']){await play(move);await battle.locator('#advance').click();}
 if(await battle.locator('body').getAttribute('data-mode')!=='done')await battle.locator('#next-scene').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).battle.state.mode==='done',key);
 return battle;
}
