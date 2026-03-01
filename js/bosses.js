/**
 * Boss Events — special conditions that trigger every 10 days.
 * Inspired by Balatro's Boss Blinds. Each event creates a unique challenge for a few days.
 */

export const BOSS_EVENTS = [
    {
        id: 'crackdown',
        name: 'CRACKDOWN WEEK',
        description: 'Police are deploying K-9 units across all boroughs. Every police encounter brings a dog.',
        flavor: '"They\'ve got dogs working every corner. Not a good time to be holding."',
        duration: 3,
        type: 'crackdown',
        color: '#ef4444'
    },
    {
        id: 'market_crash',
        name: 'MARKET CRASH',
        description: 'Fear and police raids have tanked demand everywhere. All street prices are halved.',
        flavor: '"Nobody\'s buying. Everybody\'s scared. Prices are in the gutter."',
        duration: 2,
        type: 'price',
        priceMultiplier: 0.5,
        color: '#f97316'
    },
    {
        id: 'dea_taskforce',
        name: 'DEA TASK FORCE',
        description: 'Federal agents are in town watching everything. Heat builds twice as fast.',
        flavor: '"Unmarked Crown Vics on every block. Those ain\'t tourists."',
        duration: 3,
        type: 'dea',
        color: '#8b5cf6'
    },
    {
        id: 'street_war',
        name: 'STREET WAR',
        description: 'Gang violence has locked down The Bronx and Midtown. Travel there is suicide.',
        flavor: '"Three bodies dropped last night. Those blocks are a no-go zone right now."',
        duration: 2,
        type: 'lockdown',
        lockedLocations: ['bronx', 'midtown'],
        color: '#dc2626'
    },
    {
        id: 'supply_drought',
        name: 'SUPPLY DROUGHT',
        description: 'A string of major busts choked the supply chain. All street prices are doubled.',
        flavor: '"Can\'t find product anywhere. Buyers are getting desperate — name your price."',
        duration: 2,
        type: 'price',
        priceMultiplier: 2.0,
        color: '#4ade80'
    }
];

/**
 * Check if a new boss event should trigger on the current day.
 * Fires on day multiples of 10 with a 15% skip chance for variety.
 * Returns a new boss event object or null.
 */
export function checkBossEvent(state) {
    if (state.activeBossEvent) return null;
    if (state.day % 10 !== 0) return null;
    if (Math.random() < 0.15) return null;
    return { ...BOSS_EVENTS[Math.floor(Math.random() * BOSS_EVENTS.length)] };
}
