import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configPath=path.join(ROOT,'runtime.local.json');
const cfg=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):{};
const abs=p=>p?path.resolve(ROOT,p):null;
const first=items=>items.filter(Boolean).find(p=>fs.existsSync(p));
const dependencies=first([abs(process.env.PPT_DEPENDENCIES_DIR),abs(cfg.dependencies),path.join(os.homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies')]);
if(!dependencies)throw new Error('未找到Codex文稿运行库。请运行load_workspace_dependencies，或按README填写runtime.local.json的dependencies。');
const modules=first([abs(process.env.PPT_NODE_MODULES),abs(cfg.node_modules),path.join(dependencies,'node','node_modules')]);
const python=first([abs(process.env.PPT_PYTHON),abs(cfg.python),path.join(dependencies,'python','python.exe'),path.join(dependencies,'python','bin','python3'),path.join(dependencies,'python','bin','python')]);
let helpers=first([abs(process.env.PPT_HELPERS_DIR),abs(cfg.helpers)]);
if(!helpers){
 const plugin=path.join(os.homedir(),'.codex','plugins','cache','openai-primary-runtime','presentations');
 if(fs.existsSync(plugin)){
  const versions=fs.readdirSync(plugin).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
  helpers=first(versions.map(v=>path.join(plugin,v,'skills','presentations','container_tools')));
 }
}
if(!modules||!python||!helpers)throw new Error('缺少Node包、Python或演示文稿工具。请补齐runtime.local.json，详见README。');
for(const name of ['artifact_tool_utils.mjs','inspect_presentation_package_integrity.py','inspect_presentation_layout_geometry.py']){
 if(!fs.existsSync(path.join(helpers,name)))throw new Error('工具目录缺少 '+name);
}
process.env.RUNTIME_NODE_MODULES=modules;
process.env.RUNTIME_NODE=process.execPath;
process.env.RUNTIME_PYTHON=python;
process.env.RUNTIME_BIN_DIR=path.join(dependencies,'bin','override');
const req=createRequire(pathToFileURL(path.join(path.dirname(modules),'package.json')));
export const artifact=await import(pathToFileURL(req.resolve('@oai/artifact-tool')).href);
export const canvas=await import(pathToFileURL(req.resolve('@napi-rs/canvas')).href);
export const runtime={dependencies,modules,python,helpers,node:process.execPath};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const artifactMeta=JSON.parse(fs.readFileSync(path.join(modules,'@oai','artifact-tool','package.json'),'utf8'));
 console.log(JSON.stringify({...runtime,node_version:process.version,artifact_tool_version:artifactMeta.version,required_fonts:['Microsoft YaHei','SimSun','Georgia']},null,2));
}
