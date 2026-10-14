import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialRemedy,remedyReducer,remedyAccounts} from '../lib/remedy-lab.ts';

class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.textContent='';this.open=false;}
 appendChild(child){this.children.push(child);child.parentElement=this;return child;}
 setAttribute(key,value){this.attributes[key]=value;}
}

test('legacy consumption presents one current entry, with original receipts behind a closed disclosure',()=>{
 let lab=initialRemedy('consumption');lab=remedyReducer(lab,{type:'PLACE',mode:'credit',expectedRound:0});
 const account=remedyAccounts(lab),before=JSON.stringify(lab),sent=[],window={};
 vm.runInNewContext(fs.readFileSync(new URL('../lib/remedy-ui.js',import.meta.url),'utf8'),{window,document:{createElement:tag=>new Element(tag)},StreetArt:{decorateMoney(){}}});
 const c={state:{prologue:{reliefRoute:'consumption',reliefCompleted:[],remedyLabs:{consumption:lab}},remedy:account},readout:new Element('div'),controls:new Element('div'),title(){},send(a){sent.push(a);}};
 window.renderRemedyLab(c);
 assert.deepEqual(c.readout.children.map(n=>n.className),['remedy-legacy-notice','remedy-legacy-record']);
 const old=c.readout.children[1];assert.equal(old.open,false);assert.equal(old.children.length,1,'no ledger paragraphs before expansion');
 assert.equal(c.controls.children[0].textContent,'开始按天经营 →');assert.equal(c.controls.children.length,2);
 old.open=true;old.ontoggle();assert.equal(old.children.length,2);assert.equal(old.children[1].className,'remedy-receipt');
 old.open=false;old.ontoggle();old.open=true;old.ontoggle();assert.equal(old.children.length,2,'opening twice must not duplicate receipts');
 assert.equal(JSON.stringify(lab),before);assert.deepEqual(sent,[],'reading never migrates or clears an old save');
 c.controls.children[0].onclick();assert.equal(sent.length,1);assert.equal(sent[0].type,'REMEDY');assert.equal(sent[0].action.type,'OPEN_FLOW');
});
