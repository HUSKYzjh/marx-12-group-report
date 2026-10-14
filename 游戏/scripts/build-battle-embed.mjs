import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildBattleEmbed(){
 const dir=path.join(root,'public/assets/market-duel');
 const data=async(file,mime)=>'data:'+mime+';base64,'+(await fs.readFile(path.join(root,'public/assets',file))).toString('base64');
 const resources={atlases:{},images:{}};
 for(const name of ['body','face','face_nervous','hatguy','trust']){
  const file=name==='trust'?'trust/iterated_peep':'wbwwb-source/'+name;
  resources.atlases[name]={...JSON.parse((await fs.readFile(path.join(root,'public/assets',file+'.json'),'utf8')).replace(/^\uFEFF/,'')),image:await data(file+'.png','image/png')};
 }
 for(const name of ['chef-hat','oven-new','oven-old','bread','bread-rack'])resources.images[name]=await data('bakery/'+name+'.svg','image/svg+xml');
 let css=(await fs.readFile(path.join(dir,'battle.css'),'utf8'))+'\n'+await fs.readFile(path.join(dir,'course.css'),'utf8');
 // The parent substitutes its shared font URI before creating either iframe.
 css=css.replace('../fonts/workshop-hand.woff2','__WORKSHOP_FONT_URL__');
 css+='\nbody.embedded{background:#fff}body.embedded main{padding-top:0}body.embedded footer>span{display:none}body.embedded header>span:first-child{margin-left:0}';
 const js=(await build({absWorkingDir:root,entryPoints:['public/assets/market-duel/course-game.mjs'],bundle:true,write:false,format:'iife',target:'es2020',minify:true})).outputFiles[0].text;
 const script=source=>'<script>'+source.replaceAll('</script','<\\/script')+'</script>';
 let html=await fs.readFile(path.join(dir,'battle.html'),'utf8');
 // Bundled identifiers may contain $, which must not become replacement-string tokens.
 html=html.replace('<link rel="stylesheet" href="battle.css"><link rel="stylesheet" href="course.css">',()=>'<style>'+css+'</style>')
  .replace('<script type="module" src="course-game.mjs"></script>',()=>script('window.__BATTLE_EMBED__={snapshot:/*BATTLE_SNAPSHOT*/null};window.__BATTLE_RESOURCES__='+JSON.stringify(resources)+';')+script(js));
 await fs.mkdir(path.join(root,'lib/generated'),{recursive:true});
 await fs.writeFile(path.join(root,'lib/generated/battle-embed.html'),html);
 console.log('Built embedded second act with shared handwriting font.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildBattleEmbed();
