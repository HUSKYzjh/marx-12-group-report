/**
 * Static, locally embedded symbols for the production network.
 * Brand paths: Simple Icons 16.33.0; per-asset sources and terms are below.
 * Brand marks identify their linked tools, and do not imply endorsement.
 * The eight line drawings at the end are original category illustrations.
 */
import { PRODUCTION_BRAND_CATALOG, PRODUCTION_BRAND_CATALOG_PROVENANCE } from './production-brand-catalog.ts';
import { PRODUCTION_INDUSTRY_BRANDS, PRODUCTION_INDUSTRY_PROVENANCE } from './production-industry-symbols.ts';
import { PRODUCTION_AI_BRANDS, PRODUCTION_AI_PROVENANCE } from './production-ai-symbols.ts';

export type ProductionExtraSymbol = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly svgMarkup: string;
};

export type ProductionExtraBrand = ProductionExtraSymbol & {
  readonly href: string;
  readonly sector?: string;
};

const SIMPLE_ICONS_VERSION = '16.33.0';
const SIMPLE_ICONS_SOURCE = `https://raw.githubusercontent.com/simple-icons/simple-icons/${SIMPLE_ICONS_VERSION}`;

export const PRODUCTION_LOGO_PROVENANCE = [
  ...PRODUCTION_AI_PROVENANCE,
  ...PRODUCTION_INDUSTRY_PROVENANCE,
  ...PRODUCTION_BRAND_CATALOG_PROVENANCE,
  {
    id: 'github',
    owner: 'GitHub, Inc.',
    sourceUrl: `${SIMPLE_ICONS_SOURCE}/icons/github.svg`,
    originalSourceUrl: 'https://github.com/logos',
    officialUrl: 'https://github.com/',
    policyUrl: 'https://brand.github.com/foundations/logo',
    version: SIMPLE_ICONS_VERSION,
    repositoryLicense: 'CC0-1.0',
    assetLicense: 'GitHub logo usage policy; no separate icon license recorded upstream',
    attribution: 'GitHub and the Invertocat are trademarks of GitHub, Inc.',
  },
  {
    id: 'python',
    owner: 'Python Software Foundation',
    sourceUrl: `${SIMPLE_ICONS_SOURCE}/icons/python.svg`,
    originalSourceUrl: 'https://www.python.org/community/logos/',
    officialUrl: 'https://www.python.org/',
    policyUrl: 'https://www.python.org/psf/trademarks/',
    version: SIMPLE_ICONS_VERSION,
    repositoryLicense: 'CC0-1.0',
    assetLicense: 'PSF trademark policy; no separate icon license recorded upstream',
    attribution: 'Python and the Python logos are trademarks or registered trademarks of the Python Software Foundation.',
  },
  {
    id: 'git',
    owner: 'Jason Long / Git project',
    sourceUrl: `${SIMPLE_ICONS_SOURCE}/icons/git.svg`,
    originalSourceUrl: 'https://git-scm.com/community/logos',
    officialUrl: 'https://git-scm.com/',
    policyUrl: 'https://git-scm.com/about/trademark',
    version: SIMPLE_ICONS_VERSION,
    repositoryLicense: 'CC0-1.0',
    assetLicense: 'CC-BY-3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    attribution: 'Git logo by Jason Long, used under CC BY 3.0.',
  },
  {
    id: 'rust',
    owner: 'Rust Foundation',
    sourceUrl: `${SIMPLE_ICONS_SOURCE}/icons/rust.svg`,
    originalSourceUrl: 'https://www.rust-lang.org',
    officialUrl: 'https://rust-lang.org/',
    policyUrl: 'https://rustfoundation.org/policy/rust-trademark-policy/',
    version: SIMPLE_ICONS_VERSION,
    repositoryLicense: 'CC0-1.0',
    assetLicense: 'CC-BY-SA-4.0 (Simple Icons metadata); official art policy also provides CC-BY',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'Rust logo, Rust Foundation; the embedded logo asset is distributed under CC BY-SA 4.0.',
  },
] as const;

export const PRODUCTION_LOGO_NOTICE =
  '品牌标识仅用于识别并链接至各自官网，不表示赞助、合作或背书。图标库的 CC0 许可不授予品牌商标权。';

function brandSvg(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#555" role="presentation" aria-hidden="true"><path d="${path}"/></svg>`;
}

function toolSvg(drawing: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72" fill="none" stroke="#555" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="presentation" aria-hidden="true">${drawing}</svg>`;
}

export const PRODUCTION_EXTRA_BRANDS = [
  ...PRODUCTION_AI_BRANDS,
  ...PRODUCTION_INDUSTRY_BRANDS,
  ...PRODUCTION_BRAND_CATALOG,
  {
    id: 'github',
    label: 'GitHub',
    description: '代码协作',
    href: 'https://github.com/',
    svgMarkup: brandSvg('M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'),
  },
  {
    id: 'python',
    label: 'Python',
    description: '编程语言',
    href: 'https://www.python.org/',
    svgMarkup: brandSvg('M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z'),
  },
  {
    id: 'git',
    label: 'Git',
    description: '版本协作',
    href: 'https://git-scm.com/',
    svgMarkup: brandSvg('M13.09 23.549a1.54 1.54 0 0 1-2.18 0L.451 13.089a1.54 1.54 0 0 1 0-2.179l7.191-7.19 2.733 2.733a1.85 1.85 0 0 0 .964 2.326v6.66a1.849 1.849 0 1 0 1.54 0V8.957l2.508 2.508a1.85 1.85 0 1 0 1.09-1.09l-2.634-2.634a1.85 1.85 0 0 0-2.378-2.377L8.73 2.63 10.91.451a1.54 1.54 0 0 1 2.179 0l10.459 10.46a1.54 1.54 0 0 1 0 2.179z'),
  },
  {
    id: 'rust',
    label: 'Rust',
    description: '编程语言',
    href: 'https://rust-lang.org/',
    svgMarkup: brandSvg('M23.8346 11.7033l-1.0073-.6236a13.7268 13.7268 0 00-.0283-.2936l.8656-.8069a.3483.3483 0 00-.1154-.578l-1.1066-.414a8.4958 8.4958 0 00-.087-.2856l.6904-.9587a.3462.3462 0 00-.2257-.5446l-1.1663-.1894a9.3574 9.3574 0 00-.1407-.2622l.49-1.0761a.3437.3437 0 00-.0274-.3361.3486.3486 0 00-.3006-.154l-1.1845.0416a6.7444 6.7444 0 00-.1873-.2268l.2723-1.153a.3472.3472 0 00-.417-.4172l-1.1532.2724a14.0183 14.0183 0 00-.2278-.1873l.0415-1.1845a.3442.3442 0 00-.49-.328l-1.076.491c-.0872-.0476-.1742-.0952-.2623-.1407l-.1903-1.1673A.3483.3483 0 0016.256.955l-.9597.6905a8.4867 8.4867 0 00-.2855-.086l-.414-1.1066a.3483.3483 0 00-.5781-.1154l-.8069.8666a9.2936 9.2936 0 00-.2936-.0284L12.2946.1683a.3462.3462 0 00-.5892 0l-.6236 1.0073a13.7383 13.7383 0 00-.2936.0284L9.9803.3374a.3462.3462 0 00-.578.1154l-.4141 1.1065c-.0962.0274-.1903.0567-.2855.086L7.744.955a.3483.3483 0 00-.5447.2258L7.009 2.348a9.3574 9.3574 0 00-.2622.1407l-1.0762-.491a.3462.3462 0 00-.49.328l.0416 1.1845a7.9826 7.9826 0 00-.2278.1873L3.8413 3.425a.3472.3472 0 00-.4171.4171l.2713 1.1531c-.0628.075-.1255.1509-.1863.2268l-1.1845-.0415a.3462.3462 0 00-.328.49l.491 1.0761a9.167 9.167 0 00-.1407.2622l-1.1662.1894a.3483.3483 0 00-.2258.5446l.6904.9587a13.303 13.303 0 00-.087.2855l-1.1065.414a.3483.3483 0 00-.1155.5781l.8656.807a9.2936 9.2936 0 00-.0283.2935l-1.0073.6236a.3442.3442 0 000 .5892l1.0073.6236c.008.0982.0182.1964.0283.2936l-.8656.8079a.3462.3462 0 00.1155.578l1.1065.4141c.0273.0962.0567.1914.087.2855l-.6904.9587a.3452.3452 0 00.2268.5447l1.1662.1893c.0456.088.0922.1751.1408.2622l-.491 1.0762a.3462.3462 0 00.328.49l1.1834-.0415c.0618.0769.1235.1528.1873.2277l-.2713 1.1541a.3462.3462 0 00.4171.4161l1.153-.2713c.075.0638.151.1255.2279.1863l-.0415 1.1845a.3442.3442 0 00.49.327l1.0761-.49c.087.0486.1741.0951.2622.1407l.1903 1.1662a.3483.3483 0 00.5447.2268l.9587-.6904a9.299 9.299 0 00.2855.087l.414 1.1066a.3452.3452 0 00.5781.1154l.8079-.8656c.0972.0111.1954.0203.2936.0294l.6236 1.0073a.3472.3472 0 00.5892 0l.6236-1.0073c.0982-.0091.1964-.0183.2936-.0294l.8069.8656a.3483.3483 0 00.578-.1154l.4141-1.1066a8.4626 8.4626 0 00.2855-.087l.9587.6904a.3452.3452 0 00.5447-.2268l.1903-1.1662c.088-.0456.1751-.0931.2622-.1407l1.0762.49a.3472.3472 0 00.49-.327l-.0415-1.1845a6.7267 6.7267 0 00.2267-.1863l1.1531.2713a.3472.3472 0 00.4171-.416l-.2713-1.1542c.0628-.0749.1255-.1508.1863-.2278l1.1845.0415a.3442.3442 0 00.328-.49l-.49-1.076c.0475-.0872.0951-.1742.1407-.2623l1.1662-.1893a.3483.3483 0 00.2258-.5447l-.6904-.9587.087-.2855 1.1066-.414a.3462.3462 0 00.1154-.5781l-.8656-.8079c.0101-.0972.0202-.1954.0283-.2936l1.0073-.6236a.3442.3442 0 000-.5892zm-6.7413 8.3551a.7138.7138 0 01.2986-1.396.714.714 0 11-.2997 1.396zm-.3422-2.3142a.649.649 0 00-.7715.5l-.3573 1.6685c-1.1035.501-2.3285.7795-3.6193.7795a8.7368 8.7368 0 01-3.6951-.814l-.3574-1.6684a.648.648 0 00-.7714-.499l-1.473.3158a8.7216 8.7216 0 01-.7613-.898h7.1676c.081 0 .1356-.0141.1356-.088v-2.536c0-.074-.0536-.0881-.1356-.0881h-2.0966v-1.6077h2.2677c.2065 0 1.1065.0587 1.394 1.2088.0901.3533.2875 1.5044.4232 1.8729.1346.413.6833 1.2381 1.2685 1.2381h3.5716a.7492.7492 0 00.1296-.0131 8.7874 8.7874 0 01-.8119.9526zM6.8369 20.024a.714.714 0 11-.2997-1.396.714.714 0 01.2997 1.396zM4.1177 8.9972a.7137.7137 0 11-1.304.5791.7137.7137 0 011.304-.579zm-.8352 1.9813l1.5347-.6824a.65.65 0 00.33-.8585l-.3158-.7147h1.2432v5.6025H3.5669a8.7753 8.7753 0 01-.2834-3.348zm6.7343-.5437V8.7836h2.9601c.153 0 1.0792.1772 1.0792.8697 0 .575-.7107.7815-1.2948.7815zm10.7574 1.4862c0 .2187-.008.4363-.0243.651h-.9c-.09 0-.1265.0586-.1265.1477v.413c0 .973-.5487 1.1846-1.0296 1.2382-.4576.0517-.9648-.1913-1.0275-.4717-.2704-1.5186-.7198-1.8436-1.4305-2.4034.8817-.5599 1.799-1.386 1.799-2.4915c0-1.1936-.819-1.9458-1.3769-2.3153-.7825-.5163-1.6491-.6195-1.883-.6195H5.4682a8.7651 8.7651 0 014.907-2.7699l1.0974 1.151a.648.648 0 00.9182.0213l1.227-1.1743a8.7753 8.7753 0 016.0044 4.2762l-.8403 1.8982a.652.652 0 00.33.8585l1.6178.7188c.0283.2875.0425.577.0425.8717zm-9.3006-9.5993a.7128.7128 0 11.984 1.0316.7137.7137 0 01-.984-1.0316zm8.3389 6.71a.7107.7107 0 01.9395-.3625.7137.7137 0 11-.9405.3635z'),
  },
] as const satisfies readonly ProductionExtraBrand[];

export const PRODUCTION_EXTRA_TOOLS = [
  {
    id: 'chip', label: '芯片', description: '计算器件',
    svgMarkup: toolSvg(`
      <path d="M29 18 67 19 66 55 29 54Z M38 27h20v19H38Z"/>
      <path d="M36 10v8m12-9v9m11-8v9M36 55v8m12-8v9m11-9v8M20 26h9m-10 11h10m-9 11h9m38-22h9m-9 11h10m-10 11h9"/>
    `),
  },
  {
    id: 'server', label: '服务器', description: '数据处理',
    svgMarkup: toolSvg(`
      <path d="M25 11 72 12 72 61 24 61Z M25 28h47M25 45h47"/>
      <path d="M42 20h20M42 37h20M42 53h20"/>
      <circle cx="33" cy="20" r="2"/><circle cx="33" cy="37" r="2"/><circle cx="33" cy="53" r="2"/>
    `),
  },
  {
    id: 'robot-arm', label: '机械臂', description: '自动生产',
    svgMarkup: toolSvg(`
      <path d="M16 62h42l-3-8H21Z M28 53l5-25 8 2-3 23M39 23l25-12 5 7-25 14M69 19l8 13-6 4-9-16"/>
      <circle cx="37" cy="26" r="6"/><circle cx="65" cy="15" r="5"/>
      <path d="m72 35-7 8 7 5m5-14 7 8-5 6M20 67h35"/>
    `),
  },
  {
    id: 'satellite', label: '卫星', description: '空间通信',
    svgMarkup: toolSvg(`
      <path d="m39 22 18 11-12 19-18-11Z M31 26 17 17 5 36l15 9Z M61 37l15 9 12-19-15-9Z"/>
      <path d="m23 21-12 19M8 29l15 9m53-16-12 19m5-11 15 9M47 20l7-10m1 4 9-4M41 54l-6 9"/>
      <path d="M64 53q5 0 7-5m-7 13q11-1 15-12"/>
    `),
  },
  {
    id: 'battery', label: '电池', description: '储存电能',
    svgMarkup: toolSvg(`
      <path d="M20 23h53v31H20Z M73 32h7v13h-7M30 32v13m-6-6h12m25 0h7"/>
      <path d="m48 24-9 17h10l-4 12 14-19H48l5-10"/>
    `),
  },
  {
    id: 'solar-panel', label: '太阳能板', description: '光能发电',
    svgMarkup: toolSvg(`
      <path d="M24 29h49l9 25H15Z M20 41h57M40 29l-3 25m19-25 4 25M42 55v8m13-8v8M32 64h33"/>
      <circle cx="65" cy="13" r="5"/><path d="M65 3v2m0 16v2M54 13h2m18 0h2m-18-8 2 2m12-2-2 2"/>
    `),
  },
  {
    id: 'wind-turbine', label: '风机', description: '风能发电',
    svgMarkup: toolSvg(`
      <circle cx="48" cy="28" r="4"/>
      <path d="M47 24 45 7q0-5 4-5l3 22M51 31l14 12q4 4 1 7L50 34M44 29l-16 8q-5 2-7-2l23-10M47 33l-3 31m6-31 3 31M35 65h28"/>
    `),
  },
  {
    id: 'printer-3d', label: '3D打印', description: '数字制造',
    svgMarkup: toolSvg(`
      <path d="M19 61V15h59v46M25 55V22h47v33M14 62h70v5H14Z M25 31h47M44 23v9h9v-9M48 33v6"/>
      <path d="m35 47 13-7 14 7v11H35Z M35 47l13 7 14-7M48 54v5M30 60h38"/>
      <path d="M63 14V9h12v6"/>
    `),
  },
] as const satisfies readonly ProductionExtraSymbol[];
