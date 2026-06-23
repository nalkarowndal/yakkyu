export class MatchUI {
    constructor(scene) {
        this.scene = scene;
        this.scoreboardContainer = null;
        this.inningText = null;
        this.scoreText = null;
        this.ballLights = [];
        this.strikeLights = [];
        this.outLights = [];
        this.baseUI = [];
        this.stealBtn = null;
    }

    createScoreboard() {
        this.scoreboardContainer = this.scene.add.container(20, 20).setDepth(40);
        if (this.scene.uiElements) {
            this.scene.uiElements.push(this.scoreboardContainer);
        }

        const bg = this.scene.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 0.95, 0.95, 0.85, 0.85);
        bg.fillRoundedRect(0, 0, 420, 60, 10);
        bg.lineStyle(2, 0xe94560, 0.8);
        bg.strokeRoundedRect(0, 0, 420, 60, 10);
        
        const inningBg = this.scene.add.graphics();
        inningBg.fillStyle(0xe94560, 0.9);
        inningBg.fillRoundedRect(10, 10, 60, 40, 5);
        this.inningText = this.scene.add.text(40, 30, '', { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        
        this.scoreText = this.scene.add.text(160, 30, '', { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        
        const countStartX = 280;
        const startYOffset = 15;
        const bLabel = this.scene.add.text(countStartX, startYOffset, 'B', { fontSize: '13px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        const sLabel = this.scene.add.text(countStartX, startYOffset + 15, 'S', { fontSize: '13px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        const oLabel = this.scene.add.text(countStartX, startYOffset + 30, 'O', { fontSize: '13px', fill: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
        
        const createLed = (x, y) => {
            const led = this.scene.add.rectangle(x, y, 12, 6, 0x333333).setStrokeStyle(1, 0x000000);
            return led;
        };

        this.ballLights = [
            createLed(countStartX + 20, startYOffset),
            createLed(countStartX + 35, startYOffset),
            createLed(countStartX + 50, startYOffset)
        ];
        this.strikeLights = [
            createLed(countStartX + 20, startYOffset + 15),
            createLed(countStartX + 35, startYOffset + 15)
        ];
        this.outLights = [
            createLed(countStartX + 20, startYOffset + 30),
            createLed(countStartX + 35, startYOffset + 30),
            createLed(countStartX + 50, startYOffset + 30)
        ];
        
        const baseX = 380;
        const baseY = 30;
        const baseGraphics = this.scene.add.graphics();
        baseGraphics.lineStyle(2, 0x555555);
        baseGraphics.strokePoints([{x: baseX, y: baseY - 15}, {x: baseX + 15, y: baseY}, {x: baseX, y: baseY + 15}, {x: baseX - 15, y: baseY}, {x: baseX, y: baseY - 15}]);

        this.baseUI = [
            this.scene.add.rectangle(baseX + 15, baseY, 10, 10, 0x444444).setStrokeStyle(1, 0x000000).setRotation(Math.PI / 4), // 1루
            this.scene.add.rectangle(baseX, baseY - 15, 10, 10, 0x444444).setStrokeStyle(1, 0x000000).setRotation(Math.PI / 4), // 2루
            this.scene.add.rectangle(baseX - 15, baseY, 10, 10, 0x444444).setStrokeStyle(1, 0x000000).setRotation(Math.PI / 4)  // 3루
        ];
        
        this.scoreboardContainer.add([
            bg, inningBg, this.inningText, this.scoreText,
            bLabel, sLabel, oLabel,
            ...this.ballLights, ...this.strikeLights, ...this.outLights,
            baseGraphics, ...this.baseUI
        ]);
        
        this.stealBtn = this.scene.add.text(20, 85, '🏃 도루 시도 (STEAL)', { fontSize: '14px', fill: '#ffffff', backgroundColor: '#e94560', padding: { x: 10, y: 6 }, fontStyle: 'bold', stroke: '#000', strokeThickness: 2 })
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setVisible(false)
            .setDepth(40)
            .on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation();
                if(this.scene.attemptSteal) this.scene.attemptSteal();
            });
            
        if (this.scene.uiElements) {
            this.scene.uiElements.push(this.stealBtn);
        }

        this.refreshScoreboardUI();
    }

    refreshScoreboardUI() {
        if (!this.inningText || !this.scene.gameState) return;
        const gs = this.scene.gameState;
        const isTop = gs.inning % 2 !== 0;
        const currentInning = Math.ceil(gs.inning / 2);
        this.inningText.setText(`${currentInning}회\n${isTop ? '초' : '말'}`);

        const playerTeamName = (this.scene.playerData && this.scene.playerData.team) ? this.scene.playerData.team : '우리팀';
        const opponentIndex = (this.scene.playerData && this.scene.playerData.currentMatchIndex) ? this.scene.playerData.currentMatchIndex : 0;
        const opponentTeamName = (this.scene.playerData && this.scene.playerData.schedule && this.scene.playerData.schedule[opponentIndex]) 
            ? this.scene.playerData.schedule[opponentIndex] 
            : '상대팀';

        const pScore = gs.scorePlayer || 0;
        const aiScore = gs.scoreAI || 0;

        // 플레이어 역할에 따라 공격/수비 여부 판단
        const teamStr = `${playerTeamName} ${pScore} : ${aiScore} ${opponentTeamName}`;
        this.scoreText.setText(teamStr);

        this.ballLights.forEach((light, index) => {
            light.fillColor = index < gs.balls ? 0x00ff00 : 0x333333;
        });

        this.strikeLights.forEach((light, index) => {
            light.fillColor = index < gs.strikes ? 0xffff00 : 0x333333;
        });

        this.outLights.forEach((light, index) => {
            light.fillColor = index < gs.outs ? 0xff0000 : 0x333333;
        });

        this.baseUI.forEach((rect, index) => {
            rect.fillColor = gs.bases[index] ? 0xffdd00 : 0x444444;
        });
        
        if (this.stealBtn) {
            const hasRunners = gs.bases.some(b => b !== null);
            this.stealBtn.setVisible(hasRunners && !this.scene.isPitching);
        }
    }
}
