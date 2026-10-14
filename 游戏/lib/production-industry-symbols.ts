/** Industry references and replacements: real logos, not generic devices.
 * Pinned library/official-site SVG geometry; local inert monochrome rendering.
 * Copyright and trademark rights remain separate from library licensing. */
import type { ProductionExtraBrand } from './production-extra-symbols.ts';

export const PRODUCTION_BRAND_REPLACEMENTS = [
  {
    "id": "xiaomi",
    "label": "小米",
    "description": "电子产品与智能制造",
    "href": "https://www.mi.com/shop",
    "sector": "electronics",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M12 0C8.016 0 4.756.255 2.493 2.516.23 4.776 0 8.033 0 12.012c0 3.98.23 7.235 2.494 9.497C4.757 23.77 8.017 24 12 24c3.983 0 7.243-.23 9.506-2.491C23.77 19.247 24 15.99 24 12.012c0-3.984-.233-7.243-2.502-9.504C19.234.252 15.978 0 12 0zM4.906 7.405h5.624c1.47 0 3.007.068 3.764.827.746.746.827 2.233.83 3.676v4.54a.15.15 0 0 1-.152.147h-1.947a.15.15 0 0 1-.152-.148V11.83c-.002-.806-.048-1.634-.464-2.051-.358-.36-1.026-.441-1.72-.458H7.158a.15.15 0 0 0-.151.147v6.98a.15.15 0 0 1-.152.148H4.906a.15.15 0 0 1-.15-.148V7.554a.15.15 0 0 1 .15-.149zm12.131 0h1.949a.15.15 0 0 1 .15.15v8.892a.15.15 0 0 1-.15.148h-1.949a.15.15 0 0 1-.151-.148V7.554a.15.15 0 0 1 .151-.149zM8.92 10.948h2.046c.083 0 .15.066.15.147v5.352a.15.15 0 0 1-.15.148H8.92a.15.15 0 0 1-.152-.148v-5.352a.15.15 0 0 1 .152-.147Z\"/></svg>"
  },
  {
    "id": "tesla",
    "label": "Tesla",
    "description": "电动汽车与自动化生产",
    "href": "https://www.tesla.cn/",
    "sector": "manufacturing",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362l-.004.002H12v-.002zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46v.003z\"/></svg>"
  },
  {
    "id": "dji",
    "label": "DJI",
    "description": "无人机与航空技术",
    "href": "https://www.dji.com/cn",
    "sector": "aerospace",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M19.2 7.8a716.856 716.856 0 0 0-1.232 4.63c-.202.772-.401 1.544-.634 2.308-.226.743-.504 1.535-.91 2.21-.422.703-.969 1.253-1.726 1.604-.3.137-.615.24-.939.306-.46.09-.926.146-1.394.165-1.163.065-3.628.056-4.79.056l.713-2.64c.539 0 1.078.002 1.617-.013.52-.014 1.092-.042 1.605-.163.56-.133.984-.36 1.355-.817.337-.416.564-.935.75-1.424.34-.893.688-2.173.934-3.093.277-1.041.544-2.085.812-3.129zm4.8 0-2.072 7.68h-3.84l2.073-7.68ZM11.339 4.92h3.84c-.403 1.5-.805 2.999-1.212 4.496-.283 1.044-.565 2.088-.872 3.124-.135.452-.269.903-.445 1.342-.141.352-.3.666-.591.93a1.908 1.908 0 0 1-.734.405c-.356.112-.717.154-1.085.184-.53.043-1.06.054-1.591.063-1.991.02-3.983.02-5.974-.001a21.408 21.408 0 0 1-.954-.034 5.319 5.319 0 0 1-.632-.07 1.851 1.851 0 0 1-.412-.119c-.44-.192-.664-.575-.677-1.043 0-.263.032-.525.093-.78.076-.367.171-.728.265-1.09.179-.691.506-1.966.762-2.638.2-.526.464-1.05.966-1.382.28-.186.576-.285.901-.35.241-.05.483-.075.728-.093.41-.03.82-.04 1.23-.047.582-.01 1.165-.013 1.748-.015L8.148 7.8h1.454l-.518 1.92c-.864 0-1.728-.002-2.593.003-.252.001-.504 0-.756.016a.968.968 0 0 0-.264.042c-.113.04-.17.11-.22.213-.073.15-.115.31-.162.468a84.804 84.804 0 0 0-.503 1.857c-.035.14-.07.28-.1.42-.022.099-.04.197-.05.298-.01.11-.014.242.053.345.068.103.182.127.29.143.12.018.241.021.363.025.199.006.398.007.597.008.544.003 1.089.003 1.633 0 .25-.002.501-.004.752-.014.173-.007.343-.013.513-.054.13-.031.23-.08.318-.186.056-.071.1-.15.133-.235.088-.209.15-.425.213-.641.245-.83.466-1.665.692-2.499l.675-2.503.67-2.505h3.84z\"/></svg>"
  },
  {
    "id": "deepseek",
    "label": "DeepSeek",
    "description": "人工智能模型",
    "href": "https://www.deepseek.com/",
    "sector": "ai",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45\"/></svg>"
  },
  {
    "id": "unitree",
    "label": "宇树",
    "description": "机器人与先进制造",
    "href": "https://www.unitree.com/cn/",
    "sector": "manufacturing",
    "svgMarkup": "<svg role=\"presentation\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\"\n\t viewBox=\"0 0 870.93 196.18\">\n\n<g>\n\t<path fill=\"#555\" d=\"M336.28,15.85l-28.22,113.64c-1.5,6.05-2.68,8.25-4.43,10.48c-1.72,2.2-3.89,3.93-6.4,5.13\n\t\tc-2.51,1.18-4.86,1.81-10.92,1.81h-19.2l32.55-131.06C299.66,15.85,336.28,15.85,336.28,15.85z\"/>\n\t<path fill=\"#555\" d=\"M144.8,50.55l-18.94,76.29c-1.73,6.98-3.07,9.5-5.1,12.07c-2.01,2.56-4.48,4.55-7.39,5.94\n\t\tc-2.9,1.35-5.61,2.08-12.58,2.08H29.16c-6.98,0-9.32-0.73-11.55-2.08c-2.22-1.39-3.71-3.37-4.44-5.94\n\t\tc-0.75-2.56-0.84-5.09,0.9-12.07l18.94-76.29h36.62l-18.11,72.91c-0.69,2.79-0.65,3.8-0.35,4.84c0.29,1.02,0.88,1.81,1.78,2.37\n\t\tc0.87,0.54,1.82,0.83,4.61,0.83h22.47c2.79,0,3.89-0.29,5.02-0.83c1.18-0.56,2.17-1.35,2.96-2.37c0.82-1.04,1.36-2.04,2.05-4.84\n\t\tl18.11-72.91C108.17,50.55,144.8,50.55,144.8,50.55z\"/>\n\t<path fill=\"#555\" d=\"M587.04,147.17h-40.19l-29.7-57.44h30.11c2.79,0,3.87-0.29,5.02-0.83c0.48-0.23,0.93-0.5,1.34-0.81\n\t\tc0.61-0.44,1.15-0.96,1.62-1.56c0.79-1.02,1.34-2.04,2.03-4.84l1.79-7.21c0.69-2.79,0.65-3.8,0.37-4.82\n\t\tc-0.18-0.6-0.45-1.14-0.85-1.56c-0.25-0.33-0.56-0.6-0.94-0.81c-0.89-0.54-1.82-0.83-4.61-0.83h-30.11l-19.98,80.45h-36.62\n\t\tl23.93-96.37h94.23c6.07,0,8.1,0.62,10.02,1.79c1.92,1.19,3.22,2.93,3.85,5.15c0.11,0.35,0.19,0.71,0.25,1.08\n\t\tc0.39,1.93,0.24,4.3-1.02,9.39l-4.99,20.08c-1.26,5.09-2.3,7.46-3.64,9.39c-0.25,0.37-0.51,0.73-0.79,1.08\n\t\tc-1.73,2.22-3.89,3.95-6.4,5.15c-2.51,1.18-4.84,1.79-10.91,1.79h-7.79l0,0L587.04,147.17z\"/>\n\t<path fill=\"#555\" d=\"M647.58,87.17h75.17l-4.31,17.35h-67.13c-2.79,0-3.87,0.29-5.02,0.83c-1.16,0.56-2.17,1.35-2.96,2.37\n\t\tc-0.81,1.02-1.36,2.04-2.05,4.84l-4.23,17.02h75.17l-4.31,17.35h-91.69c-7,0-9.34-0.73-11.55-2.08c-2.22-1.39-3.73-3.37-4.46-5.94\n\t\tc-0.73-2.56-0.84-5.09,0.9-12.07l14.62-58.88c1.5-6.05,2.68-8.25,4.43-10.47c1.73-2.22,3.89-3.95,6.4-5.15\n\t\tc2.51-1.18,4.86-1.79,10.91-1.79h94.36l-4.31,17.35H660.4c-2.79,0-3.87,0.29-5.02,0.83c-1.16,0.56-2.17,1.35-2.96,2.37\n\t\tc-0.81,1.02-1.36,2.04-2.05,4.84L647.58,87.17z\"/>\n\t<path fill=\"#555\" d=\"M777.75,87.17h75.17l-4.31,17.35h-67.13c-2.79,0-3.89,0.29-5.04,0.83c-1.16,0.56-2.15,1.35-2.96,2.37\n\t\tc-0.79,1.02-1.34,2.04-2.03,4.84l-4.23,17.02h75.17l-4.31,17.35h-91.71c-7,0-9.34-0.73-11.55-2.08c-2.22-1.39-3.73-3.37-4.44-5.94\n\t\tc-0.75-2.56-0.84-5.09,0.9-12.07l14.62-58.88c1.5-6.05,2.67-8.25,4.41-10.47c1.73-2.22,3.89-3.95,6.42-5.15\n\t\tc2.49-1.18,4.84-1.79,10.89-1.79H862l-4.31,17.35h-67.13c-2.79,0-3.89,0.29-5.04,0.83c-1.16,0.56-2.15,1.35-2.96,2.37\n\t\tc-0.79,1.02-1.34,2.04-2.03,4.84L777.75,87.17z\"/>\n\t<g>\n\t\t<path fill=\"#555\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M274.41,50.55l-23.93,96.37h-25.33c-6.07,0-8.09-0.64-10.02-1.81c-0.25-0.15-0.48-0.31-0.7-0.5\n\t\t\tc-1.3-0.96-2.27-2.25-2.88-3.78c0.01-0.04,0-0.06-0.02-0.08l-20.92-55.47l-15.31,61.64h-36.62l23.93-96.37h25.33\n\t\t\tc6.05,0,8.1,0.62,10.02,1.79c0.25,0.15,0.48,0.31,0.7,0.5c1.32,0.98,2.27,2.25,2.87,3.82c0.01,0.02,0.01,0.02,0.03,0.04\n\t\t\tl20.92,55.47l15.3-61.62H274.41z\"/>\n\t</g>\n\t<g>\n\t\t<polygon fill=\"#555\" points=\"473.07,50.55 468.52,68.86 422.27,68.86 394.27,181.61 357.65,181.61 385.64,68.86 339.39,68.86 \n\t\t\t343.93,50.55 \t\t\"/>\n\t</g>\n</g>\n</svg>\n"
  }
] as const satisfies readonly ProductionExtraBrand[];

export const PRODUCTION_INDUSTRY_BRANDS = [
  {
    "id": "longi",
    "label": "LONGi",
    "description": "太阳能｜光伏制造",
    "href": "https://www.longi.com/en/",
    "sector": "solar",
    "svgMarkup": "<svg role=\"presentation\" aria-hidden=\"true\" viewBox=\"0 0 294 111\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M84.28 38.93C64.64 38.93 48.73 54.84 48.73 74.45C48.73 79.81 49.91 84.86 52.02 89.4H20.68V41.35H0V108.2H44.73L54.14 93.32C60.42 103.35 71.55 110.01 84.28 110.01C103.91 110.01 119.82 94.08 119.82 74.44C119.83 54.84 103.91 38.93 84.28 38.93ZM84.28 91.25C75 91.25 67.49 83.75 67.49 74.45C67.49 65.2 75 57.68 84.28 57.68C93.55 57.68 101.06 65.19 101.06 74.45C101.06 83.75 93.55 91.25 84.28 91.25ZM171.17 82.38L146.2 41.35H143.7H128H125.51V108.21H143.71V67.17L168.7 108.2H189.39V41.35H171.18V82.38H171.17ZM265.52 68.25H264.93H247.17H230.51V80.12H247.37C245.02 87.18 238.36 92.26 230.51 92.26C220.68 92.26 212.7 84.3 212.7 74.45C212.7 64.64 220.68 56.67 230.51 56.67C235.21 56.67 239.48 58.51 242.66 61.49H263.61C258.42 48.26 245.55 38.93 230.51 38.93C210.88 38.93 194.98 54.84 194.98 74.45C194.98 94.09 210.88 110.01 230.51 110.01C250.14 110.01 266.04 94.08 266.04 74.45C266.04 72.36 265.86 70.27 265.52 68.25ZM293.77 20.7H273V0H293.77V20.7ZM293.77 109.88H273V41.03H293.77V109.88Z\" fill=\"#555\"/>\n</svg>\n"
  },
  {
    "id": "sungrow",
    "label": "SUNGROW",
    "description": "太阳能｜光伏逆变器与储能",
    "href": "https://www.sungrowpower.com/en",
    "sector": "solar",
    "svgMarkup": "<svg role=\"presentation\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 150 20\" fill=\"none\">\n  <g clip-path=\"url(#production-sungrow-clip)\">\n    <path d=\"M147.137 1.01562V14.6967L140.438 7.52459L133.739 14.6967V1.01562H130.879V18.7829H132.844C133.095 18.783 133.342 18.7317 133.572 18.632C133.801 18.5323 134.008 18.3865 134.18 18.2036L140.433 11.5136L146.687 18.2036C146.858 18.3865 147.064 18.5323 147.294 18.632C147.524 18.7317 147.772 18.783 148.022 18.7829H149.994V1.01562H147.137Z\" fill=\"#555\"/>\n    <path d=\"M14.6669 8.29631H3.74381C3.62343 8.29885 3.50378 8.27703 3.39206 8.23213C3.28033 8.18722 3.17886 8.12017 3.09372 8.03504C3.00859 7.9499 2.94154 7.84843 2.89663 7.7367C2.85173 7.62498 2.82988 7.50533 2.83242 7.38495V5.077C2.82988 4.95662 2.85173 4.83696 2.89663 4.72525C2.94154 4.61353 3.00859 4.51205 3.09372 4.42692C3.17886 4.34177 3.28033 4.27472 3.39206 4.22982C3.50378 4.18492 3.62343 4.1631 3.74381 4.16564H15.6166C15.9184 4.16725 16.2158 4.09333 16.4818 3.95059C16.7478 3.80784 16.9738 3.60082 17.1393 3.34839C17.6057 2.62541 17.9671 1.84002 18.2131 1.01562H3.74381C1.92379e-05 1.01562 0 4.27114 0 4.27114V7.86389C0 7.86389 1.92379e-05 11.1194 3.74381 11.1194H14.6669C14.7873 11.1168 14.9069 11.1388 15.0186 11.1837C15.1303 11.2286 15.2318 11.2956 15.317 11.3807C15.4021 11.4659 15.4691 11.5674 15.514 11.6791C15.559 11.7908 15.5809 11.9104 15.5783 12.0308V14.7205C15.5809 14.8409 15.559 14.9605 15.514 15.0722C15.4691 15.1839 15.4021 15.2854 15.317 15.3705C15.2318 15.4557 15.1303 15.5227 15.0186 15.5677C14.9069 15.6126 14.7873 15.6344 14.6669 15.6318H2.59656C2.2947 15.6301 1.99721 15.704 1.73123 15.8468C1.46525 15.9895 1.23925 16.1966 1.07381 16.4491C0.607459 17.172 0.245906 17.9575 0 18.7818H14.6669C18.4107 18.7818 18.4107 15.5263 18.4107 15.5263V11.5508C18.4107 11.5508 18.4107 8.29631 14.6669 8.29631Z\" fill=\"#555\"/>\n    <path d=\"M62.287 1.01562H59.2632V14.4639L47.2994 1.60321C47.1283 1.41932 46.9211 1.27271 46.6907 1.1725C46.4604 1.07229 46.2119 1.02064 45.9608 1.0208H43.8359V18.7881H46.8597V5.33976L58.8421 18.2025C59.0132 18.3861 59.2203 18.5324 59.4504 18.6325C59.6806 18.7325 59.9288 18.784 60.1797 18.7839H62.287V1.01562Z\" fill=\"#555\"/>\n    <path d=\"M37.1854 1.01562V15.7819C37.1854 16.0012 36.3485 16.3777 31.1202 16.3777C25.8919 16.3777 25.055 16.0022 25.055 15.7819V1.01562H22.0312V17.0439C22.9623 19.1584 29.6502 19.0374 31.1202 19.0374C32.5902 19.0374 39.2823 19.1584 40.2092 17.0439V1.01562H37.1854Z\" fill=\"#555\"/>\n    <path d=\"M104.105 11.1194C105.249 10.6187 105.183 6.86252 105.183 6.06804C105.183 5.27355 105.249 1.51631 104.105 1.01562H87.9805V4.16563H102.023C102.162 4.16563 102.359 4.69528 102.359 6.06804C102.359 7.76562 102.16 8.29631 102.023 8.29631H87.9805V18.7828H90.8418V11.1194H94.9239L102.052 18.2471C102.394 18.5898 102.859 18.7825 103.344 18.7828H106.939L99.275 11.1194H104.105Z\" fill=\"#555\"/>\n    <path d=\"M118.031 0.766933C116.561 0.766933 109.733 0.644835 108.807 2.76035V11.9569C109.608 11.718 110.372 11.3651 111.074 10.909C111.306 10.7592 111.496 10.5539 111.628 10.3119C111.76 10.0698 111.829 9.79855 111.83 9.52278V4.08657C111.83 3.75554 112.919 3.42452 118.031 3.42452C123.144 3.42452 124.232 3.75554 124.232 4.08657V7.38348C125.034 7.14384 125.797 6.7906 126.499 6.3345C126.731 6.18473 126.921 5.97948 127.053 5.73739C127.185 5.49531 127.255 5.22407 127.256 4.94831V2.76035C126.325 0.644835 119.497 0.766933 118.031 0.766933Z\" fill=\"#555\"/>\n    <path d=\"M118.032 19.0426C119.502 19.0426 126.331 19.1647 127.257 17.0491V7.85156C126.454 8.09073 125.69 8.44401 124.989 8.90054C124.757 9.05031 124.567 9.25557 124.435 9.49765C124.302 9.73974 124.233 10.011 124.233 10.2867V15.7229C124.233 16.054 123.145 16.385 118.032 16.385C112.92 16.385 111.831 16.055 111.831 15.7229V12.426C111.029 12.6656 110.265 13.0188 109.564 13.475C109.332 13.6247 109.141 13.8299 109.008 14.072C108.877 14.3141 108.807 14.5854 108.807 14.8612V17.0502C109.738 19.1657 116.565 19.0436 118.031 19.0436\" fill=\"#555\"/>\n    <path d=\"M83.2391 8.29422H75.7753C75.4993 8.29408 75.2277 8.36338 74.9854 8.4957C74.7432 8.62803 74.5381 8.81916 74.3891 9.05149C73.9785 9.69353 73.6598 10.39 73.4425 11.1205H81.0718C81.2601 11.1205 81.4918 11.3273 81.4918 13.5401C81.4918 15.4238 81.256 15.6338 81.0718 15.6338H69.3408C69.2022 15.6338 68.7687 15.039 68.7687 9.89974C68.7687 4.76043 69.2022 4.1656 69.3408 4.1656H81.5239C81.8257 4.16731 82.1233 4.09343 82.3892 3.95068C82.6552 3.80793 82.8812 3.60089 83.0466 3.34839C83.513 2.62539 83.8744 1.84 84.1204 1.01562H67.7353C65.7977 1.86493 65.9094 8.55288 65.9094 9.89874C65.9094 11.2446 65.7977 17.9335 67.7353 18.7818H83.2391C84.3832 18.2801 84.317 14.3335 84.317 13.538C84.317 12.7425 84.3832 8.79491 83.2391 8.29422Z\" fill=\"#555\"/>\n  </g>\n  <defs>\n    <clipPath id=\"production-sungrow-clip\">\n      <rect width=\"150\" height=\"19.6552\" fill=\"#555\"/>\n    </clipPath>\n  </defs>\n</svg>"
  },
  {
    "id": "abbott",
    "label": "Abbott",
    "description": "生物医药｜药品与医疗技术",
    "href": "https://www.abbott.com/",
    "sector": "biomedical",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M20.812 2.4H0v3.197h19.773V5.6a1.03 1.03 0 0 1 1.032 1.031v10.742l-.004.007a1.034 1.034 0 0 1-1.034 1.025H4.23c-.569 0-1.033-.46-1.033-1.033v-4.34c0-.57.464-1.032 1.033-1.032H17.6V8.803H3.188A3.185 3.185 0 0 0 0 11.99v6.423A3.188 3.188 0 0 0 3.188 21.6h17.624A3.187 3.187 0 0 0 24 18.412V5.587A3.186 3.186 0 0 0 20.812 2.4\"/></svg>"
  },
  {
    "id": "merck",
    "label": "Merck & Co.",
    "description": "生物医药｜默沙东（美国）",
    "href": "https://www.merck.com/",
    "sector": "biomedical",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M6 6a6 6 0 0112 0zm0 12a6 6 0 016-6 6 6 0 01-6-6 6 6 0 000 12 a6 6 0 1012 0zm6-6a6 6 0 016 6 6 6 0 100-12c0 3.314-2.686 6-6 6\"/></svg>"
  },
  {
    "id": "airbus",
    "label": "Airbus",
    "description": "航空航天｜飞机与空间系统",
    "href": "https://www.airbus.com/",
    "sector": "aerospace",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M11.0673 11.296c0-.8153-.5311-1.4329-1.6304-1.4329h-2.211v4.2614h1.0375v-3.335H9.437c.4323 0 .5928.247.5928.5311 0 .2965-.1605.5312-.5928.5312H8.4363l1.4329 2.2727h1.1858s-.9758-1.5316-.9635-1.5316c.5929-.1359.9758-.5558.9758-1.297M5.4966 9.8631h1.0376v4.2614H5.4966Zm-3.3227 0L0 14.137h1.1734l.3459-.7164h1.754l-.4324-.9017h-.877l.6424-1.3093h.0123l1.4575 2.9274h1.1982L3.1003 9.863Zm12.6854 2.0504c.3335-.1852.5065-.4693.5065-.9017 0-.6917-.5188-1.1487-1.3711-1.1487h-2.4333v4.2614h2.5198c.877 0 1.4575-.4693 1.4575-1.1981.0123-.494-.2718-.8646-.6794-1.0129m-2.2604-1.1487h1.3835c.21 0 .3705.1606.3705.3706s-.1606.3705-.3705.3705h-1.3835zm1.4205 2.4704H12.599v-.8646h1.4205c.247 0 .4447.1852.4447.4323 0 .247-.1977.4323-.4447.4323m4.8049-.9882c0 .6423-.2964 1.0005-.8893 1.0005-.5806 0-.877-.3582-.877-1.0005V9.8631h-1.0623v2.3098c0 1.3217.6917 2.0504 1.9516 2.0504 1.26 0 1.9516-.7287 1.9516-2.0504V9.8631h-1.0623v2.384zm3.8414-.6793c-.9881-.2347-1.1981-.2594-1.1981-.5435 0-.2223.247-.3211.667-.3211.5558 0 1.1364.1358 1.4699.3458l.3335-.8646c-.4447-.247-1.0623-.4076-1.8034-.4076-1.0993 0-1.717.5434-1.717 1.2846 0 .7905.4571 1.1116 1.5194 1.334.8276.1852 1.0005.2964 1.0005.531 0 .2471-.2224.3583-.6794.3583-.6546 0-1.2352-.1606-1.7045-.42l-.3212.914c.5188.2718 1.2846.4447 2.0504.4447 1.0746 0 1.717-.494 1.717-1.334.0123-.6793-.42-1.1116-1.334-1.3216\"/></svg>"
  },
  {
    "id": "spacex",
    "label": "SpaceX",
    "description": "航空航天｜火箭与卫星",
    "href": "https://www.spacex.com/",
    "sector": "aerospace",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M24 7.417C8.882 8.287 1.89 14.75.321 16.28L0 16.583h2.797C10.356 9.005 21.222 7.663 24 7.417zm-17.046 6.35c-.472.321-.945.68-1.398 1.02l2.457 1.796h2.778zM2.948 10.8H.189l3.25 2.381c.473-.321 1.02-.661 1.512-.945Z\"/></svg>"
  },
  {
    "id": "abb",
    "label": "ABB",
    "description": "先进制造｜工业自动化",
    "href": "https://global.abb/",
    "sector": "manufacturing",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M13.086 16.594v-4.427h3.035c.25.418.362.947.362 1.476 0 1.559-1.17 2.867-2.84 2.951zm-.279-4.455v4.455h-2.784v-4.455zm3.147-.278h-2.868V7.406h.668c1.086 0 1.949.863 1.949 1.949 0 .64-.334 1.225-.835 1.587.417.223.807.529 1.086.919m-3.147-4.455v4.455h-2.784V7.406zm7.796 9.188v-4.427h3.035c.251.418.362.947.362 1.476 0 1.559-1.169 2.867-2.84 2.951zm-.278-4.455v4.455h-2.784v-4.455zm3.146-.278h-2.868V7.406h.668c1.086 0 1.949.863 1.949 1.949 0 .64-.334 1.225-.835 1.587.418.223.808.529 1.086.919m-3.146-4.455v4.455h-2.784V7.406zM1.587 12.139h2.868v2.506H2.979l-.668 1.949H0zm2.868-4.733v4.455H1.671l1.587-4.455zm.278 7.239v-2.506h2.868l1.587 4.455H6.877l-.668-1.949zm2.784-2.784H4.733V7.406H5.93z\"/></svg>"
  },
  {
    "id": "bosch",
    "label": "Bosch",
    "description": "先进制造｜工业技术与制造",
    "href": "https://www.bosch.com/",
    "sector": "manufacturing",
    "svgMarkup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"#555\" role=\"presentation\" aria-hidden=\"true\"><path d=\"M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12C23.996 5.374 18.626.004 12 0zm0 22.88C5.991 22.88 1.12 18.009 1.12 12S5.991 1.12 12 1.12 22.88 5.991 22.88 12c-.006 6.006-4.874 10.874-10.88 10.88zm4.954-18.374h-.821v4.108h-8.24V4.506h-.847a8.978 8.978 0 0 0 0 14.988h.846v-4.108h8.24v4.108h.822a8.978 8.978 0 0 0 0-14.988zM6.747 17.876a7.86 7.86 0 0 1 0-11.752v11.752zm9.386-3.635h-8.24V9.734h8.24v4.507zm1.12 3.61V6.124a7.882 7.882 0 0 1 0 11.727z\"/></svg>"
  }
] as const satisfies readonly ProductionExtraBrand[];

export const PRODUCTION_INDUSTRY_PROVENANCE = [
  {
    "id": "xiaomi",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/xiaomi.svg",
    "originalSourceUrl": "https://www.mi.com/global",
    "officialUrl": "https://www.mi.com/shop",
    "policyUrl": "https://www.mi.com/global",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "小米 logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "tesla",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/tesla.svg",
    "originalSourceUrl": "https://www.tesla.com/tesla-gallery",
    "officialUrl": "https://www.tesla.cn/",
    "policyUrl": "https://www.tesla.com/tesla-gallery",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "Tesla logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "dji",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/dji.svg",
    "originalSourceUrl": "https://www.dji.com",
    "officialUrl": "https://www.dji.com/cn",
    "policyUrl": "https://www.dji.com",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "DJI logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "deepseek",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/deepseek.svg",
    "originalSourceUrl": "https://www.deepseek.com",
    "officialUrl": "https://www.deepseek.com/",
    "policyUrl": "https://www.deepseek.com",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "DeepSeek logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "unitree",
    "sourceUrl": "https://www.unitree.com/images/0079f8938336436e955ea3a98c4e1e59.svg",
    "originalSourceUrl": "https://www.unitree.com/images/0079f8938336436e955ea3a98c4e1e59.svg",
    "officialUrl": "https://www.unitree.com/cn/",
    "policyUrl": "https://www.unitree.com/cn/",
    "sourceKind": "official-site",
    "version": "Retrieved 2026-10-03",
    "repositoryLicense": "Not applicable: official-site artwork",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "宇树 logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "longi",
    "sourceUrl": "https://www.longi.com/en/",
    "originalSourceUrl": "https://www.longi.com/en/",
    "officialUrl": "https://www.longi.com/en/",
    "policyUrl": "https://www.longi.com/en/",
    "sourceKind": "official-site",
    "version": "Retrieved 2026-10-03",
    "repositoryLicense": "Not applicable: official-site artwork",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "LONGi logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "sungrow",
    "sourceUrl": "https://official-oversears-file.sungrowpower.com/website/_next/static/media/logo.84e5bb0c.svg",
    "originalSourceUrl": "https://official-oversears-file.sungrowpower.com/website/_next/static/media/logo.84e5bb0c.svg",
    "officialUrl": "https://www.sungrowpower.com/en",
    "policyUrl": "https://www.sungrowpower.com/en",
    "sourceKind": "official-site",
    "version": "Retrieved 2026-10-03",
    "repositoryLicense": "Not applicable: official-site artwork",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "SUNGROW logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "abbott",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/abbott.svg",
    "originalSourceUrl": "https://commons.wikimedia.org/wiki/File:Logo_Abbott_Laboratories.svg",
    "officialUrl": "https://www.abbott.com/",
    "policyUrl": "https://commons.wikimedia.org/wiki/File:Logo_Abbott_Laboratories.svg",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "Abbott logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "merck",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/merck.svg",
    "originalSourceUrl": "https://www.merck.com",
    "officialUrl": "https://www.merck.com/",
    "policyUrl": "https://www.merck.com",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "Merck & Co. logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "airbus",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/airbus.svg",
    "originalSourceUrl": "https://brand.airbus.com/en/asset-library/airbus-logo",
    "officialUrl": "https://www.airbus.com/",
    "policyUrl": "https://brand.airbus.com/en/asset-library/airbus-logo",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "Airbus logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "spacex",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/spacex.svg",
    "originalSourceUrl": "https://www.spacex.com",
    "officialUrl": "https://www.spacex.com/",
    "policyUrl": "https://www.spacex.com",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "SpaceX logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "abb",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/abb.svg",
    "originalSourceUrl": "https://global.abb",
    "officialUrl": "https://global.abb/",
    "policyUrl": "https://global.abb",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "ABB logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  },
  {
    "id": "bosch",
    "sourceUrl": "https://raw.githubusercontent.com/simple-icons/simple-icons/16.33.0/icons/bosch.svg",
    "originalSourceUrl": "https://www.bosch.de",
    "officialUrl": "https://www.bosch.com/",
    "policyUrl": "https://www.bosch.de",
    "sourceKind": "simple-icons",
    "version": "16.33.0",
    "repositoryLicense": "CC0-1.0",
    "assetLicense": "No unrestricted asset license inferred; copyright and trademark rights remain with the holder",
    "attribution": "Bosch logo; geometry unchanged, monochrome presentation and inert wrapper. No sponsorship or endorsement."
  }
] as const;
