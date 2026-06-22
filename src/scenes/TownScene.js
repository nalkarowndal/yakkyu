import Phaser from 'phaser';
import { DialogSystem } from '../systems/DialogSystem';

export class TownScene extends Phaser.Scene {
    constructor() {
        super('TownScene');
    }

    create() {
        // 🔄 씬 재진입 시 이전 UI 컨테이너 참조 초기화 (stale data 방지)
        this.shopContainer = null;
        this.hospitalContainer = null;
        this.trainingContainer = null;

        // 🌿 화사하고 밝은 연두색 잔디밭 (밀도감의 베이스)
        this.add.rectangle(400, 300, 800, 600, 0xc5e1a5).setDepth(-10);
        
        // 🟨 노란색/갈색 격자무늬(Tile) 타일로 촘촘하게 마을 산책로(Path) 깔기
        // 쿼터뷰 느낌을 주기 위해 다이아몬드(사선) 패턴 생성
        for (let py = -200; py < 800; py += 80) {
            for (let px = -200; px < 1000; px += 80) {
                // 길을 그릴지 말지 결정 (랜덤 패턴이지만 화면을 어느정도 채우게)
                if (Math.random() > 0.2) {
                    const path = this.add.rectangle(px, py, 50, 50, 0xffeb3b).setDepth(-9).setStrokeStyle(2, 0xfbc02d);
                    path.setRotation(Math.PI / 4); // 마름모꼴로 돌려 쿼터뷰 느낌
                    
                    // 길 위에 무늬
                    this.add.rectangle(px, py, 30, 30, 0xffd54f).setDepth(-8).setRotation(Math.PI / 4);
                }
            }
        }

        // 🌳🌲🌻 풍성한 장식용 자연 오브젝트 대량 배치 (빈 공간 채우기)
        const decos = ['🌳', '🌲', '🌴', '🌻', '🌻', '💈', '💡'];
        for (let i = 0; i < 80; i++) {
            const dx = Phaser.Math.Between(10, 790);
            const dy = Phaser.Math.Between(10, 590);
            
            // 메인 건물 위치들 근처는 살짝 피해서 배치
            if ((dx > 150 && dx < 250) || (dx > 550 && dx < 650)) continue; 
            if (dx > 300 && dx < 500 && dy > 200 && dy < 400) continue; // 중앙 경기장 피하기
            
            const deco = Phaser.Utils.Array.GetRandom(decos);
            const size = (deco === '🌻') ? '20px' : '40px';
            this.add.text(dx, dy, deco, { fontSize: size }).setOrigin(0.5, 1).setDepth(dy - 500);
        }

        // 🏘️ 배경용 귀여운 쿼터뷰 집들 (빨강/파랑 지붕 등 다채로운 색상)
        const roofColors = [0xe53935, 0x1e88e5, 0x8e24aa, 0xfb8c00];
        for (let i = 0; i < 20; i++) {
            const hx = Phaser.Math.Between(40, 760);
            const hy = Phaser.Math.Between(40, 560);
            
            // 겹치지 않게 메인 구역 피하기
            if (hx > 100 && hx < 700 && hy > 100 && hy < 500) continue;

            const bContainer = this.add.container(hx, hy).setDepth(hy - 450);
            
            // 건물 본체 (하얀색 벽)
            bContainer.add(this.add.rectangle(0, 0, 60, 50, 0xffffff).setStrokeStyle(2, 0x999999));
            // 둥글거나 뾰족한 지붕 (반원)
            const rColor = Phaser.Utils.Array.GetRandom(roofColors);
            bContainer.add(this.add.ellipse(0, -25, 70, 40, rColor).setStrokeStyle(2, 0x333333));
            bContainer.add(this.add.rectangle(0, -25, 60, 20, rColor));
            
            // 귀여운 창문과 문
            bContainer.add(this.add.rectangle(-15, 5, 15, 15, 0x81d4fa));
            bContainer.add(this.add.rectangle(15, 10, 15, 25, 0x8d6e63));
            
            // 야구 마을답게 지붕에 야구모자나 공 마크 추가
            const decoIcon = Math.random() > 0.5 ? '🧢' : '⚾';
            bContainer.add(this.add.text(0, -35, decoIcon, { fontSize: '20px' }).setOrigin(0.5));
        }

        // 'WELCOME' 간판 장식
        for (let i = 0; i < 4; i++) {
            const wx = Phaser.Math.Between(100, 700);
            const wy = Phaser.Math.Between(50, 550);
            const wText = this.add.text(wx, wy, 'WELCOME', { fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#1565c0', strokeThickness: 5, backgroundColor: '#42a5f5' }).setOrigin(0.5).setDepth(wy - 450);
            wText.setRotation(-0.1);
        }

        // ☁️ 둥둥 떠다니는 구름 추가 (화사하고 밝은 톤)
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.text(Phaser.Math.Between(-100, 800), Phaser.Math.Between(10, 500), '☁️', { 
                fontSize: `${Phaser.Math.Between(40, 80)}px`, alpha: Phaser.Math.FloatBetween(0.5, 0.9) 
            }).setDepth(500); // 제일 위 (하늘)
            
            this.tweens.add({
                targets: cloud, x: 900, duration: Phaser.Math.Between(20000, 40000), repeat: -1,
                onRepeat: () => { cloud.x = -100; cloud.y = Phaser.Math.Between(10, 500); }
            });
        }

        // 🚗 움직이는 자동차 추가 (십자 도로)
        const carIcons = ['🚗', '🚙', '🚕', '🚓', '🚚'];
        for (let i = 0; i < 6; i++) {
            const isHorizontal = Math.random() > 0.5;
            const isForward = Math.random() > 0.5;
            
            let startX, startY, endX, endY;
            if (isHorizontal) {
                startX = isForward ? -100 : 900;
                endX = isForward ? 900 : -100;
                startY = endY = isForward ? 330 : 270;
            } else {
                startX = endX = isForward ? 370 : 430;
                startY = isForward ? -100 : 700;
                endY = isForward ? 700 : -100;
            }

            const car = this.add.text(startX, startY, Phaser.Utils.Array.GetRandom(carIcons), { fontSize: '30px' })
                .setOrigin(0.5).setDepth(Math.max(startY, endY)); 

            if (isHorizontal && !isForward) car.setFlipX(true);
            if (!isHorizontal) car.setAngle(isForward ? 90 : -90);

            this.tweens.add({ 
                targets: car, x: endX, y: endY, 
                duration: Phaser.Math.Between(3000, 6000), 
                repeat: -1, 
                delay: Phaser.Math.Between(0, 3000),
                onUpdate: () => car.setDepth(car.y) // Y좌표에 따라 깊이 정렬
            });
        }

        // CreationScene에서 저장한 플레이어 정보 가져오기
        const playerData = this.registry.get('playerData') || { name: '테스트유저' };
        const matchIndex = playerData.currentMatchIndex || 0;
        
        this.add.text(20, 60, `환영합니다, [${playerData.team || '무소속'}] ${playerData.name} 선수!`, { fontSize: '22px', fill: '#a8d8ea', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0, 0.5).setDepth(1000);

        // 💰 현재 보유 골드 표시 (화면 우측 상단)
        this.goldText = this.add.text(760, 40, `보유 골드: ${playerData.gold || 0} G`, { fontSize: '20px', fill: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0.5).setDepth(1000);
        // 📊 현재 보유 경험치 표시 (화면 우측 상단)
        this.expText = this.add.text(760, 70, `경험치: ${playerData.exp || 0} EXP`, { fontSize: '20px', fill: '#00ffcc', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0.5).setDepth(1000);

        // 🎵 음소거(Mute) 토글 버튼 (좌측 상단)
        const soundBtn = this.add.text(20, 20, this.sound.mute ? '🔇' : '🔊', { fontSize: '28px' })
            .setInteractive({ useHandCursor: true })
            .setDepth(3000)
            .on('pointerdown', () => {
                this.sound.mute = !this.sound.mute;
                soundBtn.setText(this.sound.mute ? '🔇' : '🔊');
            });

        // 나중에 훈련소, 상점 등을 여기에 추가하게 됩니다.
        
        // 대화 시스템 초기화
        this.dialogSystem = new DialogSystem(this);

        // 🏋️ 훈련소 (좌측 하단)
        this.createCuteVillageBuilding(200, 420, 150, 130, 'gym', '🏋️', '훈련소', () => {
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

        // 🏥 구단 병원 (좌측 상단)
        this.createCuteVillageBuilding(200, 150, 150, 130, 'hospital', '🏥', '구단 병원', () => {
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

        // 🛒 스포츠 샵 (우측 상단)
        this.createCuteVillageBuilding(600, 150, 150, 130, 'shop', '🛒', '스포츠 샵', () => {
            if (this.dialogSystem.isShowing) return;
            
            // 대화가 끝난 후 openShopUI() 함수를 실행하도록 콜백 전달 (핵심! 🌟)
            this.dialogSystem.show([
                { name: '상점주인', texture: 'shop_portrait', text: '어서옵쇼! 경기장 가기 전에 장비 한 번 싹 둘러보고 가요.' },
                { name: '상점주인', texture: 'shop_portrait', text: '골드만 두둑하다면 확실하게 스탯을 올려주는 장비들을 싸게 모시겠습니다!' }
            ], () => {
                this.openShopUI();
            });
        });

        // 🏟️ 미니 경기장 (중앙 랜드마크)
        const totalMatches = playerData.schedule ? playerData.schedule.length : 144;
        const opponent = playerData.schedule ? playerData.schedule[matchIndex] : '상대팀';

        // KBO 개막 시즌(3월 23일)부터 경기가 누적될수록 날짜 증가 (단순 계산)
        const startDate = new Date(2024, 2, 23);
        startDate.setDate(startDate.getDate() + matchIndex);
        const month = startDate.getMonth() + 1;
        const day = startDate.getDate();

        const matchDesc = `정규시즌 [${Math.min(matchIndex + 1, totalMatches)}/${totalMatches}]\n${month}월 ${day}일 vs ${opponent}`;

        this.createCuteVillageBuilding(400, 320, 220, 180, 'stadium', '🏟️', matchDesc, () => {
            if (matchIndex >= totalMatches) {
                alert('이번 시즌의 모든 정규 경기를 마쳤습니다!');
                return;
            }
            this.scene.start('MatchScene');
        });
    }

    // 🏢 귀여운 쿼터뷰(아이소메트릭) 스타일의 핵심 상호작용 건물 생성 헬퍼
    createCuteVillageBuilding(x, y, width, height, type, icon, subtitleText, onClick) {
        const container = this.add.container(x, y).setDepth(y);
        const elements = [];

        // 건물 바닥 그림자
        elements.push(this.add.ellipse(0, height/2, width * 1.1, height * 0.4, 0x000000, 0.4));

        if (type === 'stadium') {
            // 중앙 랜드마크: 미니 야구장
            elements.push(this.add.ellipse(0, 0, width, height, 0xeeeeee).setStrokeStyle(3, 0xcccccc)); // 외벽/관중석 테두리
            elements.push(this.add.ellipse(0, -5, width * 0.9, height * 0.8, 0x81c784)); // 잔디 구장
            // 내야 흙
            elements.push(this.add.ellipse(0, 10, width * 0.5, height * 0.4, 0xd7ccc8));
            // 베이스들
            elements.push(this.add.rectangle(0, 25, 8, 8, 0xffffff).setRotation(Math.PI/4)); // 홈
            elements.push(this.add.rectangle(-25, 0, 8, 8, 0xffffff).setRotation(Math.PI/4)); // 3루
            elements.push(this.add.rectangle(25, 0, 8, 8, 0xffffff).setRotation(Math.PI/4)); // 1루
            elements.push(this.add.rectangle(0, -25, 8, 8, 0xffffff).setRotation(Math.PI/4)); // 2루
        } else {
            // 일반 상가 건물들의 바디 (하얀색 벽돌/페인트)
            elements.push(this.add.rectangle(0, 0, width * 0.8, height * 0.6, 0xffffff).setStrokeStyle(2, 0xaaaaaa));
            
            // 타입별 지붕 및 장식
            if (type === 'gym') {
                // 훈련소: 빨간 반원 지붕
                elements.push(this.add.ellipse(0, -height*0.3, width*0.9, height*0.4, 0xe53935).setStrokeStyle(2, 0x333333));
                elements.push(this.add.rectangle(0, -height*0.3, width*0.8, height*0.2, 0xe53935));
                elements.push(this.add.rectangle(0, height*0.1, 40, 40, 0x555555)); // 철제 문
            } else if (type === 'hospital') {
                // 병원: 둥근 파란 지붕
                elements.push(this.add.ellipse(0, -height*0.3, width*0.9, height*0.4, 0x1e88e5).setStrokeStyle(2, 0x333333));
                elements.push(this.add.rectangle(0, -height*0.3, width*0.8, height*0.2, 0x1e88e5));
                // 대형 십자 마크
                elements.push(this.add.rectangle(0, -height*0.35, 30, 10, 0xffffff));
                elements.push(this.add.rectangle(0, -height*0.35, 10, 30, 0xffffff));
                elements.push(this.add.rectangle(0, height*0.1, 40, 40, 0x81d4fa)); // 유리문
            } else if (type === 'shop') {
                // 상점: 노란색 지붕 및 어닝(천막)
                elements.push(this.add.ellipse(0, -height*0.3, width*0.9, height*0.4, 0xfbc02d).setStrokeStyle(2, 0x333333));
                elements.push(this.add.rectangle(0, -height*0.3, width*0.8, height*0.2, 0xfbc02d));
                // 어닝 (천막 무늬)
                for (let i = 0; i < 5; i++) {
                    const c = i % 2 === 0 ? 0xff0000 : 0xffffff;
                    elements.push(this.add.rectangle(-width*0.32 + i * (width*0.16), -height*0.1, width*0.16, 20, c));
                }
                elements.push(this.add.rectangle(0, height*0.15, 60, 30, 0x8d6e63)); // 상점 문/진열장
            }
        }

        // 중앙 메인 아이콘
        const iconY = type === 'stadium' ? -20 : -height * 0.45;
        const iconObj = this.add.text(0, iconY, icon, { fontSize: type === 'stadium' ? '60px' : '40px' }).setOrigin(0.5);
        elements.push(iconObj);

        // 하단 설명 라벨 (눈에 잘 띄게)
        const subLabel = this.add.text(0, height/2 + 20, subtitleText, {
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4, backgroundColor: '#00000099', padding: { x: 5, y: 5 }, align: 'center'
        }).setOrigin(0.5);
        elements.push(subLabel);

        container.add(elements);

        // 클릭 상호작용 투명 Zone
        const zone = this.add.zone(0, 0, width, height + 50).setInteractive({ useHandCursor: true });
        container.add(zone);

        zone.on('pointerover', () => {
            this.tweens.add({ targets: container, y: y - 15, duration: 150, ease: 'Back.easeOut' });
            iconObj.setScale(1.2);
        });

        zone.on('pointerout', () => {
            this.tweens.add({ targets: container, y: y, duration: 150, ease: 'Back.easeIn' });
            iconObj.setScale(1);
        });

        zone.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.9, duration: 50, yoyo: true });
            onClick();
        });
    }

    openShopUI() {
        // 상점 UI가 이미 생성되어 있다면 다시 보이기만 함
        if (this.shopContainer) {
            this.shopContainer.setVisible(true);
            return;
        }

        // UI 요소들을 하나로 묶어줄 컨테이너 생성 (화면 중앙 위치, 가장 위에 보이도록 Z-Depth 높게 설정)
        this.shopContainer = this.add.container(400, 300).setDepth(2000);

        // 반투명 배경 패널
        const bg = this.add.rectangle(0, 0, 500, 530, 0x111111, 0.95).setStrokeStyle(4, 0xffd700);
        const title = this.add.text(0, -160, '- 장비 상점 -', { fontSize: '28px', fill: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);

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
                        const effect = this.add.text(400, 300 + yPos, '구매 완료!', { fontSize: '24px', fill: '#ff0', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 50, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    } else {
                        // 골드 부족 연출
                        const effect = this.add.text(400, 300 + yPos, '골드가 부족합니다!', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
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

        this.hospitalContainer = this.add.container(400, 300).setDepth(2000);

        const bg = this.add.rectangle(0, 0, 500, 400, 0x111111, 0.95).setStrokeStyle(4, 0xff758f);
        const title = this.add.text(0, -160, '- 구단 병원 -', { fontSize: '28px', fill: '#ff758f', fontStyle: 'bold' }).setOrigin(0.5);

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
        const effect = this.add.text(400, 300 + yPos, message, { fontSize: '22px', fill: color, fontStyle: 'bold', align: 'center' }).setDepth(2001).setOrigin(0.5);
        this.tweens.add({ targets: effect, y: effect.y - 50, alpha: 0, duration: 1500, onComplete: () => effect.destroy() });
    }

    openTrainingUI() {
        if (this.trainingContainer) {
            this.trainingContainer.setVisible(true);
            this.updateTrainingUI();
            return;
        }

        this.trainingContainer = this.add.container(400, 300).setDepth(2000);

        const bg = this.add.rectangle(0, 0, 500, 400, 0x111111, 0.95).setStrokeStyle(4, 0x00ffcc);
        const title = this.add.text(0, -160, '- 코치의 훈련소 -', { fontSize: '28px', fill: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5);

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
                        
                        const effect = this.add.text(400, 300 + yPos, '스탯 상승!', { fontSize: '24px', fill: '#00ffcc', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
                        this.tweens.add({ targets: effect, y: effect.y - 30, alpha: 0, duration: 1000, onComplete: () => effect.destroy() });
                    } else {
                        const effect = this.add.text(400, 300 + yPos, '경험치 부족!', { fontSize: '24px', fill: '#f00', fontStyle: 'bold' }).setDepth(2001).setOrigin(0.5);
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
            if(this.statTexts['power']) this.statTexts['power'].setText(`파워: ${pd.stats.power || 0}`);
            if(this.statTexts['contact']) this.statTexts['contact'].setText(`콘택트: ${pd.stats.contact || 0}`);
            if(this.statTexts['speed']) this.statTexts['speed'].setText(`주력: ${pd.stats.speed || 0}`);
            if(this.statTexts['fielding']) this.statTexts['fielding'].setText(`수비: ${pd.stats.fielding || 0}`);
        } else {
            if(this.statTexts['velocity']) this.statTexts['velocity'].setText(`구속: ${pd.stats.velocity || 0}`);
            if(this.statTexts['control']) this.statTexts['control'].setText(`제구: ${pd.stats.control || 0}`);
            if(this.statTexts['stamina']) this.statTexts['stamina'].setText(`스태미나: ${pd.stats.stamina || 0}`);
            if(this.statTexts['movement']) this.statTexts['movement'].setText(`변화: ${pd.stats.movement || 0}`);
        }
    }
}