/**
 * Leaderboard: persists high scores to localStorage.
 */

const STORAGE_KEY = 'dopeWars_leaderboard_v1';
export const MAX_ENTRIES = 10;

export function getLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveScore(name, score, gameState) {
    const board = getLeaderboard();
    board.push({
        name: (name || '').trim() || 'Anonymous',
        score,
        difficulty: gameState.difficulty,
        day: gameState.day,
        maxDays: gameState.maxDays,
        date: new Date().toLocaleDateString()
    });
    board.sort((a, b) => b.score - a.score);
    if (board.length > MAX_ENTRIES) board.length = MAX_ENTRIES;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    return board;
}

export function clearLeaderboard() {
    localStorage.removeItem(STORAGE_KEY);
}
