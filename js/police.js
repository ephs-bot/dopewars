/**
 * Police & heat system.
 * Heat builds from carrying drugs, checked each travel for encounters.
 */

import { DRUGS, SMALL_ARMS, HEAVY_ARMS } from './items.js';
import { formatMoney } from './market.js';

// ── Heat ──────────────────────────────────────────────────────────

export function updateHeat(state, location) {
    let invHeat = 0;
    for (const drug of DRUGS) {
        const qty = state.inventory[drug.id] || 0;
        if (qty > 0) {
            // Each drug contributes heat proportional to its heatLevel and quantity
            invHeat += drug.heatLevel * Math.min(qty / 15, 1.5);
        }
    }
    // Normalize: max invHeat ~7 (all 7 drugs max), cap contribution
    invHeat = Math.min(invHeat / 7, 1);

    // Heat build modifier: DEA Task Force doubles it, Insider perk reduces it by 25%
    let heatMult = 1;
    if (state.activeBossEvent?.type === 'dea') heatMult = 2;
    if (state.perk === 'insider') heatMult *= 0.75;

    // Heat: blends current heat with new inventory + location pressure, minus natural decay
    state.heat = Math.max(0, Math.min(1,
        state.heat * 0.72
        + invHeat * 0.18 * heatMult
        + location.policePresence * 0.08 * heatMult
        - 0.04
    ));
}

export function checkPoliceEncounter(state, location) {
    // Base chance is heat * policePresence; min threshold so low heat = very rare
    const chance = Math.pow(state.heat, 1.4) * location.policePresence * 0.8;
    if (Math.random() > chance) return null;

    // Crackdown boss forces K-9 on every encounter; otherwise high-heat chance
    const isK9 = state.activeBossEvent?.type === 'crackdown'
        || (state.heat > 0.65 && Math.random() < 0.35);
    return {
        type: isK9 ? 'k9' : 'police',
        title: isK9 ? 'K-9 Unit!' : 'Police!',
        message: isK9
            ? "A K-9 unit has you cornered. That dog knows exactly what you're carrying."
            : 'Cops are closing in! What do you do?',
        image: isK9 ? 'k-9 dogs.png' : 'cops.png',
        isK9
    };
}

// ── Encounter Choices ────────────────────────────────────────────

export function runFromPolice(state, isK9) {
    const invCount = _invCount(state);
    const weight = invCount / state.maxCapacity;
    const weaponBonus = _getBestCombatBonus(state) * 0.2; // weapons help a little with escape

    let chance = 0.62 - weight * 0.42 + weaponBonus;
    if (isK9) chance -= 0.22;
    chance = Math.max(0.05, Math.min(0.92, chance));

    if (Math.random() < chance) {
        state.heat = Math.max(0, state.heat - 0.08);
        return { success: true, message: "You bolted down an alley and lost them. Close one." };
    }

    const fraction = isK9 ? 0.65 : 0.35;
    const lost = _confiscate(state, fraction);
    state.heat = Math.min(1, state.heat + 0.18);
    return { success: false, message: `Caught! Cops confiscated ${lost} units of product.` };
}

export function fightPolice(state, isK9) {
    const weaponBonus = _getBestCombatBonus(state);
    let chance = weaponBonus * 0.85;
    if (isK9) chance -= 0.12;
    chance = Math.max(0.02, Math.min(0.90, chance));

    const dmgReduce = state.damageReduction || 0;

    if (Math.random() < chance) {
        state.heat = Math.max(0, state.heat - 0.18);
        return { success: true, message: "You fought them off! They'll think twice before coming at you again." };
    }

    const cashLostPct = Math.max(0.05, 0.28 - dmgReduce * 0.14);
    const cashLost = Math.round(state.cash * cashLostPct);
    state.cash = Math.max(0, state.cash - cashLost);
    const drugsLost = _confiscate(state, 1.0);
    state.heat = Math.min(1, state.heat + 0.28);
    state.day += 1;
    if (state.day > state.maxDays) state.gameOver = true;

    return {
        success: false,
        message: `Took a beating. Lost ${formatMoney(cashLost)} and all your product. Night in lock-up.`
    };
}

export function bribePolice(state, amount) {
    if (amount > state.cash) {
        return { success: false, message: 'Not enough cash!', noMoney: true };
    }

    const expected = getSuggestedBribe(state);
    const ratio = amount / expected;
    const chance = Math.min(0.92, ratio * 0.75);

    state.cash -= amount;

    if (Math.random() < chance) {
        state.heat = Math.max(0, state.heat - 0.22);
        return { success: true, message: `The cop pockets ${formatMoney(amount)} and looks the other way.` };
    }

    // Bribe failed: money gone + partial confiscation
    const lost = _confiscate(state, 0.25);
    return {
        success: false,
        message: `Bribe rejected. They took your ${formatMoney(amount)} AND confiscated ${lost} units.`
    };
}

export function payOffCops(state, amount) {
    if (amount <= 0 || amount > state.cash) {
        return { success: false, message: 'Not enough cash!' };
    }
    state.cash -= amount;
    // Heat reduction proportional to payment (diminishing returns)
    const reduction = Math.min(state.heat, (amount / 25000) * 0.35);
    state.heat = Math.max(0, state.heat - reduction);
    return {
        success: true,
        message: `Greased some palms with ${formatMoney(amount)}. Heat reduced by ${(reduction * 100).toFixed(0)}%.`
    };
}

export function getSuggestedBribe(state) {
    return Math.round(2500 + state.heat * 18000);
}

// ── Helpers ───────────────────────────────────────────────────────

function _getBestCombatBonus(state) {
    if (!state.weapons || state.weapons.length === 0) return 0;
    const allWeapons = [...SMALL_ARMS, ...HEAVY_ARMS];
    let best = 0;
    for (const weaponId of state.weapons) {
        const def = allWeapons.find(w => w.id === weaponId);
        if (def && (def.combatBonus || 0) > best) best = def.combatBonus;
    }
    return best;
}

function _invCount(state) {
    let n = 0;
    for (const id in state.inventory) n += state.inventory[id];
    return n;
}

function _confiscate(state, fraction) {
    let lost = 0;
    for (const drug of DRUGS) {
        const held = state.inventory[drug.id] || 0;
        if (held > 0) {
            const take = Math.ceil(held * fraction);
            state.inventory[drug.id] = Math.max(0, held - take);
            if (state.inventory[drug.id] === 0) state.avgCost[drug.id] = 0;
            lost += take;
        }
    }
    return lost;
}
