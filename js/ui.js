/**
 * UI rendering module.
 * Handles all DOM manipulation and screen transitions.
 */

import { DRUGS, SMALL_ARMS, HEAVY_ARMS, INVENTORY_UPGRADES } from './items.js';
import { LOCATIONS } from './locations.js';
import { formatMoney } from './market.js';
import {
    createGameState, LOAN_TIERS, HEAVY_ARMS_UNLOCK, PERKS,
    buyDrug, sellDrug, travel,
    getInventoryCount, getInventoryValue, calculateScore,
    getDrugById, getLocationById,
    buyWeapon, buyInventoryUpgrade
} from './game.js';
import { payDebt, buyBitcoin, sellBitcoin, stashCash, withdrawCash } from './economy.js';
import { runFromPolice, fightPolice, bribePolice, payOffCops, getSuggestedBribe } from './police.js';
import { generateTravelEvents } from './events.js';
import { getLeaderboard, saveScore } from './leaderboard.js';

let gameState = null;
let eventQueue = [];
let sortMode = 'default';
let selectedDuration = 30;
let selectedPerk = 'no_perk';

const IMAGE_BASE = 'Game Assets/revised/';

// ── Screen Management ─────────────────────────────────────────────

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ── Setup Screen ──────────────────────────────────────────────────

export function renderSetupScreen() {
    const container = document.getElementById('setup-screen');
    const durations = [
        { label: '30 Days', value: 30, desc: 'Quick run' },
        { label: '60 Days', value: 60, desc: 'Standard' },
        { label: '90 Days', value: 90, desc: 'Long haul' },
        { label: 'Endless', value: 0, desc: 'No day limit' },
    ];

    container.innerHTML = `
        <div class="setup-content">
            <h1 class="game-title">DOPE WARS</h1>
            <p class="game-subtitle">NYC, Present Day</p>

            <div class="setup-section">
                <h2>Game Duration</h2>
                <p class="setup-hint">Choose how long you want to play. Endless mode has no day limit.</p>
                <div class="duration-tiers">
                    ${durations.map((d, i) => `
                        <button class="duration-btn ${i === 0 ? 'selected' : ''}" data-duration="${d.value}">
                            <span class="duration-label">${d.label}</span>
                            <span class="duration-desc">${d.desc}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="setup-section">
                <h2>Choose Your Starting Loan</h2>
                <p class="setup-hint">Higher loans mean more starting cash, but steeper interest and tougher consequences.</p>
                <div class="loan-tiers">
                    ${LOAN_TIERS.map((tier, i) => `
                        <button class="loan-tier-btn ${i === 1 ? 'selected' : ''}" data-tier="${i}"
                                style="--tier-color: ${tier.color}">
                            <span class="tier-difficulty">${tier.difficulty}</span>
                            <span class="tier-amount">${formatMoney(tier.amount)}</span>
                            <span class="tier-interest">${(tier.interestRate * 100).toFixed(0)}% daily interest</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="setup-section">
                <h2>Choose Your Background</h2>
                <p class="setup-hint">Your background gives you a starting edge — or none at all.</p>
                <div class="perk-cards">
                    ${PERKS.map(p => `
                        <button class="perk-card ${p.id === 'no_perk' ? 'selected' : ''}" data-perk="${p.id}"
                                style="--perk-color: ${p.color}">
                            <span class="perk-icon">${p.icon}</span>
                            <span class="perk-name">${p.name}</span>
                            <span class="perk-desc">${p.description}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <button class="btn-start" id="btn-start-game">START GAME</button>
        </div>
    `;

    let selectedTier = 1;
    selectedDuration = 30;
    selectedPerk = 'no_perk';

    container.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDuration = parseInt(btn.dataset.duration);
        });
    });

    container.querySelectorAll('.loan-tier-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.loan-tier-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTier = parseInt(btn.dataset.tier);
        });
    });

    container.querySelectorAll('.perk-card').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.perk-card').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPerk = btn.dataset.perk;
        });
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
        gameState = createGameState(selectedTier, selectedDuration, selectedPerk);
        sortMode = 'default';
        showScreen('game-screen');
        renderGameScreen();
    });

    showScreen('setup-screen');
}

// ── Game Screen ───────────────────────────────────────────────────

function renderGameScreen() {
    const container = document.getElementById('game-screen');
    const location = getLocationById(gameState.currentLocation);
    const locationPrices = gameState.prices[gameState.currentLocation];
    const inventoryCount = getInventoryCount(gameState);
    const heatPct = Math.round((gameState.heat || 0) * 100);
    const heatColor = heatPct < 30 ? 'var(--green)' : heatPct < 60 ? '#facc15' : 'var(--red)';
    const btcValue = Math.round((gameState.bitcoin || 0) * (gameState.bitcoinPrice || 0));
    const bestWeapon = _getBestWeaponName();
    const isUnlimited = gameState.isUnlimited;
    const sortedDrugs = getSortedDrugs(locationPrices);

    container.innerHTML = `
        <div class="game-layout">
            <!-- Header -->
            <div class="game-header">
                <div class="header-stat">
                    <span class="stat-label">Day</span>
                    <span class="stat-value">${isUnlimited ? gameState.day : `${gameState.day}&nbsp;/&nbsp;${gameState.maxDays}`}</span>
                </div>
                <div class="header-stat">
                    <span class="stat-label">Cash</span>
                    <span class="stat-value cash">${formatMoney(gameState.cash)}</span>
                </div>
                <div class="header-stat">
                    <span class="stat-label">Debt</span>
                    <span class="stat-value ${gameState.debt > 0 ? 'debt' : 'paid'}">${gameState.debt > 0 ? formatMoney(gameState.debt) : 'PAID'}</span>
                    ${gameState.debt > 0 ? `<span class="stat-sublabel">${(gameState.interestRate * 100).toFixed(0)}%/day</span>` : ''}
                </div>
                <div class="header-stat">
                    <span class="stat-label">Stash</span>
                    <span class="stat-value">${inventoryCount}&nbsp;/&nbsp;${gameState.maxCapacity}</span>
                </div>
                <div class="header-stat heat-stat">
                    <span class="stat-label">Heat</span>
                    <div class="heat-bar">
                        <div class="heat-fill" style="width:${heatPct}%; background:${heatColor}"></div>
                    </div>
                    <span class="stat-value" style="color:${heatColor}">${heatPct}%</span>
                </div>
            </div>

            <!-- Location Banner -->
            <div class="location-banner">
                <h2 class="location-name">${location.name}</h2>
                <p class="location-desc">${location.description}</p>
                ${bestWeapon ? `<span class="weapon-badge">Armed: ${bestWeapon}</span>` : ''}
            </div>

            <!-- Boss Event Banner -->
            ${renderBossBanner()}

            <!-- Price Events -->
            ${renderPriceEvents()}

            <!-- Travel -->
            <div class="travel-section">
                <h3>Travel</h3>
                <div class="location-grid">
                    ${LOCATIONS.map(loc => {
                        const locked = gameState.activeBossEvent?.type === 'lockdown'
                            && gameState.activeBossEvent.lockedLocations?.includes(loc.id);
                        return `
                            <button class="btn-travel ${loc.id === gameState.currentLocation ? 'current' : ''} ${locked ? 'locked' : ''}"
                                    data-location="${loc.id}"
                                    ${loc.id === gameState.currentLocation || locked ? 'disabled' : ''}>
                                ${loc.name}
                                ${loc.id === gameState.currentLocation ? '<span class="here-badge">HERE</span>' : ''}
                                ${locked ? '<span class="locked-badge">LOCKED</span>' : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
                <p class="current-location-label">You are in <strong>${location.name}</strong></p>
            </div>

            <!-- Market -->
            <div class="market-section">
                <div class="market-header">
                    <h3>Street Prices</h3>
                    <div class="sort-buttons">
                        <button class="btn-sort ${sortMode === 'default' ? 'active' : ''}" data-sort="default">Default</button>
                        <button class="btn-sort ${sortMode === 'az' ? 'active' : ''}" data-sort="az">A–Z</button>
                        <button class="btn-sort ${sortMode === 'price-asc' ? 'active' : ''}" data-sort="price-asc">Price ↑</button>
                        <button class="btn-sort ${sortMode === 'price-desc' ? 'active' : ''}" data-sort="price-desc">Price ↓</button>
                    </div>
                </div>
                <table class="market-table">
                    <thead>
                        <tr>
                            <th>Drug</th>
                            <th>Price</th>
                            <th>Have</th>
                            <th>Avg Cost</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedDrugs.map(drug => {
                            const price = locationPrices[drug.id];
                            const held = gameState.inventory[drug.id];
                            const avgCost = gameState.avgCost[drug.id];
                            const canAfford = Math.min(
                                Math.floor(gameState.cash / price),
                                gameState.maxCapacity - inventoryCount
                            );
                            let costClass = '';
                            if (held > 0 && avgCost > 0) {
                                costClass = price > avgCost ? 'profit' : price < avgCost ? 'loss' : '';
                            }
                            return `
                                <tr class="drug-row" data-drug="${drug.id}">
                                    <td class="drug-name">${drug.name}</td>
                                    <td class="drug-price">${formatMoney(price)}</td>
                                    <td class="drug-held">${held > 0 ? held : '-'}</td>
                                    <td class="drug-avg-cost ${costClass}">${held > 0 ? formatMoney(avgCost) : '-'}</td>
                                    <td class="drug-actions">
                                        <button class="btn-buy" data-drug="${drug.id}" ${canAfford <= 0 ? 'disabled' : ''}>Buy</button>
                                        <button class="btn-sell" data-drug="${drug.id}" ${held <= 0 ? 'disabled' : ''}>Sell</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
                <button class="btn-action ${gameState.debt > 0 ? 'btn-urgent' : ''}" id="btn-loan-shark">
                    Loan Shark${gameState.debt > 0 ? ' ⚠' : ''}
                </button>
                <button class="btn-action" id="btn-arms-dealer">Arms Dealer</button>
                <button class="btn-action ${(gameState.stash > 0 || gameState.bitcoin > 0) ? 'btn-active' : ''}" id="btn-stash-house">
                    Stash House${btcValue > 0 ? ` (${formatMoney(btcValue)})` : gameState.stash > 0 ? ` (${formatMoney(gameState.stash)})` : ''}
                </button>
                <button class="btn-action ${gameState.heat > 0.3 ? 'btn-urgent' : ''}" id="btn-pay-cops">
                    Pay Off Cops${gameState.heat > 0.5 ? ' ⚠' : ''}
                </button>
                ${gameState.perk === 'insider' ? `<button class="btn-action btn-intel" id="btn-intel">Street Intel 📡</button>` : ''}
                ${isUnlimited ? `<button class="btn-action btn-end-game" id="btn-end-game">End Game</button>` : ''}
            </div>
        </div>

        <!-- Modal overlay -->
        <div class="modal-overlay" id="modal-overlay" style="display:none">
            <div class="modal" id="modal-content"></div>
        </div>
    `;

    attachGameListeners();
}

function getSortedDrugs(locationPrices) {
    const drugs = [...DRUGS];
    if (sortMode === 'az') {
        drugs.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'price-asc') {
        drugs.sort((a, b) => (locationPrices[a.id] || 0) - (locationPrices[b.id] || 0));
    } else if (sortMode === 'price-desc') {
        drugs.sort((a, b) => (locationPrices[b.id] || 0) - (locationPrices[a.id] || 0));
    }
    return drugs;
}

function renderBossBanner() {
    const boss = gameState.activeBossEvent;
    if (!boss) return '';
    const days = gameState.bossEventDaysLeft;
    return `
        <div class="boss-banner" style="--boss-color: ${boss.color}">
            <div class="boss-banner-header">
                <span class="boss-name">${boss.name}</span>
                <span class="boss-timer">${days} day${days !== 1 ? 's' : ''} left</span>
            </div>
            <p class="boss-desc">${boss.description}</p>
            <p class="boss-flavor">${boss.flavor}</p>
        </div>
    `;
}

function renderPriceEvents() {
    const localEvents = gameState.priceEvents.filter(e => e.locationId === gameState.currentLocation);
    if (localEvents.length === 0) return '';
    return `
        <div class="price-events">
            ${localEvents.map(e => `
                <div class="event-banner ${e.type === 'price_spike' ? 'spike' : 'crash'}">
                    ${e.message}
                </div>
            `).join('')}
        </div>
    `;
}

function _getBestWeaponName() {
    if (!gameState.weapons || gameState.weapons.length === 0) return null;
    const allWeapons = [...SMALL_ARMS, ...HEAVY_ARMS];
    let best = null;
    let bestBonus = -1;
    for (const id of gameState.weapons) {
        const w = allWeapons.find(x => x.id === id);
        if (w && (w.combatBonus || 0) > bestBonus) {
            bestBonus = w.combatBonus;
            best = w.name;
        }
    }
    return best;
}

// ── Buy / Sell Modal ──────────────────────────────────────────────

function showBuySellModal(drugId, action) {
    const drug = getDrugById(drugId);
    const price = gameState.prices[gameState.currentLocation][drugId];
    const held = gameState.inventory[drugId];
    const inventoryCount = getInventoryCount(gameState);
    const spaceAvailable = gameState.maxCapacity - inventoryCount;

    let maxQty = action === 'buy'
        ? Math.min(Math.floor(gameState.cash / price), spaceAvailable)
        : held;

    _openModal(`
        <div class="dealer-modal">
            <img class="dealer-image" src="${IMAGE_BASE}${drug.dealerImage}" alt="${drug.name} dealer"
                 onerror="this.style.display='none'">
            <div class="dealer-details">
                <h3>${action === 'buy' ? 'Buying' : 'Selling'} ${drug.name}</h3>
                <p class="dealer-price">Street Price: ${formatMoney(price)} per ${drug.unit}</p>
                <div class="quantity-selector">
                    <label>Quantity (max ${maxQty}):</label>
                    <div class="qty-controls">
                        <button class="qty-btn" id="qty-min">1</button>
                        <button class="qty-btn" id="qty-quarter">${Math.max(1, Math.floor(maxQty * 0.25))}</button>
                        <button class="qty-btn" id="qty-half">${Math.max(1, Math.floor(maxQty * 0.5))}</button>
                        <button class="qty-btn" id="qty-max">${maxQty}</button>
                    </div>
                    <input type="number" id="qty-input" min="1" max="${maxQty}" value="${Math.min(1, maxQty)}" class="qty-input">
                    <p class="total-cost" id="total-cost">Total: ${formatMoney(price)}</p>
                </div>
                <div class="modal-buttons">
                    <button class="btn-confirm" id="btn-confirm-deal" ${maxQty <= 0 ? 'disabled' : ''}>
                        ${action === 'buy' ? 'BUY' : 'SELL'}
                    </button>
                    <button class="btn-cancel" id="btn-cancel-deal">Cancel</button>
                </div>
            </div>
        </div>
    `, true);

    const qtyInput = document.getElementById('qty-input');
    const totalEl = document.getElementById('total-cost');
    const updateTotal = () => {
        const qty = parseInt(qtyInput.value) || 0;
        totalEl.textContent = `Total: ${formatMoney(qty * price)}`;
    };

    qtyInput.addEventListener('input', updateTotal);
    document.getElementById('qty-min').addEventListener('click', () => { qtyInput.value = 1; updateTotal(); });
    document.getElementById('qty-quarter').addEventListener('click', () => { qtyInput.value = Math.max(1, Math.floor(maxQty * 0.25)); updateTotal(); });
    document.getElementById('qty-half').addEventListener('click', () => { qtyInput.value = Math.max(1, Math.floor(maxQty * 0.5)); updateTotal(); });
    document.getElementById('qty-max').addEventListener('click', () => { qtyInput.value = maxQty; updateTotal(); });

    document.getElementById('btn-confirm-deal').addEventListener('click', () => {
        const qty = parseInt(qtyInput.value) || 0;
        if (qty <= 0) return;
        const result = action === 'buy' ? buyDrug(gameState, drugId, qty) : sellDrug(gameState, drugId, qty);
        _closeModal();
        showNotification(result.message, result.success ? 'success' : 'error');
        renderGameScreen();
    });

    document.getElementById('btn-cancel-deal').addEventListener('click', _closeModal);
}

// ── Loan Shark Modal ──────────────────────────────────────────────

function showLoanSharkModal() {
    const hasDebt = gameState.debt > 0;
    _openModal(`
        <div class="event-modal loanshark-modal">
            <img class="event-image" src="${IMAGE_BASE}loan shark.png" alt="Loan Shark"
                 onerror="this.style.display='none'">
            <h3>The Loan Shark</h3>
            ${hasDebt ? `
                <div class="modal-info-grid">
                    <span>Debt:</span><span class="debt">${formatMoney(gameState.debt)}</span>
                    <span>Interest:</span><span>${(gameState.interestRate * 100).toFixed(0)}% / day</span>
                    <span>Days Since Payment:</span><span>${gameState.daysSincePayment}</span>
                    <span>Your Cash:</span><span class="cash">${formatMoney(gameState.cash)}</span>
                </div>
                <p class="modal-flavor">"Every day you don't pay, I add ${(gameState.interestRate * 100).toFixed(0)}%. You do the math."</p>
                <div class="modal-input-row">
                    <input type="number" id="loan-amount" class="qty-input" placeholder="Amount"
                           min="1" max="${Math.min(gameState.cash, gameState.debt)}" value="${Math.min(gameState.cash, gameState.debt)}">
                    <button class="btn-confirm" id="btn-pay-debt">PAY UP</button>
                </div>
                <button class="btn-cancel" id="btn-close-loan" style="margin-top:8px">Leave</button>
            ` : `
                <p class="modal-flavor">"You're all squared up. Don't be a stranger."</p>
                <button class="btn-cancel" id="btn-close-loan">Leave</button>
            `}
        </div>
    `);

    if (hasDebt) {
        document.getElementById('btn-pay-debt').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('loan-amount').value) || 0;
            const result = payDebt(gameState, amount);
            _closeModal();
            showNotification(result.message, result.success ? 'success' : 'error');
            renderGameScreen();
        });
    }
    document.getElementById('btn-close-loan').addEventListener('click', () => {
        _closeModal();
        renderGameScreen();
    });
}

// ── Arms Dealer Modal ─────────────────────────────────────────────

function showArmsDealerModal() {
    const owned = id => gameState.weapons.includes(id);
    const heavyUnlocked = gameState.totalBought >= HEAVY_ARMS_UNLOCK;

    const weaponCard = w => `
        <div class="weapon-card">
            <div class="weapon-card-name">${w.name}</div>
            <div class="weapon-card-desc">${w.description}</div>
            <div class="weapon-card-price">${formatMoney(w.price)}</div>
            ${owned(w.id)
                ? '<span class="badge-owned">OWNED</span>'
                : `<button class="btn-buy-weapon" data-weapon="${w.id}" ${gameState.cash < w.price ? 'disabled' : ''}>BUY</button>`
            }
        </div>
    `;

    const upgradeCard = u => `
        <div class="weapon-card">
            <div class="weapon-card-name">${u.name}</div>
            <div class="weapon-card-desc">${u.description}</div>
            <div class="weapon-card-price">${formatMoney(u.price)}</div>
            ${gameState.maxCapacity >= u.capacity
                ? '<span class="badge-owned">OWNED</span>'
                : `<button class="btn-buy-upgrade" data-upgrade="${u.id}" ${gameState.cash < u.price ? 'disabled' : ''}>BUY</button>`
            }
        </div>
    `;

    _openModal(`
        <div class="event-modal arms-modal">
            <h3>Arms Dealer</h3>
            <p class="cash-display">Your cash: <span class="cash">${formatMoney(gameState.cash)}</span></p>

            <div class="arms-section">
                <img class="arms-banner-img" src="${IMAGE_BASE}small arms dealer.png" onerror="this.style.display='none'">
                <div class="arms-section-label">Small Arms</div>
                <div class="weapon-cards-grid">
                    ${SMALL_ARMS.map(w => weaponCard(w)).join('')}
                </div>
            </div>

            <div class="arms-section">
                <img class="arms-banner-img" src="${IMAGE_BASE}large arms dealers.png" onerror="this.style.display='none'">
                <div class="arms-section-label">Heavy Arms</div>
                ${heavyUnlocked
                    ? `<div class="weapon-cards-grid">${HEAVY_ARMS.map(w => weaponCard(w)).join('')}</div>`
                    : `<div class="arms-lock-msg">
                           <p>🔒 Traffic <strong>${formatMoney(HEAVY_ARMS_UNLOCK)}</strong> in drugs to unlock.</p>
                           <p class="lock-progress">Current: ${formatMoney(gameState.totalBought)}</p>
                       </div>`
                }
            </div>

            <div class="arms-section">
                <div class="arms-section-label">Inventory Upgrades</div>
                <div class="weapon-cards-grid">
                    ${INVENTORY_UPGRADES.map(u => upgradeCard(u)).join('')}
                </div>
            </div>

            <button class="btn-cancel" id="btn-close-arms">Close</button>
        </div>
    `);

    document.querySelectorAll('.btn-buy-weapon').forEach(btn => {
        btn.addEventListener('click', () => {
            const result = buyWeapon(gameState, btn.dataset.weapon);
            showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) showArmsDealerModal();
        });
    });

    document.querySelectorAll('.btn-buy-upgrade').forEach(btn => {
        btn.addEventListener('click', () => {
            const result = buyInventoryUpgrade(gameState, btn.dataset.upgrade);
            showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) showArmsDealerModal();
        });
    });

    document.getElementById('btn-close-arms').addEventListener('click', () => {
        _closeModal();
        renderGameScreen();
    });
}

// ── Stash House Modal ─────────────────────────────────────────────

function showStashModal() {
    const btcValue = Math.round(gameState.bitcoin * gameState.bitcoinPrice);

    _openModal(`
        <div class="event-modal stash-modal">
            <h3>Stash House</h3>

            <div class="stash-section">
                <h4>Cash</h4>
                <div class="modal-info-grid">
                    <span>On Person:</span><span class="cash">${formatMoney(gameState.cash)}</span>
                    <span>In Stash:</span><span class="cash">${formatMoney(gameState.stash)}</span>
                </div>
                <div class="modal-input-row">
                    <input type="number" id="stash-amount" class="qty-input" placeholder="Amount" min="1">
                    <button class="btn-confirm" id="btn-deposit">Deposit</button>
                    <button class="btn-action" id="btn-withdraw">Withdraw</button>
                </div>
                <p class="modal-hint">Stashed cash is safe from muggings, but your place can be robbed.</p>
            </div>

            <div class="stash-section">
                <h4>Bitcoin</h4>
                <div class="modal-info-grid">
                    <span>BTC Price:</span><span>${formatMoney(gameState.bitcoinPrice)}</span>
                    <span>You Hold:</span><span>${gameState.bitcoin.toFixed(4)} BTC</span>
                    <span>Value:</span><span class="cash">${formatMoney(btcValue)}</span>
                </div>
                <div class="modal-input-row">
                    <input type="number" id="btc-amount" class="qty-input" placeholder="$ amount" min="1">
                    <button class="btn-confirm" id="btn-buy-btc">Buy BTC</button>
                    <button class="btn-action" id="btn-sell-btc" ${gameState.bitcoin <= 0 ? 'disabled' : ''}>Sell All</button>
                </div>
                <p class="modal-hint">Bitcoin can be hacked. High risk, high reward.</p>
            </div>

            <button class="btn-cancel" id="btn-close-stash">Close</button>
        </div>
    `);

    document.getElementById('btn-deposit').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('stash-amount').value) || 0;
        const result = stashCash(gameState, amount);
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) showStashModal();
    });

    document.getElementById('btn-withdraw').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('stash-amount').value) || 0;
        const result = withdrawCash(gameState, amount);
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) showStashModal();
    });

    document.getElementById('btn-buy-btc').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('btc-amount').value) || 0;
        const result = buyBitcoin(gameState, amount);
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) showStashModal();
    });

    document.getElementById('btn-sell-btc').addEventListener('click', () => {
        const result = sellBitcoin(gameState, gameState.bitcoin);
        showNotification(result.message, result.success ? 'success' : 'error');
        if (result.success) showStashModal();
    });

    document.getElementById('btn-close-stash').addEventListener('click', () => {
        _closeModal();
        renderGameScreen();
    });
}

// ── Pay Off Cops Modal ────────────────────────────────────────────

function showPayCopsModal() {
    const suggested = getSuggestedBribe(gameState);
    const heatPct = Math.round(gameState.heat * 100);

    _openModal(`
        <div class="event-modal paycops-modal">
            <img class="event-image" src="${IMAGE_BASE}cops.png" alt="Cops" onerror="this.style.display='none'">
            <h3>Pay Off Cops</h3>
            <div class="modal-info-grid">
                <span>Current Heat:</span><span>${heatPct}%</span>
                <span>Your Cash:</span><span class="cash">${formatMoney(gameState.cash)}</span>
                <span>Suggested:</span><span>${formatMoney(suggested)}</span>
            </div>
            <p class="modal-hint">Greasing the right palms reduces your heat level. The more you pay, the more effective it is.</p>
            <div class="modal-input-row">
                <input type="number" id="cop-amount" class="qty-input" placeholder="Amount"
                       min="500" max="${gameState.cash}" value="${Math.min(suggested, gameState.cash)}">
                <button class="btn-confirm" id="btn-pay-cops-confirm">PAY</button>
            </div>
            <button class="btn-cancel" id="btn-close-cops">Cancel</button>
        </div>
    `);

    document.getElementById('btn-pay-cops-confirm').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('cop-amount').value) || 0;
        const result = payOffCops(gameState, amount);
        _closeModal();
        showNotification(result.message, result.success ? 'success' : 'error');
        renderGameScreen();
    });

    document.getElementById('btn-close-cops').addEventListener('click', () => {
        _closeModal();
    });
}

// ── Travel & Event Queue ──────────────────────────────────────────

function handleTravel(locationId) {
    const location = getLocationById(locationId);
    const result = travel(gameState, locationId);

    if (!result.success) {
        showNotification(result.message, 'error');
        return;
    }

    if (gameState.gameOver) {
        showGameOverScreen();
        return;
    }

    const events = generateTravelEvents(gameState);

    // If a new boss event just triggered, prepend an announcement
    if (result.newBoss) {
        events.unshift({
            type: 'boss',
            title: result.newBoss.name,
            message: result.newBoss.description,
            flavor: result.newBoss.flavor,
            bossColor: result.newBoss.color,
            image: null
        });
    }

    if (gameState.gameOver) {
        if (events.length > 0) {
            eventQueue = events;
            processEventQueue();
        } else {
            showGameOverScreen();
        }
        return;
    }

    if (events.length > 0) {
        eventQueue = events;
        processEventQueue();
    } else {
        showNotification(`Arrived in ${location.name}. Day ${gameState.day}.`, 'info');
        renderGameScreen();
    }
}

function processEventQueue() {
    if (eventQueue.length === 0) {
        if (gameState.gameOver) {
            showGameOverScreen();
            return;
        }
        renderGameScreen();
        return;
    }
    const event = eventQueue.shift();
    showEventModal(event);
}

function showEventModal(event) {
    const isPolice = event.type === 'police' || event.type === 'k9';
    const isBoss = event.type === 'boss';
    const bossStyle = isBoss ? `style="border-color: ${event.bossColor}; border-width: 2px; border-style: solid;"` : '';

    _openModal(`
        <div class="event-modal" ${bossStyle}>
            ${event.image ? `<img class="event-image" src="${IMAGE_BASE}${event.image}" onerror="this.style.display='none'">` : ''}
            <h3 class="event-title ${isBoss ? 'boss-event-title' : ''}" ${isBoss ? `style="color: ${event.bossColor}"` : ''}>${event.title}</h3>
            <p class="event-message">${event.message}</p>
            ${isBoss && event.flavor ? `<p class="boss-flavor">${event.flavor}</p>` : ''}
            ${isPolice ? `
                <div class="event-choices">
                    <button class="btn-event btn-run" id="evt-run">Run</button>
                    <button class="btn-event btn-fight" id="evt-fight">Fight</button>
                    <button class="btn-event btn-bribe" id="evt-bribe">Bribe</button>
                </div>
            ` : `
                <button class="btn-event-ok" id="evt-ok">OK</button>
            `}
        </div>
    `);

    if (isPolice) {
        document.getElementById('evt-run').addEventListener('click', () => {
            const result = runFromPolice(gameState, event.isK9);
            showEventResult(result);
        });
        document.getElementById('evt-fight').addEventListener('click', () => {
            const result = fightPolice(gameState, event.isK9);
            showEventResult(result);
        });
        document.getElementById('evt-bribe').addEventListener('click', () => {
            showBribeInput(event.isK9);
        });
    } else {
        document.getElementById('evt-ok').addEventListener('click', () => {
            _closeModal();
            processEventQueue();
        });
    }
}

function showEventResult(result) {
    _openModal(`
        <div class="event-modal">
            <h3 class="event-title ${result.success ? 'success-text' : 'danger-text'}">${result.success ? 'Got Away!' : 'Bad Luck'}</h3>
            <p class="event-message">${result.message}</p>
            <button class="btn-event-ok" id="evt-ok">Continue</button>
        </div>
    `);
    document.getElementById('evt-ok').addEventListener('click', () => {
        _closeModal();
        if (gameState.gameOver) {
            showGameOverScreen();
        } else {
            processEventQueue();
        }
    });
}

function showBribeInput(isK9) {
    const suggested = getSuggestedBribe(gameState);

    _openModal(`
        <div class="event-modal">
            <img class="event-image" src="${IMAGE_BASE}cops.png" onerror="this.style.display='none'">
            <h3 class="event-title">Bribe</h3>
            <p class="event-message">How much are you willing to offer? A higher bribe has a better chance of working.</p>
            <div class="modal-info-grid">
                <span>Your Cash:</span><span class="cash">${formatMoney(gameState.cash)}</span>
                <span>Suggested:</span><span>${formatMoney(suggested)}</span>
            </div>
            <div class="modal-input-row" style="margin-top:12px">
                <input type="number" id="bribe-amount" class="qty-input" min="0"
                       max="${gameState.cash}" value="${Math.min(suggested, gameState.cash)}"
                       placeholder="Amount">
                <button class="btn-confirm" id="btn-pay-bribe">PAY</button>
            </div>
            <button class="btn-cancel" id="btn-cancel-bribe" style="margin-top:8px">Back (Run instead)</button>
        </div>
    `);

    document.getElementById('btn-pay-bribe').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('bribe-amount').value) || 0;
        const result = bribePolice(gameState, amount);
        showEventResult(result);
    });

    document.getElementById('btn-cancel-bribe').addEventListener('click', () => {
        const result = runFromPolice(gameState, isK9);
        showEventResult(result);
    });
}

// ── Game Over Screen ──────────────────────────────────────────────

function showGameOverScreen() {
    const score = calculateScore(gameState);
    const inventoryValue = getInventoryValue(gameState);
    const btcValue = Math.round((gameState.bitcoin || 0) * (gameState.bitcoinPrice || 0));
    const isUnlimited = gameState.isUnlimited;

    let grade = 'F';
    if (score > 500000) grade = 'S';
    else if (score > 200000) grade = 'A';
    else if (score > 75000) grade = 'B';
    else if (score > 20000) grade = 'C';
    else if (score > 0) grade = 'D';

    const container = document.getElementById('gameover-screen');
    container.innerHTML = `
        <div class="gameover-content">
            <h1>GAME OVER</h1>
            <p class="gameover-subtitle">${isUnlimited ? `${gameState.day - 1} days in the streets of NYC` : `${gameState.maxDays} days in the streets of NYC`}</p>

            <div class="score-display">
                <span class="score-label">Final Score</span>
                <span class="score-value ${score >= 0 ? 'positive' : 'negative'}">${formatMoney(score)}</span>
                <span class="grade-badge grade-${grade}">${grade}</span>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-card-label">Cash on Hand</span>
                    <span class="stat-card-value">${formatMoney(gameState.cash)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Cash in Stash</span>
                    <span class="stat-card-value">${formatMoney(gameState.stash || 0)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Bitcoin Value</span>
                    <span class="stat-card-value">${formatMoney(btcValue)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Inventory Value</span>
                    <span class="stat-card-value">${formatMoney(inventoryValue)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Remaining Debt</span>
                    <span class="stat-card-value debt">${formatMoney(gameState.debt)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Difficulty</span>
                    <span class="stat-card-value">${gameState.difficulty}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Total Bought</span>
                    <span class="stat-card-value">${formatMoney(gameState.totalBought)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Total Sold</span>
                    <span class="stat-card-value">${formatMoney(gameState.totalSold)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Biggest Sale</span>
                    <span class="stat-card-value">${formatMoney(gameState.biggestSale)}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-card-label">Days Played</span>
                    <span class="stat-card-value">${gameState.day - 1}</span>
                </div>
            </div>

            <div class="leaderboard-save">
                <h3>Hall of Fame</h3>
                <div class="leaderboard-name-row">
                    <input type="text" id="player-name" class="name-input" placeholder="Enter your name (optional)" maxlength="20">
                    <button class="btn-confirm" id="btn-save-score">SAVE</button>
                </div>
            </div>

            <div class="leaderboard-section" id="leaderboard-section">
                ${renderLeaderboardTable()}
            </div>

            <button class="btn-start" id="btn-play-again">PLAY AGAIN</button>
        </div>
    `;

    document.getElementById('btn-save-score').addEventListener('click', () => {
        const name = document.getElementById('player-name').value;
        saveScore(name, score, gameState);
        document.getElementById('leaderboard-section').innerHTML = renderLeaderboardTable();
        const saveBtn = document.getElementById('btn-save-score');
        saveBtn.disabled = true;
        saveBtn.textContent = 'SAVED!';
    });

    document.getElementById('btn-play-again').addEventListener('click', renderSetupScreen);
    showScreen('gameover-screen');
}

function renderLeaderboardTable() {
    const board = getLeaderboard();
    if (board.length === 0) {
        return '<p class="leaderboard-empty">No scores yet. Be the first!</p>';
    }
    return `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Score</th>
                    <th>Mode</th>
                    <th>Days</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${board.map((entry, i) => `
                    <tr class="${i === 0 ? 'lb-top' : ''}">
                        <td class="lb-rank">${i + 1}</td>
                        <td class="lb-name">${entry.name}</td>
                        <td class="lb-score">${formatMoney(entry.score)}</td>
                        <td class="lb-difficulty">${entry.difficulty}</td>
                        <td class="lb-days">${entry.maxDays >= 999999 ? `${entry.day - 1} days` : `${entry.day - 1}/${entry.maxDays}`}</td>
                        <td class="lb-date">${entry.date}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ── Intel Modal (Insider perk) ────────────────────────────────────

function showIntelModal() {
    const headerCells = LOCATIONS.map(l => `<th>${l.name.split(' ')[0]}</th>`).join('');
    const rows = DRUGS.map(d => {
        const cells = LOCATIONS.map(l => {
            const price = gameState.prices[l.id][d.id];
            const isCurrent = l.id === gameState.currentLocation;
            return `<td class="${isCurrent ? 'intel-current' : ''}">${formatMoney(price)}</td>`;
        }).join('');
        return `<tr><td class="drug-name">${d.name}</td>${cells}</tr>`;
    }).join('');

    _openModal(`
        <div class="event-modal intel-modal">
            <h3>Street Intel 📡</h3>
            <p class="modal-hint">Today's prices from all boroughs. Your current location is highlighted.</p>
            <div class="intel-table-wrapper">
                <table class="intel-table">
                    <thead>
                        <tr><th>Drug</th>${headerCells}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <button class="btn-cancel" id="btn-close-intel">Close</button>
        </div>
    `);
    document.getElementById('btn-close-intel').addEventListener('click', _closeModal);
}

// ── Notification Toast ────────────────────────────────────────────

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 2800);
}

// ── Modal Helpers ─────────────────────────────────────────────────

function _openModal(html, allowBackdropClose = false) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-content');
    modal.innerHTML = html;
    overlay.style.display = 'flex';

    overlay.onclick = allowBackdropClose
        ? (e) => { if (e.target === overlay) _closeModal(); }
        : null;
}

function _closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ── Event Listeners ───────────────────────────────────────────────

function attachGameListeners() {
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', () => showBuySellModal(btn.dataset.drug, 'buy'));
    });

    document.querySelectorAll('.btn-sell').forEach(btn => {
        btn.addEventListener('click', () => showBuySellModal(btn.dataset.drug, 'sell'));
    });

    document.querySelectorAll('.btn-travel').forEach(btn => {
        btn.addEventListener('click', () => handleTravel(btn.dataset.location));
    });

    document.querySelectorAll('.btn-sort').forEach(btn => {
        btn.addEventListener('click', () => {
            sortMode = btn.dataset.sort;
            renderGameScreen();
        });
    });

    document.getElementById('btn-loan-shark').addEventListener('click', showLoanSharkModal);
    document.getElementById('btn-arms-dealer').addEventListener('click', showArmsDealerModal);
    document.getElementById('btn-stash-house').addEventListener('click', showStashModal);
    document.getElementById('btn-pay-cops').addEventListener('click', showPayCopsModal);

    const intelBtn = document.getElementById('btn-intel');
    if (intelBtn) intelBtn.addEventListener('click', showIntelModal);

    const endBtn = document.getElementById('btn-end-game');
    if (endBtn) {
        endBtn.addEventListener('click', () => {
            gameState.gameOver = true;
            showGameOverScreen();
        });
    }
}
