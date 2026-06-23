const fs = require('fs');
let c = fs.readFileSync('src/scenes/MatchScene.js', 'utf8');

// 1. Add Imports
c = c.replace(
    /import \{([^}]+)\} from '\.\.\/constants\/Layout';/,
    'import {$1} from \'../constants/Layout\';\nimport { MatchUI } from \'../systems/MatchUI\';\nimport { FielderManager } from \'../systems/FielderManager\';'
);

// 2. Replace UI calls
c = c.replace(/this\.refreshScoreboardUI\(\);/g, 'if(this.matchUI) this.matchUI.refreshScoreboardUI();');
c = c.replace(/this\.createScoreboard\(\);/, 'this.matchUI = new MatchUI(this); this.matchUI.createScoreboard();');

// 3. Remove Dead UI methods
c = c.replace(/    createScoreboard\(\) \{[\s\S]*?initDefenseView\(\);\n    \}\n/g, '');
c = c.replace(/    refreshScoreboardUI\(\) \{[\s\S]*?    \/\/ 타격 결과에 따른 아웃 카운트\/점수 갱신 로직\n/g, '    // 타격 결과에 따른 아웃 카운트/점수 갱신 로직\n');

// 4. Replace fielders initialization
c = c.replace(
    /        this\.fielders = \[\];\n        const fielderCoords = \[\{x:980[\s\S]*?        \}\);/,
    '        this.fielderManager = new FielderManager(this);\n        this.fielderManager.createFielders();\n        this.fielders = this.fielderManager.fielders;'
);

// 5. Replace initDefenseView fielders addition
c = c.replace(
    /        \/\/ 수비수 컨테이너 \(야수 7명 \+ 투수 \+ 포수\)[\s\S]*?        this\.fielders\.push\(p1, p2\);/,
    '        this.fieldersContainer = this.fielderManager.fieldersContainer;'
);

fs.writeFileSync('src/scenes/MatchScene.js', c);
console.log('Refactoring complete!');
