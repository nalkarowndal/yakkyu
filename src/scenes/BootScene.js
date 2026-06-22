import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // ⚠️ 에셋 로드 실패 시 게임이 멈추지 않도록 에러 핸들러 등록
        this.load.on('loaderror', (fileObj) => {
            console.warn(`[BootScene] 에셋 로드 실패: ${fileObj.key} (${fileObj.url})`);
        });

        // 🖼️ assets 폴더에서 NPC 초상화 이미지 로드
        // (실제 준비하신 파일명과 확장자가 다르다면 아래 문자열을 파일명에 맞게 수정해 주세요!)
        this.load.image('coach_portrait', 'assets/coach.png');
        this.load.image('nurse_portrait', 'assets/nurse.png');
        this.load.image('shop_portrait', 'assets/shop.png');
        
        // 로딩 중임을 알리는 텍스트
        this.add.text(400, 300, '로딩 중...', { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);

        // 🎨 외부 파일 없이 코드로 직접 픽셀 아트와 배경 텍스처 생성
        this.createPixelArtTextures();
        
        // 🎵 코드로 직접 사운드 효과(SFX) 합성하여 캐시에 추가
        this.createProceduralAudio();
    }

    createPixelArtTextures() {
        // 1. 경기장(Stadium) 배경 생성 (Graphics 활용)
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // 잔디밭
        graphics.fillStyle(0x386641);
        graphics.fillRect(0, 0, 800, 600);
        
        // 파울 라인 (홈에서 양쪽 외야로 뻗어나가는 선)
        graphics.lineStyle(4, 0xffffff);
        graphics.beginPath();
        graphics.moveTo(400, 400); 
        graphics.lineTo(0, 0); 
        graphics.moveTo(400, 400);
        graphics.lineTo(800, 0); 
        graphics.strokePath();

        // 투수 마운드 (흙)
        graphics.fillStyle(0xbc4749);
        graphics.fillCircle(400, 170, 70);
        graphics.fillStyle(0xf2e8cf);
        graphics.fillRect(380, 165, 40, 8); // 투수 발판
        
        // 홈 플레이트 흙 영역
        graphics.fillStyle(0xbc4749);
        graphics.fillCircle(400, 400, 90);
        // 홈 베이스 오각형
        graphics.fillStyle(0xf2e8cf);
        graphics.fillPoints([{x: 400, y: 415}, {x: 410, y: 405}, {x: 410, y: 395}, {x: 390, y: 395}, {x: 390, y: 405}], true); 
        
        graphics.generateTexture('stadium', 800, 600);

        // 1.5 백스톱(Backstop) 카메라 시점의 3D 원근감 경기장 추가
        const bgBack = this.make.graphics({ x: 0, y: 0, add: false });
        
        // 🌌 하늘
        bgBack.fillStyle(0x4a90e2);
        bgBack.fillRect(0, 0, 800, 130);

        // 📺 중앙 대형 전광판
        bgBack.fillStyle(0x222222);
        bgBack.fillRect(280, 20, 240, 110); // 테두리 프레임
        bgBack.fillStyle(0x111111);
        bgBack.fillRect(290, 30, 220, 90); // 내부 스크린
        bgBack.fillStyle(0x00b4d8);
        bgBack.fillRect(300, 40, 200, 45); // 메인 비디오 보드 (빛나는 느낌)
        bgBack.fillStyle(0xffaa00);
        bgBack.fillRect(300, 95, 70, 15); // 좌측 텍스트 UI 느낌
        bgBack.fillStyle(0xffaa00);
        bgBack.fillRect(380, 95, 120, 15); // 우측 텍스트 UI 느낌

        // 🏟️ 외야 관중석 (Stands)
        bgBack.fillStyle(0x2d3436);
        bgBack.fillRect(0, 130, 800, 70);

        // 👥 수많은 관중들 (랜덤 도트 파티클)
        const crowdColors = [0xff0000, 0x0055ff, 0xffffff, 0xfca311, 0x00ffcc, 0xff66bb];
        for (let i = 0; i < 1200; i++) {
            let cx = Math.random() * 800;
            let cy = 130 + (Math.random() * 65);
            bgBack.fillStyle(crowdColors[Math.floor(Math.random() * crowdColors.length)]);
            bgBack.fillRect(cx, cy, 3, 3);
        }

        // 🟡 큼직한 파울 폴대 (Foul Poles)
        bgBack.fillStyle(0xffff00);
        bgBack.fillRect(90, 60, 6, 140); // 좌측
        bgBack.fillRect(704, 60, 6, 140); // 우측

        // 🧱 외야 펜스
        bgBack.fillStyle(0x1D3557);
        bgBack.fillRect(0, 200, 800, 20);
        bgBack.lineStyle(2, 0xffffff);
        bgBack.beginPath();
        bgBack.moveTo(0, 200); bgBack.lineTo(800, 200); // 펜스 윗부분 라인
        bgBack.strokePath();
        
        // 잔디밭
        bgBack.fillStyle(0x386641);
        bgBack.fillRect(0, 220, 800, 380);
        
        // 파울 라인 (아래에서 위로 모이는 원근감 적용)
        bgBack.lineStyle(4, 0xffffff);
        bgBack.beginPath();
        bgBack.moveTo(400, 600); bgBack.lineTo(93, 220); // 좌측 파울 폴대에 연결되도록 각도 수정
        bgBack.moveTo(400, 600); bgBack.lineTo(707, 220); // 우측 파울 폴대에 연결되도록 각도 수정
        bgBack.strokePath();

        // 투수 마운드 및 발판 (작고 납작한 타원으로 원근감 표현)
        bgBack.fillStyle(0xbc4749);
        bgBack.fillEllipse(400, 254, 160, 45); 
        bgBack.fillStyle(0xf2e8cf);
        bgBack.fillRect(380, 248, 40, 6); 

        // 홈 플레이트 (화면 바로 앞이므로 아주 큼지막하게)
        bgBack.fillStyle(0xbc4749);
        bgBack.fillEllipse(400, 530, 350, 100); 
        bgBack.fillStyle(0xf2e8cf);
        bgBack.fillPoints([{x: 400, y: 550}, {x: 420, y: 535}, {x: 420, y: 515}, {x: 380, y: 515}, {x: 380, y: 535}], true);

        bgBack.generateTexture('stadium_backstop', 800, 600);

        // 2. 캐릭터 및 공 픽셀 아트 생성 (ASCII 배열 형태)
        const palette = {
            '1': '#FFFFFF', // 흰색 (하의/공)
            '2': '#FFCC99', // 살구색 (피부)
            '3': '#E63946', // 빨간색 (타자 유니폼)
            '4': '#1D3557', // 파란색 (투수 유니폼)
            '5': '#A8DADC', // 은회색 (배트)
            '6': '#000000', // 검은색 (눈/입)
            '7': '#00FFFF', // 하늘색 (땀방울)
            '8': '#8B4513'  // 갈색 (글러브/포수 미트)
            // '.'은 자동으로 투명 처리됩니다.
        };

        const pitcherData = [
            '....2222....',
            '...222222...',
            '...222222...',
            '....2222....',
            '..44444444..',
            '.4444444444.',
            '.44.4444.44.',
            '.4..4444..4.',
            '....1111....',
            '....1111....',
            '...11..11...',
            '...11..11...'
        ];

        // 투구 시 힘을 주거나 놀라는 표정(땀방울 포함) 텍스처
        const pitcherActionData = [
            '....2222....',
            '...262262...',
            '...226622.7.',
            '....2222..7.',
            '..44444444..',
            '.4444444444.',
            '.44.4444.44.',
            '.4..4444..4.',
            '....1111....',
            '....1111....',
            '...11..11...',
            '...11..11...'
        ];

        const batterData = [
            '....2222...5',
            '...222222..5',
            '...222222..5',
            '....2222..55',
            '..333333335.',
            '.333333335..',
            '.33.333353..',
            '.3..3335..3.',
            '....1111....',
            '....1111....',
            '...11..11...',
            '...11..11...'
        ];

        // 스윙 시 깜짝 놀라는 표정(땀방울 포함) 텍스처
        const batterActionData = [
            '....2222...5',
            '...262262..5',
            '...226622.75',
            '....2222..55',
            '..333333335.',
            '.333333335..',
            '.33.333353..',
            '.3..3335..3.',
            '....1111....',
            '....1111....',
            '...11..11...',
            '...11..11...'
        ];

        const ballData = [
            '.11.',
            '1111',
            '1111',
            '.11.'
        ];

        // 파티클(별가루/먼지)용 아주 작은 조각 텍스처
        const particleData = [
            '11',
            '11'
        ];

        // 포수 미트 픽셀 텍스처 데이터
        const mittData = [
            '..888..',
            '.88888.',
            '8866688',
            '8866688',
            '8888888',
            '.88888.',
            '..888..'
        ];

        // 배열 데이터를 바탕으로 실제 텍스처 이지미 생성 (pixelWidth로 도트 크기 설정)
        this.textures.generate('pitcher', { data: pitcherData, pixelWidth: 6, palette: palette });
        this.textures.generate('pitcher_action', { data: pitcherActionData, pixelWidth: 6, palette: palette });
        this.textures.generate('batter', { data: batterData, pixelWidth: 6, palette: palette });
        this.textures.generate('batter_action', { data: batterActionData, pixelWidth: 6, palette: palette });
        this.textures.generate('ball', { data: ballData, pixelWidth: 4, palette: palette });
        this.textures.generate('particle', { data: particleData, pixelWidth: 3, palette: palette });
        this.textures.generate('mitt', { data: mittData, pixelWidth: 6, palette: palette });
    }

    createProceduralAudio() {
        const audioCtx = this.sound.context;
        if (!audioCtx) return; // Web Audio API 미지원 환경 대비 방어 코드

        const sampleRate = audioCtx.sampleRate;

        // 1. 투구 소리 (Pitch Sound) - 바람을 가르는 듯한 '쉭' 소리
        const pitchDuration = 0.3; // 0.3초
        const pitchBuffer = audioCtx.createBuffer(1, sampleRate * pitchDuration, sampleRate);
        const pitchData = pitchBuffer.getChannelData(0);
        for (let i = 0; i < pitchBuffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.sin((t / pitchDuration) * Math.PI); // 부드럽게 커졌다 작아지는 반원 형태 곡선
            pitchData[i] = (Math.random() * 2 - 1) * envelope * 0.4; // 백색 소음(White Noise)에 볼륨 곡선 적용
        }
        this.cache.audio.add('pitch_sound', pitchBuffer);

        // 2. 타격 소리 (Hit Sound) - 경쾌하게 맞는 '딱!' 소리
        const hitDuration = 0.2; // 0.2초
        const hitBuffer = audioCtx.createBuffer(1, sampleRate * hitDuration, sampleRate);
        const hitData = hitBuffer.getChannelData(0);
        for (let i = 0; i < hitBuffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 40); // 매우 빠르게 감쇠하는 형태 (타격감)
            const noise = Math.random() * 2 - 1; // 타격 마찰음
            const tone = Math.sin(t * Math.PI * 2 * 1000); // 1000Hz의 나무/금속성의 경쾌한 울림
            hitData[i] = (noise * 0.6 + tone * 0.4) * envelope;
        }
        this.cache.audio.add('hit_sound', hitBuffer);

        // 3. 레트로풍 8비트 배경음악 (BGM)
        const bgmDuration = 3.2; // 3.2초 (1루프당 8개의 음표)
        const bgmBuffer = audioCtx.createBuffer(1, sampleRate * bgmDuration, sampleRate);
        const bgmData = bgmBuffer.getChannelData(0);
        
        // C4, E4, G4, C5, G4, E4, D4, G3 (도, 미, 솔, 높은도, 솔, 미, 레, 낮은솔)
        const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 196.00]; 
        const noteDuration = bgmDuration / notes.length;

        for (let i = 0; i < bgmBuffer.length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t / noteDuration);
            const freq = notes[noteIndex];
            const noteT = t % noteDuration; // 현재 음표 내에서의 시간 (0 ~ noteDuration)

            const wave = Math.sign(Math.sin(t * Math.PI * 2 * freq)); // 8비트 특유의 사각파(Square Wave)
            const envelope = Math.exp(-noteT * 8); // 음이 튕기듯 끊어지는 스타카토 효과
            bgmData[i] = wave * envelope * 0.05; // 0.05는 전체 볼륨 (배경음악이므로 작게)
        }
        this.cache.audio.add('bgm', bgmBuffer);
    }

    create() {
        // 💾 전역 데이터 자동 저장 이벤트 등록 (어느 씬에서든 playerData가 갱신되면 발동)
        const savePlayerData = (parent, key, value) => {
            if (key === 'playerData') {
                localStorage.setItem('baseball_rpg_save', JSON.stringify(value));
            }
        };
        this.registry.events.on('setdata', savePlayerData);
        this.registry.events.on('changedata', savePlayerData);

        // 🎵 합성된 BGM 재생 (전역 설정)
        this.sound.play('bgm', { loop: true, volume: 0.4 });

        // 에셋 로딩이 끝나면 create()가 실행되며, 바로 타이틀 씬으로 전환합니다.
        console.log('에셋 로드 완료! 타이틀로 이동');
        this.scene.start('TitleScene');
    }
}