const fs = require('fs');

const path = 'src/scenes/MatchScene.js';
let c = fs.readFileSync(path, 'utf8');

const targetLine = "this.stadiumBg.setTexture('stadium').setPosition(TOP_DOWN_VIEW.STADIUM_POS.x, TOP_DOWN_VIEW.STADIUM_POS.y).setScale(1);";
const newLine = "this.stadiumBg.setTexture('defense_field_bg').setPosition(CENTER_X, CENTER_Y).setScale(1);";

if (c.includes(targetLine)) {
    c = c.replace(targetLine, newLine);
    fs.writeFileSync(path, c);
    console.log("Successfully replaced background texture!");
} else {
    console.log("Target line not found.");
}
