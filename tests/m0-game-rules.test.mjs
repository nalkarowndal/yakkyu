import test from 'node:test';
import assert from 'node:assert/strict';
import { isWalkOff, endsAfterTopOfNinth } from '../src/systems/GameRules.js';

test('home team can walk off in the ninth, independent of player role', () => {
  assert.equal(isWalkOff({inning:9,isBottom:true,scorePlayer:4,scoreAI:3}), true);
  assert.equal(isWalkOff({inning:9,isBottom:true,scorePlayer:2,scoreAI:3}), false);
  assert.equal(isWalkOff({inning:8,isBottom:true,scorePlayer:4,scoreAI:3}), false);
  assert.equal(isWalkOff({inning:10,isBottom:false,scorePlayer:4,scoreAI:3}), false);
});
test('home lead after nine top outs ends before bottom half', () => {
  assert.equal(endsAfterTopOfNinth({inning:9,isBottom:false,outs:3,scorePlayer:4,scoreAI:3}),true);
  assert.equal(endsAfterTopOfNinth({inning:9,isBottom:false,outs:3,scorePlayer:3,scoreAI:3}),false);
  assert.equal(endsAfterTopOfNinth({inning:8,isBottom:false,outs:3,scorePlayer:4,scoreAI:3}),false);
  assert.equal(endsAfterTopOfNinth({inning:9,isBottom:false,outs:2,scorePlayer:4,scoreAI:3}),false);
});
