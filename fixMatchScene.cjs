const fs = require('fs');

const path = 'src/scenes/MatchScene.js';
let c = fs.readFileSync(path, 'utf8');

const brokenStr = `                if (activeUIs.length > 0) activeUIs.forEach(ui => ui.setAlpha(1));
            // 🌟 1600x1600`;

const fixedStr = `                if (activeUIs.length > 0) activeUIs.forEach(ui => ui.setAlpha(1));
            } else {
                this.pitcherSprite.setPosition(this.moundPosition.x, this.moundPosition.y).setScale(BACK_VIEW.PITCHER_SCALE);
                this.batterSprite.setPosition(this.homePlatePosition.x + BACK_VIEW.BATTER_OFFSET.x, this.homePlatePosition.y + BACK_VIEW.BATTER_OFFSET.y).setScale(BACK_VIEW.BATTER_SCALE);
                this.strikeZone.setPosition(BACK_VIEW.STRIKE_ZONE.x, BACK_VIEW.STRIKE_ZONE.y);
                this.tweens.add({ targets: [this.pitcherSprite, this.batterSprite, this.strikeZone], alpha: 1, duration: duration });
                if (this.fielders) this.tweens.add({ targets: this.fielders, alpha: 0, duration: duration });
                const activeUIs = this.uiElements.filter(ui => ui && ui.active);
                if (activeUIs.length > 0) this.tweens.add({ targets: activeUIs, alpha: 1, duration: duration });
            }
        } else if (viewType === 'TOP_DOWN') {
            if (this.vignetteFX) this.vignetteFX.active = false;
            this.cameras.main.setBackgroundColor('#2e7d32');
            // 🌟 1600x1600`;

c = c.replace(brokenStr, fixedStr);

const textureStrOld = `this.stadiumBg.setTexture('stadium').setPosition(TOP_DOWN_VIEW.STADIUM_POS.x, TOP_DOWN_VIEW.STADIUM_POS.y).setScale(1);`;
const textureStrNew = `this.stadiumBg.setTexture('defense_field_bg').setPosition(640, 360).setScale(1);`;
c = c.replace(textureStrOld, textureStrNew);

fs.writeFileSync(path, c);
console.log("Fixed MatchScene TOP_DOWN logic");
