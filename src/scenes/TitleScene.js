import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        // 배경색 설정 (짙은 남색)
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // 타이틀 제목 텍스트
        this.add.text(400, 200, '⚾ 나만의 야구 RPG ⚾', {
            fontSize: '48px', fill: '#fca311', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 💾 로컬 스토리지에 저장된 데이터 확인
        const savedData = localStorage.getItem('baseball_rpg_save');

        // [ 새로 하기 ] 버튼
        const startBtn = this.add.text(400, 360, '[ 새로 하기 ]', {
            fontSize: '32px', fill: '#ffffff', backgroundColor: '#16213e', padding: { x: 20, y: 10 }
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
        const loadBtn = this.add.text(400, 440, '[ 이어 하기 ]', {
            fontSize: '32px', fill: savedData ? '#ffffff' : '#555555', backgroundColor: '#16213e', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // 저장된 데이터가 있을 때만 클릭 가능
        if (savedData) {
            loadBtn.setInteractive({ useHandCursor: true });
            loadBtn.on('pointerover', () => loadBtn.setStyle({ fill: '#00ffcc' }));
            loadBtn.on('pointerout', () => loadBtn.setStyle({ fill: '#ffffff' }));
            loadBtn.on('pointerdown', () => {
                try {
                    const pd = JSON.parse(savedData);
                    
                    // 불러온 데이터를 레지스트리에 등록
                    this.registry.set('playerData', pd);
                    
                    // 생성 화면을 건너뛰고 마을로 바로 이동
                    this.scene.start('TownScene'); 
                } catch (e) {
                    alert('저장된 데이터를 불러오는 중 오류가 발생했습니다.');
                    console.error(e);
                }
            });
        }
    }
}