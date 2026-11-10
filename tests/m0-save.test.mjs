import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedPlayer, writePlayerSave } from '../src/systems/SaveData.js';

const valid = {name:'선수',role:'pitcher',team:'KIA 타이거즈',position:'선발 투수',
  stats:{velocity:40,control:40,movement:40,stamina:40},pitches:['four_seam'],
  schedule:['삼성 라이온즈'],currentMatchIndex:0,exp:10,gold:50};

test('legacy valid player loads without losing progress, with standings added', () => {
  const p = parseSavedPlayer(JSON.stringify(valid));
  assert.equal(p.name,valid.name);
  assert.equal(p.gold,50);
  assert.equal(p.currentMatchIndex,0);
  assert.equal(p.leagueStandings['KIA 타이거즈'].w,0);
});
test('corrupt and invalid saves cannot enter a broken scene', () => {
  assert.equal(parseSavedPlayer('{not json'),null);
  assert.equal(parseSavedPlayer(JSON.stringify({...valid,stats:null})),null);
  assert.equal(parseSavedPlayer(JSON.stringify({...valid,currentMatchIndex:-1})),null);
  assert.equal(parseSavedPlayer(JSON.stringify({...valid,role:'unknown'})),null);
});
test('storage write fails gracefully without crashing the game', () => {
  const broken = {setItem(){throw new Error('denied')}};
  assert.equal(writePlayerSave(valid,broken),false);
});
