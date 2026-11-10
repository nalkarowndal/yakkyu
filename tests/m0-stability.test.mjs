import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateLandingPoint } from '../src/systems/FieldGeometry.js';
import { getTeamResult } from '../src/systems/MatchOutcome.js';
import { TOP_DOWN_VIEW } from '../src/constants/Layout.js';

const scene = readFileSync(new URL('../src/scenes/MatchScene.js', import.meta.url), 'utf8');
const matchUI = readFileSync(new URL('../src/systems/MatchUI.js', import.meta.url), 'utf8');
const ball = readFileSync(new URL('../src/entities/Ball.js', import.meta.url), 'utf8');

test('M0: fair-field landing coordinates use the top-down home plate', () => {
  const target = calculateLandingPoint(TOP_DOWN_VIEW.BASES.HOME, 20, -90);
  assert.equal(target.distance, 240);
  assert.ok(Math.abs(target.x - TOP_DOWN_VIEW.BASES.HOME.x) < 0.001);
  assert.equal(target.y, TOP_DOWN_VIEW.BASES.HOME.y - 240);
  assert.ok(Number.isFinite(target.x) && Number.isFinite(target.y));
});

test('M0: landing distance is capped at 800 pixels', () => {
  const target = calculateLandingPoint({ x: 100, y: 100 }, 1000, -90);
  assert.equal(target.distance, 800);
});

test('M0: league W/D/L depends on team score, not player mission outcome', () => {
  assert.equal(getTeamResult(4, 3), 'win');
  assert.equal(getTeamResult(2, 2), 'draw');
  assert.equal(getTeamResult(1, 5), 'loss');
  assert.match(scene, /updateLeagueStandings\(teamResult\)/);
});

test('M0: match result and forfeit both save using the scene manager', () => {
  assert.doesNotMatch(scene, /\bgm\.savePlayerData\(/);
  assert.equal((scene.match(/this\.gameManager\.savePlayerData\(/g) || []).length, 2);
});

test('M0: the hit animation passes coordinates and power in Ball.hit order', () => {
  assert.match(scene, /this\.ball\.hit\(ballDestX, ballDestY, hitPower\)/);
  assert.match(scene, /TOP_DOWN_VIEW\.BASES\.FIRST/);
  assert.match(scene, /TOP_DOWN_VIEW\.BASES\.SECOND/);
  assert.match(scene, /TOP_DOWN_VIEW\.BASES\.THIRD/);
  assert.match(ball, /this\.scene\.physics\.world\.enable\(this\)/);
});

test('M0: steal button and scoreboard follow game state', () => {
  assert.doesNotMatch(scene, /this\.stealBtn\./);
  assert.match(scene, /this\.matchUI\.stealBtn\.setVisible\(false\)/);
  assert.match(matchUI, /const isTop = !gs\.isBottom/);
  assert.match(matchUI, /gs\.bases\.some\(Boolean\)/);
  assert.match(matchUI, /this\.scene\.playerData\?\.role === 'batter'/);
});
