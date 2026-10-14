import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../lib/ownership-permissions.js',import.meta.url),'utf8'),{window});
test('using the same oven does not give the chef the fictional final investment permission',()=>{
 const can=window.OwnershipPermissions.allows;assert.equal(can('chef','operate'),true);assert.equal(can('chef','schedule'),false);assert.equal(can('chef','invest'),false);for(const action of ['operate','schedule','invest'])assert.equal(can('owner',action),true);assert.equal(can('owner','confiscate'),null);assert.equal(can('unknown','operate'),null);
});
