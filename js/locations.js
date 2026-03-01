/**
 * NYC location definitions.
 * Each location has price modifiers per drug and a police presence level.
 */

export const LOCATIONS = [
    {
        id: 'staten_island',
        name: 'Staten Island',
        description: 'Suburban and quiet. Low risk, low reward.',
        policePresence: 0.1,
        priceModifiers: {
            weed: 0.85,
            mushrooms: 0.90,
            ecstasy: 0.80,
            acid: 0.85,
            fentanyl: 0.90,
            meth: 0.85,
            heroin: 0.80,
            cocaine: 0.75
        }
    },
    {
        id: 'bronx',
        name: 'The Bronx',
        description: 'Rough and street-level. Cheap bulk items.',
        policePresence: 0.3,
        priceModifiers: {
            weed: 0.75,
            mushrooms: 0.80,
            ecstasy: 0.85,
            acid: 0.90,
            fentanyl: 0.70,
            meth: 0.75,
            heroin: 0.80,
            cocaine: 0.85
        }
    },
    {
        id: 'queens',
        name: 'Queens',
        description: 'Mixed and diverse. Average prices across the board.',
        policePresence: 0.25,
        priceModifiers: {
            weed: 1.0,
            mushrooms: 1.0,
            ecstasy: 1.0,
            acid: 1.0,
            fentanyl: 1.0,
            meth: 1.0,
            heroin: 1.0,
            cocaine: 1.0
        }
    },
    {
        id: 'brooklyn',
        name: 'Brooklyn',
        description: 'Hip and gentrifying. Psychedelics are in demand.',
        policePresence: 0.2,
        priceModifiers: {
            weed: 1.3,
            mushrooms: 1.4,
            ecstasy: 1.2,
            acid: 1.35,
            fentanyl: 0.85,
            meth: 0.90,
            heroin: 0.90,
            cocaine: 1.1
        }
    },
    {
        id: 'uptown',
        name: 'Uptown',
        description: 'Wealthy and discreet. Cocaine country.',
        policePresence: 0.35,
        priceModifiers: {
            weed: 1.1,
            mushrooms: 1.0,
            ecstasy: 1.15,
            acid: 1.0,
            fentanyl: 0.80,
            meth: 1.2,
            heroin: 1.1,
            cocaine: 1.5
        }
    },
    {
        id: 'midtown',
        name: 'Midtown',
        description: 'Tourist-heavy, cops everywhere. High risk.',
        policePresence: 0.6,
        priceModifiers: {
            weed: 1.15,
            mushrooms: 1.1,
            ecstasy: 1.2,
            acid: 1.1,
            fentanyl: 1.0,
            meth: 1.1,
            heroin: 1.15,
            cocaine: 1.25
        }
    },
    {
        id: 'downtown',
        name: 'Downtown',
        description: 'Financial district. Big money, big risk.',
        policePresence: 0.5,
        priceModifiers: {
            weed: 1.2,
            mushrooms: 1.15,
            ecstasy: 1.3,
            acid: 1.2,
            fentanyl: 1.1,
            meth: 1.15,
            heroin: 1.3,
            cocaine: 1.4
        }
    },
    {
        id: 'long_island',
        name: 'Long Island',
        description: 'Suburban sprawl. Low police, limited variety.',
        policePresence: 0.1,
        priceModifiers: {
            weed: 0.95,
            mushrooms: 1.05,
            ecstasy: 0.90,
            acid: 0.95,
            fentanyl: 1.1,
            meth: 1.0,
            heroin: 0.90,
            cocaine: 0.80
        }
    },
    {
        id: 'upstate',
        name: 'Upstate',
        description: 'Rural and remote. Cheap bulk, rare finds.',
        policePresence: 0.05,
        priceModifiers: {
            weed: 0.65,
            mushrooms: 0.70,
            ecstasy: 0.75,
            acid: 0.80,
            fentanyl: 0.75,
            meth: 0.65,
            heroin: 0.70,
            cocaine: 0.65
        }
    }
];
