// 구종별 물리 엔진 및 시각 효과 파라미터 정의
export const PITCH_TYPES = {
    FOUR_SEAM: {
        id: 'four_seam',
        name: '포심',
        desc: '기본적인 직구. 빠르고 곧게 날아갑니다.',
        speedRatio: 1.0,
        speed: 1200,      // 공이 도달하는 기본 시간 (밀리초)
        breakX: 0,        // 좌우 휘어짐 (픽셀)
        dropY: 0,         // 상하 떨어짐 (픽셀)
        curveEase: 'Linear', // 휘어지는 타이밍 (포심은 직선)
        color: 0xffffff   // 공 잔상 효과용 색상 (선택 사항)
    },
    CURVE: {
        id: 'curve',
        name: '커브',
        desc: '크게 휘어지며 떨어지는 변화구.',
        speedRatio: 0.8,
        speed: 1600,
        breakX: 50,       // 우타자 기준 바깥쪽으로 살짝
        dropY: 150,       // 홈플레이트 근처에서 크게 떨어짐
        curveEase: 'Sine.easeIn', // 끝에서 급격히 떨어지는 느낌
        color: 0x88ccff
    },
    SLIDER: {
        id: 'slider',
        name: '슬라이더',
        desc: '직구처럼 오다가 옆으로 빠르게 휘는 구종.',
        speedRatio: 0.9,
        speed: 1300,
        breakX: 120,      // 옆으로 크게 휨
        dropY: 30,        // 살짝 떨어짐
        curveEase: 'Cubic.easeIn',
        color: 0xffaaaa
    },
    CHANGEUP: {
        id: 'changeup',
        name: '체인지업',
        desc: '직구와 비슷한 궤적이지만 타자 앞에서 떨어집니다.',
        speedRatio: 0.85,
        speed: 1700,
        breakX: -30,      // 역방향으로 살짝
        dropY: 100,       // 타자 앞에서 뚝 떨어짐
        curveEase: 'Quad.easeIn',
        color: 0xaaffaa
    },
    SINKER: {
        id: 'sinker',
        name: '싱커',
        desc: '타자 몸쪽으로 떨어지며 가라앉는 구종.',
        speedRatio: 0.95,
        speed: 1250,
        breakX: -80,
        dropY: 80,
        curveEase: 'Cubic.easeInOut',
        color: 0xffffaa
    },
    FORK: {
        id: 'fork',
        name: '포크볼',
        desc: '타자 앞에서 급격하게 떨어지는 구종.',
        speedRatio: 0.9,
        speed: 1400,
        breakX: 0,
        dropY: 180,       // 위에서 아래로 꽂히는 느낌
        curveEase: 'Expo.easeIn', // 도착 직전에 미친듯이 떨어짐
        color: 0xffddaa
    },
    TWO_SEAM: {
        id: 'two_seam',
        name: '투심',
        desc: '포심처럼 빠르지만 타자 몸쪽으로 살짝 파고듭니다.',
        speedRatio: 0.98,
        speed: 1220,
        breakX: -40,
        dropY: 20,
        curveEase: 'Quad.easeIn',
        color: 0xeeeeff
    },
    CUTTER: {
        id: 'cutter',
        name: '커터',
        desc: '직구처럼 오다가 끝에서 반대 방향으로 짧게 꺾입니다.',
        speedRatio: 0.95,
        speed: 1250,
        breakX: 60,
        dropY: 10,
        curveEase: 'Expo.easeIn',
        color: 0xffccee
    },
    SWEEPER: {
        id: 'sweeper',
        name: '스위퍼',
        desc: '슬라이더보다 횡방향 움직임이 극대화된 마구.',
        speedRatio: 0.85,
        speed: 1450,
        breakX: 180,
        dropY: 40,
        curveEase: 'Cubic.easeIn',
        color: 0xff88ff
    },
    SPLITTER: {
        id: 'splitter',
        name: '스플리터',
        desc: '직구처럼 날아오다 홈플레이트 앞에서 짧게 떨어집니다.',
        speedRatio: 0.92,
        speed: 1300,
        breakX: 0,
        dropY: 120,
        curveEase: 'Expo.easeIn',
        color: 0xddffdd
    },
    KNUCKLEBALL: {
        id: 'knuckle',
        name: '너클볼',
        desc: '회전이 없어 궤적을 예측할 수 없게 흔들립니다.',
        speedRatio: 0.6,
        speed: 2000,
        breakX: 0,
        dropY: 60,
        isKnuckle: true, // 너클볼 전용 물리 로직을 위한 플래그
        curveEase: 'Linear',
        color: 0xcccccc
    }
};

export const PITCH_LIST = Object.values(PITCH_TYPES);