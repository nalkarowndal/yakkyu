const fs = require('fs');
let c = fs.readFileSync('src/scenes/TownScene.js', 'utf8');
c = c.replace(
    /import \{ GAME_WIDTH, GAME_HEIGHT, CENTER_X, CENTER_Y, TOWN_BOUNDS \} from '\.\.\/constants\/Layout';/,
    'import { GAME_WIDTH, GAME_HEIGHT, CENTER_X, CENTER_Y, TOWN_BOUNDS } from \'../constants/Layout\';\nimport { GameManager } from \'../systems/GameManager\';'
);
c = c.replace(
    /const playerData = this\.registry\.get\('playerData'\) \|\| \{ name: '테스트유저' \};/,
    'const gm = GameManager.getInstance();\n        gm.init(this.registry);\n        const playerData = gm.getPlayerData();'
);
fs.writeFileSync('src/scenes/TownScene.js', c);
console.log('TownScene updated!');
