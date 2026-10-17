import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function instrumentLayout(text){
  return text.replace('self.buildSplash = function () {','self.buildSplash = function () { var packStarted=performance.now();')
    .replace('self.paintSplash();\n    };\n    self.paintSplash =','self.paintSplash(); performance.measure("opening-layout",{start:packStarted});\n    };\n    self.paintSplash =');
}

export async function hostedTestServer(directory,{baseline,instrument=false}={}){
  const root=path.resolve(directory),cache=new Map();
  const server=http.createServer(async(req,res)=>{
    try{
      const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(route==='/favicon.ico'){res.writeHead(204);res.end();return;}
      const file=route==='/baseline.html'&&baseline?baseline:path.resolve(root,'.'+(route==='/'?'/index.html':route));
      if(file!==baseline&&file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      let body=cache.get(file);
      if(!body){body=await fs.readFile(file);if(instrument&&/\.(html|js)$/.test(file))body=Buffer.from(instrumentLayout(body.toString()));cache.set(file,body);}
      const type={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
      const etag='"'+createHash('sha256').update(body).digest('hex')+'"';
      const headers={'Content-Type':type,'ETag':etag,'Cache-Control':route.startsWith('/runtime-assets/')?'public,max-age=31536000,immutable':'no-cache'};
      if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
      res.writeHead(200,{...headers,'Content-Length':body.length});res.end(body);
    }catch(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end(String(e));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise(resolve=>server.close(resolve))};
}
