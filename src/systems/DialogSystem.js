export class DialogSystem {
    constructor(scene) {
        this.scene = scene;
        this.isShowing = false;
        this.isTyping = false;
        this.dialogues = [];
        this.currentLineIndex = 0;
        this.onComplete = null;
        
        this.createUI();
    }

    createUI() {
        // 대화창 배경 (화면 하단)
        this.bg = this.scene.add.rectangle(400, 500, 700, 130, 0x1a1a2e, 0.9)
            .setStrokeStyle(3, 0x00b4d8)
            .setDepth(1000)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);

        // 🖼️ 초상화 배경 네모칸 (대화창 좌측 내부에 위치)
        this.portraitBg = this.scene.add.rectangle(120, 500, 100, 100, 0x000000, 0.8)
            .setStrokeStyle(3, 0x00b4d8).setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);

        // 🖼️ 초상화 이미지/텍스트 (이모지 또는 주인공 픽셀 스프라이트)
        this.portraitText = this.scene.add.text(120, 500, '', { fontSize: '60px' }).setOrigin(0.5).setDepth(1002).setVisible(false);
        this.portraitSprite = this.scene.add.sprite(120, 500, '').setOrigin(0.5).setDepth(1002).setVisible(false);

        // 화자 이름 텍스트
        this.nameText = this.scene.add.text(185, 420, '', {
            fontSize: '22px', fill: '#ccff00', fontStyle: 'bold', 
            backgroundColor: '#000', padding: { x: 15, y: 5 }
        }).setDepth(1001).setVisible(false);

        // 대화 내용 텍스트
        this.dialogueText = this.scene.add.text(185, 460, '', {
            fontSize: '20px', fill: '#ffffff', wordWrap: { width: 545, useAdvancedWrap: true },
            lineSpacing: 8
        }).setDepth(1001).setVisible(false);

        // 대화창 클릭 시 다음 대화로 넘어가거나 타이핑 스킵
        this.bg.on('pointerdown', () => this.advance());
        this.portraitBg.on('pointerdown', () => this.advance());
    }

    show(dialogues, onCompleteCallback = null) {
        this.dialogues = dialogues;
        this.currentLineIndex = 0;
        this.isShowing = true;
        this.onComplete = onCompleteCallback;
        
        this.bg.setVisible(true);
        this.portraitBg.setVisible(true);
        this.nameText.setVisible(true);
        this.dialogueText.setVisible(true);

        this.showLine();
    }

    showLine() {
        if (this.currentLineIndex >= this.dialogues.length) {
            this.close();
            return;
        }

        const lineData = this.dialogues[this.currentLineIndex];
        this.nameText.setText(lineData.name);
        this.dialogueText.setText(''); // 타이핑 전 텍스트 초기화
        
        // 초상화 분기 처리 (플레이어의 픽셀 텍스처 vs NPC 이모지)
        if (lineData.texture) {
            this.portraitText.setVisible(false);
            this.portraitSprite.setTexture(lineData.texture);
            
            // 🖼️ 초상화 박스(100x100) 안에 쏙 들어가도록 비율에 맞춰 자동 크기 조정
            const maxSize = 90; // 약간의 여백을 주기 위해 90으로 설정
            const scale = Math.min(maxSize / this.portraitSprite.width, maxSize / this.portraitSprite.height);
            this.portraitSprite.setScale(scale).setVisible(true);
        } else {
            this.portraitSprite.setVisible(false);
            this.portraitText.setText(lineData.portrait || '👤').setVisible(true);
        }

        this.isTyping = true;
        this.fullText = lineData.text;
        this.typeIndex = 0;

        if (this.typeEvent) this.typeEvent.remove();

        // 타이핑 효과를 위한 타이머 이벤트
        this.typeEvent = this.scene.time.addEvent({
            delay: 40, // 글자당 타이핑 속도 (ms)
            callback: () => {
                this.typeIndex++;
                this.dialogueText.setText(this.fullText.substring(0, this.typeIndex));
                if (this.typeIndex >= this.fullText.length) {
                    this.isTyping = false;
                    this.typeEvent.remove();
                }
            },
            loop: true
        });
    }

    advance() {
        if (this.isTyping) {
            // 현재 타이핑 중이면 즉시 전체 텍스트 표시
            this.isTyping = false;
            this.typeEvent.remove();
            this.dialogueText.setText(this.fullText);
        } else {
            // 타이핑이 끝난 상태면 다음 대사로 이동
            this.currentLineIndex++;
            this.showLine();
        }
    }

    close() {
        this.isShowing = false;
        this.bg.setVisible(false);
        this.portraitBg.setVisible(false);
        this.portraitText.setVisible(false);
        this.portraitSprite.setVisible(false);
        this.nameText.setVisible(false);
        this.dialogueText.setVisible(false);
        
        if (this.onComplete) {
            this.onComplete();
        }
    }
}