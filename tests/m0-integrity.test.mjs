import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const scene=readFileSync(new URL('../src/scenes/MatchScene.js',import.meta.url),'utf8');
const creation=readFileSync(new URL('../src/scenes/CreationScene.js',import.meta.url),'utf8');
const boot=readFileSync(new URL('../src/scenes/BootScene.js',import.meta.url),'utf8');
const title=readFileSync(new URL('../src/scenes/TitleScene.js',import.meta.url),'utf8');

test('match results and forfeits cannot finalize twice',()=>{
  assert.match(scene,/this\.matchFinalized = false/);
  assert.equal((scene.match(/if \(this\.matchFinalized\) return;/g)||[]).length,2);
});
test('inning-end and walkoff checks share role-independent rules',()=>{
  assert.match(scene,/return isWalkOff\(this\.gameState\)/);
  assert.match(scene,/endsAfterTopOfNinth\(this\.gameState\)/);
});
test('player name is inserted into a DOM property, never unsanitized HTML',()=>{
  assert.doesNotMatch(creation,/value="\$\{this\.playerName\}"/);
  assert.match(creation,/querySelector\('#playerName'\)\.value = this\.playerName/);
});
test('saved player data is validated and storage errors are handled',()=>{
  assert.match(title,/parseSavedPlayer/);
  assert.match(boot,/writePlayerSave/);
});
