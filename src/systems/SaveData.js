export const SAVE_KEY = 'baseball_rpg_save';

const TEAMS = [
    'KIA 타이거즈', '삼성 라이온즈', 'LG 트윈스', '두산 베어스',
    'KT 위즈', 'SSG 랜더스', '롯데 자이언츠', '한화 이글스',
    'NC 다이노스', '키움 히어로즈'
];

const STAT_FIELDS = {
    pitcher: ['velocity', 'control', 'stamina', 'movement'],
    batter: ['power', 'contact', 'speed', 'fielding']
};

/**
 * Validate user-loaded data, retaining legacy fields and filling in old
 * missing league standings. An invalid payload never enters a game scene.
 */
export function parseSavedPlayer(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    let player;
    try {
        player = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!player || typeof player !== 'object' || Array.isArray(player)) return null;
    if (typeof player.name !== 'string' || !player.name.trim() || player.name.length > 100) return null;
    if (!STAT_FIELDS[player.role]) return null;
    if (typeof player.team !== 'string' || !TEAMS.includes(player.team)) return null;
    if (!player.stats || typeof player.stats !== 'object' || Array.isArray(player.stats)) return null;
    if (!STAT_FIELDS[player.role].every(key => Number.isFinite(player.stats[key]) && player.stats[key] >= 0)) return null;
    if (!Array.isArray(player.schedule) || !player.schedule.length ||
        player.schedule.some(team => !TEAMS.includes(team))) return null;
    const current = player.currentMatchIndex ?? 0;
    if (!Number.isInteger(current) || current < 0 || current > player.schedule.length) return null;

    const standings = {};
    for (const team of TEAMS) {
        const input = player.leagueStandings?.[team] || {};
        const value = {};
        for (const key of ['w', 'l', 'd']) {
            value[key] = Number.isSafeInteger(input[key]) && input[key] >= 0 ? input[key] : 0;
        }
        standings[team] = value;
    }

    return {
        ...player,
        currentMatchIndex: current,
        leagueStandings: standings,
        gold: Number.isFinite(player.gold) && player.gold >= 0 ? player.gold : 0,
        exp: Number.isFinite(player.exp) && player.exp >= 0 ? player.exp : 0
    };
}

/** Storage failures (private mode / permission denial) must not crash the game. */
export function writePlayerSave(player, storage = null) {
    try {
        const target = storage ?? localStorage;
        target.setItem(SAVE_KEY, JSON.stringify(player));
        return true;
    } catch {
        return false;
    }
}
