import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { MatchSystem } from '../systems/MatchSystem';
import { PITCH_TYPES, PITCH_LIST } from '../constants/PitchTypes';

export class MatchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MatchScene' });
    }

    create() {
        // 🌟 시점 전환 시 일괄적으로 투명도를 조절할 UI 요소들을 담는 배열
        this.uiElements = [];

        // CreationScene에서 저장한 플레이어 데이터를 가져옵니다. (없으면 기본값)
        this.playerData = this.registry.get('playerData') || {
            name: '테스트선수',
            role: 'batter',
            stats: { power: 40, contact: 40, velocity: 40, stamina: 40, speed: 40, fielding: 40, control: 40, movement: 40 }
        };

        // 📊 개인 기록 통계 초기화
        this.personalStats = {
            atBats: 0,       // 타수
            hits: 0,         // 안타
            homeRuns: 0,     // 홈런
            rbi: 0,          // 타점
            strikeOuts: 0,   // 삼진 (타자 기준: 삼진 당한 횟수 / 투수 기준: 삼진 잡은 횟수)
            walks: 0,        // 볼넷
            pitchCount: 0,   // 투구 수 (투수 전용)
            hitsAllowed: 0,  // 피안타 (투수 전용)
            runsAllowed: 0   // 실점 (투수 전용)
        };

        // ⚾ 포지션 및 보직별 초기 게임 상태(State) 설정
        this.gameState = {
            inning: 9,
            isBottom: true,
            scorePlayer: 0,
            scoreAI: 0,
            balls: 0,
            strikes: 0,
            outs: 0,
            bases: [false, false, false] // 1루, 2루, 3루 주자 여부
        };

        if (this.playerData.role === 'batter') {
            this.gameState.inning = 1;
            this.gameState.isBottom = false; // 1회 초 상대팀 공격부터 시작
            this.myBattingOrder = Phaser.Math.Between(2, 5); // 3번 ~ 6번 타자 중 무작위 배정
        } else {
            // 투수는 보직에 따라 다른 상황 부여
            const pos = this.playerData.position;
            if (pos === '선발 투수') {
                this.gameState.inning = 1; this.gameState.isBottom = false; // 1회 초
                this.gameState.scorePlayer = 0; this.gameState.scoreAI = 0;
            } else if (pos === '중간 계투') {
                this.gameState.inning = 7; this.gameState.isBottom = false; // 7회 초
                this.gameState.scorePlayer = 3; this.gameState.scoreAI = 3;
                this.gameState.bases = [true, true, false]; // 1, 2루 위기
            } else { // 마무리 투수
                this.gameState.inning = 9; this.gameState.isBottom = false; // 9회 초
                this.gameState.scorePlayer = 3; this.gameState.scoreAI = 2;
            }
        }

        this.playerBattingIndex = 0; // 플레이어 팀 현재 타순 (1번 타자부터)
        this.aiBattingIndex = 0; // 상대 팀 현재 타순

        // 🤖 AI 선수 스탯 무작위 생성 (초기)
        // 세이브 데이터 오류를 방지하기 위해 || '상대팀' 안전장치 추가
        this.opponentTeam = (this.playerData.schedule ? this.playerData.schedule[this.playerData.currentMatchIndex || 0] : '상대팀') || '상대팀';
        this.aiData = this.generateAIStats(this.gameState.inning);

        // 게임 종료 여부 플래그
        this.isGameOver = false;

        const roleText = this.playerData.position || (this.playerData.role === 'batter' ? '타자' : '투수');
        this.roleTextObj = this.add.text(1260, 650, `[ ${this.playerData.name} - ${roleText} ]`, { fontSize: '14px', fill: '#ccc', fontStyle: 'bold', backgroundColor: '#00000088', padding: { x: 10, y: 5 } }).setOrigin(1, 0.5);
        this.uiElements.push(this.roleTextObj);

        // 🤖 AI 스탯 텍스트 UI 생성 (우측 상단 미니맵 아래로 이동)
        this.aiStatText = this.add.text(1260, 250, '', { fontSize: '14px', fill: '#ffcccc', fontStyle: 'bold', backgroundColor: '#00000088', padding: { x: 10, y: 4 } }).setOrigin(1, 0.5).setDepth(20);
        this.uiElements.push(this.aiStatText);
        this.updateAIStatUI();

        // 🌟 현대적인 스트라이크 존 시각화 (반투명 영역 및 뚜렷한 경계선)
        this.strikeZone = this.add.rectangle(640, 450, 100, 150, 0x00aaff, 0.15).setStrokeStyle(3, 0xffffff, 0.8);
        this.uiElements.push(this.strikeZone); // UI 엘리먼트에 추가하여 페이드 인/아웃 동기화
        
        // 투수 마운드 및 홈 플레이트 좌표 정의
        this.moundPosition = { x: 640, y: 250 };
        this.homePlatePosition = { x: 640, y: 500 };

        // 배경 및 캐릭터 이미지 배치 (가장 뒤에 렌더링되도록 Z-depth 설정)
        this.stadiumBg = this.add.image(640, 360, 'stadium').setDepth(-10).setTint(0xbbbbbb);
        this.pitcherSprite = this.add.image(this.moundPosition.x, this.moundPosition.y, 'pitcher').setOrigin(0.5, 1).setDepth(-5).setScale(0.7);
        this.batterSprite = this.add.image(520, 650, 'batter').setOrigin(0.5, 1).setDepth(5).setScale(1.8);

        // 투수 & 타자 대기(Idle) 애니메이션 (숨쉬는 효과)
        this.tweens.add({
            targets: this.pitcherSprite,
            scaleY: 0.75, // base 0.7
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.tweens.add({
            targets: this.batterSprite,
            scaleY: 1.85, // base 1.8
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 500 // 투수와 숨쉬는 타이밍을 살짝 다르게 (엇박자)
        });

        // 🏃 탑다운 뷰(수비 시점)에서만 나타날 수비수(야수) 7명 배치 (확장된 구장 스케일에 맞게 조정)
        this.fielders = [];
        const fielderCoords = [
            { x: 770, y: 340, role: '1B', name: '1루수' },
            { x: 690, y: 240, role: '2B', name: '2루수' },
            { x: 510, y: 340, role: '3B', name: '3루수' },
            { x: 590, y: 240, role: 'SS', name: '유격수' },
            { x: 440, y: 80,  role: 'LF', name: '좌익수' },
            { x: 640, y: 20,  role: 'CF', name: '중견수' },
            { x: 840, y: 80,  role: 'RF', name: '우익수' }
        ];
        fielderCoords.forEach(coord => {
            const fielder = this.add.sprite(coord.x, coord.y, 'pitcher').setScale(0.5).setAlpha(0).setDepth(4);
            fielder.originalX = coord.x;
            fielder.originalY = coord.y;
            fielder.role = coord.role;
            fielder.roleName = coord.name;
            this.fielders.push(fielder);
        });

        // � 초기 시점(백뷰) 설정
        this.currentView = null;
        this.switchView('BACK', true);

        // 전광판 UI 생성
        this.createScoreboard();

        // 야구공 객체 생성
        this.ball = new Ball(this, this.moundPosition.x, this.moundPosition.y, 'ball');
        this.ball.setVisible(false);

        // 판정 결과 텍스트 (화면 중앙 강렬한 메시지)
        this.resultText = this.add.text(640, 320, '', { 
            fontSize: '36px', 
            fontStyle: 'bold', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
        }).setOrigin(0.5).setDepth(100);

        // 포지션에 따른 모드 초기화
        if (this.playerData.role === 'batter') {
            this.setupBatterMode();
        } else {
            this.setupPitcherMode();
        }

        // 마을로 돌아가기 버튼 (상단 우측으로 이동)
        this.add.text(1260, 20, '🚪 마을로', { fontSize: '18px', fill: '#aaa', backgroundColor: '#333333', padding: { x: 8, y: 4 } }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            this.showForfeitConfirm();
        });

        // 🎵 음소거(Mute) 토글 버튼 (상단 우측)
        const soundBtn = this.add.text(1170, 20, this.sound.mute ? '🔇' : '🔊', { fontSize: '28px' })
            .setOrigin(1, 0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(3000)
            .on('pointerdown', () => {
                this.sound.mute = !this.sound.mute;
                soundBtn.setText(this.sound.mute ? '🔇' : '🔊');
            });
    }

    // 🌟 게임빌 스타일의 다이내믹 시점 전환 함수
    switchView(viewType, instant = false) {
        if (this.currentView === viewType) return; // 현재 시점과 같으면 무시
        this.currentView = viewType;

        const duration = instant ? 0 : 300; // 카메라 컷 전환처럼 짧게 설정
        
        if (viewType === 'BACK') {
            // 🌟 5. 포스트 프로세싱 (Vignette) - 투수와 타자에게 집중되는 효과
            if (this.cameras.main.postFX) {
                if (!this.vignetteFX) {
                    this.vignetteFX = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.85, 0.4);
                } else {
                    this.vignetteFX.active = true;
                }
            }

            // 카메라 트래킹 해제 및 바운드 초기화
            this.cameras.main.stopFollow();
            this.cameras.main.removeBounds(); // 백뷰에서는 바운드 제거
            this.cameras.main.setZoom(1);
            this.cameras.main.centerOn(640, 360);

            // 백뷰: 타자와 투수에게 줌인된 시점 (홈 플레이트가 화면 하단으로 내려옴)
            this.moundPosition = { x: 640, y: 300 };
            this.homePlatePosition = { x: 640, y: 650 };
            
            // 🌟 텍스처를 백스톱(뒤쪽) 시점으로 즉시 교체
            this.stadiumBg.setTexture('stadium_backstop').setPosition(640, 360).setScale(1);

            if (instant) {
                this.pitcherSprite.setPosition(this.moundPosition.x, this.moundPosition.y).setAlpha(1).setScale(0.7);
                this.batterSprite.setPosition(this.homePlatePosition.x - 120, this.homePlatePosition.y + 20).setAlpha(1).setScale(1.8);
                this.strikeZone.setPosition(640, 520).setAlpha(1);
                if (this.fielders) this.fielders.forEach(f => f.setAlpha(0));
                const activeUIs = this.uiElements.filter(ui => ui && ui.active);
                if (activeUIs.length > 0) activeUIs.forEach(ui => ui.setAlpha(1));
            } else {
                this.pitcherSprite.setPosition(this.moundPosition.x, this.moundPosition.y).setScale(0.7);
                this.batterSprite.setPosition(this.homePlatePosition.x - 120, this.homePlatePosition.y + 20).setScale(1.8);
                this.strikeZone.setPosition(640, 520);
                this.tweens.add({ targets: [this.pitcherSprite, this.batterSprite, this.strikeZone], alpha: 1, duration: duration });
                if (this.fielders) this.tweens.add({ targets: this.fielders, alpha: 0, duration: duration });
                const activeUIs = this.uiElements.filter(ui => ui && ui.active);
                if (activeUIs.length > 0) this.tweens.add({ targets: activeUIs, alpha: 1, duration: duration });
            }
        } else if (viewType === 'TOP_DOWN') {
            // 🌟 5. 포스트 프로세싱 (Vignette) 해제
            if (this.vignetteFX) this.vignetteFX.active = false;

            // 🌟 2. 다이내믹 카메라 (줌 & 트래킹) - 타구 발생 시 공을 부드럽게 쫓아감
            this.cameras.main.setBackgroundColor('#2e7d32'); // 카메라가 맵 밖을 비춰도 잔디처럼 보이게 처리
            // 🌟 1600x1600 메가 텍스처(중심 400,200)의 영역(-400, -600 ~ 1200, 1000) 밖으로 카메라가 나가지 않도록 제한!
            this.cameras.main.setBounds(-400, -600, 2080, 1920);
            if (this.ball) {
                this.cameras.main.startFollow(this.ball, true, 0.08, 0.08);
                this.cameras.main.setZoom(1.2); // 줌인 수치를 1.6에서 1.2로 완화하여 가림 현상 방지
            }

            // 쿼터/탑다운 뷰: 경기장 전체가 보이는 시점 (거대한 투수/타자는 시야에서 숨김)
            this.moundPosition = { x: 640, y: 280 }; // 새로 그려진 다이아몬드 정중앙 흙에 맞춤
            this.homePlatePosition = { x: 640, y: 400 };

            // 🌟 1600x1600 메가 텍스처를 좌표계에 맞게 배치 (TextureCenter(800,800) -> World(400,200) 에 둬야 HomePlate가 400,400에 일치함)
            this.stadiumBg.setTexture('stadium').setPosition(640, 200).setScale(1);

            if (instant) {
                this.pitcherSprite.setAlpha(0);
                this.batterSprite.setAlpha(0);
                this.strikeZone.setAlpha(0);
                if (this.fielders) this.fielders.forEach(f => f.setAlpha(1));
                const activeUIs = this.uiElements.filter(ui => ui && ui.active);
                if (activeUIs.length > 0) activeUIs.forEach(ui => ui.setAlpha(0)); // 완전히 숨김
            } else {
                this.tweens.add({ targets: [this.pitcherSprite, this.batterSprite, this.strikeZone], alpha: 0, duration: duration });
                if (this.fielders) this.tweens.add({ targets: this.fielders, alpha: 1, duration: duration });
                const activeUIs = this.uiElements.filter(ui => ui && ui.active);
                if (activeUIs.length > 0) this.tweens.add({ targets: activeUIs, alpha: 0, duration: duration });
            }
        }
    }

    // 🔄 타자/투수 모드용 게임 루프 (시점 및 상황 분기)
    startGameLoop() {
        if (this.isGameOver) return;
        
        if (this.playerData.role === 'batter') {
            if (this.gameState.isBottom) {
                // 플레이어 팀 공격 차례
                if (this.playerBattingIndex === this.myBattingOrder) {
                    this.statusText.setText(`[내 타석] ${this.myBattingOrder + 1}번 타자, 타석에 들어섰습니다!`);
                    this.switchView('BACK');
                    this.startNextPitch();
                } else {
                    this.statusText.setText(`[우리팀 공격] ${this.playerBattingIndex + 1}번 타자 타석 시뮬레이션 중...`);
                    this.switchView('TOP_DOWN');
                    this.time.delayedCall(1000, () => this.simulateAtBat(true));
                }
            } else {
                // 상대팀 공격 차례 (수비)
                this.statusText.setText(`[상대팀 공격] 수비 시뮬레이션 중...`);
                this.switchView('TOP_DOWN');
                this.time.delayedCall(1000, () => this.simulateAtBat(false));
            }
        } else if (this.playerData.role === 'pitcher') {
            if (!this.gameState.isBottom) {
                // 플레이어 팀 수비 차례 (투구)
                this.statusText.setText(`[수비] ${this.gameState.inning}회 초, 마운드에 올랐습니다!`);
                this.switchView('BACK');
                this.isPitcherWaiting = false;
            } else {
                // 플레이어 팀 공격 차례 (시뮬레이션)
                this.statusText.setText(`[우리팀 공격] ${this.gameState.inning}회 말 공격 시뮬레이션 중...`);
                this.switchView('TOP_DOWN');
                this.time.delayedCall(1000, () => this.simulateAtBat(true));
            }
        }
    }

    setupBatterMode() {
        const pos = this.playerData.position || '타자';
        const batterMissionText = `[${pos}] 당신은 ${this.myBattingOrder + 1}번 타자입니다! 당신의 타석을 기다리세요.`;
        
        // 시스템 메시지 배경 패널 (가독성 향상)
        this.batterMsgBg = this.add.rectangle(640, 670, 1280, 80, 0x000000, 0.6).setDepth(49);
        this.uiElements.push(this.batterMsgBg);

        this.batterMissionUI = this.add.text(640, 650, batterMissionText, { 
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5).setDepth(50);
        this.uiElements.push(this.batterMissionUI);
        
        this.statusText = this.add.text(640, 690, '경기가 곧 시작됩니다...', { 
            fontSize: '16px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5).setDepth(50);

        this.isPitching = false;
        this.pitchStartTime = 0;
        this.pitchDuration = 1500; // 기본값, 투구 시마다 변경됨

        // 시뮬레이션/타격 루프 시작
        this.startGameLoop();

        // 타자 스윙 이벤트 (화면 클릭 시)
        this.input.on('pointerdown', (pointer) => {
            // UI 버튼 등을 누른 경우는 무시
            if (this.isGameOver) return; // 🔒 게임 종료 시 클릭 완벽 차단
            if (pointer.y < 200) return;
            if (!this.isPitching) return; // 공이 안 날아올 때 휘두르면 무시 (혹은 헛스윙 처리 가능)

            this.isPitching = false; // 공 판정 종료

            // 타자 스윙 애니메이션
            this.batterSprite.setTexture('batter_action');
            this.tweens.add({ 
                targets: this.batterSprite, angle: { from: 0, to: 60 }, duration: 100, yoyo: true,
                onComplete: () => this.batterSprite.setTexture('batter')
            });

            const swingTime = this.time.now;
            const expectedArrivalTime = this.pitchStartTime + this.pitchDuration; // 공이 홈 플레이트에 도달하는 완벽한 타이밍
            
            // 타이밍 오차 계산
            const timingDiff = swingTime - expectedArrivalTime;

            // AI 투수의 구위 보정값 (구속, 변화구에 따라 0.8~1.5 수준)
            const aiVelocity = this.aiData.stats.velocity;
            const aiMovement = this.aiData.stats.movement;
            const pitchQuality = Math.min(2.0, Math.max(0.5, (aiVelocity / 40) + (aiMovement * 0.005) - 0.2));

            // 판정 시스템을 통해 결과 도출
            const result = MatchSystem.calculateSwingResult(timingDiff, this.playerData.stats, pitchQuality);

            const proceedNext = () => {
                if (!this.scene.isActive()) return;
                this.time.delayedCall(2000, () => {
                    this.resultText.setText('');
                    if (this.plateAppearanceEnded && this.playerData.role === 'batter' && !this.isGameOver) {
                        this.plateAppearanceEnded = false;
                        this.playerBattingIndex = (this.playerBattingIndex + 1) % 9;
                        this.startGameLoop();
                    } else {
                        this.startNextPitch();
                    }
                });
            };

            if (result.result.includes('헛스윙')) {
                this.resultText.setText(result.result).setColor(result.color);
                this.updateCount(result.result);
                proceedNext();
            } else {
                // 수비 시점으로 넘어가며 타격 결과를 즉시 노출하지 않음 (긴장감 조성)
                this.playHitEffect(result, () => {
                    // 수비(송구/심판 판정 등)가 끝나는 순간 결과 텍스트와 스코어보드를 업데이트!
                    this.resultText.setText(result.result).setColor(result.color);
                    this.updateCount(result.result);
                    proceedNext();
                });
            }
        });
    }

    startNextPitch() {
        if (this.isGameOver) return; // 게임이 종료되었으면 더 이상 투구하지 않음

        this.switchView('BACK'); // 다음 투구를 위해 백뷰 시점으로 복구
        this.isPitching = false;
        this.ball.setVisible(false);
        this.ball.body.setVelocity(0, 0); // 타격으로 발생한 물리 속도 초기화
        this.statusText.setText('투수가 투구 타이밍을 재고 있습니다...');
        
        // 🌟 달려갔던 수비수(야수) 제자리 복구
        if (this.fielders) {
            this.fielders.forEach(f => f.setPosition(f.originalX, f.originalY).setAngle(0));
        }
        
        // 주자(Runner) 스프라이트 정리
        if (this.runnerSprites) {
            this.runnerSprites.forEach(r => r.destroy());
            this.runnerSprites = [];
        }
        
        // 3~5초 사이 랜덤 딜레이 후 투구
        const delay = Phaser.Math.Between(3000, 5000);
        
        this.time.delayedCall(delay, () => {
            // Scene이 변경되었거나 파괴되었으면 타이머 콜백 무시
            if (!this.scene.isActive() || this.isGameOver) return;

            // 투수가 무작위 구종 선택
            const randomPitch = Phaser.Utils.Array.GetRandom(PITCH_LIST);

            this.statusText.setText(`투구했습니다! (구종: ${randomPitch.name})`);
            this.isPitching = true;
            this.ball.setVisible(true);
            if (this.stealBtn) this.stealBtn.setVisible(false); // 투구 중 도루 버튼 숨김
            this.pitchStartTime = this.time.now;

            // 구속 50 기준 기본 도달 시간 계산 후 구종별 배율 적용
            // AI 기본 구속 스탯을 기준으로 ±3의 오차 부여
            this.currentAiSpeed = Phaser.Math.Between(this.aiData.stats.velocity - 3, this.aiData.stats.velocity + 3);
            const baseDuration = 2000 - (this.currentAiSpeed * 20);
            this.pitchDuration = baseDuration / randomPitch.speedRatio;

            // 스트라이크 존 근처로 무작위 '최종 탄착 지점' 설정 (볼도 나오게 설정)
            const finalDestX = Phaser.Math.Between(310, 490);
            const finalDestY = Phaser.Math.Between(350, 550);

            // Ball.js에 전달할 baseTarget 역산
            const baseTargetX = finalDestX - randomPitch.breakX;
            let baseTargetY = finalDestY - randomPitch.dropY;
            const finalGravity = 30;
            if (randomPitch.id === 'four_seam' || randomPitch.id === 'two_seam') {
                baseTargetY -= (finalGravity - finalGravity * 1.5);
            } else {
                baseTargetY -= finalGravity;
            }

            // AI 투수 투구 애니메이션
            this.pitcherSprite.setTexture('pitcher_action');
            this.tweens.add({ 
                targets: this.pitcherSprite, scaleY: 0.6, duration: 100, yoyo: true, // base 0.7이므로 0.6으로 축소
                onComplete: () => this.pitcherSprite.setTexture('pitcher')
            });

            // 마운드 먼지 파티클
            this.playParticleBurst(this.moundPosition.x, this.moundPosition.y - 20, 0xdddddd, 10, 150);

            // 사운드 재생 (파일이 정상 로드되었을 경우에만)
            if (this.cache.audio.exists('pitch_sound')) {
                this.sound.play('pitch_sound');
            }

            // 공 투구 (무작위 구속 적용)
            this.ball.pitch(this.moundPosition.x, this.moundPosition.y, baseTargetX, baseTargetY, this.currentAiSpeed, randomPitch, () => {
                // 공의 최종 도착 지점 확인
                const finalX = this.ball.x;
                const finalY = this.ball.y;
                const isStrikeZone = finalX >= 350 && finalX <= 450 && finalY >= 375 && finalY <= 525;

                // ⚾ 투구가 완료되었고 타자가 공을 맞추지 않았다면 미트(글러브) 연출
                this.playCatchEffect(finalX, finalY);

                // 공이 홈 플레이트에 도달할 때까지 스윙하지 않은 경우
                if (this.isPitching) {
                    this.isPitching = false;
                    if (isStrikeZone) {
                        this.resultText.setText('스트라이크 (루킹)').setColor('#ff0000');
                        this.updateCount('스트라이크');
                    } else {
                        this.resultText.setText('볼! (Ball)').setColor('#00ff00');
                        this.updateCount('볼!');
                    }
                    
                    // 2초 뒤 다음 투구 준비
                    this.time.delayedCall(2000, () => {
                        if (!this.scene.isActive()) return;
                        this.resultText.setText('');

                        if (this.plateAppearanceEnded && this.playerData.role === 'batter' && !this.isGameOver) {
                            this.plateAppearanceEnded = false;
                            this.playerBattingIndex = (this.playerBattingIndex + 1) % 9;
                            this.startGameLoop();
                        } else {
                            this.startNextPitch();
                        }
                    });
                }
            });
        });
    }

    setupPitcherMode() {
        let pitchMissionText = '구종을 선택하고, 던질 스트라이크 존 위치를 클릭하세요.';
        if (this.playerData.position === '선발 투수') pitchMissionText = '[선발 투수] 당신은 선발입니다. 최대한 많은 이닝을 소화하세요!';
        else if (this.playerData.position === '중간 계투') pitchMissionText = '[중간 계투] 7회 초 무사 1,2루 위기! 실점 없이 이닝을 종료하세요.';
        else pitchMissionText = '[마무리 투수] 9회 초 1점차 리드! 세 타자를 잡아내고 승리를 지키세요.';

        this.pitchMsgBg = this.add.rectangle(640, 670, 1280, 80, 0x000000, 0.6).setDepth(49);
        this.uiElements.push(this.pitchMsgBg);

        this.pitchMissionUI = this.add.text(640, 650, pitchMissionText, { 
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5).setDepth(50);
        this.uiElements.push(this.pitchMissionUI);

        this.statusText = this.add.text(640, 690, '경기가 곧 시작됩니다...', { 
            fontSize: '16px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5).setDepth(50);

        this.selectedPitch = null;
        this.isPitcherWaiting = true; // 타격 연출 중 투구 방지 플래그
        this.stamina = this.playerData.stats.stamina * 4; // 스태미나 40 기준 (160)
        this.maxStamina = this.stamina;
        this.pitchCount = 0; // 투구 수 초기화
        this.coachWarned = false; // 코치 대화 등장 여부

        // 🌟 투수 전용 대시보드 UI 패널 생성 (위로 살짝 더 올려서 겹침 완전 해소)
        this.pitcherDashboard = this.add.container(1000, 480).setDepth(30);
        this.uiElements.push(this.pitcherDashboard);

        // 플랫한 레트로 다크 테마 배경
        const dashBg = this.add.graphics();
        dashBg.fillStyle(0x1a1a1a, 0.95);
        dashBg.fillRoundedRect(0, 0, 250, 130, 8);
        dashBg.lineStyle(2, 0x888888, 1);
        dashBg.strokeRoundedRect(0, 0, 250, 130, 8);
        
        // 투구 클릭 방지용 투명 인터랙티브 영역
        const dashHitArea = this.add.rectangle(125, 65, 250, 130, 0xffffff, 0).setInteractive().on('pointerdown', (p, x, y, event) => event.stopPropagation());
        
        // 타이틀
        const titleText = this.add.text(125, 20, 'PITCHER DASHBOARD', { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // 스태미나 바 배경
        const stBg = this.add.graphics();
        stBg.fillStyle(0x333333, 1);
        stBg.fillRoundedRect(25, 45, 200, 20, 10);

        // 스태미나 수치 텍스트
        this.staminaValueText = this.add.text(125, 55, '', { fontSize: '13px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // 스태미나 바 채우기
        this.staminaBarFill = this.add.graphics();
        this.updateStaminaBar = () => {
            this.staminaBarFill.clear();
            const percent = Math.max(0, this.stamina / this.maxStamina);
            
            let color = 0x00ff00; 
            if (percent <= 0.3) color = 0xff4444;      
            else if (percent <= 0.6) color = 0xffff44; 
            
            this.staminaBarFill.fillStyle(color, 1);
            if (percent > 0) {
                this.staminaBarFill.fillRoundedRect(25, 45, 200 * percent, 20, 10);
            }
            
            this.staminaValueText.setText(`STAMINA: ${this.stamina} / ${this.maxStamina}`);
        };
        this.updateStaminaBar(); 

        // 투구 수 및 아웃 카운트 텍스트 배치
        this.pitchCountText = this.add.text(40, 90, '투구 수: 0', { fontSize: '18px', fill: '#ffffff', fontStyle: 'bold' });
        this.dashboardOutText = this.add.text(150, 90, `아웃: ${this.gameState.outs}`, { fontSize: '18px', fill: '#ffaaaa', fontStyle: 'bold' });

        this.pitcherDashboard.add([dashBg, dashHitArea, titleText, stBg, this.staminaBarFill, this.staminaValueText, this.pitchCountText, this.dashboardOutText]);

        // 모든 구종(12개)을 좌측에 수직으로 정렬
        const playerPitchIds = this.playerData.pitches || PITCH_LIST.map(p => p.id);
        const availablePitches = PITCH_LIST.filter(p => playerPitchIds.includes(p.id));

        const startX = 20; 
        const startY = 250; // 중앙에서 살짝 아래로 시작하여 세로로 나열

        availablePitches.forEach((pitch, index) => {
            const x = startX;
            const y = startY + (index * 45);

            // 플랫한 버튼 배경 (좌측 정렬 앵커 적용)
            const btnBg = this.add.rectangle(x, y, 100, 35, 0x333333, 0.9).setOrigin(0, 0.5).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
            const btnText = this.add.text(x + 50, y, pitch.name, { fontSize: '15px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            
            btnBg.on('pointerover', () => { btnBg.setFillStyle(0x555555); btnBg.setStrokeStyle(2, 0xffffff); });
            btnBg.on('pointerout', () => { btnBg.setFillStyle(0x333333); btnBg.setStrokeStyle(2, 0x666666); });

            btnBg.on('pointerdown', (pointer, localX, localY, event) => {
                this.selectedPitch = pitch;
                this.resultText.setText(`${pitch.name} 선택됨.`).setColor('#ffffff');
                event.stopPropagation();
            });
            this.uiElements.push(btnBg, btnText);
        });

        this.startGameLoop(); // 투수 시뮬레이션/투구 루프 시작

        // 🌟 궤적 미리보기를 위한 그래픽 객체 생성
        this.trajectoryPreviewGraphics = this.add.graphics();
        this.trajectoryPreviewGraphics.setDepth(20);
        this.uiElements.push(this.trajectoryPreviewGraphics);

        // 🌟 마우스 이동 시 구종별 예상 궤적 표시 (미리보기)
        this.input.on('pointermove', (pointer) => {
            if (this.trajectoryPreviewGraphics) this.trajectoryPreviewGraphics.clear();

            if (this.isGameOver) return;
            if (this.playerData.role === 'pitcher' && this.gameState.isBottom) return;
            if (pointer.y < 300 || pointer.y > 600) return;
            if (this.isPitcherWaiting || !this.selectedPitch) return;
            if (this.currentView !== 'BACK') return; // 백뷰에서만 표시

            const pitchData = this.selectedPitch;
            const startX = this.moundPosition.x;
            const startY = this.moundPosition.y;

            // 마우스 커서를 '최종 목표 지점(final target)'으로 간주합니다.
            const finalTargetX = pointer.x;
            const finalTargetY = pointer.y;

            // Ball.js의 물리 로직에 맞추기 위해, 내부적으로 사용할 base target 역산
            const baseTargetX = finalTargetX - pitchData.breakX;
            let baseTargetY = finalTargetY - pitchData.dropY;
            const finalGravity = 30;
            if (pitchData.id === 'four_seam' || pitchData.id === 'two_seam') {
                baseTargetY -= (finalGravity - finalGravity * 1.5);
            } else {
                baseTargetY -= finalGravity;
            }

            // 변화구 Ease 함수 가져오기
            let easeFunc = Phaser.Math.Easing.Linear;
            const easeName = pitchData.curveEase;
            if (easeName === 'Sine.easeIn') easeFunc = Phaser.Math.Easing.Sine.In;
            else if (easeName === 'Cubic.easeIn') easeFunc = Phaser.Math.Easing.Cubic.In;
            else if (easeName === 'Quad.easeIn') easeFunc = Phaser.Math.Easing.Quadratic.In;
            else if (easeName === 'Cubic.easeInOut') easeFunc = Phaser.Math.Easing.Cubic.InOut;
            else if (easeName === 'Expo.easeIn') easeFunc = Phaser.Math.Easing.Expo.In;

            // 궤적을 점(불투명한 원)들로 그리기
            for (let t = 0.05; t <= 1; t += 0.05) {
                let currentX = Phaser.Math.Linear(startX, baseTargetX, t);
                let currentY = Phaser.Math.Linear(startY, baseTargetY, t);

                const gravityDrop = (t * t) * 30;
                currentY += gravityDrop;

                const breakT = easeFunc(t);
                currentX += pitchData.breakX * breakT;

                let dropAmount = pitchData.dropY * breakT;
                if (pitchData.id === 'four_seam' || pitchData.id === 'two_seam') {
                    dropAmount -= gravityDrop * 1.5;
                }
                currentY += dropAmount;

                const radius = 2 + (t * 3);
                this.trajectoryPreviewGraphics.fillStyle(pitchData.color || 0xffffff, 0.4);
                this.trajectoryPreviewGraphics.fillCircle(currentX, currentY, radius);
            }

            // 제구력(Control) 기반 오차 범위 계산
            const control = this.playerData.stats.control || 40;
            const maxError = Math.max(0, 70 - control);

            // 최종 탄착 지점(마우스 커서)에 오차 범위 불투명 원 그리기
            this.trajectoryPreviewGraphics.fillStyle(0xff0000, 0.15);
            this.trajectoryPreviewGraphics.fillCircle(finalTargetX, finalTargetY, maxError);
            this.trajectoryPreviewGraphics.lineStyle(1, 0xffaa00, 0.5);
            this.trajectoryPreviewGraphics.strokeCircle(finalTargetX, finalTargetY, maxError);

            // 투구 시작점(에임)을 시각적으로 알려주는 크로스헤어 (Cyan)
            this.trajectoryPreviewGraphics.lineStyle(2, 0x00ffff, 0.5);
            this.trajectoryPreviewGraphics.beginPath();
            this.trajectoryPreviewGraphics.moveTo(baseTargetX - 8, baseTargetY);
            this.trajectoryPreviewGraphics.lineTo(baseTargetX + 8, baseTargetY);
            this.trajectoryPreviewGraphics.moveTo(baseTargetX, baseTargetY - 8);
            this.trajectoryPreviewGraphics.lineTo(baseTargetX, baseTargetY + 8);
            this.trajectoryPreviewGraphics.strokePath();
            
            // 마우스 커서 위치(최종 탄착 지점) 십자선 표시 (Red)
            this.trajectoryPreviewGraphics.lineStyle(2, 0xff0000, 0.8);
            this.trajectoryPreviewGraphics.beginPath();
            this.trajectoryPreviewGraphics.moveTo(finalTargetX - 10, finalTargetY);
            this.trajectoryPreviewGraphics.lineTo(finalTargetX + 10, finalTargetY);
            this.trajectoryPreviewGraphics.moveTo(finalTargetX, finalTargetY - 10);
            this.trajectoryPreviewGraphics.lineTo(finalTargetX, finalTargetY + 10);
            this.trajectoryPreviewGraphics.strokePath();
        });

        // 투수 투구 이벤트 (배경 클릭 시)
        this.input.on('pointerdown', (pointer) => {
            // UI 버튼이 있는 영역이나, 너무 위쪽(마운드 위)을 클릭한 경우는 투구하지 않음
            // 스트라이크 존 근처인 300~600 영역만 투구 허용
            if (this.isGameOver) return; // 🔒 게임 종료 시 클릭 완벽 차단
            if (this.playerData.role === 'pitcher' && this.gameState.isBottom) return; // 🚨 투구 차례가 아닐 때 차단
            if (pointer.y < 300 || pointer.y > 600) return;
            
            // ⚾ 타격 연출(이펙트)이 진행 중일 때는 다음 투구를 막음
            if (this.isPitcherWaiting) return;

            if (!this.selectedPitch) {
                this.resultText.setText('먼저 하단에서 구종을 선택하세요!').setColor('#ffaa00');
                return;
            }

            // 코치 교체 제안 (선발 투수만, 스태미나 30% 이하일 때 최초 1회)
            if (this.playerData.position === '선발 투수' && (this.stamina - 5) <= this.maxStamina * 0.3 && !this.coachWarned) {
                this.coachWarned = true;
                this.showCoachDialog();
                return; // 투구는 중단되고, 다이얼로그 후 진행
            }

            if (this.stamina <= 0) {
                this.resultText.setText('스태미나가 완전히 고갈되었습니다! 강제 교체됩니다.').setColor('#ff0000');
                this.isPitcherWaiting = true;
                this.time.delayedCall(1500, () => this.finishPitching());
                return;
            }

            // 스태미나 소모 및 UI 업데이트
            this.stamina -= 5;
            this.pitchCount++;
            this.personalStats.pitchCount++;
            this.updateStaminaBar();
            this.pitchCountText.setText(`투구 수: ${this.pitchCount}`);
            this.resultText.setText('');
            this.ball.setVisible(true);
            this.ball.body.setVelocity(0, 0); // 이전 타격된 공의 물리 속도 초기화

            if (this.trajectoryPreviewGraphics) this.trajectoryPreviewGraphics.clear(); // 🌟 클릭 시 궤적 미리보기 즉시 지우기

            this.isPitcherWaiting = true; // 🔒 투구 시작 시 연속 클릭(광클) 방지 락 걸기

            // 투구 구속 계산: 기본 구속 * (현재 스태미나 / 최대 스태미나)
            // 스태미나가 떨어질수록 구속이 감소합니다.
            const baseSpeed = this.playerData.stats.velocity || 40;
            const speedModifier = Math.max(0.5, this.stamina / this.maxStamina); 
            const finalSpeed = baseSpeed * speedModifier;

            // 1. 제구(Control) 스탯에 따른 탄착군 오차 계산
            const control = this.playerData.stats.control || 40;
            const maxError = Math.max(0, 70 - control);
            const errorX = (Math.random() - 0.5) * 2 * maxError;
            const errorY = (Math.random() - 0.5) * 2 * maxError;

            // 마우스 클릭 지점이 최종 탄착 지점입니다. 오차를 더해줍니다.
            const finalDestX = Phaser.Math.Clamp(pointer.x + errorX, 300, 500);
            const finalDestY = Phaser.Math.Clamp(pointer.y + errorY, 320, 580);

            // Ball.js에 넘겨줄 base target 역산
            const baseTargetX = finalDestX - this.selectedPitch.breakX;
            let baseTargetY = finalDestY - this.selectedPitch.dropY;
            const finalGravity = 30;
            if (this.selectedPitch.id === 'four_seam' || this.selectedPitch.id === 'two_seam') {
                baseTargetY -= (finalGravity - finalGravity * 1.5);
            } else {
                baseTargetY -= finalGravity;
            }

            // 플레이어 투수 투구 애니메이션
            this.pitcherSprite.setTexture('pitcher_action');
            this.tweens.add({
                targets: this.pitcherSprite, scaleY: 0.6, duration: 100, yoyo: true,
                onComplete: () => this.pitcherSprite.setTexture('pitcher')
            });
            
            // 마운드 먼지 파티클
            this.playParticleBurst(this.moundPosition.x, this.moundPosition.y - 20, 0xdddddd, 10, 150);

            // 사운드 재생 (파일이 정상 로드되었을 경우에만)
            if (this.cache.audio.exists('pitch_sound')) {
                this.sound.play('pitch_sound');
            }

            this.ball.pitch(this.moundPosition.x, this.moundPosition.y, baseTargetX, baseTargetY, finalSpeed, this.selectedPitch, () => {
                this.selectedPitch = null; // 구종 선택 초기화
                
                // 공의 최종 도착 지점 확인
                const finalX = this.ball.x;
                const finalY = this.ball.y;

                // 2. 스트라이크 존 판정 (최종 도착 지점 기준)
                const isStrikeZone = finalX >= 350 && finalX <= 450 && finalY >= 375 && finalY <= 525;
                const movement = this.playerData.stats.movement || 40;

                // 3. 변화구(Movement) 스탯 및 구속에 따른 AI 타격 확률
                const aiContact = this.aiData.stats.contact || 40;
                const aiPower = this.aiData.stats.power || 40;

                // 타격 확률 (AI 콘택트에 비례, 플레이어 구위/변화에 반비례)
                let hitChance = 0.35 + (aiContact * 0.005) - ((finalSpeed - 40) * 0.005) - (movement * 0.005);
                hitChance = Math.max(0.05, Math.min(0.8, hitChance)); 

                if (!isStrikeZone) {
                    this.playCatchEffect(finalX, finalY); // ⚾ 볼 판정 시 미트 이펙트

                    // 볼일 경우: AI가 속아서 헛스윙할 확률 (AI 콘택트가 높으면 덜 속음)
                    const swingChance = Math.max(0.05, (movement * 0.015) - (aiContact * 0.005));
                    if (Math.random() < swingChance) {
                         this.batterSprite.setTexture('batter_action');
                         this.tweens.add({ targets: this.batterSprite, angle: { from: 0, to: 60 }, duration: 100, yoyo: true, onComplete: () => this.batterSprite.setTexture('batter') });
                         this.resultText.setText('스트라이크! (헛스윙)').setColor('#00ffff');
                         this.updateCount('스트라이크');
                    } else {
                         this.resultText.setText('볼! (Ball)').setColor('#00ff00');
                         this.updateCount('볼!');
                    }
                    // 락 해제 (다음 투구 준비)
                    this.time.delayedCall(1500, () => { 
                        this.checkPitcherNextTurn(); 
                    });
                    return;
                }

                const isHit = Math.random() < hitChance;
                
                if (isHit) {
                     this.batterSprite.setTexture('batter_action');
                     this.tweens.add({ targets: this.batterSprite, angle: { from: 0, to: 60 }, duration: 100, yoyo: true, onComplete: () => this.batterSprite.setTexture('batter') });
                     
                     // 타격 결과 세분화 (AI 파워 스탯 영향)
                     const rand = Math.random();
                     const hrChance = Math.min(0.2, 0.02 + (aiPower * 0.003)); // 파워 15면 약 6.5%
                     const tripleChance = hrChance + 0.05;
                     const doubleChance = tripleChance + 0.1;
                     const hitChanceRatio = doubleChance + 0.25;
                     const foulChance = hitChanceRatio + 0.3;

                     let hitResult = '';
                     if (rand < hrChance) hitResult = '홈런';
                     else if (rand < tripleChance) hitResult = '3루타';
                     else if (rand < doubleChance) hitResult = '2루타';
                     else if (rand < hitChanceRatio) hitResult = '안타';
                     else if (rand < foulChance) hitResult = '파울';
                     else hitResult = '땅볼';

                     // 타격 결과 텍스트 출력 생략 (결과 지연)
                     // 수비 애니메이션이 끝난 후 콜백으로 결과 업데이트
                     this.playHitEffect({ result: hitResult }, () => {
                         this.resultText.setText(`${this.opponentTeam} 타자: ${hitResult}!`).setColor('#ff00ff');
                         this.updateCount(hitResult);
                         this.time.delayedCall(2000, () => { 
                             this.checkPitcherNextTurn(); 
                         });
                     });
                } else {
                     this.playCatchEffect(finalX, finalY); // ⚾ 스트라이크/헛스윙 시 미트 이펙트
                     this.batterSprite.setTexture('batter_action');
                     this.tweens.add({ targets: this.batterSprite, angle: { from: 0, to: 60 }, duration: 100, yoyo: true, onComplete: () => this.batterSprite.setTexture('batter') });
                     this.resultText.setText('스트라이크! (헛스윙)').setColor('#00ffff');
                     this.updateCount('스트라이크');
                     
                     this.time.delayedCall(1500, () => { 
                         this.checkPitcherNextTurn(); 
                     });
                }
            });
        });
    }

    createScoreboard() {
        // 🌟 컴투스/MLB 스타일: 좌측 상단 콤팩트하고 입체적인 스코어보드
        this.scoreboardContainer = this.add.container(20, 20).setDepth(40);
        this.uiElements.push(this.scoreboardContainer);

        // 스코어보드 전체 배경 (그라데이션 및 라운드 처리)
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 0.95, 0.95, 0.85, 0.85);
        bg.fillRoundedRect(0, 0, 380, 60, 10);
        bg.lineStyle(2, 0xe94560, 0.8);
        bg.strokeRoundedRect(0, 0, 380, 60, 10);
        
        // 1. 이닝 텍스트 (안정적인 라운드 패딩)
        const inningBg = this.add.graphics();
        inningBg.fillStyle(0xe94560, 0.9);
        inningBg.fillRoundedRect(10, 10, 60, 40, 5);
        this.inningText = this.add.text(40, 30, '', { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        
        // 2. 점수 및 팀 이름 표시부 (이닝 텍스트와 겹치지 않도록 간격 조정)
        this.scoreText = this.add.text(170, 30, '', { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        
        // 3. 볼카운트 (B S O) - 세련된 LED 표시기 스타일
        const countStartX = 240;
        const startYOffset = 15;
        const bLabel = this.add.text(countStartX, startYOffset, 'B', { fontSize: '13px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
        const sLabel = this.add.text(countStartX, startYOffset + 15, 'S', { fontSize: '13px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
        const oLabel = this.add.text(countStartX, startYOffset + 30, 'O', { fontSize: '13px', fill: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
        
        // 동그라미 대신 빛나는 직사각형(LED 바) 사용
        const createLed = (x, y) => {
            const led = this.add.rectangle(x, y, 12, 6, 0x333333).setStrokeStyle(1, 0x000000);
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
        
        // 4. 베이스 다이아몬드 (우측 끝) - 투시도 적용된 3D 다이아몬드 느낌
        const baseX = 340;
        const baseY = 30;
        const baseGraphics = this.add.graphics();
        baseGraphics.lineStyle(2, 0x555555);
        baseGraphics.strokePoints([{x: baseX, y: baseY - 15}, {x: baseX + 15, y: baseY}, {x: baseX, y: baseY + 15}, {x: baseX - 15, y: baseY}, {x: baseX, y: baseY - 15}]);

        this.baseUI = [
            this.add.polygon(baseX + 15, baseY, [0,-7, 7,0, 0,7, -7,0], 0x444444).setStrokeStyle(1, 0x000000), // 1루
            this.add.polygon(baseX, baseY - 15, [0,-7, 7,0, 0,7, -7,0], 0x444444).setStrokeStyle(1, 0x000000), // 2루
            this.add.polygon(baseX - 15, baseY, [0,-7, 7,0, 0,7, -7,0], 0x444444).setStrokeStyle(1, 0x000000)  // 3루
        ];
        
        this.scoreboardContainer.add([
            bg, inningBg, this.inningText, this.scoreText,
            bLabel, sLabel, oLabel,
            ...this.ballLights, ...this.strikeLights, ...this.outLights,
            baseGraphics, ...this.baseUI
        ]);
        
        // 도루 시도 버튼 (스코어보드 하단에 세련된 버튼으로)
        this.stealBtn = this.add.text(20, 85, '🏃 도루 시도 (STEAL)', { fontSize: '14px', fill: '#ffffff', backgroundColor: '#e94560', padding: { x: 10, y: 6 }, fontStyle: 'bold', stroke: '#000', strokeThickness: 2 })
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setVisible(false)
            .setDepth(40)
            .on('pointerdown', (pointer, localX, localY, event) => {
                event.stopPropagation();
                this.attemptSteal();
            });
        this.uiElements.push(this.stealBtn);

        this.refreshScoreboardUI();

        // 🌟 수비 위치 미니맵 UI 추가
        this.drawDefensivePosition();
    }

    drawDefensivePosition() {
        const startX = 1180;
        const startY = 80; // 우측 상단 미니맵
        
        // 미니맵 컨테이너 생성
        this.miniMapContainer = this.add.container(startX, startY).setDepth(30);
        this.uiElements.push(this.miniMapContainer);

        // 반투명한 둥근 배경
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(-60, -70, 120, 140, 10);
        bg.lineStyle(2, 0x888888, 0.8);
        bg.strokeRoundedRect(-60, -70, 120, 140, 10);
        
        // 미니맵 타이틀
        const title = this.add.text(0, -55, '- DEFENSE -', { fontSize: '11px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0.5);
        
        // ⚾ 다이아몬드 (내야 잔디)
        const diamond = this.add.polygon(0, 5, [0,-25, 25,0, 0,25, -25,0], 0x386641).setStrokeStyle(2, 0xaaaaaa);
        
        // 1,2,3루 및 홈 베이스
        const base1 = this.add.rectangle(25, 5, 5, 5, 0xffffff).setRotation(Math.PI / 4); // 1루
        const base2 = this.add.rectangle(0, -20, 5, 5, 0xffffff).setRotation(Math.PI / 4); // 2루
        const base3 = this.add.rectangle(-25, 5, 5, 5, 0xffffff).setRotation(Math.PI / 4); // 3루
        const home = this.add.polygon(0, 30, [0,-4, 4,0, 0,4, -4,0], 0xffffff); // 홈

        const pos = this.playerData.position;
        // 각 포지션별 맵 내 좌표 매핑
        const posMap = {
            '포수': { x: 0, y: 40 }, '1루수': { x: 30, y: 10 }, '2루수': { x: 15, y: -15 },
            '3루수': { x: -30, y: 10 }, '유격수': { x: -15, y: -15 }, '좌익수': { x: -40, y: -40 },
            '중견수': { x: 0, y: -50 }, '우익수': { x: 40, y: -40 },
            '선발 투수': { x: 0, y: 5 }, '중간 계투': { x: 0, y: 5 }, '마무리 투수': { x: 0, y: 5 }
        };
        
        const p = posMap[pos] || { x: 0, y: 5 };
        
        // 플레이어 위치 깜빡이는 점 애니메이션
        const playerDot = this.add.circle(p.x, p.y, 6, 0x00ffff).setStrokeStyle(2, 0xffffff);
        this.tweens.add({ targets: playerDot, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
        
        // 포지션 텍스트 라벨
        const posText = this.add.text(p.x, p.y + 12, pos, { fontSize: '10px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        
        this.miniMapContainer.add([bg, title, diamond, base1, base2, base3, home, playerDot, posText]);
    }

    refreshScoreboardUI() {
        const halfStr = this.gameState.isBottom ? '▼' : '▲';
        this.inningText.setText(`${this.gameState.inning}${halfStr}`);
        
        const teamNameText = this.playerData.team ? this.playerData.team.split(' ')[0] : 'PLAYER';
        const opponentNameText = this.opponentTeam.split(' ')[0];
        
        // 스코어 포맷 맞추기 (가운데 정렬 느낌)
        this.scoreText.setText(`${teamNameText}  ${this.gameState.scorePlayer} - ${this.gameState.scoreAI}  ${opponentNameText}`);
        
        // LED 불빛 업데이트 (밝은 불빛 / 꺼진 불빛 색상)
        this.ballLights.forEach((light, i) => light.setFillStyle(i < this.gameState.balls ? 0x00ff00 : 0x333333));
        this.strikeLights.forEach((light, i) => light.setFillStyle(i < this.gameState.strikes ? 0xffff00 : 0x333333));
        this.outLights.forEach((light, i) => light.setFillStyle(i < this.gameState.outs ? 0xff4444 : 0x333333));
        
        // 베이스 상황 업데이트 (노란색: 불 들어옴 / 어두운 회색: 비어있음)
        this.baseUI[0].setFillStyle(this.gameState.bases[0] ? 0xffff00 : 0x444444);
        this.baseUI[1].setFillStyle(this.gameState.bases[1] ? 0xffff00 : 0x444444);
        this.baseUI[2].setFillStyle(this.gameState.bases[2] ? 0xffff00 : 0x444444);
        
        // 도루 버튼 표시 로직 (플레이어 타자, 진루 가능한 주자 존재 시)
        const isPlayerBatting = this.playerData.role === 'batter';
        const canSteal = isPlayerBatting && !this.isPitching && (
            (this.gameState.bases[0] && !this.gameState.bases[1]) ||
            (this.gameState.bases[1] && !this.gameState.bases[2])
        );
        if (this.stealBtn) this.stealBtn.setVisible(canSteal);

        // 🌟 투수 대시보드의 아웃 카운트도 함께 동기화
        if (this.dashboardOutText && this.dashboardOutText.active) {
            this.dashboardOutText.setText(`아웃: ${this.gameState.outs}`);
        }
    }

    // 타격 결과에 따른 아웃 카운트/점수 갱신 로직
    updateCount(resultStr) {
        const isPlayerBatting = this.playerData.role === 'batter';
        let isPlateAppearanceEnded = false;

        if (resultStr.includes('스트라이크') || resultStr.includes('헛스윙')) {
            this.gameState.strikes++;
            if (this.gameState.strikes >= 3) {
                this.gameState.outs++;
                this.gameState.strikes = 0;
                this.gameState.balls = 0;
                this.resultText.setText(this.resultText.text + '\n(삼진 아웃!)').setColor('#ff0000');
                this.playStrikeOutEffect();
                isPlateAppearanceEnded = true;
                // 📊 개인 기록: 삼진
                this.personalStats.strikeOuts++;
                if (this.playerData.role === 'batter') this.personalStats.atBats++;
            }
        } else if (resultStr.includes('볼!')) {
            this.gameState.balls++;
            if (this.gameState.balls >= 4) {
                this.gameState.balls = 0;
                this.gameState.strikes = 0;
                this.resultText.setText(this.resultText.text + '\n(볼넷 출루!)').setColor('#00ff00');
                this.personalStats.walks++;
                this.handleWalk();
                return;
            }
        } else if (resultStr.includes('파울')) {
            if (this.gameState.strikes < 2) {
                this.gameState.strikes++; // 2스트라이크 이후에는 파울을 쳐도 카운트가 오르지 않음
            }
        } else if (resultStr.includes('땅볼')) {
            this.gameState.outs++;
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            this.resultText.setText(this.resultText.text + '\n(땅볼 아웃!)').setColor('#ffaa00');
            isPlateAppearanceEnded = true;
            if (this.playerData.role === 'batter') this.personalStats.atBats++;
        } else if (resultStr.includes('홈런')) {
            // 현재 나가있는 주자 수 + 타자 본인 = 총 득점
            let runs = 1 + this.gameState.bases.filter(b => b).length;
            if (isPlayerBatting) this.gameState.scorePlayer += runs;
            else this.gameState.scoreAI += runs;
            
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            this.gameState.bases = [false, false, false]; // 베이스 비우기
            this.resultText.setText(this.resultText.text + `\n(${runs}점 홈런!)`);
            isPlateAppearanceEnded = true;
            // 📊 개인 기록: 홈런
            if (this.playerData.role === 'batter') {
                this.personalStats.atBats++;
                this.personalStats.hits++;
                this.personalStats.homeRuns++;
                this.personalStats.rbi += runs;
            } else {
                this.personalStats.hitsAllowed++;
                this.personalStats.runsAllowed += runs;
            }
        } else if (resultStr.includes('3루타') || resultStr.includes('Triple')) {
            // ⚠️ 3루타/2루타를 안타보다 먼저 매칭하여 오판 방지
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            
            let runs = 0;
            if (this.gameState.bases[2]) runs++;
            if (this.gameState.bases[1]) runs++;
            if (this.gameState.bases[0]) runs++;
            this.gameState.bases = [false, false, true]; // 타자 -> 3루에 안착

            if (runs > 0) {
                if (isPlayerBatting) this.gameState.scorePlayer += runs;
                else this.gameState.scoreAI += runs;
            }
            this.resultText.setText(this.resultText.text + `\n(3루타!${runs > 0 ? ` ${runs}타점!` : ''})`);
            isPlateAppearanceEnded = true;
            // 📊 개인 기록: 3루타
            if (this.playerData.role === 'batter') {
                this.personalStats.atBats++;
                this.personalStats.hits++;
                this.personalStats.rbi += runs;
            } else {
                this.personalStats.hitsAllowed++;
                if (runs > 0) this.personalStats.runsAllowed += runs;
            }
        } else if (resultStr.includes('2루타') || resultStr.includes('Double')) {
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            
            let runs = 0;
            if (this.gameState.bases[2]) runs++;
            if (this.gameState.bases[1]) runs++;
            this.gameState.bases[2] = this.gameState.bases[0]; // 1루 -> 3루
            this.gameState.bases[1] = true; // 타자 -> 2루
            this.gameState.bases[0] = false;

            if (runs > 0) {
                if (isPlayerBatting) this.gameState.scorePlayer += runs;
                else this.gameState.scoreAI += runs;
            }
            this.resultText.setText(this.resultText.text + `\n(2루타!${runs > 0 ? ` ${runs}타점!` : ''})`);
            isPlateAppearanceEnded = true;
            // 📊 개인 기록: 2루타
            if (this.playerData.role === 'batter') {
                this.personalStats.atBats++;
                this.personalStats.hits++;
                this.personalStats.rbi += runs;
            } else {
                this.personalStats.hitsAllowed++;
                if (runs > 0) this.personalStats.runsAllowed += runs;
            }
        } else if (resultStr.includes('안타') || resultStr.includes('Hit')) {
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            
            // 1루타 처리 (주자 1칸씩 이동)
            let runs = 0;
            if (this.gameState.bases[2]) runs++; // 3루 주자 홈인 (득점)
            this.gameState.bases[2] = this.gameState.bases[1]; // 2루 주자 -> 3루 진루
            this.gameState.bases[1] = this.gameState.bases[0]; // 1루 주자 -> 2루 진루
            this.gameState.bases[0] = true; // 타자 -> 1루 출루

            if (runs > 0) {
                if (isPlayerBatting) this.gameState.scorePlayer += runs;
                else this.gameState.scoreAI += runs;
                this.resultText.setText(this.resultText.text + `\n(${runs}타점 적시타!)`);
            }
            isPlateAppearanceEnded = true;
            // 📊 개인 기록: 안타
            if (this.playerData.role === 'batter') {
                this.personalStats.atBats++;
                this.personalStats.hits++;
                this.personalStats.rbi += runs;
            } else {
                this.personalStats.hitsAllowed++;
                if (runs > 0) this.personalStats.runsAllowed += runs;
            }
        }

        // 9회 말 끝내기 승/패 발생 여부 확인
        if (this.checkWalkOff()) {
            this.isGameOver = true;
            this.refreshScoreboardUI();
            this.time.delayedCall(1500, () => this.showMatchResult());
            return; // 3아웃 교대 등 진행 안 함
        }

        this.checkOutsAndSwap();
        this.refreshScoreboardUI();
        
        this.plateAppearanceEnded = isPlateAppearanceEnded; // 타석 종료 여부 저장

        // 타석이 끝났고 플레이어가 투수라면 새로운 AI 타자 등장
        if (isPlateAppearanceEnded && this.playerData.role === 'pitcher' && !this.isGameOver) {
            this.aiData = this.generateAIStats(this.gameState.inning);
            this.updateAIStatUI();
        }
    }

    handleWalk() {
        const isPlayerBatting = this.playerData.role === 'batter';
        let runs = 0;
        
        if (this.gameState.bases[0]) {
            if (this.gameState.bases[1]) {
                if (this.gameState.bases[2]) {
                    runs++; // 밀어내기 득점
                }
                this.gameState.bases[2] = true;
            }
            this.gameState.bases[1] = true;
        }
        this.gameState.bases[0] = true;

        if (runs > 0) {
            if (isPlayerBatting) this.gameState.scorePlayer += runs;
            else this.gameState.scoreAI += runs;
            this.resultText.setText(this.resultText.text + `\n(밀어내기 ${runs}득점!)`);
        }

        // 볼넷(Walk) 화려한 연출
        this.cameras.main.flash(300, 0, 255, 0); // 초록색 섬광
        const walkText = this.add.text(640, 360, 'WALK!', { 
            fontSize: '80px', fill: '#00ff00', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(100);

        this.tweens.add({
            targets: walkText,
            alpha: 1,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            hold: 1500,
            ease: 'Back.easeOut',
            onComplete: () => walkText.destroy()
        });

        // 볼넷 처리 후 게임 종료 여부 확인 및 공수 교대 스킵
        if (this.checkWalkOff()) {
            this.isGameOver = true;
            this.refreshScoreboardUI();
            this.time.delayedCall(1500, () => this.showMatchResult());
            return;
        }

        this.plateAppearanceEnded = true; // 볼넷 시 타석 완전 종료

        this.checkOutsAndSwap();
        this.refreshScoreboardUI();

        // 볼넷으로 타석이 끝났으므로 새로운 AI 타자 등장
        if (this.playerData.role === 'pitcher' && !this.isGameOver) {
            this.aiData = this.generateAIStats(this.gameState.inning);
            this.updateAIStatUI();
        }
    }

    checkWalkOff() {
        // 9회 말 공격팀이 점수를 역전하는 순간 즉시 끝내기로 처리합니다.
        if (this.gameState.inning >= 9 && this.gameState.isBottom) {
            const isBatter = this.playerData.role === 'batter';
            if (isBatter && this.gameState.scorePlayer > this.gameState.scoreAI) return true; // 플레이어의 끝내기 승리
            if (!isBatter && this.gameState.scoreAI > this.gameState.scorePlayer) return true; // AI의 끝내기 역전승 (플레이어 패배)
        }
        return false;
    }

    checkOutsAndSwap() {
        if (this.gameState.outs >= 3) {
            // 투수 모드일 경우 보직에 따라 로직 다름
            if (this.playerData.role === 'pitcher') {
                const pos = this.playerData.position;
                if (pos === '중간 계투' || pos === '마무리 투수') {
                    // 구원 투수는 1이닝(3아웃)만 막으면 미션 성공으로 간주
                    this.isGameOver = true;
                    this.time.delayedCall(1500, () => this.showMatchResult());
                    return;
                }
            }

            // 9회 말 이후 3아웃: 동점이면 연장전 진입, 아니면 경기 종료
            if (this.gameState.inning >= 9 && this.gameState.isBottom) {
                if (this.gameState.scorePlayer !== this.gameState.scoreAI) {
                    // 점수 차이가 나면 경기 종료
                    this.isGameOver = true;
                    this.time.delayedCall(1500, () => this.showMatchResult());
                    return;
                }
                // 동점이면 연장전 진입 (12회까지)
                if (this.gameState.inning >= 12) {
                    this.isGameOver = true;
                    this.time.delayedCall(1500, () => this.showMatchResult());
                    return;
                }
                // 연장전 안내 텍스트
                this.resultText.setText(this.resultText.text + '\n[ ⚾ 연장전 돌입! ]').setColor('#fca311');
            }

            this.gameState.outs = 0;
            this.gameState.strikes = 0;
            this.gameState.balls = 0;
            this.gameState.bases = [false, false, false]; // 이닝 종료 시 주자 초기화
            this.gameState.isBottom = !this.gameState.isBottom;
            if (!this.gameState.isBottom) this.gameState.inning++;
            this.resultText.setText(this.resultText.text + '\n[ 공수 교대 ]').setColor('#ffff00');
        }
    }

    attemptSteal() {
        this.stealBtn.setVisible(false);
        
        // 주력 스탯을 기반으로 도루 확률 계산 (기본 스탯 40 기준 약 65% 성공률)
        const speed = this.playerData.stats?.speed || 40;
        const successRate = 0.25 + (speed * 0.01); 

        let stolen = false;
        let isSuccess = false;
        // 2루주자의 3루 도루 우선 판단
        if (this.gameState.bases[1] && !this.gameState.bases[2]) {
            if (Math.random() < successRate) {
                this.gameState.bases[1] = false;
                this.gameState.bases[2] = true;
                this.resultText.setText('🏃 3루 도루 성공!').setColor('#00ff00');
                isSuccess = true;
            } else {
                this.gameState.bases[1] = false;
                this.gameState.outs++;
                this.resultText.setText('🏃 3루 도루 실패... 아웃!').setColor('#ff0000');
                isSuccess = false;
            }
            stolen = true;
        } 
        // 1루주자의 2루 도루 (3루 도루가 없을 때)
        else if (this.gameState.bases[0] && !this.gameState.bases[1]) {
            if (Math.random() < successRate) {
                this.gameState.bases[0] = false;
                this.gameState.bases[1] = true;
                this.resultText.setText('🏃 2루 도루 성공!').setColor('#00ff00');
                isSuccess = true;
            } else {
                this.gameState.bases[0] = false;
                this.gameState.outs++;
                this.resultText.setText('🏃 2루 도루 실패... 아웃!').setColor('#ff0000');
                isSuccess = false;
            }
            stolen = true;
        }

        if (stolen) {
            this.playStealEffect(isSuccess);
            this.checkOutsAndSwap();
            this.refreshScoreboardUI();
            
            // 다른 이벤트(타격 등)가 덮어쓰지 않으면 2초 후 메시지 제거
            this.time.delayedCall(2000, () => {
                if (this.resultText.text.includes('도루')) this.resultText.setText('');
            });
        }
    }

    showMatchResult() {
        let goldReward = 0;
        let expReward = 0;
        let title = '';
        let color = '';

        let isWin = false;
        let isDraw = false;

        // 포지션/보직에 따른 승패(미션 성공) 판정 로직
        if (this.playerData.role === 'batter') {
            isWin = this.gameState.scorePlayer > this.gameState.scoreAI;
            isDraw = this.gameState.scorePlayer === this.gameState.scoreAI;
        } else {
            const pos = this.playerData.position;
            if (pos === '선발 투수' || pos === '중간 계투') {
                const startScore = pos === '선발 투수' ? 0 : 3;
                isWin = this.gameState.scoreAI === startScore; // 실점 없음
                isDraw = this.gameState.scoreAI === startScore + 1; // 1실점 (절반의 성공)
            } else { // 마무리 투수
                isWin = this.gameState.scorePlayer > this.gameState.scoreAI;
                isDraw = this.gameState.scorePlayer === this.gameState.scoreAI;
            }
        }

        if (isWin) {
            title = '미션 성공! (VICTORY)';
            color = '#00ff00';
            goldReward = 150;
            expReward = 50;
        } else if (isDraw) {
            title = '절반의 성공 (DRAW)';
            color = '#aaaaaa';
            goldReward = 70;
            expReward = 20;
        } else {
            title = '미션 실패... (DEFEAT)';
            color = '#ff0000';
            goldReward = 30;
            expReward = 10;
        }

        const matchIndex = this.playerData.currentMatchIndex || 0;
        const startDate = new Date(2024, 2, 23);
        startDate.setDate(startDate.getDate() + matchIndex);
        const month = startDate.getMonth() + 1;
        const day = startDate.getDate();
        
        // 📊 리그 전체 순위/승패 업데이트
        if (isWin) this.updateLeagueStandings('win');
        else if (isDraw) this.updateLeagueStandings('draw');
        else this.updateLeagueStandings('loss');

        // 데이터 갱신 (전역 레지스트리에 보상 및 스케줄 진척도 누적)
        this.playerData.gold = (this.playerData.gold || 0) + goldReward;
        this.playerData.exp = (this.playerData.exp || 0) + expReward;
        this.playerData.currentMatchIndex = matchIndex + 1;
        this.registry.set('playerData', this.playerData);

        // 결과 연출 UI 생성
        // .setInteractive()를 추가하여 결과창이 떴을 때 뒤쪽의 게임 화면(마운드 등)이 클릭되는 것을 방지합니다.
        this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85).setDepth(200).setInteractive();
        
        this.add.text(640, 120, `- ${month}월 ${day}일 경기 결과 -`, { fontSize: '24px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
        
        this.add.text(640, 180, title, { fontSize: '50px', fill: color, fontStyle: 'bold', stroke: '#fff', strokeThickness: 2 }).setOrigin(0.5).setDepth(201);
        
        const teamNameText = this.playerData.team ? this.playerData.team.split(' ')[0] : 'PLAYER';
        const opponentNameText = this.opponentTeam.split(' ')[0];
        this.add.text(640, 260, `최종 스코어\n${teamNameText} ${this.gameState.scorePlayer} : ${this.gameState.scoreAI} ${opponentNameText}`, { fontSize: '32px', fill: '#fff', align: 'center' }).setOrigin(0.5).setDepth(201);
        
        const rewardText = `획득 보상\n골드: +${goldReward} G\n경험치: +${expReward} EXP`;
        this.add.text(640, 340, rewardText, { fontSize: '22px', fill: '#ffcc00', align: 'center', backgroundColor: '#333', padding: { x: 20, y: 8 } }).setOrigin(0.5).setDepth(201);

        // 📊 개인 기록 통계 표시
        let statsLine = '';
        const ps = this.personalStats;
        if (this.playerData.role === 'batter') {
            const avg = ps.atBats > 0 ? (ps.hits / ps.atBats).toFixed(3) : '0.000';
            statsLine = `📊 개인 기록\n${ps.atBats}타수 ${ps.hits}안타 (타율 ${avg})\n홈런: ${ps.homeRuns} | 타점: ${ps.rbi} | 삼진: ${ps.strikeOuts} | 볼넷: ${ps.walks}`;
        } else {
            statsLine = `📊 개인 기록\n투구수: ${ps.pitchCount}구 | 삼진: ${ps.strikeOuts}\n피안타: ${ps.hitsAllowed} | 실점: ${ps.runsAllowed} | 볼넷: ${ps.walks}`;
        }
        this.add.text(640, 420, statsLine, { fontSize: '18px', fill: '#a8d8ea', align: 'center', backgroundColor: '#1a1a2e', padding: { x: 15, y: 8 } }).setOrigin(0.5).setDepth(201);

        const returnBtn = this.add.text(490, 510, '[ 마을로 돌아가기 ]', { fontSize: '22px', fill: '#00ffff', backgroundColor: '#111', padding: { x: 15, y: 8 } })
            .setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
            
        returnBtn.on('pointerover', () => returnBtn.setStyle({ fill: '#ffffff', backgroundColor: '#555' }))
           .on('pointerout', () => returnBtn.setStyle({ fill: '#00ffff', backgroundColor: '#111' }))
           .on('pointerdown', () => this.scene.start('TownScene'));
           
        const rankBtn = this.add.text(790, 510, '[ 리그 순위 확인 ]', { fontSize: '22px', fill: '#fca311', backgroundColor: '#111', padding: { x: 15, y: 8 } })
            .setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
            
        rankBtn.on('pointerover', () => rankBtn.setStyle({ fill: '#ffffff', backgroundColor: '#555' }))
           .on('pointerout', () => rankBtn.setStyle({ fill: '#fca311', backgroundColor: '#111' }))
           .on('pointerdown', () => this.showStandingsPopup());
    }

    showForfeitConfirm() {
        if (this.isGameOver) return;

        // 화면 클릭(투구/타격) 차단용 투명 배경
        const blocker = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setDepth(3000).setInteractive();

        const confirmContainer = this.add.container(640, 360).setDepth(3001);
        const bg = this.add.rectangle(0, 0, 450, 200, 0x222222).setStrokeStyle(4, 0xff0000);
        
        const text = this.add.text(0, -30, '경기를 포기하고 마을로 돌아가시겠습니까?\n(패배로 기록되며 보상을 받을 수 없습니다.)', { 
            fontSize: '18px', fill: '#ffffff', align: 'center', lineSpacing: 10
        }).setOrigin(0.5);

        const yesBtn = this.add.text(-100, 50, '[ 네 (포기) ]', { 
            fontSize: '22px', fill: '#ff0000', backgroundColor: '#111', padding: { x: 15, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const noBtn = this.add.text(100, 50, '[ 아니오 ]', { 
            fontSize: '22px', fill: '#00ff00', backgroundColor: '#111', padding: { x: 15, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerover', () => yesBtn.setStyle({ backgroundColor: '#444' }));
        yesBtn.on('pointerout', () => yesBtn.setStyle({ backgroundColor: '#111' }));
        noBtn.on('pointerover', () => noBtn.setStyle({ backgroundColor: '#444' }));
        noBtn.on('pointerout', () => noBtn.setStyle({ backgroundColor: '#111' }));

        yesBtn.on('pointerdown', () => {
            blocker.destroy();
            confirmContainer.destroy();
            this.forfeitMatch();
        });

        noBtn.on('pointerdown', () => {
            blocker.destroy();
            confirmContainer.destroy();
        });

        confirmContainer.add([bg, text, yesBtn, noBtn]);
    }

    forfeitMatch() {
        this.isGameOver = true;
        
        const matchIndex = this.playerData.currentMatchIndex || 0;
        const startDate = new Date(2024, 2, 23);
        startDate.setDate(startDate.getDate() + matchIndex);
        const month = startDate.getMonth() + 1;
        const day = startDate.getDate();
        
        // 📊 리그 전체 순위/승패 업데이트 (포기는 패배 처리)
        this.updateLeagueStandings('loss');

        // 포기 시에도 스케줄 진행
        this.playerData.currentMatchIndex = matchIndex + 1;
        this.registry.set('playerData', this.playerData);

        // 결과 연출 UI 생성
        this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85).setDepth(3000).setInteractive();
        
        this.add.text(640, 120, `- ${month}월 ${day}일 경기 결과 -`, { fontSize: '24px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3001);
        
        this.add.text(640, 180, '경기 포기 (FORFEIT)', { fontSize: '50px', fill: '#ff0000', fontStyle: 'bold', stroke: '#fff', strokeThickness: 2 }).setOrigin(0.5).setDepth(3001);
        
        const teamNameText = this.playerData.team ? this.playerData.team.split(' ')[0] : 'PLAYER';
        const opponentNameText = this.opponentTeam.split(' ')[0];
        this.add.text(640, 260, `최종 스코어\n${teamNameText} ${this.gameState.scorePlayer} : ${this.gameState.scoreAI} ${opponentNameText}`, { fontSize: '32px', fill: '#fff', align: 'center' }).setOrigin(0.5).setDepth(3001);
        
        const rewardText = `획득 보상\n골드: +0 G\n경험치: +0 EXP`;
        this.add.text(640, 360, rewardText, { fontSize: '26px', fill: '#777777', align: 'center', backgroundColor: '#222', padding: { x: 20, y: 10 } }).setOrigin(0.5).setDepth(3001);

        const returnBtn = this.add.text(490, 480, '[ 마을로 돌아가기 ]', { fontSize: '24px', fill: '#00ffff', backgroundColor: '#111', padding: { x: 15, y: 10 } })
            .setOrigin(0.5).setDepth(3001).setInteractive({ useHandCursor: true });
            
        returnBtn.on('pointerover', () => returnBtn.setStyle({ fill: '#ffffff', backgroundColor: '#555' }))
           .on('pointerout', () => returnBtn.setStyle({ fill: '#00ffff', backgroundColor: '#111' }))
           .on('pointerdown', () => this.scene.start('TownScene'));

        const rankBtn = this.add.text(790, 480, '[ 리그 순위 확인 ]', { fontSize: '24px', fill: '#fca311', backgroundColor: '#111', padding: { x: 15, y: 10 } })
            .setOrigin(0.5).setDepth(3001).setInteractive({ useHandCursor: true });
            
        rankBtn.on('pointerover', () => rankBtn.setStyle({ fill: '#ffffff', backgroundColor: '#555' }))
           .on('pointerout', () => rankBtn.setStyle({ fill: '#fca311', backgroundColor: '#111' }))
           .on('pointerdown', () => this.showStandingsPopup());
    }

    updateLeagueStandings(resultType) {
        let standings = this.playerData.leagueStandings;
        const kboTeams = ['KIA 타이거즈', '삼성 라이온즈', 'LG 트윈스', '두산 베어스', 'KT 위즈', 'SSG 랜더스', '롯데 자이언츠', '한화 이글스', 'NC 다이노스', '키움 히어로즈'];
        
        // 예전 데이터(순위표가 없던 세이브) 호환용 방어 코드
        if (!standings) {
            standings = {};
            kboTeams.forEach(t => standings[t] = { w: 0, l: 0, d: 0 });
        }

        const pTeam = this.playerData.team || 'KIA 타이거즈';
        const oTeam = this.opponentTeam;

        if (resultType === 'win') {
            standings[pTeam].w++; standings[oTeam].l++;
        } else if (resultType === 'draw') {
            standings[pTeam].d++; standings[oTeam].d++;
        } else {
            standings[pTeam].l++; standings[oTeam].w++;
        }

        // 나머지 8개 팀들끼리의 가상 경기 결과 동시 처리 (시뮬레이션)
        const otherTeams = kboTeams.filter(t => t !== pTeam && t !== oTeam);
        otherTeams.sort(() => Math.random() - 0.5); // 무작위 매칭
        
        for(let i=0; i<otherTeams.length; i+=2) {
            const t1 = otherTeams[i];
            const t2 = otherTeams[i+1];
            if (!t2) continue; // 남은 팀이 홀수일 때 발생하는 에러 완벽 방지
            if (Math.random() < 0.02) { // 2% 확률로 무승부
                standings[t1].d++; standings[t2].d++;
            } else if (Math.random() < 0.5) { // 50% 승률
                standings[t1].w++; standings[t2].l++;
            } else {
                standings[t1].l++; standings[t2].w++;
            }
        }
        
        this.playerData.leagueStandings = standings;
    }

    showStandingsPopup() {
        if (this.standingsContainer) {
            this.standingsContainer.setVisible(true);
            return;
        }

        this.standingsContainer = this.add.container(640, 360).setDepth(5000);
        const bg = this.add.rectangle(0, 0, 600, 450, 0x1a1a2e, 0.98).setStrokeStyle(4, 0xfca311);
        const title = this.add.text(0, -180, '🏆 KBO 리그 순위 🏆', { fontSize: '28px', fill: '#fca311', fontStyle: 'bold' }).setOrigin(0.5);
        
        const closeBtn = this.add.text(0, 180, '[ 닫기 ]', { fontSize: '20px', fill: '#fff', backgroundColor: '#333', padding: { x: 15, y: 5 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.standingsContainer.setVisible(false));
            
        this.standingsContainer.add([bg, title, closeBtn]);

        const standings = this.playerData.leagueStandings;
        
        // 승률 = 승 / (승 + 패), 동률일 경우 다승(Win) 우선으로 정렬
        const sortedTeams = Object.keys(standings).sort((a, b) => {
            const rateA = standings[a].w + standings[a].l === 0 ? 0 : standings[a].w / (standings[a].w + standings[a].l);
            const rateB = standings[b].w + standings[b].l === 0 ? 0 : standings[b].w / (standings[b].w + standings[b].l);
            if (rateB !== rateA) return rateB - rateA;
            return standings[b].w - standings[a].w;
        });

        // 테이블 헤더
        const header = this.add.text(-250, -130, '순위', { fontSize: '18px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0, 0.5);
        const headerTeam = this.add.text(-150, -130, '팀명', { fontSize: '18px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0, 0.5);
        const headerWLD = this.add.text(50, -130, '승-무-패', { fontSize: '18px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
        const headerRate = this.add.text(200, -130, '승률', { fontSize: '18px', fill: '#a8d8ea', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
        
        this.standingsContainer.add([header, headerTeam, headerWLD, headerRate]);

        // 순위 데이터 그리기
        sortedTeams.forEach((team, index) => {
            const yPos = -90 + (index * 26);
            const s = standings[team];
            const rate = s.w + s.l === 0 ? '0.000' : (s.w / (s.w + s.l)).toFixed(3);
            
            const isPlayerTeam = team === (this.playerData.team || 'KIA 타이거즈');
            const color = isPlayerTeam ? '#ccff00' : '#ffffff'; // 내 팀은 형광색으로 강조
            
            const rankText = this.add.text(-240, yPos, `${index + 1}`, { fontSize: '18px', fill: color, fontStyle: 'bold' }).setOrigin(0.5, 0.5);
            const teamText = this.add.text(-150, yPos, team, { fontSize: '18px', fill: color, fontStyle: 'bold' }).setOrigin(0, 0.5);
            const wldText = this.add.text(50, yPos, `${s.w}승 ${s.d}무 ${s.l}패`, { fontSize: '18px', fill: color }).setOrigin(0.5, 0.5);
            const rateText = this.add.text(200, yPos, rate, { fontSize: '18px', fill: color }).setOrigin(0.5, 0.5);
            
            this.standingsContainer.add([rankText, teamText, wldText, rateText]);
        });
    }

    playHitEffect(resultObj, onPlayEnd) {
        // 타격 사운드 재생
        if (this.cache.audio.exists('hit_sound')) this.sound.play('hit_sound');

        // 이펙트를 터트릴 타격 지점 (시점 전환 전 좌표 저장)
        const impactX = this.homePlatePosition.x;
        const impactY = this.homePlatePosition.y;

        // 🌟 타격 시 필드 뷰(탑다운/쿼터뷰)로 시점 전환
        this.switchView('TOP_DOWN');

        const resultText = resultObj.result;
        const powerStat = this.playerData.stats?.power || 15;
        
        let hitAngle = Phaser.Math.Between(-130, -50); // 페어(Fair) 지역 방향
        let hitPower = 0;
        let nextPitchDelay = 2000;

        // 타격 결과에 따른 파티클 색상 분기
        let particleColor = 0xffffff;
        if (resultText.includes('홈런')) particleColor = 0xff00ff;
        else if (resultText.includes('안타')) particleColor = 0x00ffff;
        else if (resultText.includes('2루타') || resultText.includes('3루타')) particleColor = 0xffff00;
        else if (resultText.includes('파울')) particleColor = 0xffaa00;
        else if (resultText.includes('땅볼')) particleColor = 0xaaaaaa;
        
        this.playParticleBurst(impactX, impactY - 20, particleColor, 30, 400);

        if (resultText.includes('홈런')) {
            hitPower = 50 + Phaser.Math.Between(0, 20); // 50 * 12 = 600 (펜스 500 밖으로 훌쩍 넘어감)
            hitAngle = Phaser.Math.Between(-130, -50); // 페어 구역
            nextPitchDelay = 4000; // 홈런 연출을 감상할 수 있도록 딜레이 증가

            // 카메라 연출: 흔들림 + 플래시
            this.cameras.main.shake(300, 0.02);
            this.cameras.main.flash(500, 255, 255, 255);

            // 🌟 1. Bullet Time (슬로우 모션) 적용
            if (this.tweens) this.tweens.timeScale = 0.3;
            this.time.delayedCall(1200, () => { if (this && this.tweens) this.tweens.timeScale = 1; });

            // 텍스트 애니메이션 연출
            const hrText = this.add.text(640, 360, 'HOME RUN!', { 
                fontSize: '80px', fill: '#ff00ff', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6
            }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(100);

            // 🌟 5. 포스트 프로세싱 (Bloom) - 홈런 텍스트 네온 효과
            if (hrText.postFX) hrText.postFX.addBloom(0xff00ff, 1, 1, 2, 1.5);

            this.tweens.add({
                targets: hrText,
                alpha: 1,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                hold: 2000,
                ease: 'Back.easeOut',
                onComplete: () => hrText.destroy()
            });

            // 🏃 홈런 시 다이아몬드 베이스 런닝 애니메이션
            const runnerContainer = this.add.container(640, 400).setDepth(5);
            // 기존 타자 이미지를 절반(0.5) 크기로 줄여 미니 주자로 활용
            const runnerSprite = this.add.sprite(0, 0, 'batter').setScale(0.5).setOrigin(0.5, 1);
            runnerContainer.add(runnerSprite);

            // 주자가 달릴 때 통통 튀는(뜀박질) 효과
            this.tweens.add({
                targets: runnerSprite,
                y: -15, // 위로 15픽셀 점프
                duration: 150,
                yoyo: true,
                repeat: -1, // 무한 반복
                ease: 'Sine.easeOut'
            });

            // 1루 -> 2루 -> 3루 -> 홈으로 이어지는 궤적 이동 (총 4초 = nextPitchDelay와 동일)
            this.tweens.chain({
                targets: runnerContainer,
                tweens: [
                    { x: 800, y: 240, duration: 1000 }, // 1루 (640+160, 400-160)
                    { x: 640, y: 80, duration: 1000 }, // 2루
                    { x: 480, y: 240, duration: 1000 }, // 3루
                    { x: 640, y: 400, duration: 1000 }  // 홈인
                ],
                onComplete: () => runnerContainer.destroy() // 베이스를 다 돌면 삭제
            });
        } else if (resultText.includes('안타')) {
            hitPower = Phaser.Math.Between(15, 25); // 180 ~ 300 (내야를 벗어난 얕은 외야)
            hitAngle = Phaser.Math.Between(-130, -50);
            nextPitchDelay = 3000;

            const hitText = this.add.text(640, 360, 'HIT!', { 
                fontSize: '60px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(100);

            this.tweens.add({
                targets: hitText,
                alpha: 1,
                scale: 1,
                y: 200,
                duration: 400,
                yoyo: true,
                hold: 1500,
                ease: 'Cubic.easeOut',
                onComplete: () => hitText.destroy()
            });
        } else if (resultText.includes('2루타') || resultText.includes('3루타')) {
            hitPower = Phaser.Math.Between(30, 40); // 360 ~ 480 (펜스 앞 깊은 외야)
            hitAngle = Phaser.Math.Between(-130, -50);
            nextPitchDelay = 3500;

            const isTriple = resultText.includes('3루타');
            const hitTextStr = isTriple ? 'TRIPLE!' : 'DOUBLE!';
            const hitColor = isTriple ? '#ffff00' : '#00ff00';

            const hitText = this.add.text(640, 360, hitTextStr, { 
                fontSize: '70px', fill: hitColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(100);

            this.tweens.add({
                targets: hitText,
                alpha: 1,
                scale: 1.1,
                y: 200,
                duration: 400,
                yoyo: true,
                hold: 1500,
                ease: 'Cubic.easeOut',
                onComplete: () => hitText.destroy()
            });
        } else if (resultText.includes('파울')) {
            hitPower = Phaser.Math.Between(15, 50); // 다양한 비거리
            hitAngle = Math.random() > 0.5 ? Phaser.Math.Between(-40, 0) : Phaser.Math.Between(-180, -140); // 파울 라인 바깥
        } else if (resultText.includes('땅볼')) {
            hitPower = Phaser.Math.Between(5, 12); // 60 ~ 144 (내야 땅볼)
            hitAngle = Phaser.Math.Between(-130, -50);
        }

        // 홈런 및 파울은 송구 모션이 없으므로 직접 체공 시간에 맞춰 콜백 트리거
        if (resultText.includes('홈런')) {
            if (onPlayEnd) this.time.delayedCall(nextPitchDelay, onPlayEnd);
        } else if (resultText.includes('파울')) {
            if (onPlayEnd) this.time.delayedCall(1500, onPlayEnd);
        }

        // 🌟 3. 타격 임팩트 파티클 고도화 (방향성 부채꼴 스파크)
        this.playDirectionalSparks(impactX, impactY - 20, hitAngle, hitPower);

        // 공 물리 궤적(Ball.hit) 호출
        this.ball.hit(hitPower, hitAngle);

        // 🏃 야수들이 타구를 향해 일제히 달려가는 쫓아가기 애니메이션
        // 🏃 픽셀 주자(Runner) 리드 및 진루 애니메이션
        if (this.runnerSprites) {
            this.runnerSprites.forEach(r => r.destroy());
        }
        this.runnerSprites = [];

        const baseCoords = [
            { x: 640, y: 400 }, // 0: Home
            { x: 800, y: 240 }, // 1: 1B
            { x: 640, y: 80 }, // 2: 2B
            { x: 480, y: 240 }, // 3: 3B
            { x: 640, y: 400 }  // 4: Home (End)
        ];

        const activeRunners = [{ from: 0 }]; // 타자 본인
        if (this.gameState.bases[0]) activeRunners.push({ from: 1 });
        if (this.gameState.bases[1]) activeRunners.push({ from: 2 });
        if (this.gameState.bases[2]) activeRunners.push({ from: 3 });

        const isHomeRun = resultText.includes('홈런');
        
        activeRunners.forEach(runnerInfo => {
            const startCoord = baseCoords[runnerInfo.from];
            const targetCoord = baseCoords[runnerInfo.from + 1];
            
            const runnerContainer = this.add.container(startCoord.x, startCoord.y).setDepth(5);
            const runnerSprite = this.add.sprite(0, 0, 'batter').setScale(0.3).setOrigin(0.5, 1);
            runnerContainer.add(runnerSprite);
            
            this.runnerSprites.push(runnerContainer);

            // 제자리 뛰기 (뜀박질) 효과
            const bounceTween = this.tweens.add({
                targets: runnerSprite,
                y: -10,
                duration: 150,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeOut'
            });

            if (isHomeRun) {
                // 홈런이면 망설임 없이 모든 베이스를 순차적으로 돎
                const tweens = [];
                for (let i = runnerInfo.from + 1; i <= 4; i++) {
                    tweens.push({ x: baseCoords[i].x, y: baseCoords[i].y, duration: 1000 });
                }
                this.tweens.chain({
                    targets: runnerContainer,
                    tweens: tweens,
                    onComplete: () => { bounceTween.stop(); runnerContainer.destroy(); }
                });
            } else {
                // 일반 타구: 리드(망설임) 동작
                const leadX = startCoord.x + (targetCoord.x - startCoord.x) * 0.25;
                const leadY = startCoord.y + (targetCoord.y - startCoord.y) * 0.25;

                const leadTween = this.tweens.add({
                    targets: runnerContainer,
                    x: { from: startCoord.x, to: leadX },
                    y: { from: startCoord.y, to: leadY },
                    duration: 300,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // 수비수가 공을 잡을 즈음(runDuration)에 결과에 따라 진루 또는 귀루
                this.time.delayedCall(nextPitchDelay * 0.6, () => {
                    if (!runnerContainer.scene) return;
                    leadTween.stop();
                    
                    const isOut = resultText.includes('땅볼') || resultText.includes('파울');
                    const finalDest = isOut ? startCoord : targetCoord; 
                    
                    this.tweens.add({
                        targets: runnerContainer,
                        x: finalDest.x,
                        y: finalDest.y,
                        duration: 500,
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                            bounceTween.stop();
                            this.tweens.add({ targets: runnerContainer, alpha: 0, duration: 200, onComplete: () => runnerContainer.destroy() });
                        }
                    });
                });
            }
        });

        // 🏃 수비 AI 고도화: 중계 플레이, 백업, 베이스 커버 포지셔닝 및 송구
        const rad = Phaser.Math.DegToRad(hitAngle);
        
        // 타구의 체공/구르는 거리를 예측
        const ballDistance = Math.min(800, hitPower * 12); 
        const ballDestX = this.homePlatePosition.x + Math.cos(rad) * ballDistance; 
        const ballDestY = this.homePlatePosition.y + Math.sin(rad) * ballDistance;

        const isGroundball = resultText.includes('땅볼') || resultText.includes('안타');
        const isFlyball = resultText.includes('홈런') || resultText.includes('2루타') || resultText.includes('3루타') || resultText.includes('파울');
        const isOut = resultText.includes('땅볼') || resultText.includes('파울');

        // 수비수들을 원래 위치 기준으로 타구 도착지점과의 거리로 정렬
        const sortedFielders = [...this.fielders].map(f => ({
            sprite: f,
            dist: Phaser.Math.Distance.Between(f.originalX, f.originalY, ballDestX, ballDestY)
        })).sort((a, b) => a.dist - b.dist);

        const primaryFielder = sortedFielders[0].sprite;
        const backupFielder = sortedFielders[1].sprite;
        
        // 송구 타겟 베이스 (기본적으로 1루)
        const base1 = { x: 800, y: 240 };
        const base2 = { x: 640, y: 80 };
        const base3 = { x: 480, y: 240 };

        this.fielders.forEach((fielder) => {
            const reactionTime = Phaser.Math.Between(0, 150); // 반응 속도 0~0.15초
            const runDuration = nextPitchDelay * 0.5; // 이동하는 데 걸리는 시간
            let targetX = fielder.originalX;
            let targetY = fielder.originalY;
            let roleAction = 'idle';

            if (resultText.includes('홈런')) {
                // 홈런: 담장 쪽을 바라보며 좌절
                targetX = fielder.originalX + (ballDestX - fielder.originalX) * 0.1;
                targetY = fielder.originalY + (ballDestY - fielder.originalY) * 0.1;
            } else if (resultText.includes('파울')) {
                // 파울: 조금만 쫓아감
                targetX = fielder.originalX + (ballDestX - fielder.originalX) * 0.2;
                targetY = fielder.originalY + (ballDestY - fielder.originalY) * 0.2;
            } else {
                if (fielder === primaryFielder) {
                    // 1. 메인 수비수 - 타구 위치로 전력 질주
                    targetX = ballDestX;
                    targetY = ballDestY;
                    roleAction = 'primary';
                } else if (fielder === backupFielder) {
                    // 2. 백업 수비수 - 공 뒤쪽 80px에서 커버
                    targetX = ballDestX + Math.cos(rad) * 80;
                    targetY = ballDestY + Math.sin(rad) * 80;
                    roleAction = 'backup';
                } else {
                    // 3. 베이스 커버 및 컷오프
                    if (isFlyball || ballDestY < 180) {
                        // 외야 타구: 내야수가 컷오프(중계)로 나감
                        if (fielder.role === 'SS' || fielder.role === '2B') {
                            targetX = (ballDestX + base2.x) / 2;
                            targetY = (ballDestY + base2.y) / 2;
                            roleAction = 'cutoff';
                        } else if (fielder.role === '1B') { targetX = base1.x; targetY = base1.y; }
                        else if (fielder.role === '3B') { targetX = base3.x; targetY = base3.y; }
                    } else {
                        // 내야 땅볼: 베이스 커버 집중
                        if (fielder.role === '1B') { targetX = base1.x; targetY = base1.y; }
                        else if (fielder.role === '2B' || fielder.role === 'SS') { targetX = base2.x; targetY = base2.y; }
                        else if (fielder.role === '3B') { targetX = base3.x; targetY = base3.y; }
                    }
                }
            }

            // 🌟 클램프 처리 (외야 펜스 밖, 즉 관중석으로 나가지 않도록 워닝트랙 반경 480으로 제한)
            let distFromHome = Phaser.Math.Distance.Between(this.homePlatePosition.x, this.homePlatePosition.y, targetX, targetY);
            if (distFromHome > 480) {
                let angleFromHome = Phaser.Math.Angle.Between(this.homePlatePosition.x, this.homePlatePosition.y, targetX, targetY);
                targetX = this.homePlatePosition.x + Math.cos(angleFromHome) * 480;
                targetY = this.homePlatePosition.y + Math.sin(angleFromHome) * 480;
            }

            // 지정된 위치로 이동하는 트윈
            this.tweens.add({
                targets: fielder,
                x: targetX,
                y: targetY,
                duration: runDuration,
                delay: reactionTime,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    if (roleAction === 'primary' && !resultText.includes('홈런') && !resultText.includes('파울')) {
                        // 🌟 수비 실책 (Error) 확률 연출
                        const defenseStat = this.playerData.stats?.fielding || 40;
                        const errorChance = Math.max(0.01, (100 - defenseStat) * 0.003); // 1~30% 실책
                        const isError = Math.random() < errorChance;
                        const throwTarget = (isFlyball) ? base2 : base1;

                        if (isError) {
                            // 공을 더듬는 모션
                            const bobbleText = this.add.text(fielder.x, fielder.y - 30, '실책!', { fontSize: '16px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
                            this.tweens.add({ targets: bobbleText, y: bobbleText.y - 20, alpha: 0, duration: 1000, onComplete: () => bobbleText.destroy() });
                            
                            this.tweens.add({ targets: fielder, y: fielder.y - 10, duration: 150, yoyo: true, repeat: 1 }); // 당황해서 뛰는 모습
                            this.ball.setPosition(fielder.x + 20, fielder.y + 20); // 공이 옆으로 튐
                            
                            // 실책 후 뒤늦은 송구
                            this.time.delayedCall(800, () => this.performThrowAnimation(fielder, isOut, throwTarget, onPlayEnd));
                        } else {
                            // 정상 캐치
                            if (isOut) {
                                this.playParticleBurst(fielder.x, fielder.y, 0xaaaaaa, 10, 100);
                            } else {
                                const catchText = this.add.text(fielder.x, fielder.y - 30, 'Catch!', { fontSize: '14px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
                                this.tweens.add({ targets: catchText, y: catchText.y - 20, alpha: 0, duration: 1000, onComplete: () => catchText.destroy() });
                            }
                            
                            this.ball.body.setVelocity(0, 0); // 물리 중단
                            this.tweens.add({ targets: this.ball, x: fielder.x, y: fielder.y, duration: 100, ease: 'Linear' });
                            
                            // 🌟 1루로 송구 (Throw) 연출
                            this.time.delayedCall(200, () => this.performThrowAnimation(fielder, isOut, throwTarget, onPlayEnd));
                        }
                    } else {
                        fielder.setAngle(0);
                    }
                }
            });

            // 뛰는 모션 (뒤뚱뒤뚱 애니메이션)
            if (Phaser.Math.Distance.Between(fielder.x, fielder.y, targetX, targetY) > 20) {
                this.tweens.add({
                    targets: fielder,
                    angle: { from: -15, to: 15 },
                    duration: 150,
                    yoyo: true,
                    repeat: Math.floor(runDuration / 150),
                    delay: reactionTime,
                    onComplete: () => fielder.setAngle(0)
                });
            }
        });

        return nextPitchDelay;
    }

    // 🌟 송구 (Throwing) 애니메이션 및 아웃/세이프 판정 연출
    performThrowAnimation(fielder, isOut, targetBase, onPlayEnd) {
        this.tweens.add({
            targets: this.ball,
            x: targetBase.x,
            y: targetBase.y,
            duration: 400, // 송구 비행 속도
            ease: 'Power1',
            onComplete: () => {
                // 베이스 미트 안착 파티클
                this.playParticleBurst(targetBase.x, targetBase.y, 0xffffff, 15, 150);
                
                // 심판 판정 텍스트 (OUT / SAFE)
                const judgeText = isOut ? 'OUT!' : 'SAFE!';
                const judgeColor = isOut ? '#ff0000' : '#00ffff';
                
                const t = this.add.text(targetBase.x, targetBase.y - 40, judgeText, {
                    fontSize: '30px', fill: judgeColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5).setScale(0.1).setDepth(200);
                
                this.tweens.add({
                    targets: t,
                    scale: 1,
                    y: t.y - 30,
                    duration: 300,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // 송구가 완료되고 판정이 내려지는 이 순간, 숨겨둔 타격 결과(onPlayEnd)를 트리거!
                        if (onPlayEnd) onPlayEnd();
                        this.time.delayedCall(1000, () => t.destroy());
                    }
                });
            }
        });
    }

    playStrikeOutEffect() {
        // 🌟 1. Bullet Time (슬로우 모션) 적용
        if (this.tweens) this.tweens.timeScale = 0.2;
        this.time.delayedCall(800, () => { if (this && this.tweens) this.tweens.timeScale = 1; });

        // 카메라 흔들림 및 붉은색 섬광 연출
        this.cameras.main.shake(300, 0.015);
        this.cameras.main.flash(300, 255, 0, 0);

        // 삼진 아웃 시 강렬한 붉은 파티클 폭발
        this.playParticleBurst(this.homePlatePosition.x, this.homePlatePosition.y - 20, 0xff0000, 40, 500);

        // 화면 중앙에 크게 꽂히는 텍스트
        const soText = this.add.text(640, 360, 'STRIKE OUT!', { 
            fontSize: '80px', fill: '#ff0000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0).setScale(3).setDepth(100);

        // 🌟 5. 포스트 프로세싱 (Bloom) - 삼진 아웃 텍스트 강조
        if (soText.postFX) soText.postFX.addBloom(0xff0000, 1, 1, 2, 1.5);

        // 화면에 쾅! 하고 박히는 역동적인 바운스 애니메이션
        this.tweens.add({
            targets: soText,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            hold: 1500,
            ease: 'Bounce.easeOut',
            onComplete: () => soText.destroy()
        });
    }

    playStealEffect(isSuccess) {
        const textStr = isSuccess ? 'STEAL\nSUCCESS!' : 'STEAL\nFAILED...';
        const color = isSuccess ? '#00ff00' : '#ff0000';

        // 실패 시에만 화면이 흔들리고 붉게 번쩍임
        if (!isSuccess) {
            this.cameras.main.shake(200, 0.015);
            this.cameras.main.flash(200, 255, 0, 0);
        }

        const effectText = this.add.text(640, 360, textStr, { 
            fontSize: '70px', fill: color, fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setAlpha(0).setScale(isSuccess ? 0.5 : 3).setDepth(100);

        this.tweens.add({
            targets: effectText,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            hold: 1000,
            ease: isSuccess ? 'Back.easeOut' : 'Bounce.easeOut',
            onComplete: () => effectText.destroy()
        });
    }

    playCatchEffect(x, y) {
        // 포수 미트 이미지 스프라이트 생성
        const mitt = this.add.sprite(x, y, 'mitt').setDepth(15).setScale(0.5).setAlpha(0);

        // 미트가 나타나며 확 커지는 펀치감 있는 연출
        this.tweens.add({
            targets: mitt,
            alpha: 1,
            scale: 1.8,
            duration: 80,
            yoyo: true, // 닫히듯 줄어들며 사라짐
            hold: 300,  // 잠시 화면에 머무름
            ease: 'Expo.easeOut',
            onComplete: () => mitt.destroy()
        });
    }

    // 파티클을 터트리는 범용 헬퍼 함수
    playParticleBurst(x, y, colorHex, count = 20, speed = 300) {
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 50, max: speed },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, // 점점 작아지며 사라짐
            blendMode: 'ADD', // 빛나는 블렌드 효과
            tint: colorHex,
            lifespan: 600,
            gravityY: 400, // 중력 적용 (아래로 튐)
            emitting: false // 폭발용으로 설정
        });
        emitter.setDepth(105);
        emitter.explode(count); // 지정된 개수만큼 한 번에 터트림
        
        this.time.delayedCall(1000, () => emitter.destroy()); // 연출 종료 후 메모리 정리
    }

    // 🌟 3. 타격 임팩트 파티클 고도화 (부채꼴 스파크)
    playDirectionalSparks(x, y, angleDeg, power) {
        const speedBase = Math.min(power * 5, 800);
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: speedBase * 0.5, max: speedBase },
            angle: { min: angleDeg - 25, max: angleDeg + 25 }, // 부채꼴 방향
            scale: { start: 1.5, end: 0 },
            blendMode: 'ADD',
            tint: 0xffffaa, // 밝은 노란색 스파크
            lifespan: 500,
            gravityY: 100, // 살짝 아래로 처짐
            emitting: false
        });
        emitter.setDepth(106);
        emitter.explode(Math.floor(power * 0.5) + 10);
        this.time.delayedCall(1000, () => emitter.destroy());
    }

    generateAIStats(inning) {
        // 시즌 진행도에 따른 난이도 보정 (144경기가 후반으로 갈수록 적 스탯 상승)
        const matchProgressBonus = Math.floor(((this.playerData.currentMatchIndex || 0) / 144) * 20);
        const difficultyBonus = Math.floor((inning - 1) / 2) * 2 + matchProgressBonus; 
        
        const isPlayerBatter = this.playerData.role === 'batter';
        
        if (isPlayerBatter) {
            // AI는 투수
            return {
                name: `[${this.opponentTeam}] 투수`,
                role: 'pitcher',
                stats: {
                    velocity: Phaser.Math.Between(35, 45) + difficultyBonus,
                    control: Phaser.Math.Between(35, 45) + difficultyBonus,
                    movement: Phaser.Math.Between(35, 45) + difficultyBonus
                }
            };
        } else {
            // AI는 타자
            return {
                name: `[${this.opponentTeam}] 타자`,
                role: 'batter',
                stats: {
                    power: Phaser.Math.Between(35, 45) + difficultyBonus,
                    contact: Phaser.Math.Between(35, 45) + difficultyBonus,
                    speed: Phaser.Math.Between(35, 45) + difficultyBonus
                }
            };
        }
    }

    updateAIStatUI() {
        if (!this.aiStatText) return;
        
        if (this.aiData.role === 'pitcher') {
            this.aiStatText.setText(`[ 상대 투수 ] 구속: ${this.aiData.stats.velocity} | 제구: ${this.aiData.stats.control} | 변화: ${this.aiData.stats.movement}`);
        } else {
            this.aiStatText.setText(`[ 상대 타자 ] 파워: ${this.aiData.stats.power} | 콘택트: ${this.aiData.stats.contact} | 주력: ${this.aiData.stats.speed}`);
        }
    }

    simulateAtBat(isPlayerTeam) {
        if (this.isGameOver) return;

        // 시뮬레이션 타석 결과 랜덤 계산
        const rand = Math.random();
        let runs = 0;
        let resultStr = '';

        if (rand < 0.3) { // 30% 출루율
            if (Math.random() < 0.1) {
                // 홈런
                runs = 1 + this.gameState.bases.filter(b => b).length;
                this.gameState.bases = [false, false, false];
                resultStr = '홈런!';
            } else {
                // 안타
                if (this.gameState.bases[2]) runs++;
                this.gameState.bases[2] = this.gameState.bases[1];
                this.gameState.bases[1] = this.gameState.bases[0];
                this.gameState.bases[0] = true;
                resultStr = '안타!';
            }
        } else {
            this.gameState.outs++;
            resultStr = '아웃!';
        }

        if (runs > 0) {
            if (isPlayerTeam) this.gameState.scorePlayer += runs;
            else this.gameState.scoreAI += runs;
        }

        const teamName = isPlayerTeam ? '우리팀' : '상대팀';
        this.resultText.setText(`[${teamName}] 시뮬레이션: ${resultStr}`);
        this.time.delayedCall(800, () => {
            if (this.scene.isActive()) this.resultText.setText('');
        });

        // 9회말 끝내기 처리
        if (this.checkWalkOff()) {
            this.isGameOver = true;
            this.refreshScoreboardUI();
            this.time.delayedCall(1500, () => this.showMatchResult());
            return;
        }

        const wasBottom = this.gameState.isBottom;
        this.checkOutsAndSwap();
        this.refreshScoreboardUI();

        if (this.isGameOver) return;

        // 연장 12회 종료
        if (this.gameState.inning > 12) {
            this.isGameOver = true;
            this.time.delayedCall(1500, () => this.showMatchResult());
            return;
        }

        // 타순 갱신
        if (isPlayerTeam && wasBottom === this.gameState.isBottom) {
            this.playerBattingIndex = (this.playerBattingIndex + 1) % 9;
        } else if (!isPlayerTeam && wasBottom === this.gameState.isBottom) {
            this.aiBattingIndex = (this.aiBattingIndex + 1) % 9;
        } else if (wasBottom !== this.gameState.isBottom) { // 공수교대 발생
            if (wasBottom) this.playerBattingIndex = (this.playerBattingIndex + 1) % 9; // 말 -> 초
            else this.aiBattingIndex = (this.aiBattingIndex + 1) % 9; // 초 -> 말
        }

        // 짧은 딜레이 후 다음 루프 진행
        this.time.delayedCall(1000, () => this.startGameLoop());
    }

    checkPitcherNextTurn() {
        if (this.isGameOver) return;
        
        this.resultText.setText('');
        if (this.gameState.isBottom) {
            // 공수 교대되어 우리팀 공격 시작
            this.startGameLoop();
        } else {
            // 계속 투구
            this.switchView('BACK');
            this.ball.setVisible(false);
            this.isPitcherWaiting = false;
        }
    }

    showCoachDialog() {
        this.isPitcherWaiting = true; // 투구 막기
        const blocker = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8).setDepth(4000).setInteractive();
        const container = this.add.container(640, 360).setDepth(4001);
        
        const bg = this.add.rectangle(0, 0, 500, 250, 0x222222).setStrokeStyle(4, 0xffaa00);
        
        const text = this.add.text(0, -50, '어이! 스태미나가 많이 떨어졌군.\n이제 마운드를 불펜에게 넘기고 교체하겠나?', { 
            fontSize: '20px', fill: '#ffffff', align: 'center', lineSpacing: 10
        }).setOrigin(0.5);

        const yesBtn = this.add.text(-120, 60, '[ 교체한다 ]', { 
            fontSize: '22px', fill: '#00ff00', backgroundColor: '#111', padding: { x: 15, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const noBtn = this.add.text(120, 60, '[ 계속 던진다 ]', { 
            fontSize: '22px', fill: '#ff0000', backgroundColor: '#111', padding: { x: 15, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerdown', () => {
            blocker.destroy();
            container.destroy();
            this.finishPitching(); // 강제 종료 후 남은 경기 시뮬레이션
        });

        noBtn.on('pointerdown', () => {
            blocker.destroy();
            container.destroy();
            this.isPitcherWaiting = false; // 다시 던질 수 있게 허용
            this.selectedPitch = null; // 구종 선택 초기화
        });

        yesBtn.on('pointerover', () => yesBtn.setStyle({ backgroundColor: '#444' })).on('pointerout', () => yesBtn.setStyle({ backgroundColor: '#111' }));
        noBtn.on('pointerover', () => noBtn.setStyle({ backgroundColor: '#444' })).on('pointerout', () => noBtn.setStyle({ backgroundColor: '#111' }));

        container.add([bg, text, yesBtn, noBtn]);
    }

    finishPitching() {
        this.isGameOver = true;
        this.statusText.setText('불펜 투수로 교체되었습니다. 남은 경기 시뮬레이션 중...');
        this.switchView('TOP_DOWN');
        
        let remainingInnings = 9 - this.gameState.inning;
        if (!this.gameState.isBottom) remainingInnings += 0.5;

        for (let i = 0; i < remainingInnings * 2; i++) {
            if (Math.random() < 0.25) {
                if (i % 2 === 0) this.gameState.scoreAI += Phaser.Math.Between(1, 2); // 초(AI)
                else this.gameState.scorePlayer += Phaser.Math.Between(1, 2); // 말(플레이어)
            }
        }
        
        this.refreshScoreboardUI();
        this.time.delayedCall(2000, () => this.showMatchResult());
    }
}
