export class MatchSystem {
    /**
     * 타격 타이밍과 스탯을 기반으로 스윙 결과를 계산합니다.
     * @param {number} timingDiff - 완벽한 타이밍과의 오차 (ms). 0이 완벽.
     * @param {object} batterStats - 타자의 능력치 (power, contact 등)
     * @param {number} pitchQuality - 투수의 구위 보정값
     * @returns {object} 판정 결과 텍스트, 품질, 색상
     */
    static calculateSwingResult(timingDiff, batterStats, pitchQuality = 1) {
        // 콘택트 스탯이 높을수록 공을 맞출 수 있는 유효 판정(ms)이 넓어짐, 투수 구위(pitchQuality)에 반비례
        const contactZone = Math.max(20, (50 + (batterStats.contact * 2)) / pitchQuality); 
        // 완벽한 타격으로 인정되는 좁은 프레임 (ms)
        const perfectZone = Math.max(5, 15 / pitchQuality); 

        // 얼마나 빨리, 혹은 늦게 쳤는지 절대값 오차
        const absTiming = Math.abs(timingDiff);

        // 1. 유효 판정을 벗어나면 헛스윙
        if (absTiming > contactZone) {
            return { result: '헛스윙 (Miss)', quality: 'Bad', color: '#ff0000' };
        }

        // 2. 완벽한 타이밍 존에 들어온 경우
        if (absTiming <= perfectZone) {
            // 파워 스탯에 비례하여 홈런 확률 계산, 투수 구위에 반비례
            const hrChance = (batterStats.power * 0.5) / pitchQuality; 
            
            // 난수 생성하여 홈런 및 장타 여부 판정
            const rand = Math.random() * 100;
            if (rand < hrChance) {
                return { result: '홈런! (Home Run)', quality: 'Perfect', color: '#ff00ff' };
            } else if (rand < hrChance + 10) {
                return { result: '3루타 (Triple)', quality: 'Perfect', color: '#ff00ff' };
            } else if (rand < hrChance + 30) {
                return { result: '2루타 (Double)', quality: 'Perfect', color: '#00ffff' };
            }
            return { result: '안타 (Hit)', quality: 'Perfect', color: '#00ffff' };
        }

        // 3. 타이밍이 약간 엇나간 경우 (콘택트 존 내부이긴 함)
        // 50% 확률로 파울, 50% 확률로 땅볼/플라이 아웃 처리
        if (Math.random() > 0.5) {
            return { result: '파울 (Foul)', quality: 'Normal', color: '#ffff00' };
        } else {
            return { result: '땅볼 아웃 (Ground Out)', quality: 'Poor', color: '#ffaa00' };
        }
    }
}
