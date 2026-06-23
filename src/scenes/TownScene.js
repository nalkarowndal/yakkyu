import Phaser from 'phaser';
import { DialogSystem } from '../systems/DialogSystem';
import { GAME_WIDTH, GAME_HEIGHT, CENTER_X, CENTER_Y, TOWN_BOUNDS } from '../constants/Layout';
import { GameManager } from '../systems/GameManager';

export class TownScene extends Phaser.Scene {
    constructor() {
        super('TownScene');
    }

    create() {
        // 🔄 씬 재진입 시 이전 UI 컨테이너 참조 초기화 (stale data 방지)
        this.shopContainer = null;
        this.hospitalContainer = null;
        this.trainingContainer = null;

        // 🖼️ 생성된 마을 배경 이미지 적용 (비율 유지 확대로 화질 개선)
        this.add.image(640, 360, 'town_bg').setDepth(-10).setScale(1280 / 1024);

        // 구름, 새, 시민 등 잡다한 애니메이션 및 웨이포인트 로직 모두 제거

        // CreationScene에서 저장한 플레이어 정보 가져오기
        const gm = GameManager.getInstance();
        gm.init(this.registry);
        const playerData = gm.getPlayerData();
        const matchIndex = playerData.currentMatchIndex || 0;

        // --- 모바일 게임 스타일 상단 HUD 배경 바 ---
        const topBar = this.add.graphics();
        topBar.fillStyle(0x0a3c7a, 0.85); // 진한 파란색 반투명
        topBar.fillRect(0, 0, 1280, 50); // 화면 상단 가로 1280, 세로 50 픽셀
        topBar.lineStyle(2, 0x4a90e2, 1);
        topBar.strokeRect(0, 50, 1280, 2); // 아래 테두리 라인
        topBar.setDepth(1000);

        // 유저 정보 (좌측)
        this.add.text(20, 25, `Lv.1 ${playerData.name} [${playerData.team || '무소속'}]`, { fontSize: '22px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(1001);

        // 골드 표시 (중앙 우측 박스)
        const goldBox = this.add.graphics();
        goldBox.fillStyle(0x000000, 0.5);
        goldBox.fillRoundedRect(850, 10, 150, 30, 15);
        goldBox.setDepth(1001);
        this.goldText = this.add.text(925, 25, `💰 ${playerData.gold || 0} G`, { fontSize: '20px', fill: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1002);

        // 경험치/스태미나 표시 (우측 끝 박스)
        const expBox = this.add.graphics();
        expBox.fillStyle(0x000000, 0.5);
        expBox.fillRoundedRect(1050, 10, 200, 30, 15);
        expBox.setDepth(1001);
        this.expText = this.add.text(1150, 25, `EXP ${playerData.exp || 0} / 100`, { fontSize: '20px', fill: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1002);

        // --- 모바일 게임 스타일 하단 진행 상태바 ---
        const bottomBar = this.add.graphics();
        bottomBar.fillStyle(0x0a3c7a, 0.9);
        bottomBar.fillRect(0, 680, 1280, 40); // 화면 맨 아래쪽
        bottomBar.lineStyle(2, 0x4a90e2, 1);
        bottomBar.strokeRect(0, 680, 1280, 2);
        bottomBar.setDepth(1000);

        const totalMatches = playerData.schedule ? playerData.schedule.length : 144;
        const opponent = playerData.schedule ? playerData.schedule[matchIndex] : '상대팀';
        const startDate = new Date(2024, 2, 23);
        startDate.setDate(startDate.getDate() + matchIndex);
        const month = startDate.getMonth() + 1;
        const day = startDate.getDate();

        this.add.text(640, 700, `진행 현황: 1년차 [ ${Math.min(matchIndex + 1, totalMatches)} / ${totalMatches} 경기 ]  |  ${month}월 ${day}일 vs ${opponent}`, { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001);

        // 🎵 음소거(Mute) 토글 버튼 (아이콘 형태로 상단 우측으로 이동)
        const soundBtn = this.add.text(1230, 25, this.sound.mute ? '🔇' : '🔊', { fontSize: '28px' })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5, 0.5)
            .setDepth(3000)
            .on('pointerdown', () => {
                this.sound.mute = !this.sound.mute;
                soundBtn.setText(this.sound.mute ? '🔇' : '🔊');
            });

        // 대화 시스템 초기화
        this.dialogSystem = new DialogSystem(this);

        // 🏋️ 훈련소 (좌측 하단) - 파라미터에서 이모티콘 제거
        this.createCuteVillageBuilding(250, 650, 150, 130, 'gym', '훈련소', () => {
            if (this.dialogSystem.isShowing) return; // 이미 대화 중이면 무시

            this.dialogSystem.show([
                { name: '열혈 코치', texture: 'coach_portrait', text: `어이, ${playerData.name}! 오늘 컨디션은 좀 어떤가?` },
                { name: '열혈 코치', texture: 'coach_portrait', text: playerData.role === 'batter' ? '9회말 위기 상황을 극복하려면 끝없는 훈련만이 살 길이지!' : `팀의 믿음직한 ${playerData.position}로서 마운드를 든든하게 지켜야지!` },
                { name: `${playerData.name}`, texture: playerData.role === 'batter' ? 'batter' : 'pitcher', text: '네, 코치님! 모아둔 경험치로 훈련하겠습니다!' },
                { name: '열혈 코치', texture: 'coach_portrait', text: '좋아, 패기가 넘치는군. 어떤 훈련을 할 건지 골라보게.' }
            ], () => {
                this.openTrainingUI();
            });
        });

        // 🏥 구단 병원 (중앙 상단)
        this.createCuteVillageBuilding(640, 200, 150, 130, 'hospital', '병원', () => {
            if (this.dialogSystem.isShowing) return;

            const pd = this.registry.get('playerData');
            const affection = pd.affection || 0;

            let dialogs = [];
            if (pd.isNurseDating) {
                dialogs = [
                    { name: '간호사(여친)', texture: 'nurse_portrait', text: `앗, ${pd.name} 자기야! 다친 곳은 없고?` },
                    { name: '간호사(여친)', texture: 'nurse_portrait', text: '오늘 경기도 내가 벤치에서 응원하고 있으니까 힘내야 해! 사랑해~ 💕' }
                ];
            } else {
                dialogs = [
                    { name: '간호사', texture: 'nurse_portrait', text: `안녕하세요, ${pd.name} 선수! 어디가 불편해서 오셨나요?` },
                    { name: '간호사', texture: 'nurse_portrait', text: '무리한 훈련은 독이 될 수 있으니 항상 조심하세요.' }
                ];
            }

            this.dialogSystem.show(dialogs, () => this.openHospitalUI());
        });

        // 🛒 쇼핑몰/상점 (우측 하단)
        this.createCuteVillageBuilding(1150, 550, 150, 130, 'shop', '쇼핑몰', () => {
            if (this.dialogSystem.isShowing) return;

            this.dialogSystem.show([
                { name: '상점주인', texture: 'shop_portrait', text: '어서옵쇼! 경기장 가기 전에 장비 한 번 싹 둘러보고 가요.' },
                { name: '상점주인', texture: 'shop_portrait', text: '골드만 두둑하다면 확실하게 스탯을 올려주는 장비들을 싸게 모시겠습니다!' }
            ], () => {
                this.openShopUI();
            });
        });

        // 🏟️ 메인 경기장 (중앙)
        this.createCuteVillageBuilding(950, 250, 220, 180, 'stadium', '경기장', () => {
            if (matchIndex >= totalMatches) {
                alert('이번 시즌의 모든 정규 경기를 마쳤습니다!');
                return;
            }
            this.scene.start('MatchScene');
        });
    }

    // 🏢 배경 건물 위에 투명한 상호작용 영역과 세련된 블루 리본 라벨을 띄우는 헬퍼
    createCuteVillageBuilding(x, y, width, height, type, subtitleText, onClick) {
        const container = this.add.container(x, y).setDepth(y);
        const elements = [];

        // 하단 설명 라벨 (모바일 게임 스타일의 블루 배너)
        // 1. 배너 배경 (그래픽스)
        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(0x0a3c7a, 1); // 진한 남색 바탕
        bannerBg.fillRoundedRect(-60, 10, 120, 30, 5); // x, y, width, height, radius
        bannerBg.lineStyle(2, 0xffffff, 1); // 흰색 테두리
        bannerBg.strokeRoundedRect(-60, 10, 120, 30, 5);
        
        // 그림자 효과를 위한 별도 도형 (선택적)
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-57, 13, 120, 30, 5);
        elements.push(shadow, bannerBg);

        // 2. 텍스트
        const subLabel = this.add.text(0, 25, subtitleText, {
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        elements.push(subLabel);

        container.add(elements);

        // 클릭 상호작용 투명 Zone
        const zone = this.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            this.tweens.add({ targets: container, y: y - 5, duration: 150, ease: 'Back.easeOut' });
            subLabel.setStyle({ fill: '#ffeb3b' }); // 오버 시 노란색 텍스트로 강조
        });

        zone.on('pointerout', () => {
            this.tweens.add({ targets: container, y: y, duration: 150, ease: 'Back.easeIn' });
            subLabel.setStyle({ fill: '#ffffff' });
        });

        zone.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
            onClick();
        });
    }

    openShopUI() {
        // 상점 UI가 이미 생성되어 있다면 다시 보이기만 함
        if (this.shopContainer) {
            this.shopContainer.setVisible(true);
            return;
        }

        // UI 요소들을 하나로 묶어줄 컨테이너 생성
        this.shopContainer = this.add.container(640, 360).setDepth(2000);

        // 모바일 게임 스타일의 라운드 패널 배경
        const bg = this.add.graphics();
        bg.fillStyle(0x1a2a40, 0.95); // 어두운 네이비색 배경
        bg.fillRoundedRect(-250, -265, 500, 530, 20); // x, y, width, height, radius
        bg.lineStyle(4, 0x4a90e2, 1); // 파란색 테두리
        bg.strokeRoundedRect(-250, -265, 500, 530, 20);

        // 상단 헤더 장식
        const header = this.add.graphics();
        header.fillStyle(0x0a3c7a, 1);
        header.fillRoundedRect(-250, -265, 500, 60, { tl: 20, tr: 20, bl: 0, br: 0 }); // 위쪽만 둥글게

        const title = this.add.text(0, -235, '장비 상점', { fontSize: '26px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // 닫기 버튼
        const closeBtn = this.add.text(0, 230, '[ 닫기 ]', { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: { x: 20, y: 5 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.shopContainer.setVisible(false));

        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#f00' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#fff' }));

        this.shopContainer.add([bg, title, closeBtn]);

        // 판매 아이템 목록 (투수/타자 모두에게 유용한 스탯으로 구성)
        const items = [
            { name: '🔥 파워 배트', stat: 'power', amount: 5, price: 50 },
            { name: '👁️ 정밀 글러브', stat: 'contact', amount: 5, price: 50 },
            { name: '🏃 초경량 스파이크', stat: 'speed', amount: 5, price: 50 },
            { name: '🔋 고농축 에너지 드링크', stat: 'stamina', amount: 10, price: 30 },
            { name: '⚡ 구속 강화 트레이닝볼', stat: 'velocity', amount: 5, price: 50 },
            { name: '🎯 제구 훈련 키트', stat: 'control', amount: 5, price: 50 },
            { name: '📖 비밀 변화구 교본', stat: 'movement', amount: 5, price: 60 }
        ];

        items.forEach((item, index) => {
            const yPos = -170 + (index * 50); // 위에서부터 아래로 나열

            // 아이템 이름 및 스탯 표시
            const itemText = this.add.text(-220, yPos, `${item.name} (+${item.amount}) - ${item.price} G`, { fontSize: '20px', fill: '#fff' }).setOrigin(0, 0.5);

            // 구매 버튼
            const buyBtn = this.add.text(220, yPos, '[ 구매 ]', { fontSize: '20px', fill: '#0f0', backgroundColor: '#222', padding: { x: 10, y: 5 } })
                .setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    const pd = this.registry.get('playerData');
                    const currentGold = pd.gold || 0;

                    if (currentGold >= item.price) {
                        // 골드 차감 및 스탯 증가 적용
                        pd.gold = currentGold - item.price;
                        if (!pd.stats) pd.stats = {}; // 안전장치
                        pd.stats[item.stat] = (pd.stats[item.stat] || 0) + item.amount;

                        this.registry.set('playerData', pd); // 갱신된 데이터 저장
                        this.goldText.setText(`보유 골드: ${pd.gold} G`); // UI 즉시 반영

                        // 구매 성공 연출 (위로 떠오르며 사라지는 텍스트)
                        const effect = this.add.text(640, 360 + yPos, '구매 완료!', { fontSize: '24px', fill: '#ff0', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 50, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    } else {
                        // 골드 부족 연출
                        const effect = this.add.text(640, 360 + yPos, '골드가 부족합니다!', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 50, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    }
                });

            buyBtn.on('pointerover', () => buyBtn.setStyle({ fill: '#fff', backgroundColor: '#0a0' }));
            buyBtn.on('pointerout', () => buyBtn.setStyle({ fill: '#0f0', backgroundColor: '#222' }));

            this.shopContainer.add([itemText, buyBtn]);
        });
    }

    openHospitalUI() {
        if (this.hospitalContainer) {
            this.hospitalContainer.setVisible(true);
            this.updateHospitalUI();
            return;
        }

        this.hospitalContainer = this.add.container(640, 360).setDepth(2000);

        const bg = this.add.graphics();
        bg.fillStyle(0x1a2a40, 0.95);
        bg.fillRoundedRect(-250, -200, 500, 400, 20);
        bg.lineStyle(4, 0xff758f, 1);
        bg.strokeRoundedRect(-250, -200, 500, 400, 20);

        const header = this.add.graphics();
        header.fillStyle(0x9a0036, 1);
        header.fillRoundedRect(-250, -200, 500, 60, { tl: 20, tr: 20, bl: 0, br: 0 });

        const title = this.add.text(0, -170, '구단 병원', { fontSize: '26px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        const closeBtn = this.add.text(0, 160, '[ 닫기 ]', { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: { x: 20, y: 5 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.hospitalContainer.setVisible(false));

        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#f00' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#fff' }));

        this.affectionText = this.add.text(0, -110, '', { fontSize: '20px', fill: '#ff9ebb', fontStyle: 'bold' }).setOrigin(0.5);

        this.hospitalContainer.add([bg, title, closeBtn, this.affectionText]);

        const actions = [
            { name: '🩹 일반 치료 (스태미나 +10)', affectionUp: 2, price: 20, type: 'treat' },
            { name: '💐 명품 향수 선물하기', affectionUp: 15, price: 100, type: 'gift' },
            { name: '💍 고백하기 (호감도 50 이상)', affectionUp: 0, price: 0, type: 'confess' }
        ];

        actions.forEach((action, index) => {
            const yPos = -30 + (index * 60);
            const actionText = this.add.text(-220, yPos, `${action.name} ${action.price > 0 ? '- ' + action.price + ' G' : ''}`, { fontSize: '18px', fill: '#fff' }).setOrigin(0, 0.5);

            const btn = this.add.text(220, yPos, '[ 선택 ]', { fontSize: '20px', fill: '#ff758f', backgroundColor: '#222', padding: { x: 10, y: 5 } })
                .setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.handleHospitalAction(action, yPos));

            btn.on('pointerover', () => btn.setStyle({ fill: '#fff', backgroundColor: '#ff758f' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#ff758f', backgroundColor: '#222' }));

            this.hospitalContainer.add([actionText, btn]);
        });

        this.updateHospitalUI();
    }

    updateHospitalUI() {
        const pd = this.registry.get('playerData');
        const affection = pd.affection || 0;
        this.affectionText.setText(pd.isNurseDating ? '💖 연인 상태 💖 (전 스탯 +5 버프 적용 중)' : `현재 호감도: ${affection} 💕`);
    }

    handleHospitalAction(action, yPos) {
        const pd = this.registry.get('playerData');
        const currentGold = pd.gold || 0;
        pd.affection = pd.affection || 0;

        if (action.type === 'confess') {
            if (pd.isNurseDating) {
                this.showHospitalEffect('이미 꿀 떨어지는 연인 사이입니다! 🍯', '#ff0000', yPos);
            } else if (pd.affection >= 50) {
                pd.isNurseDating = true;
                if (!pd.stats) pd.stats = {};
                // 투수, 타자 관련 모든 스탯 +5 증가 버프
                const allStats = ['power', 'contact', 'speed', 'fielding', 'velocity', 'control', 'stamina', 'movement'];
                allStats.forEach(stat => { if (pd.stats[stat] !== undefined) pd.stats[stat] += 5; });

                this.registry.set('playerData', pd);
                this.updateHospitalUI();
                this.showHospitalEffect('고백 성공! 💕\n(사랑의 힘으로 전 스탯이 5 증가합니다!)', '#ff69b4', yPos - 20);
            } else {
                this.showHospitalEffect('아직 호감도가 부족합니다... (차였습니다 💔)', '#aaaaaa', yPos);
            }
            return;
        }

        if (currentGold >= action.price) {
            pd.gold -= action.price;
            pd.affection += action.affectionUp;

            if (action.type === 'treat') {
                if (!pd.stats) pd.stats = {};
                pd.stats.stamina = (pd.stats.stamina || 40) + 10;
            }

            this.registry.set('playerData', pd);
            this.goldText.setText(`보유 골드: ${pd.gold} G`);
            this.updateHospitalUI();

            this.showHospitalEffect(action.type === 'gift' ? '호감도가 대폭 상승했습니다! 😍' : '치료 완료! 호감도가 조금 올랐습니다 😊', '#ffff00', yPos);
        } else {
            this.showHospitalEffect('골드가 부족합니다!', '#ff0000', yPos);
        }
    }

    showHospitalEffect(message, color, yPos) {
        const effect = this.add.text(640, 360 + yPos, message, { fontSize: '22px', fill: color, fontStyle: 'bold', align: 'center' }).setDepth(2001).setOrigin(0.5);
        this.tweens.add({ targets: effect, y: effect.y - 50, alpha: 0, duration: 1500, onComplete: () => effect.destroy() });
    }

    openTrainingUI() {
        if (this.trainingContainer) {
            this.trainingContainer.setVisible(true);
            this.updateTrainingUI();
            return;
        }

        this.trainingContainer = this.add.container(640, 360).setDepth(2000);

        const bg = this.add.graphics();
        bg.fillStyle(0x1a2a40, 0.95);
        bg.fillRoundedRect(-250, -200, 500, 400, 20);
        bg.lineStyle(4, 0x00ffcc, 1);
        bg.strokeRoundedRect(-250, -200, 500, 400, 20);

        const header = this.add.graphics();
        header.fillStyle(0x006655, 1);
        header.fillRoundedRect(-250, -200, 500, 60, { tl: 20, tr: 20, bl: 0, br: 0 });

        const title = this.add.text(0, -170, '코치의 훈련소', { fontSize: '26px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        const closeBtn = this.add.text(0, 160, '[ 닫기 ]', { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: { x: 20, y: 5 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.trainingContainer.setVisible(false));

        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#f00' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#fff' }));

        this.trainingContainer.add([bg, title, closeBtn]);

        const pd = this.registry.get('playerData');

        // 포지션(타자/투수)에 맞게 훈련할 스탯 목록 분기
        let statsToShow = [];
        if (pd.role === 'batter') {
            statsToShow = [
                { key: 'power', name: '파워', cost: 50 },
                { key: 'contact', name: '콘택트', cost: 50 },
                { key: 'speed', name: '주력', cost: 50 },
                { key: 'fielding', name: '수비', cost: 50 }
            ];
        } else {
            statsToShow = [
                { key: 'velocity', name: '구속', cost: 50 },
                { key: 'control', name: '제구', cost: 50 },
                { key: 'stamina', name: '스태미나', cost: 50 },
                { key: 'movement', name: '변화', cost: 50 }
            ];
        }

        this.statTexts = {};

        statsToShow.forEach((stat, index) => {
            const yPos = -60 + (index * 50);

            const statText = this.add.text(-200, yPos, `${stat.name}: ${pd.stats[stat.key] || 0}`, { fontSize: '22px', fill: '#fff' }).setOrigin(0, 0.5);
            this.statTexts[stat.key] = statText;

            const btn = this.add.text(200, yPos, `[ 훈련 (-${stat.cost} EXP) ]`, { fontSize: '20px', fill: '#000', backgroundColor: '#00ffcc', padding: { x: 10, y: 5 } })
                .setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    const currentPd = this.registry.get('playerData');
                    const currentExp = currentPd.exp || 0;

                    if (currentExp >= stat.cost) {
                        // 경험치 차감 및 스탯 영구 증가 (+1)
                        currentPd.exp -= stat.cost;
                        if (!currentPd.stats) currentPd.stats = {};
                        currentPd.stats[stat.key] = (currentPd.stats[stat.key] || 0) + 1;

                        this.registry.set('playerData', currentPd);
                        this.expText.setText(`경험치: ${currentPd.exp} EXP`);
                        this.updateTrainingUI(); // 텍스트 갱신

                        const effect = this.add.text(640, 360 + yPos, '스탯 상승!', { fontSize: '24px', fill: '#00ffcc', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 30, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    } else {
                        const effect = this.add.text(640, 360 + yPos, '경험치 부족!', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 30, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    }
                });

            btn.on('pointerover', () => btn.setStyle({ fill: '#fff', backgroundColor: '#009977' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#000', backgroundColor: '#00ffcc' }));

            this.trainingContainer.add([statText, btn]);
        });
    }

    updateTrainingUI() {
        const pd = this.registry.get('playerData');
        if (pd.role === 'batter') {
            if (this.statTexts['power']) this.statTexts['power'].setText(`파워: ${pd.stats.power || 0}`);
            if (this.statTexts['contact']) this.statTexts['contact'].setText(`콘택트: ${pd.stats.contact || 0}`);
            if (this.statTexts['speed']) this.statTexts['speed'].setText(`주력: ${pd.stats.speed || 0}`);
            if (this.statTexts['fielding']) this.statTexts['fielding'].setText(`수비: ${pd.stats.fielding || 0}`);
        } else {
            if (this.statTexts['velocity']) this.statTexts['velocity'].setText(`구속: ${pd.stats.velocity || 0}`);
            if (this.statTexts['control']) this.statTexts['control'].setText(`제구: ${pd.stats.control || 0}`);
            if (this.statTexts['stamina']) this.statTexts['stamina'].setText(`스태미나: ${pd.stats.stamina || 0}`);
            if (this.statTexts['movement']) this.statTexts['movement'].setText(`변화: ${pd.stats.movement || 0}`);
        }
    }
}