const fs = require('fs');
let c = fs.readFileSync('src/scenes/MatchScene.js', 'utf8');

c = c.replace(
    /this\.ball\.hit\(hitPower, hitAngle\);\n        if\(this\.fielderManager\) this\.fielderManager\.moveFieldersToBall\(this\.ball\.x, this\.ball\.y, resultText\.includes\('홈런'\)\);/,
    'const distance = hitPower * 12;\n        const radians = Phaser.Math.DegToRad(hitAngle);\n        const landingX = 640 + Math.cos(radians) * distance;\n        const landingY = 650 + Math.sin(radians) * distance;\n        this.ball.hit(landingX, landingY, hitPower);\n        if(this.fielderManager) this.fielderManager.moveFieldersToBall(landingX, landingY, resultText.includes(\'홈런\'));'
);

fs.writeFileSync('src/scenes/MatchScene.js', c);
console.log('Fixed hit in MatchScene');
