/** One embedded binary; child srcdoc documents receive a short, shared local URL.
 * Repeating a multi-megabyte data URI in iframe attributes is needlessly costly.
 * The browser owns the URL until the document is unloaded. No network is used.
 */
export function sharedFontBootstrap(dataURI){
 if(!dataURI.startsWith('data:font/woff2;base64,'))throw new Error('Expected an embedded WOFF2 font');
 return `(()=>{const encoded=${JSON.stringify(dataURI)};const raw=atob(encoded.slice(encoded.indexOf(',')+1));const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);globalThis.__WORKSHOP_FONT_URI__=URL.createObjectURL(new Blob([bytes],{type:'font/woff2'}));})();\n`;
}
