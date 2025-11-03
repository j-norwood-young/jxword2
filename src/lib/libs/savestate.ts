import type { XD } from '$lib/types/XD';
export function saveState(state: XD) {
    const stateString = JSON.stringify(state);
    localStorage.setItem('jxword-creator', stateString);
}

export function restoreState() {
    const stateString = localStorage.getItem('jxword-creator');
    if (stateString && stateString !== 'undefined') {
        const state = JSON.parse(stateString);
        return state;
    } else {
        return null;
    }
}

export function clearState() {
    localStorage.clear();
}