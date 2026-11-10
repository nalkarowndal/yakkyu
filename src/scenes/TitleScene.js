import Phaser from 'phaser';
import { parseSavedPlayer } from '../systems/SaveData';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        // 배경색 설정 (짙은 남색)
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // 타이틀 제목 텍스트
        this.add.text(640, 250, '⚾ 나만의 야구 RPG ⚾', {
            fontSize: '56px', fill: '#fca311', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 💾 로컬 스토리지에 저장된 데이터 확인
        let savedData = null;
        try {
            savedData = localStorage.getItem('baseball_rpg_save');
        } catch (error) {
            console.warn('[SaveData] 로컬 저장소에 접근할 수 없습니다.', error);
        }
        const savedPlayer = parseSavedPlayer(savedData);
        if (savedData && !savedPlayer) {
            this.add.text(640, 620, '저장 파일이 손상되었거나 지원되지 않습니다. 새 게임을 시작할 수 있습니다.', {
                fontSize: '17px', fill: '#ffaaaa'
            }).setOrigin(0.5);
        }

        // [ 새로 하기 ] 버튼
        const startBtn = this.add.text(640, 450, '[ 새로 하기 ]', {
            fontSize: '36px', fill: '#ffffff', backgroundColor: '#16213e', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        startBtn.on('pointerover', () => startBtn.setStyle({ fill: '#ccff00' }));
        startBtn.on('pointerout', () => startBtn.setStyle({ fill: '#ffffff' }));
        startBtn.on('pointerdown', () => {
            if (savedData) {
                if (!confirm('기존 저장 데이터가 삭제됩니다. 새로 시작하시겠습니까?')) return;
            }
            this.scene.start('CreationScene');
        });

        // [ 이어 하기 ] 버튼
        const loadBtn = this.add.text(640, 550, '[ 이어 하기 ]', {
            fontSize: '36px', fill: savedPlayer ? '#ffffff' : '#555555', backgroundColor: '#16213e', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // 저장된 데이터가 있을 때만 클릭 가능
        if (savedPlayer) {
            loadBtn.setInteractive({ useHandCursor: true });
            loadBtn.on('pointerover', () => loadBtn.setStyle({ fill: '#00ffcc' }));
            loadBtn.on('pointerout', () => loadBtn.setStyle({ fill: '#ffffff' }));
            loadBtn.on('pointerdown', () => {
                // The saved player has already been parsed and normalized.
                this.registry.set('playerData', savedPlayer);
                this.scene.start('TownScene');
            });
        }
    }
}