import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const documentPath=path.join(root,'offline','技术红利去了哪里.html');
await fs.access(documentPath);
const server=http.createServer(async (req,res)=>{
 if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
 try {const html=await fs.readFile(documentPath);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':html.length});res.end(req.method==='HEAD'?undefined:html);}catch {res.writeHead(503);res.end('The experiment is being prepared. Please refresh shortly.');}
});
server.listen(3000,'127.0.0.1',()=>console.log('Offline game: http://localhost:3000/ (loopback only)'));
