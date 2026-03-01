/**
 * Drug and weapon item definitions.
 * Price ranges roughly track real-world street prices.
 * Higher-value items = wider swings but steady floors.
 * Lower-value items = tighter ranges, higher floors relative to base.
 */

export const DRUGS = [
    {
        id: 'weed',
        name: 'Weed',
        emoji: '',
        baseMin: 500,
        baseMax: 2500,
        volatility: 0.18,
        heatLevel: 0.1,
        unit: 'lb',
        dealerImage: 'pot dealers.png',
        spikeMessages: {
            crash: 'A massive weed harvest has flooded the streets!',
            spike: 'Dispensary raids have dried up supply — street prices are soaring!'
        }
    },
    {
        id: 'mushrooms',
        name: 'Mushrooms',
        emoji: '',
        baseMin: 800,
        baseMax: 3500,
        volatility: 0.22,
        heatLevel: 0.1,
        unit: 'oz',
        dealerImage: 'mushroom dealer.png',
        spikeMessages: {
            crash: 'Festival season is over — mushrooms are everywhere!',
            spike: 'A microdosing trend has everyone hunting for shrooms!'
        }
    },
    {
        id: 'ecstasy',
        name: 'Ecstasy',
        emoji: '',
        baseMin: 400,
        baseMax: 2000,
        volatility: 0.25,
        heatLevel: 0.2,
        unit: 'pill',
        dealerImage: 'x dealer.png',
        spikeMessages: {
            crash: 'A lab in Jersey just dumped a ton of pills on the market!',
            spike: 'Rave season is here — club kids are paying premium for molly!'
        }
    },
    {
        id: 'acid',
        name: 'Acid',
        emoji: '',
        baseMin: 1000,
        baseMax: 5000,
        volatility: 0.30,
        heatLevel: 0.25,
        unit: 'sheet',
        dealerImage: 'acid dealer.png',
        spikeMessages: {
            crash: 'A chemist got busted but his stash hit the streets!',
            spike: 'Word spread about a legendary batch — everyone wants in!'
        }
    },
    {
        id: 'fentanyl',
        name: 'Fentanyl',
        emoji: '',
        baseMin: 200,
        baseMax: 1500,
        volatility: 0.25,
        heatLevel: 0.35,
        unit: 'gram',
        dealerImage: 'fent manufacturers.png',
        spikeMessages: {
            crash: 'Chinese imports flooded the market with cheap fent!',
            spike: 'DEA crackdowns have made fentanyl scarce — prices are insane!'
        }
    },
    {
        id: 'meth',
        name: 'Meth',
        emoji: '',
        baseMin: 1000,
        baseMax: 7000,
        volatility: 0.35,
        heatLevel: 0.4,
        unit: 'gram',
        dealerImage: 'meth dealers.png',
        spikeMessages: {
            crash: 'A new supercook flooded the market with cheap product!',
            spike: 'The DEA burned a major lab — supply just dried up!'
        }
    },
    {
        id: 'heroin',
        name: 'Heroin',
        emoji: '',
        baseMin: 3000,
        baseMax: 15000,
        volatility: 0.40,
        heatLevel: 0.5,
        unit: 'brick',
        dealerImage: 'smack dealers.png',
        spikeMessages: {
            crash: 'A cartel shipment made it through — smack is dirt cheap!',
            spike: 'Border seizures have choked supply — junkies are desperate!'
        }
    },
    {
        id: 'cocaine',
        name: 'Cocaine',
        emoji: '',
        baseMin: 8000,
        baseMax: 35000,
        volatility: 0.45,
        heatLevel: 0.7,
        unit: 'kilo',
        dealerImage: 'narco trafficantes.png',
        spikeMessages: {
            crash: 'The Colombians just dropped a mountain of blow on NYC!',
            spike: 'Wall Street bonuses hit — bankers are buying coke like water!'
        }
    }
];

export const SMALL_ARMS = [
    { id: 'switchblade', name: 'Switchblade', price: 500, combatBonus: 0.1, description: 'Small boost to mugging defense' },
    { id: 'pistol', name: 'Pistol', price: 3000, combatBonus: 0.25, description: 'Medium boost to police/mugging encounters' },
    { id: 'sawed_off', name: 'Sawed-off Shotgun', price: 6000, combatBonus: 0.35, description: 'Good close-range defense' },
    { id: 'uzi', name: 'Uzi', price: 12000, combatBonus: 0.45, description: 'Strong boost to all combat encounters' }
];

export const HEAVY_ARMS = [
    { id: 'ak47', name: 'AK-47', price: 25000, combatBonus: 0.6, description: 'Major boost to all combat, intimidation factor' },
    { id: 'm16', name: 'M16', price: 40000, combatBonus: 0.75, description: 'Superior combat effectiveness' },
    { id: 'rpg', name: 'RPG', price: 75000, combatBonus: 0.95, description: 'Near-guaranteed escape from any encounter' },
    { id: 'body_armor', name: 'Body Armor', price: 15000, combatBonus: 0, damageReduction: 0.5, description: 'Passive damage reduction from all encounters' }
];

export const INVENTORY_UPGRADES = [
    { id: 'trenchcoat', name: 'Trenchcoat', price: 1000, capacity: 150, description: 'Carry up to 150 units' },
    { id: 'van', name: 'Van', price: 10000, capacity: 300, description: 'Carry up to 300 units' }
];
