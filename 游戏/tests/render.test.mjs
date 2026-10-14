import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('standalone React render covers initial scene and added interactive components', async () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const result = await build({
    stdin: {
      contents: `
 import React from 'react';
 import {renderToString} from 'react-dom/server';
 import Game from './components/trust-game';
 import FactoryStory,{FactoryStage,Ledger,Coins,PeopleWallets,PolicyConsequences} from './components/factory-story';
 import {factoryAccount} from './lib/factory-model';
 import {ProductionPlayground, Prediction, SkillFlow, BurdenDots, FeedbackLab} from './components/playful-scenes';
 export const html=renderToString(React.createElement(Game));
 export const story=renderToString(React.createElement(FactoryStory));
 export const allocation=renderToString(React.createElement(React.Fragment,null,
 React.createElement(PeopleWallets,{rules:{technology:true,wageEach:6},baseline:factoryAccount({technology:true})}),
 React.createElement(Ledger,{rules:{technology:true,wageEach:6},compare:true,baseline:factoryAccount({technology:true}),baselineLabel:'新机器，不改合同'})));
 export const policies=[24,32].map(buyers=>Array.from({length:8},(_,mask)=>{
 const relief={pay:Boolean(mask&1),time:Boolean(mask&2),clean:Boolean(mask&4)};
 return renderToString(React.createElement(PolicyConsequences,{relief,buyers}));
 }));
 export const accounts=renderToString(React.createElement(React.Fragment,null,React.createElement(FactoryStage,{joined:1,rules:{technology:true}}),React.createElement(Ledger,{rules:{technology:true,price:1}}),React.createElement(Coins,{amount:-4,label:'亏损'})));
 export const scenes=renderToString(React.createElement(React.Fragment,null,
 React.createElement(ProductionPlayground,{adopted:true,disabled:false,onToggle:()=>{}}),
 React.createElement(Prediction,{chosen:'rise',revealed:true,onChoose:()=>{}}),
 React.createElement(SkillFlow,{stock:100,choice:'mentor'}),
 React.createElement(BurdenDots,{total:105,responsibility:50}),
 React.createElement(FeedbackLab)));
 `,
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(
    createRequire(import.meta.url),
    module,
    module.exports,
  );
  assert.match(module.exports.html, /先猜，再试/);
  assert.match(module.exports.html, /开启新技术/);
  assert.match(module.exports.html, /disabled/);
  assert.match(module.exports.scenes, /120/);
  assert.match(module.exports.scenes, /不等于多拿50%/);
  assert.match(module.exports.scenes, /为什么这不是/);
  assert.match(module.exports.scenes, /运行一轮/);
  assert.match(module.exports.story, /规则与边界/);
  assert.match(module.exports.story, /先让工厂转起来/);
  assert.match(module.exports.story, /本幕假设/);
  assert.doesNotMatch(module.exports.story, /<details[^>]*\sopen(?:[\s=>])/);
  assert.match(module.exports.story, /Nicky Case/);
  assert.match(module.exports.story, /干完一天，结算金币/);
  assert.match(module.exports.accounts, /亏损-4金币/);
  assert.match(module.exports.allocation, /对照值28金币，减少4金币/);
  assert.match(module.exports.allocation, /增减对照：<!-- -->新机器，不改合同/);
  assert.doesNotMatch(module.exports.allocation, /对照值6金币/);
  assert.match(module.exports.policies[0][2], /结余反而增加2枚/);
  assert.match(module.exports.policies[1][2], /结余减少6枚/);
  assert.match(module.exports.policies[0][0], /还没有改变规则/);
  for (const branch of module.exports.policies)
    for (const [mask, html] of branch.entries()) {
      assert.match(html, /role="status"/);
      assert.doesNotMatch(html, /NaN|undefined/);
      const plain = html.replace(/<!-- -->/g, '');
      assert.equal(plain.includes('<b>加薪：</b>'), Boolean(mask & 1));
      assert.equal(plain.includes('<b>缩时：</b>'), Boolean(mask & 2));
      assert.equal(plain.includes('<b>治理：</b>'), Boolean(mask & 4));
      if (mask & 4) assert(plain.includes(mask & 2 ? '环境负担从3降到0.75' : '环境负担从4降到1'));
    }
});
