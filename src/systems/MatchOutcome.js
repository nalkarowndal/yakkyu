/**
 * A player's mission can succeed despite the team losing the match.
 * Standings always track actual team score independently from mission rewards.
 */
export function getTeamResult(scorePlayer, scoreAI) {
    if (!Number.isFinite(scorePlayer) || !Number.isFinite(scoreAI)) {
        throw new TypeError('Final scores must be finite numbers');
    }
    if (scorePlayer > scoreAI) return 'win';
    if (scorePlayer < scoreAI) return 'loss';
    return 'draw';
}
