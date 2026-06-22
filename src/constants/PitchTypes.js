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
    }
};

export const PITCH_LIST = Object.values(PITCH_TYPES);