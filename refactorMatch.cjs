const fs = require('fs');
let c = fs.readFileSync('src/scenes/MatchScene.js', 'utf8');

c = c.replace(
    /import \{ FielderManager \} from '\.\.\/systems\/FielderManager';/,
    'import { FielderManager } from \'../systems/FielderManager\';\nimport { GameManager } from \'../systems/GameManager\';'
);

c = c.replace(
    /\/\/ CreationScene에서 저장한 플레이어 데이터를 가져옵니다\. \(없으면 기본값\)[\s\S]*?        \};/,
    '        const gm = GameManager.getInstance();\n        gm.init(this.registry);\n        this.playerData = gm.getPlayerData();'
);

// We need to find places where we modify this.registry or playerData and replace them.
// In MatchScene, when does it update stats or gold? 
// let's look for this.registry.set('playerData'
c = c.replace(/this\.registry\.set\('playerData', this\.playerData\);/g, 'gm.savePlayerData(this.playerData);');

fs.writeFileSync('src/scenes/MatchScene.js', c);
console.log('MatchScene GameManager integration done!');
