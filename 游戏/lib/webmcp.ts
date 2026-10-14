type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type Context={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function registerGameTools(read:()=>unknown,configure:(input:unknown)=>unknown,context?:Context){
 const registry=context??(typeof document==='undefined'?undefined:(document as Document&{modelContext?:Context}).modelContext);
 if(!registry?.registerTool)return ()=>{};
 const lifecycle=new AbortController();
 const tools:Tool[]=[{name:'read_technology_experiment',title:'读取当前实验',description:'读取当前章节和教学假设，不改变游戏。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>read()},
 {name:'configure_technology_sandbox',title:'调整自由实验室',description:'只在尾声自由实验室调整分配、规模、单位负担和责任，更新可见结果。不是现实预测。',inputSchema:{type:'object',properties:{share:{type:'number',minimum:0,maximum:100},growth:{type:'number',minimum:0,maximum:100},intensity:{type:'number',minimum:0,maximum:80},responsibility:{type:'number',minimum:0,maximum:100}},required:['share','growth','intensity','responsibility'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{if(typeof input!=='object'||input===null||Array.isArray(input))throw new Error('参数必须为对象');const obj=input as Record<string,unknown>;if(Object.keys(obj).length!==4||['share','growth','intensity','responsibility'].some(k=>typeof obj[k]!=='number'))throw new Error('请提供四个数值参数');return configure(obj);}}];
 for(const tool of tools){try{void Promise.resolve(registry.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported implementation must not interrupt the game. */}}
 return ()=>lifecycle.abort();
}
