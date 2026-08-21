import assert from 'node:assert/strict';
import {
  CONTRACTS,
  CONTRACT_BONUSES,
  CONTRACT_CACHE_OFFERS,
  CONTRACT_CLAUSES,
  CONTRACT_DIFFICULTIES,
  CONTRACT_LEDGER_RANKS,
  buildContractOffer,
  contractLedgerRankForXp
} from '../src/data/contracts.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
};

const { GameEngine } = await import('../src/systems/game.js');

assert.equal(CONTRACTS.length, 30, 'all thirty legacy blueprint ids must remain valid');
assert.equal(CONTRACT_DIFFICULTIES.length, 5, 'contracts need five progression bands');
assert.ok(CONTRACT_CLAUSES.length >= 8, 'contracts need a broad risk-clause pool');
assert.ok(CONTRACT_BONUSES.length >= 4, 'contracts need optional objective variety');
assert.ok(CONTRACT_CACHE_OFFERS.length >= 8, 'the Seal Exchange needs regional and endgame targeting');
assert.equal(CONTRACT_LEDGER_RANKS.at(-1).rank, 10, 'the contract mastery road must reach rank ten');
assert.equal(contractLedgerRankForXp(CONTRACT_LEDGER_RANKS[6].xp), 6);

const apexDefinition = buildContractOffer({ blueprintId: 'bellscar-contract-6', difficultyId: 'apex', seed: 7341, level: 100 });
assert.equal(apexDefinition.steps.length, 5, 'Apex mandates need four field stages and a sealed finale');
assert.equal(apexDefinition.steps.at(-1).type, 'operation');
assert.equal(apexDefinition.clauses.length, 4);
assert.ok(apexDefinition.gold > 5_000 && apexDefinition.seals >= 8, 'Apex risk must pay materially better');

const input = {
  pointer: { active: true, worldX: 820, worldY: 620 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; },
  getAimDirection() { return null; }, isHeld() { return false; }, consume() { return false; },
  defer() {}, press() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(game.start('gravebinder', 'dawnstrider'));

const openingBoard = game.getContractBoard();
assert.equal(openingBoard.available.length, 6, 'a new covenant begins with six readable Gravewake orders');
assert.ok(openingBoard.available.every((entry) => entry.zoneId === 'gravewake' && entry.difficultyId === 'field'));
assert.deepEqual(game.getContractBoard().available.map((entry) => entry.id), openingBoard.available.map((entry) => entry.id), 'a board cycle must remain deterministic');

// Legacy single-counter orders migrate without losing ids, counters, or
// duplicate hardening from the v1.3 reliability pass.
const migrated = game._normalizeContracts({
  active: [
    { id: 'gravewake-contract-1', progress: 17 },
    { id: 'gravewake-contract-1', progress: 999 },
    { id: 'redfen-contract-2', progress: 3 },
    { id: 'unknown-contract', progress: 999 }
  ],
  completed: { 'gravewake-contract-1': 4, injected: 999 }
}, 80);
assert.deepEqual(migrated.active.map((entry) => entry.id), ['gravewake-contract-1', 'redfen-contract-2']);
assert.equal(migrated.active[0].steps[0].target, 18);
assert.equal(migrated.active[0].stepProgress, 17);
assert.deepEqual(migrated.completed, { 'gravewake-contract-1': 4 });
assert.equal(migrated.ledgerXp, 104, 'legacy completions should seed contract mastery');

// Unlock the full board for deterministic endgame coverage.
game.player.level = 100;
game.player.gold = 1_000_000;
game.player.contracts.ledgerXp = CONTRACT_LEDGER_RANKS[8].xp;
game.player.contracts.ledgerRank = 8;
game.player.contracts.boardCycle += 1;
game.player.contracts.offers = [];
game._refreshPlayerStats(true);
const endgameBoard = game.getContractBoard();
assert.equal(endgameBoard.available.length, 12, 'the mature board should expose twelve rotating offers');
assert.ok(endgameBoard.available.some((entry) => entry.difficultyId === 'apex'), 'a mastered level-100 board must include an Apex mandate');
assert.equal(new Set(endgameBoard.available.map((entry) => entry.id)).size, endgameBoard.available.length);
assert.ok(new Set(endgameBoard.available.map((entry) => entry.zoneId)).size >= 5, 'mature boards must cover all hostile regions');

const apex = endgameBoard.available.find((entry) => entry.difficultyId === 'apex');
assert.ok(game.acceptContract(apex.id));
let active = game.getContractBoard().active.find((entry) => entry.id === apex.id);
assert.equal(active.stepNumber, 1);
assert.ok(game.pinContract(active.id));
assert.equal(game.getTrackedContract().id, active.id);

// Risk clauses materially affect the live regional director.
const internal = game.player.contracts.active.find((entry) => entry.id === apex.id);
internal.clauses = ['swarming', 'elite-host', 'iron-ranks', 'ruthless'];
const pressure = game.getContractPressure(internal.zoneId);
assert.ok(pressure.population >= 8 && pressure.eliteChance >= 0.22 && pressure.enemyHp >= 0.24 && pressure.enemyDamage >= 0.18);

// Optional objectives run in parallel with the staged main route.
internal.bonus = { id: 'execution-tithe', type: 'execution', target: 2, name: 'Execution Tithe', description: 'Execute enemies.' };
game._progressContracts('execution', { zoneId: internal.zoneId, amount: 2 });
active = game.getContractBoard().active.find((entry) => entry.id === apex.id);
assert.equal(active.bonus.complete, true);

while (!active.ready && active.currentStep.type !== 'operation') {
  game._progressContracts(active.currentStep.type, { zoneId: active.zoneId, amount: active.currentStep.target });
  active = game.getContractBoard().active.find((entry) => entry.id === apex.id);
}
assert.equal(active.currentStep.type, 'operation', 'Apex field work must culminate in a sealed mission');
assert.ok(game.startContractMission(active.id));
assert.equal(game.endgame.activity, 'contract');
assert.equal(game.endgame.contractId, active.id);
assert.equal(game.endgame.zoneId, active.zoneId);
assert.ok(game.endgame.wavePlan.length >= 6 && game.endgame.wavePlan.at(-1).type === 'boss');
assert.equal(game.abandonContract(active.id), false, 'a live sealed mission cannot be detached from its writ');
assert.equal(game.startEndgame('arena', 10), false, 'a second operation cannot overwrite a live contract mission');

// Resolve the mission using the real completion path.
game.entities.enemies = [];
game.endgame.waveIndex = game.endgame.wavePlan.length;
game.endgame.elapsed = 60;
game._finishEndgame();
active = game.getContractBoard().active.find((entry) => entry.id === apex.id);
assert.equal(active.ready, true);
const sealsBefore = game.player.contracts.seals;
const ledgerBefore = game.player.contracts.ledgerXp;
assert.ok(game.claimContract(active.id));
assert.ok(game.player.contracts.seals > sealsBefore);
assert.ok(game.player.contracts.ledgerXp > ledgerBefore);
assert.equal(game.player.contracts.streak, 1);
assert.equal(game.player.contracts.history[0].id, active.id);
assert.ok([...game.player.inventory, ...game.player.stash].length > 0, 'every overhauled contract should award an item cache');

// Potion and death clauses are actual failure conditions rather than labels.
game.player.contracts.ledgerXp = CONTRACT_LEDGER_RANKS[8].xp;
game.player.contracts.ledgerRank = 8;
game.player.contracts.offers = [];
const field = game.getContractBoard().available.find((entry) => entry.difficultyId === 'field');
assert.ok(game.acceptContract(field.id));
const failureEntry = game.player.contracts.active.find((entry) => entry.id === field.id);
failureEntry.bonus = { id: 'dry-flask', type: 'noPotion', target: 1, name: 'Dry Flask', description: 'Use no potion.' };
game.player.potions = Math.max(1, game.player.potions);
game._potion();
assert.equal(failureEntry.bonusFailed, true);
assert.ok(game.abandonContract(failureEntry.id));
assert.equal(game.player.contracts.streak, 0, 'abandoning a writ should break the payment streak');

// Board turns preserve active work, cost the advertised currency, and change
// the deterministic offer set.
const signatureBefore = game.getContractBoard().available.map((entry) => entry.id).join('|');
game.player.contracts.freeRefreshes = 0;
const refreshCost = game.getContractRefreshCost();
const goldBefore = game.player.gold;
assert.ok(game.refreshContractBoard());
assert.equal(game.player.gold, goldBefore - refreshCost);
assert.notEqual(game.getContractBoard().available.map((entry) => entry.id).join('|'), signatureBefore);

// Seal Exchange purchases are rank-gated and deliver to pack or stash.
game.player.contracts.ledgerXp = CONTRACT_LEDGER_RANKS[10].xp;
game.player.contracts.ledgerRank = 10;
game.player.contracts.seals = 30;
const ownedBefore = game.player.inventory.length + game.player.stash.length;
assert.ok(game.purchaseContractCache('road-cache'));
assert.ok(game.player.contracts.seals < 30);
assert.equal(game.player.inventory.length + game.player.stash.length, ownedBefore + 1);

assert.ok(game.save());
const snapshot = game.snapshot();
assert.equal(snapshot.version, 19);
const restored = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all', aimAssist: true });
assert.ok(restored.continueRun());
assert.equal(restored.player.contracts.version, 2);
assert.equal(restored.player.contracts.ledgerRank, 10);
assert.ok(Array.isArray(restored.player.contracts.offers) && restored.player.contracts.offers.length > 0);
assert.ok(restored.player.contracts.history.length > 0);

console.log('Ashen Covenant Contracts overhaul test passed.');
