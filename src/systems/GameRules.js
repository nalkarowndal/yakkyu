/**
 * Inning-ending rules shared between player batting and pitching modes.
 * The player-controlled club is always the home club in Yakkyu.
 */
export function isWalkOff(state) {
    return state.inning >= 9 && state.isBottom === true
        && state.scorePlayer > state.scoreAI;
}

export function endsAfterTopOfNinth(state) {
    return state.inning >= 9 && state.isBottom === false
        && state.outs >= 3 && state.scorePlayer > state.scoreAI;
}
