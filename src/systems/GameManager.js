export class GameManager {
    static instance = null;

    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        GameManager.instance = this;
        this.registry = null; // Phaser Registry
    }

    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    init(registry) {
        this.registry = registry;
        
        // Initialize default player data if none exists
        let pd = this.registry.get('playerData');
        if (!pd) {
            pd = {
                name: '테스트유저',
                role: 'batter',
                team: '무소속',
                gold: 0,
                exp: 0,
                affection: 0,
                currentMatchIndex: 0,
                stats: { power: 40, contact: 40, velocity: 40, stamina: 40, speed: 40, fielding: 40, control: 40, movement: 40 }
            };
            this.registry.set('playerData', pd);
        }
    }

    getPlayerData() {
        return this.registry ? this.registry.get('playerData') : null;
    }

    savePlayerData(data) {
        if (this.registry) {
            this.registry.set('playerData', data);
        }
    }

    addGold(amount) {
        const pd = this.getPlayerData();
        if (pd) {
            pd.gold = (pd.gold || 0) + amount;
            this.savePlayerData(pd);
        }
    }

    addExp(amount) {
        const pd = this.getPlayerData();
        if (pd) {
            pd.exp = (pd.exp || 0) + amount;
            this.savePlayerData(pd);
        }
    }

    // 리그 및 경기 스케줄
    getMatchSchedule() {
        const pd = this.getPlayerData();
        return pd ? pd.schedule : null;
    }

    getCurrentMatchIndex() {
        const pd = this.getPlayerData();
        return pd ? (pd.currentMatchIndex || 0) : 0;
    }

    advanceMatch() {
        const pd = this.getPlayerData();
        if (pd) {
            pd.currentMatchIndex = (pd.currentMatchIndex || 0) + 1;
            this.savePlayerData(pd);
        }
    }
}
