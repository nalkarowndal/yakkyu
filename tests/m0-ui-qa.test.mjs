import test from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_UI, TOWN_HOTSPOTS } from '../src/constants/Layout.js';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/systems/MatchUI.js',import.meta.url),'utf8');
const town = readFileSync(new URL('../src/scenes/TownScene.js',import.meta.url),'utf8');

test('scoreboard gives team score its own width and is visible in field view', () => {
  const s=MATCH_UI.SCOREBOARD_LAYOUT;
  assert.ok(s.teamX - 130 > s.inningX + 30,'Team name overlaps inning');
  assert.ok(s.teamX + 130 < s.countX,'Team name overlaps BSO indicators');
  assert.ok(s.countX + 55 < s.baseX - 15,'BSO overlaps base diamond');
  assert.ok(s.baseX + 25 < s.width,'Base diamond clips scoreboard');
  assert.doesNotMatch(ui,/uiElements.push\(this.scoreboardContainer\)/);
  assert.match(ui,/SCOREBOARD_LAYOUT/);
});

test('stadium click area covers the actual stadium art, not the mall', () => {
  assert.ok(TOWN_HOTSPOTS.STADIUM.x < 600);
  assert.ok(TOWN_HOTSPOTS.STADIUM.y > 290);
  assert.ok(TOWN_HOTSPOTS.SHOP.x > 700);
  assert.ok(TOWN_HOTSPOTS.TRAINING.y + 25 < 680);
  assert.match(town,/TOWN_HOTSPOTS\.STADIUM/);
  assert.match(town,/TOWN_HOTSPOTS\.SHOP/);
});
