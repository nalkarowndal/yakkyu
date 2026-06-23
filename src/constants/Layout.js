/**
 * Layout.js - 게임 전역 좌표 상수 관리
 * 
 * 모든 씬에서 공유하는 해상도, 위치, 영역 크기를 한 곳에서 관리합니다.
 * 하드코딩된 좌표로 인한 해상도 버그를 방지합니다.
 */

// ─── 게임 기본 해상도 ───
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CENTER_X = GAME_WIDTH / 2;   // 640
export const CENTER_Y = GAME_HEIGHT / 2;  // 360

// ─── MatchScene: 백스톱(뒤쪽) 시점 좌표 ───
export const BACK_VIEW = {
    MOUND: { x: CENTER_X, y: 300 },
    HOME_PLATE: { x: CENTER_X, y: 650 },
    BATTER_OFFSET: { x: -120, y: 20 },   // 홈플레이트 기준 타자 위치 오프셋
    PITCHER_SCALE: 0.7,
    BATTER_SCALE: 1.8,
    // 스트라이크 존 — 시각/판정 통합 (중심: CENTER_X, y=520)
    STRIKE_ZONE: {
        x: CENTER_X,
        y: 520,
        width: 100,
        height: 150,
        // 판정에 사용할 바운더리 (좌상단~우하단)
        get left() { return this.x - this.width / 2; },   // 590
        get right() { return this.x + this.width / 2; },   // 690
        get top() { return this.y - this.height / 2; },    // 445
        get bottom() { return this.y + this.height / 2; }  // 595
    }
};

// ─── MatchScene: 탑다운(수비) 시점 좌표 ───
export const TOP_DOWN_VIEW = {
    MOUND: { x: CENTER_X, y: 480 },
    HOME_PLATE: { x: CENTER_X, y: 650 },
    STADIUM_POS: { x: CENTER_X, y: 360 },
    CAMERA_BOUNDS: { x: -400, y: -600, width: 2080, height: 1920 },
    CAMERA_ZOOM: 1,
    // 베이스 좌표 (다이아몬드)
    BASES: {
        HOME:   { x: CENTER_X, y: 650 },
        FIRST:  { x: CENTER_X + 320, y: 480 },
        SECOND: { x: CENTER_X, y: 310 },
        THIRD:  { x: CENTER_X - 320, y: 480 },
    }
};

// ─── MatchScene: 수비수(야수) 기본 좌표 ───
export const FIELDER_POSITIONS = [
    { x: 960 + 20, y: 480 - 20, role: '1B', name: '1루수' },
    { x: 800, y: 395, role: '2B', name: '2루수' },
    { x: 320 - 20, y: 480 - 20, role: '3B', name: '3루수' },
    { x: 480, y: 395, role: 'SS', name: '유격수' },
    { x: 300, y: 150,  role: 'LF', name: '좌익수' },
    { x: CENTER_X, y: 100,  role: 'CF', name: '중견수' },
    { x: 980, y: 150,  role: 'RF', name: '우익수' }
];

// ─── MatchScene: 투구 클릭 허용 영역 ───
export const PITCH_CLICK_AREA = {
    minY: 300,
    maxY: 600
};

// ─── MatchScene: 타자 스윙 클릭 제외 영역 ───
export const SWING_CLICK_AREA = {
    minY: 200,
    maxY: 620   // 하단 UI(메시지 배경 y=670 - 여유분) 이전까지만 허용
};

// ─── MatchScene: 투수 구종 버튼 레이아웃 ───
export const PITCH_BUTTON_LAYOUT = {
    startX: 20,
    startY: 260,
    columns: 2,        // 2열 배치
    buttonWidth: 100,
    buttonHeight: 35,
    gapX: 110,         // 열 간격
    gapY: 40,          // 행 간격
};

// ─── MatchScene: UI 위치 상수 ───
export const MATCH_UI = {
    ROLE_TEXT: { x: GAME_WIDTH - 20, y: 650 },
    AI_STAT_TEXT: { x: GAME_WIDTH - 20, y: 250 },
    RESULT_TEXT: { x: CENTER_X, y: 320 },
    STATUS_TEXT: { x: CENTER_X, y: 690 },
    MISSION_TEXT: { x: CENTER_X, y: 650 },
    MSG_BG: { x: CENTER_X, y: 670, width: GAME_WIDTH, height: 80 },
    EXIT_BTN: { x: GAME_WIDTH - 20, y: 20 },
    MUTE_BTN: { x: GAME_WIDTH - 110, y: 20 },
    // 스코어보드
    SCOREBOARD: { x: 20, y: 20 },
    STEAL_BTN: { x: 20, y: 85 },
    // 투수 대시보드
    PITCHER_DASHBOARD: { x: 1000, y: 480 },
    // 미니맵
    MINIMAP: { x: GAME_WIDTH - 90, y: 120 },
};

// ─── DialogSystem: 대화창 위치 ───
export const DIALOG_UI = {
    BG: { x: CENTER_X, y: 560, width: 900, height: 150 },
    PORTRAIT_BG: { x: CENTER_X - 340, y: 560, size: 110 },
    PORTRAIT: { x: CENTER_X - 340, y: 560 },
    NAME_TEXT: { x: CENTER_X - 270, y: 470 },
    DIALOGUE_TEXT: { x: CENTER_X - 270, y: 510, wordWrapWidth: 650 },
};

// ─── TownScene: 이동 범위 ───
export const TOWN_BOUNDS = {
    CAR_HORIZONTAL: { start: -100, end: GAME_WIDTH + 100 },
    CAR_VERTICAL: { start: -100, end: GAME_HEIGHT + 50 },
    CLOUD: { startX: -100, endX: GAME_WIDTH + 100, minY: 10, maxY: 500 },
};

// ─── BootScene: 백스톱 텍스처 내 주요 좌표 ───
export const BACKSTOP_TEXTURE = {
    WIDTH: GAME_WIDTH,
    HEIGHT: GAME_HEIGHT,
    MOUND_CENTER: { x: CENTER_X, y: 330 },   // 텍스처 내 마운드 흙 중심
    MOUND_RUBBER: { x: CENTER_X - 20, y: 324, width: 40, height: 6 },
    HOME_PLATE_CENTER: { x: CENTER_X, y: 650 },
};
