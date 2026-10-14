import type {StreetGame,Industry} from './street-game.ts';

export const CAMPAIGN_BEATS=['opening','expand','lead','rival','others','pressure','decide','insolvent','closed'] as const;
export type StreetCampaign={beat:typeof CAMPAIGN_BEATS[number];followed:Industry[];attempts:number;pressureDays:number;solvency?:StreetSolvency};
export type StreetSolvency={cash:number;arrears:number;resale:number;shortfall:number};

/** A funded liquidation offer, not the unsold stock's sticker price.
 * The warehouse buys used equipment/materials at one quarter of book value.
 * It never promises to buy stale bread; its cash caps the whole-coin bid.
 * This discount is a stated teaching assumption, not an estimated market rate. */
export function streetSolvency(g:StreetGame):StreetSolvency{
 const f=g.world.firms.find(f=>f.id==='bakery')!,buyer=g.world.firms.find(f=>f.id==='inputs')!;
 const cash=Math.floor(f.cash/100),arrears=(f.storageDebt??0)+(f.rentDebt??0);
 const assetValue=g.books?g.books.inputValue+g.books.ovens.reduce((n,o)=>n+o.value,0):0;
 const resale=Math.min(Math.floor(buyer.cash/100),Math.floor(assetValue/400));
 return {cash,arrears,resale,shortfall:Math.max(0,arrears-cash-resale)};
}

/** Changes in inventory/profit, not a fixed number of clicks, open decisions. */
export function advanceCampaign(g:StreetGame,previous:StreetGame):StreetGame{
 if(!g.campaign||!g.report||g.report.management)return g;
 const c={...g.campaign},before=previous.campaign!;
 const loss=(g.report.accounts?.netProfit??0)<0,pressure=g.report.stock>0||loss;
 c.pressureDays=pressure?c.pressureDays+1:0;
 if(before.beat==='opening')c.beat='expand';
 else if(before.beat==='lead')c.beat='rival';
 else if(before.beat==='pressure'&&pressure)c.beat='decide';
 else if(before.beat==='decide')c.attempts++;
 const solvency=streetSolvency(g);c.solvency=solvency;
 if(solvency.shortfall>0)c.beat='insolvent';
 return {...g,campaign:c};
}
