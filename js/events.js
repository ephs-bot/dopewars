/**
 * Random event engine.
 * Generates travel events: police, goon visits, muggings, lucky finds, etc.
 */

import { DRUGS } from './items.js';
import { LOCATIONS } from './locations.js';
import { formatMoney } from './market.js';
import { checkGoonVisit } from './economy.js';
import { updateHeat, checkPoliceEncounter } from './police.js';

/**
 * Called after travel() updates state.
 * Returns an array of events the UI should display in order.
 * Auto-resolve events (mugging, find cash, etc.) have their effects applied immediately.
 * Choice events (police) are returned for the UI to resolve interactively.
 */
export function generateTravelEvents(state) {
    const events = [];
    const location = LOCATIONS.find(l => l.id === state.currentLocation);

    // 1. Update heat (always runs)
    updateHeat(state, location);

    // 2. Police encounter (requires player choice — no effects applied yet)
    const policeEvent = checkPoliceEncounter(state, location);
    if (policeEvent) {
        events.push(policeEvent);
    }

    // 3. Goon visit (auto-resolve: effects applied in checkGoonVisit)
    const goonResult = checkGoonVisit(state);
    if (goonResult) {
        events.push({ type: 'goon', ...goonResult });
    }

    // 4. One random street event per trip (auto-resolve)
    if (events.length < 2) {
        const streetEvent = rollStreetEvent(state);
        if (streetEvent) events.push(streetEvent);
    }

    return events;
}

// ── Street Events (auto-resolve) ─────────────────────────────────

function rollStreetEvent(state) {
    // Build pool of eligible events with weights
    const pool = [];

    if (state.cash > 200) {
        pool.push({ weight: 5, fn: () => eventMugging(state) });
    }

    const freeSpace = state.maxCapacity - _invCount(state);
    if (freeSpace > 0) {
        pool.push({ weight: 4, fn: () => eventFindDrugs(state) });
    }

    pool.push({ weight: 4, fn: () => eventFindCash(state) });

    if (state.stash > 500) {
        pool.push({ weight: 3, fn: () => eventHouseRobbed(state) });
    }

    if (state.bitcoin > 0.001) {
        pool.push({ weight: 2, fn: () => eventBTCHacked(state) });
    }

    if (pool.length === 0) return null;

    // ~18% base chance of any street event happening
    if (Math.random() > 0.18) return null;

    const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) return entry.fn();
    }

    return pool[pool.length - 1].fn();
}

function eventMugging(state) {
    const pct = 0.08 + Math.random() * 0.18;
    const lost = Math.round(state.cash * pct);
    state.cash = Math.max(0, state.cash - lost);
    return {
        type: 'mugging',
        title: 'Jumped!',
        message: `You got jumped in an alley by a couple of guys. They grabbed ${formatMoney(lost)} from you before taking off.`,
        image: null
    };
}

function eventFindDrugs(state) {
    const drug = DRUGS[Math.floor(Math.random() * DRUGS.length)];
    const space = state.maxCapacity - _invCount(state);
    const qty = Math.min(Math.floor(Math.random() * 8) + 2, space);

    // Weighted average: found drugs cost $0
    const oldQty = state.inventory[drug.id];
    const oldTotalCost = (state.avgCost[drug.id] || 0) * oldQty;
    state.inventory[drug.id] += qty;
    const newQty = state.inventory[drug.id];
    state.avgCost[drug.id] = newQty > 0 ? Math.round(oldTotalCost / newQty) : 0;

    return {
        type: 'find_drugs',
        title: 'Lucky Find!',
        message: `You spotted an abandoned bag in a doorway — ${qty} ${drug.unit} of ${drug.name} inside. You grab it.`,
        image: null
    };
}

function eventFindCash(state) {
    const cash = Math.round((300 + Math.random() * 4700) / 100) * 100;
    state.cash += cash;
    return {
        type: 'find_cash',
        title: 'Found Cash!',
        message: `You spot a fat envelope tucked under a trash can. ${formatMoney(cash)} in unmarked bills. No questions asked.`,
        image: null
    };
}

function eventHouseRobbed(state) {
    const pct = 0.15 + Math.random() * 0.30;
    const lost = Math.round(state.stash * pct);
    state.stash = Math.max(0, state.stash - lost);
    return {
        type: 'house_robbed',
        title: 'Robbed!',
        message: `Someone broke into your place while you were out. They got away with ${formatMoney(lost)} from your stash.`,
        image: null
    };
}

function eventBTCHacked(state) {
    const pct = 0.08 + Math.random() * 0.18;
    const lost = state.bitcoin * pct;
    state.bitcoin = Math.max(0, state.bitcoin - lost);
    if (state.bitcoin < 0.00001) state.bitcoin = 0;
    return {
        type: 'btc_hacked',
        title: 'Wallet Hacked!',
        message: `A phishing link you clicked last week just came back to haunt you. Lost ${lost.toFixed(4)} BTC from your wallet.`,
        image: null
    };
}

// ── Utility ───────────────────────────────────────────────────────

function _invCount(state) {
    let n = 0;
    for (const id in state.inventory) n += state.inventory[id];
    return n;
}
