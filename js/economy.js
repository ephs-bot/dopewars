/**
 * Economy system: loan shark, bitcoin trading, cash stash.
 */

import { formatMoney } from './market.js';

// ── Bitcoin ───────────────────────────────────────────────────────

const BTC_MIN = 20000;
const BTC_MAX = 80000;

export function generateBitcoinPrice(previous) {
    if (!previous) {
        return Math.round(BTC_MIN + Math.random() * (BTC_MAX - BTC_MIN));
    }
    // Random walk with mild mean-reversion
    const mid = (BTC_MIN + BTC_MAX) / 2;
    const pull = (mid - previous) * 0.05;
    const swing = previous * (Math.random() * 2 - 1) * 0.28;
    const next = Math.round(previous + swing + pull);
    return Math.max(Math.round(BTC_MIN * 0.4), Math.min(Math.round(BTC_MAX * 1.6), next));
}

export function buyBitcoin(state, cashAmount) {
    if (cashAmount <= 0 || cashAmount > state.cash) {
        return { success: false, message: 'Not enough cash!' };
    }
    const btc = cashAmount / state.bitcoinPrice;
    state.cash -= cashAmount;
    state.bitcoin += btc;
    return { success: true, message: `Bought ${btc.toFixed(4)} BTC for ${formatMoney(cashAmount)}` };
}

export function sellBitcoin(state, btcAmount) {
    btcAmount = Math.min(btcAmount, state.bitcoin);
    if (btcAmount <= 0) {
        return { success: false, message: 'No BTC to sell!' };
    }
    const cash = Math.round(btcAmount * state.bitcoinPrice);
    state.bitcoin -= btcAmount;
    if (state.bitcoin < 0.00001) state.bitcoin = 0;
    state.cash += cash;
    return { success: true, message: `Sold ${btcAmount.toFixed(4)} BTC for ${formatMoney(cash)}` };
}

// ── Cash Stash ────────────────────────────────────────────────────

export function stashCash(state, amount) {
    if (amount <= 0 || amount > state.cash) {
        return { success: false, message: 'Not enough cash on hand!' };
    }
    state.cash -= amount;
    state.stash += amount;
    return { success: true, message: `Stashed ${formatMoney(amount)} at your place.` };
}

export function withdrawCash(state, amount) {
    if (amount <= 0 || amount > state.stash) {
        return { success: false, message: 'Not enough in your stash!' };
    }
    state.stash -= amount;
    state.cash += amount;
    return { success: true, message: `Withdrew ${formatMoney(amount)} from your stash.` };
}

// ── Loan Shark ────────────────────────────────────────────────────

export function payDebt(state, amount) {
    if (amount <= 0 || amount > state.cash) {
        return { success: false, message: 'Not enough cash!' };
    }
    const payment = Math.min(amount, state.debt);
    state.cash -= payment;
    state.debt -= payment;
    state.daysSincePayment = 0;
    state.goonLevel = Math.max(0, state.goonLevel - 1);

    if (state.debt <= 0) {
        state.debt = 0;
        state.goonLevel = 0;
        return { success: true, message: 'Debt fully paid off! The Loan Shark tips his hat.' };
    }
    return { success: true, message: `Paid ${formatMoney(payment)}. Remaining debt: ${formatMoney(state.debt)}` };
}

// ── Goon Escalation ───────────────────────────────────────────────

export const GOON_EVENTS = [
    {
        level: 1,
        title: 'A Warning',
        message: 'The Loan Shark sends his regards.\n\n"Pay up soon, or things get ugly."',
        image: 'loan shark.png',
        daysLost: 0,
        cashPercent: 0,
        capacityLoss: 0
    },
    {
        level: 2,
        title: 'Roughed Up',
        message: "Two goons caught up with you outside the bodega. A punch in the face and a boot to the ribs — you're out for a day.",
        image: 'goons.png',
        daysLost: 1,
        cashPercent: 0,
        capacityLoss: 0
    },
    {
        level: 3,
        title: 'Thrown Down Stairs',
        message: "The goons threw you down a full flight of stairs. You're out for 2 days and they helped themselves to your wallet.",
        image: 'goons.png',
        daysLost: 2,
        cashPercent: 0.15,
        capacityLoss: 0
    },
    {
        level: 4,
        title: 'Broken Legs',
        message: "Baseball bat to both kneecaps. 3 days in the hospital, a large chunk of your cash gone, and you can barely carry anything.",
        image: 'goons.png',
        daysLost: 3,
        cashPercent: 0.30,
        capacityLoss: 30
    }
];

export function checkGoonVisit(state) {
    if (state.debt <= 0) return null;

    // Chance increases with debt-to-assets ratio and days since last payment
    const totalAssets = state.cash + state.stash + state.bitcoin * state.bitcoinPrice + 1;
    const ratio = Math.min(state.debt / totalAssets, 1);
    const daysFactor = Math.min(state.daysSincePayment / 5, 1);
    const chance = ratio * daysFactor * 0.35;

    if (Math.random() > chance) return null;

    const nextLevel = Math.min(state.goonLevel + 1, GOON_EVENTS.length);
    state.goonLevel = nextLevel;

    const evt = { ...GOON_EVENTS[nextLevel - 1] };

    if (evt.daysLost > 0) {
        state.day += evt.daysLost;
    }
    if (evt.cashPercent > 0) {
        evt.cashLost = Math.round(state.cash * evt.cashPercent);
        state.cash = Math.max(0, state.cash - evt.cashLost);
    }
    if (evt.capacityLoss > 0) {
        state.maxCapacity = Math.max(50, state.maxCapacity - evt.capacityLoss);
    }
    if (state.day > state.maxDays) {
        state.gameOver = true;
    }

    return evt;
}
