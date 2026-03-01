/**
 * Market pricing engine.
 * Generates daily prices per location with randomized fluctuations.
 * Handles price spikes and crashes.
 */

import { DRUGS } from './items.js';
import { LOCATIONS } from './locations.js';

const SPIKE_CHANCE = 0.08;   // 8% chance per drug per day for a price event
const SPIKE_MULTIPLIER = 3.5; // Price spikes multiply by this
const CRASH_MULTIPLIER = 0.25; // Price crashes multiply by this

/**
 * Generate a random price for a drug at a location.
 */
function generateBasePrice(drug, location) {
    const modifier = location.priceModifiers[drug.id] || 1.0;
    const range = drug.baseMax - drug.baseMin;

    // Random price within range, modified by location
    const rawPrice = drug.baseMin + Math.random() * range;

    // Apply volatility: higher volatility = more random spread
    const volatilitySwing = 1 + (Math.random() * 2 - 1) * drug.volatility;

    let price = Math.round(rawPrice * modifier * volatilitySwing);

    // Enforce floors: lower-value items have higher relative floors
    const floor = Math.round(drug.baseMin * 0.6 * modifier);
    price = Math.max(price, floor);

    return price;
}

/**
 * Generate all prices for all drugs at all locations for a given day.
 * Returns: { locationId: { drugId: price, ... }, ... }
 */
export function generateDailyPrices() {
    const prices = {};
    const events = [];

    for (const location of LOCATIONS) {
        prices[location.id] = {};

        for (const drug of DRUGS) {
            let price = generateBasePrice(drug, location);

            // Check for price spike or crash
            if (Math.random() < SPIKE_CHANCE) {
                const isCrash = Math.random() < 0.5;
                if (isCrash) {
                    price = Math.round(price * CRASH_MULTIPLIER);
                    events.push({
                        type: 'price_crash',
                        drugId: drug.id,
                        drugName: drug.name,
                        locationId: location.id,
                        locationName: location.name,
                        message: drug.spikeMessages.crash,
                        price
                    });
                } else {
                    price = Math.round(price * SPIKE_MULTIPLIER);
                    events.push({
                        type: 'price_spike',
                        drugId: drug.id,
                        drugName: drug.name,
                        locationId: location.id,
                        locationName: location.name,
                        message: drug.spikeMessages.spike,
                        price
                    });
                }
            }

            prices[location.id][drug.id] = price;
        }
    }

    return { prices, events };
}

/**
 * Format a price for display.
 */
export function formatMoney(amount) {
    if (amount >= 1000000) {
        return '$' + (amount / 1000000).toFixed(2) + 'M';
    }
    return '$' + amount.toLocaleString();
}
