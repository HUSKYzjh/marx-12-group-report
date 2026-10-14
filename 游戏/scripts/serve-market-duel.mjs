import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
export function createDuelServer(){return http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
 if(req.url==='/'){res.writeHead(302,{'Location':'/assets/market-duel/index.html','Cache-Control':'no-store'});res.end();return;}
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/assets/market-duel/index.html':pathname));if(!file.startsWith(root+path.sep))throw new Error('outside public');const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404);res.end('Not found');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createDuelServer().listen(3019,'127.0.0.1',()=>console.log('Duel prototype: http://127.0.0.1:3019/ (loopback only)'));
