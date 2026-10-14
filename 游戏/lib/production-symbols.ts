/**
 * Original category symbols paired with brand labels by the surrounding DOM.
 * These drawings are illustrative tools and devices, not official brand logos.
 */
export type ProductionSymbol = {
  readonly id:
    | "computer"
    | "ai"
    | "codex"
    | "deepseek"
    | "unitree"
    | "xiaomi"
    | "tesla"
    | "dji";
  readonly label: string;
  readonly description: string;
  readonly svgMarkup: string;
};

function symbolSvg(drawing: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="presentation" aria-hidden="true">${drawing}</svg>`;
}

export const PRODUCTION_SYMBOLS = [
  {
    id: "computer",
    label: "电脑",
    description: "数字工具",
    svgMarkup: symbolSvg(`
      <path d="M15 10 80 9 81 44 14 45Z"/>
      <path d="M20 15 75 15 76 37 20 38Z"/>
      <path d="M42 45 41 52M54 45 55 52M33 53 63 53"/>
      <path d="M21 58 73 58 80 66 15 66Z"/>
      <path d="M27 62h8m5 0h8m5 0h8m5 0h3"/>
    `),
  },
  {
    id: "ai",
    label: "AI",
    description: "智能工具",
    svgMarkup: symbolSvg(`
      <path d="M29 17 66 18 67 55 29 54Z"/>
      <path d="M37 9v8m11-9v9m11-8v9M37 55v9m11-9v9m11-9v9"/>
      <path d="M20 26h9m-10 10h10m-9 10h9M67 26h9m-9 10h10m-10 10h9"/>
      <path d="m40 28 14 7m-14 9 14-9m-14-7v16m14-9 4 12"/>
      <circle cx="39" cy="27" r="3.5"/>
      <circle cx="39" cy="45" r="3.5"/>
      <circle cx="56" cy="35" r="4"/>
      <circle cx="59" cy="48" r="2.5"/>
    `),
  },
  {
    id: "codex",
    label: "Codex",
    description: "编程工具",
    svgMarkup: symbolSvg(`
      <path d="M13 13 81 12 83 58 14 59Z"/>
      <path d="m14 23 67-1"/>
      <path d="M20 18h1m6 0h1m6 0h1"/>
      <path d="m28 33 12 9-12 9M48 51l18-1"/>
    `),
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "智能工具",
    svgMarkup: symbolSvg(`
      <path d="M10 34c7-10 22-12 33-6 12 7 22 10 32 3l7-13 2 11 9-3-7 12-8 3C67 55 40 58 22 51 11 47 7 40 10 34Z"/>
      <circle cx="21" cy="37" r="1.6"/>
      <path d="M11 42q8 3 13 0M36 42q5 7 15 7l-5-9"/>
      <path d="M28 22q-1-8-6-9m6 9q2-9 8-10"/>
      <path d="M13 62q10-3 18 0m7 1q11-3 20 0m7-1q9-3 17 0"/>
    `),
  },
  {
    id: "unitree",
    label: "宇树",
    description: "机器人",
    svgMarkup: symbolSvg(`
      <path d="M26 22 65 23 69 34 25 33Z"/>
      <path d="m68 25 11 1 2 8-12 1M25 25l-8-5"/>
      <path d="m30 34-6 11-5 14h8m12-24 7 10-5 16h8"/>
      <path d="m56 35-4 11 6 15h7m-2-26 9 10-3 14h8"/>
      <circle cx="24" cy="45" r="2.5"/>
      <circle cx="46" cy="45" r="2.5"/>
      <circle cx="52" cy="46" r="2.5"/>
      <circle cx="72" cy="45" r="2.5"/>
      <path d="M74 30h2M34 28l21 1"/>
    `),
  },
  {
    id: "xiaomi",
    label: "小米",
    description: "智能设备",
    svgMarkup: symbolSvg(`
      <path d="M23 10q-3 0-3 4l1 44q0 4 4 4l23-1q4 0 4-4l-1-43q0-4-4-4Z"/>
      <path d="M29 15h13M25 21l21-1 1 31-22 1Z"/>
      <path d="M33 57h6"/>
      <path d="M66 34h15q4 0 4 4v20q0 4-4 4H65q-4 0-4-4V39q0-5 5-5Z"/>
      <circle cx="73" cy="46" r="5"/>
      <path d="M69 56h8M61 17q10-8 21 0m-16 6q5-4 11 0"/>
      <circle cx="72" cy="28" r="1.2"/>
    `),
  },
  {
    id: "tesla",
    label: "Tesla",
    description: "电动汽车",
    svgMarkup: symbolSvg(`
      <path d="M12 49 11 39q0-5 8-7l12-13 28 1 15 14 9 3q3 1 3 5v8H75m-14 0H35m-14 0h-9"/>
      <path d="m25 33 11-10 18 1 11 10Z"/>
      <path d="m47 24 1 10M17 40h7m53 1h7M46 39h7"/>
      <circle cx="28" cy="50" r="7"/>
      <circle cx="68" cy="50" r="7"/>
      <path d="m49 43-7 11h7l-4 11 13-15h-8l4-7"/>
    `),
  },
  {
    id: "dji",
    label: "DJI",
    description: "无人机",
    svgMarkup: symbolSvg(`
      <path d="m37 29-13-8m35 8 14-8M37 42l-13 9m35-9 14 9"/>
      <path d="M37 28 59 29 60 44 37 45Z"/>
      <ellipse cx="21" cy="18" rx="15" ry="6" transform="rotate(-8 21 18)"/>
      <ellipse cx="76" cy="18" rx="14" ry="6" transform="rotate(8 76 18)"/>
      <ellipse cx="21" cy="54" rx="15" ry="6" transform="rotate(7 21 54)"/>
      <ellipse cx="76" cy="54" rx="14" ry="6" transform="rotate(-7 76 54)"/>
      <path d="M21 15v6m55-6v6M21 51v6m55-6v6M42 46l-2 7m15-7 2 7"/>
      <circle cx="48" cy="38" r="4"/>
    `),
  },
] as const satisfies readonly ProductionSymbol[];
