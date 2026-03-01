/**
 * Core game state machine.
 * Manages game state, turns, buying/selling, and win/lose conditions.
 */

import { DRUGS, SMALL_ARMS, HEAVY_ARMS, INVENTORY_UPGRADES } from './items.js';
import { LOCATIONS } from './locations.js';
import { generateDailyPrices, formatMoney } from './market.js';
import { generateBitcoinPrice } from './economy.js';
import { checkBossEvent } from './bosses.js';

const LOAN_TIERS = [
    { amount: 5000, interestRate: 0.05, difficulty: 'Easy', color: '#4ade80' },
    { amount: 10000, interestRate: 0.08, difficulty: 'Medium', color: '#facc15' },
    { amount: 25000, interestRate: 0.12, difficulty: 'Hard', color: '#f97316' },
    { amount: 50000, interestRate: 0.18, difficulty: 'Insane', color: '#ef4444' }
];

const DEFAULT_MAX_DAYS = 30;
const DEFAULT_CAPACITY = 100;

export { LOAN_TIERS };
export { SMALL_ARMS, HEAVY_ARMS, INVENTORY_UPGRADES };
export const HEAVY_ARMS_UNLOCK = 75000;

export const PERKS = [
    {
        id: 'street_kid',
        name: 'Street Kid',
        description: 'You grew up in the game. Start with 150 carry capacity.',
        icon: '🧥',
        color: '#4ade80'
    },
    {
        id: 'veteran',
        name: 'Veteran',
        description: 'You know how to handle business. Start with a pistol already in your waistband.',
        icon: '🔫',
        color: '#facc15'
    },
    {
        id: 'banker',
        name: 'Banker',
        description: 'Legitimate businessman. No debt, but you only have $2,000 to start.',
        icon: '💼',
        color: '#38bdf8'
    },
    {
        id: 'insider',
        name: 'Insider',
        description: 'Connects everywhere. Heat builds 25% slower. Check prices for every borough.',
        icon: '📡',
        color: '#f97316'
    },
    {
        id: 'no_perk',
        name: 'None',
        description: 'No special background. Just you and the streets.',
        icon: '⬛',
        color: '#6b7280'
    }
];

export function createGameState(loanTierIndex = 1, maxDays = 30, perkId = 'no_perk') {
    const tier = LOAN_TIERS[loanTierIndex];
    const isUnlimited = !maxDays || maxDays === 0;

    const state = {
        // Time
        day: 1,
        maxDays: isUnlimited ? 999999 : maxDays,
        isUnlimited,
        gameOver: false,

        // Economy
        cash: tier.amount,
        debt: tier.amount,
        interestRate: tier.interestRate,
        difficulty: tier.difficulty,

        // Location
        currentLocation: LOCATIONS[0].id,  // Start at Staten Island

        // Inventory
        inventory: {},  // { drugId: quantity }
        avgCost: {},    // { drugId: average price paid per unit }
        maxCapacity: DEFAULT_CAPACITY,
        currentCapacity: 0,

        // Market
        prices: {},
        priceEvents: [],

        // M2: Cash stash & bitcoin
        stash: 0,
        bitcoin: 0,
        bitcoinPrice: generateBitcoinPrice(null),

        // M2: Police heat
        heat: 0,

        // M2: Weapons & armor
        weapons: [],          // array of weapon IDs owned
        damageReduction: 0,   // from body armor

        // M2: Loan shark escalation
        goonLevel: 0,
        daysSincePayment: 0,

        // Boss Events
        activeBossEvent: null,
        bossEventDaysLeft: 0,

        // Perk
        perk: perkId,

        // Stats
        totalBought: 0,
        totalSold: 0,
        totalProfit: 0,
        daysTraveled: 0,
        biggestSale: 0
    };

    // Initialize empty inventory for each drug
    for (const drug of DRUGS) {
        state.inventory[drug.id] = 0;
        state.avgCost[drug.id] = 0;
    }

    // Apply perk effects
    if (perkId === 'street_kid') {
        state.maxCapacity = 150;
    } else if (perkId === 'veteran') {
        state.weapons = ['pistol'];
    } else if (perkId === 'banker') {
        state.cash = 2000;
        state.debt = 0;
    }

    // Generate first day's prices
    const { prices, events } = generateDailyPrices();
    state.prices = prices;
    state.priceEvents = events;

    return state;
}

/**
 * Calculate current inventory count.
 */
export function getInventoryCount(state) {
    let count = 0;
    for (const drugId in state.inventory) {
        count += state.inventory[drugId];
    }
    return count;
}

/**
 * Calculate the market value of current inventory.
 */
export function getInventoryValue(state) {
    let value = 0;
    const locationPrices = state.prices[state.currentLocation];
    for (const drugId in state.inventory) {
        value += state.inventory[drugId] * (locationPrices[drugId] || 0);
    }
    return value;
}

/**
 * Buy a drug at the current location.
 */
export function buyDrug(state, drugId, quantity) {
    const price = state.prices[state.currentLocation][drugId];
    const totalCost = price * quantity;
    const currentCount = getInventoryCount(state);
    const spaceAvailable = state.maxCapacity - currentCount;

    if (quantity > spaceAvailable) {
        return { success: false, message: `Not enough space! You can carry ${spaceAvailable} more units.` };
    }

    if (totalCost > state.cash) {
        const maxAffordable = Math.floor(state.cash / price);
        return { success: false, message: `Not enough cash! You can afford ${maxAffordable} units.` };
    }

    // Update average cost (weighted average)
    const existingQty = state.inventory[drugId];
    const existingCost = state.avgCost[drugId] * existingQty;
    const newTotalQty = existingQty + quantity;
    state.avgCost[drugId] = Math.round((existingCost + totalCost) / newTotalQty);

    state.cash -= totalCost;
    state.inventory[drugId] = newTotalQty;
    state.totalBought += totalCost;

    return {
        success: true,
        message: `Bought ${quantity} ${getDrugById(drugId).unit} of ${getDrugById(drugId).name} for ${formatMoney(totalCost)}`,
        cost: totalCost
    };
}

/**
 * Sell a drug at the current location.
 */
export function sellDrug(state, drugId, quantity) {
    if (state.inventory[drugId] < quantity) {
        return { success: false, message: `You only have ${state.inventory[drugId]} to sell!` };
    }

    const price = state.prices[state.currentLocation][drugId];
    const totalRevenue = price * quantity;

    state.cash += totalRevenue;
    state.inventory[drugId] -= quantity;
    if (state.inventory[drugId] === 0) {
        state.avgCost[drugId] = 0;
    }
    state.totalSold += totalRevenue;
    state.totalProfit += totalRevenue;

    if (totalRevenue > state.biggestSale) {
        state.biggestSale = totalRevenue;
    }

    return {
        success: true,
        message: `Sold ${quantity} ${getDrugById(drugId).unit} of ${getDrugById(drugId).name} for ${formatMoney(totalRevenue)}`,
        revenue: totalRevenue
    };
}

/**
 * Travel to a new location. Advances the day.
 */
export function travel(state, locationId) {
    if (locationId === state.currentLocation) {
        return { success: false, message: 'You\'re already here!' };
    }

    state.currentLocation = locationId;
    state.day += 1;
    state.daysTraveled += 1;
    state.daysSincePayment += 1;

    // Apply daily interest on debt
    if (state.debt > 0) {
        state.debt = Math.round(state.debt * (1 + state.interestRate));
    }

    // Tick active boss event
    if (state.bossEventDaysLeft > 0) {
        state.bossEventDaysLeft--;
        if (state.bossEventDaysLeft === 0) {
            state.activeBossEvent = null;
        }
    }

    // Check if game is over before checking boss (no boss on final day)
    if (state.day > state.maxDays) {
        state.gameOver = true;
    }

    // Check for new boss event
    let newBoss = null;
    if (!state.gameOver) {
        newBoss = checkBossEvent(state);
        if (newBoss) {
            state.activeBossEvent = newBoss;
            state.bossEventDaysLeft = newBoss.duration;
        }
    }

    // Generate new prices
    const { prices, events } = generateDailyPrices();
    state.prices = prices;
    state.priceEvents = events;

    // Apply boss price multiplier across all locations
    if (state.activeBossEvent?.priceMultiplier) {
        const mult = state.activeBossEvent.priceMultiplier;
        for (const locId in state.prices) {
            for (const drugId in state.prices[locId]) {
                state.prices[locId][drugId] = Math.max(1, Math.round(state.prices[locId][drugId] * mult));
            }
        }
    }

    // Update bitcoin price daily
    state.bitcoinPrice = generateBitcoinPrice(state.bitcoinPrice);

    const location = getLocationById(locationId);
    return {
        success: true,
        message: `Traveled to ${location.name}. Day ${state.day} of ${state.maxDays}.`,
        events,
        newBoss
    };
}

/**
 * Calculate final score.
 */
export function calculateScore(state) {
    const inventoryValue = getInventoryValue(state);
    const bitcoinValue = Math.round((state.bitcoin || 0) * (state.bitcoinPrice || 0));
    return state.cash + (state.stash || 0) + bitcoinValue + inventoryValue - state.debt;
}

/**
 * Buy a weapon from an arms dealer.
 */
export function buyWeapon(state, weaponId) {
    const allWeapons = [...SMALL_ARMS, ...HEAVY_ARMS];
    const weapon = allWeapons.find(w => w.id === weaponId);
    if (!weapon) return { success: false, message: 'Unknown weapon.' };
    if (state.weapons.includes(weaponId)) return { success: false, message: 'You already own this.' };
    if (state.cash < weapon.price) return { success: false, message: `Need ${formatMoney(weapon.price)}. You have ${formatMoney(state.cash)}.` };

    state.cash -= weapon.price;
    state.weapons.push(weaponId);

    if (weapon.damageReduction) {
        state.damageReduction = Math.max(state.damageReduction, weapon.damageReduction);
    }

    return { success: true, message: `Bought ${weapon.name} for ${formatMoney(weapon.price)}!` };
}

/**
 * Buy an inventory capacity upgrade.
 */
export function buyInventoryUpgrade(state, upgradeId) {
    const upgrade = INVENTORY_UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return { success: false, message: 'Unknown upgrade.' };
    if (state.maxCapacity >= upgrade.capacity) return { success: false, message: 'You already have a better setup.' };
    if (state.cash < upgrade.price) return { success: false, message: `Need ${formatMoney(upgrade.price)}.` };

    state.cash -= upgrade.price;
    state.maxCapacity = upgrade.capacity;

    return { success: true, message: `Got the ${upgrade.name}! You can now carry ${upgrade.capacity} units.` };
}

/**
 * Get drug definition by ID.
 */
export function getDrugById(drugId) {
    return DRUGS.find(d => d.id === drugId);
}

/**
 * Get location definition by ID.
 */
export function getLocationById(locationId) {
    return LOCATIONS.find(l => l.id === locationId);
}
