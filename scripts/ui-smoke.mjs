import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { CLASSES, getClass, getHybrid } from '../src/data/classes.js';
import { CAMPAIGN_CHAPTERS } from '../src/data/campaign.js';
import { ASCENSION_TIERS, JOURNEY_BANDS, LEGACY_PATHS, LEVEL_REWARDS, PILLARS, journeyBandForLevel } from '../src/data/leveling.js';
import { PARAGON_BOARDS, PARAGON_GLYPHS, paragonXpForRank } from '../src/data/paragon.js';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage
});

const { GameUI } = await import('../src/ui/ui.js');
const listeners = new Map();
const game = {
  state: 'menu', clock: 1, player: null, entities: { enemies: [], loot: [], landmarks: [] }, objective: { title: 'The road', detail: 'Begin', progress: 0, total: 1 },
  on(event, callback) { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(callback); },
  emit(event, detail) { (listeners.get(event) ?? []).forEach((callback) => callback(detail)); },
  hasSave() { return false; },
  start(primary, secondary) {
    this.player = { primary, secondary, level: 20, x: 700, y: 620, hp: 100, maxHp: 100, resource: 50, maxResource: 50, skillPoints: 0, cooldowns: {}, inventory: [], stash: [], equipment: {}, itemLocks: {}, skillImprints: {}, masteryDoctrines: {}, resonance: 0, confluence: 0, materials: { cinders: 0, echoes: 0, shards: 0, prisms: 0, marks: 0 }, gold: 0, campaign: { stageId: 'meet-maelin', progress: 0 } };
    this.state = 'playing';
    this.emit('run-started', { player: this.player });
    return true;
  },
  continueRun() { return false; },
  getPrimaryClass() { return this.player ? getClass(this.player.primary) : null; },
  getSecondaryClass() { return this.player ? getClass(this.player.secondary) : null; },
  getHybrid() { return this.player ? getHybrid(this.player.primary, this.player.secondary) : null; },
  getStats() { return {}; }, getBoss() { return null; }, save() {}, acknowledgeCampaignDialogue() { return true; },
  getLevelingOverview() {
    const level = this.player?.level ?? 1;
    const active = journeyBandForLevel(level);
    return {
      level, xp: 120, nextXp: 900, activeBandId: active.id, rewards: LEVEL_REWARDS, pillarPoints: 2,
      bands: JOURNEY_BANDS.map((band) => ({ ...band, unlocked: level >= band.minLevel, active: band.id === active.id, tasks: band.tasks.map((entry) => ({ ...entry, progress: 0, complete: false })), completed: 0, required: 4, cacheClaimed: false, masteryClaimed: false, cacheReady: false, masteryReady: false })),
      pillars: PILLARS.map((pillar) => ({ ...pillar, rank: 0, canInvest: true })),
      ascensions: ASCENSION_TIERS.map((tier) => ({ ...tier, unlocked: level >= tier.level, selected: null })),
      paragon: {
        unlocked: level >= 100, rank: 0, maxRank: 180, xp: 0, nextXp: paragonXpForRank(0), points: 0, boardSigils: 0, glyphEmbers: 0,
        boards: PARAGON_BOARDS.map((board, boardIndex) => ({ ...board, unlocked: boardIndex === 0, canUnlock: false, nodes: board.nodes.map((node) => ({ ...node, allocated: false, available: false, socketedGlyph: null })) })),
        glyphs: PARAGON_GLYPHS.map((glyph) => ({ ...glyph, rank: 1, upgradeCost: 5, canUpgrade: false, socketedNodeId: null })),
        sockets: {}, legacyImprints: []
      },
      legacy: { rank: 0, xp: 0, nextXp: 3200, points: 0, paths: LEGACY_PATHS.map((path) => ({ ...path, rank: 0, canInvest: false })) }
    };
  },
  getChoirVerdict() { return this.player?.campaign?.flags?.choirVerdict ?? null; },
  chooseChoirVerdict(verdict) { this.player.campaign.flags.choirVerdict = verdict; return true; },
  getCampaignJournal() { const chapter = this.player?.campaign?.chapterId === 'chapter-two' ? CAMPAIGN_CHAPTERS[1] : CAMPAIGN_CHAPTERS[0]; return { chapter, stage: chapter.stages[0], progress: 0, completed: false, chapters: CAMPAIGN_CHAPTERS.map((entry) => ({ ...entry, active: entry.id === chapter.id, discovered: entry.id === chapter.id, completed: false })) }; },
  getSkillNodes() { return []; }, upgradeSkill() { return false; },
  getImprintOptions() { return [{ slot: 'skillOne', title: 'First skill', selected: this.player.skillImprints.skillOne ?? null, options: [{ id: 'forked', name: 'Forked Oath', level: 3, icon: '⌇', desc: 'A real combat modification.' }] }]; },
  selectImprint(slot, id) { this.player.skillImprints[slot] = id; return true; },
  getMasteryOptions() { return [{ id: 'attack', name: 'Vanguard Discipline', icon: '⚔', rank: 3, maxRank: 5, xp: 230, nextXp: 430, unlockLevel: 16, desc: 'Earned in combat.', doctrineUnlocked: true, selectedDoctrine: this.player.masteryDoctrines.attack ?? null, doctrineOptions: [{ id: 'relentless', name: 'Relentless Cadence', icon: '↻', desc: 'A real combat doctrine.' }] }]; },
  selectMasteryDoctrine(slot, id) { this.player.masteryDoctrines[slot] = id; return true; },
  equipItem() { return false; }, reforgeItem() { return false; }, startEndgame() { return false; }, returnToSanctuary() {}
};
const presses = [];
const input = { press(action) { presses.push(action); }, hold() {}, release() {} };
const ui = new GameUI(document.querySelector('#root'), game, input, { reducedVfx: false });

assert.equal(document.querySelectorAll('.class-card.is-selected').length, 0, 'no class can be silently preselected');
assert.equal(document.querySelector('#new-run').disabled, true, 'new run needs two classes');
assert.equal(document.querySelector('.touch-controls'), null, 'Windows UI must not include virtual touch controls');
assert.doesNotMatch(document.body.textContent, /Install Game/, 'Windows UI must not expose a PWA installation path');
document.querySelector('[data-class-id="warden"]').click();
document.querySelector('[data-class-id="thornseer"]').click();
assert.equal(document.querySelector('#class-count').textContent, '2 / 2 selected');
assert.equal(document.querySelector('#new-run').disabled, false, 'the start button must become usable after two selections');
assert.match(document.querySelector('#hybrid-preview').textContent, /Briar Oath/);
document.querySelector('#new-run').click();
assert.equal(game.player.primary, 'warden');
assert.equal(game.player.secondary, 'thornseer');
assert.ok(document.querySelector('#title-screen').classList.contains('is-hidden'));
assert.ok(!document.querySelector('#hud').classList.contains('is-hidden'));
document.querySelector('#campaign-button').click();
assert.match(document.querySelector('#overlay-title').textContent, /Campaign journal/);
assert.match(document.querySelector('#overlay-content').textContent, /Bell-Broken Road/);
ui.hideOverlay();
document.querySelector('#journey-button').click();
assert.match(document.querySelector('#overlay-title').textContent, /Covenant Journey/);
assert.match(document.querySelector('#overlay-content').textContent, /Crownless March/);
assert.equal(document.querySelectorAll('.journey-task').length, 6, 'the active level stage should expose six Journey trials');
document.querySelector('[data-journey-view="pillars"]').click();
assert.match(document.querySelector('#overlay-content').textContent, /Permanent build foundations/);
assert.equal(document.querySelectorAll('.pillar-card').length, 6, 'all permanent Pillars need a desktop UI');
document.querySelector('[data-journey-view="ascension"]').click();
assert.equal(document.querySelectorAll('.ascension-tier').length, 20, 'all twenty Ascensions need a desktop UI');
document.querySelector('[data-journey-view="paragon"]').click();
assert.match(document.querySelector('#overlay-content').textContent, /Paragon Atlas/);
assert.equal(document.querySelectorAll('.paragon-board-card').length, 8, 'all eight Paragon boards need a desktop UI');
assert.equal(document.querySelectorAll('.paragon-node').length, 15, 'the selected board should render its full routed topology');
ui.hideOverlay();
game.player.campaign = { chapterId: 'chapter-two', stageId: 'choose-the-toll', flags: { choirVerdict: null } };
ui.showOverlay('campaign-choice');
assert.match(document.querySelector('#overlay-content').textContent, /Bind the Choir/);
document.querySelector('[data-choir-verdict="bind-choir"]').click();
assert.equal(game.player.campaign.flags.choirVerdict, 'bind-choir', 'the Chapter II verdict must be selectable through the desktop UI');
ui.hideOverlay();
ui.showOverlay('skills');
document.querySelector('[data-overlay-action="imprints"]').click();
assert.match(document.querySelector('#overlay-title').textContent, /Skill imprints/);
document.querySelector('[data-imprint-id="forked"]').click();
assert.equal(game.player.skillImprints.skillOne, 'forked', 'imprint selections must be available through the UI');
ui.showOverlay('skills');
document.querySelector('[data-overlay-action="mastery"]').click();
assert.match(document.querySelector('#overlay-title').textContent, /Covenant mastery/);
document.querySelector('[data-mastery-doctrine="relentless"]').click();
assert.equal(game.player.masteryDoctrines.attack, 'relentless', 'mastery doctrines must be selectable through the UI');
ui.showOverlay('inventory');
assert.match(document.querySelector('#overlay-content').textContent, /Pack 0\/60/);
assert.match(document.querySelector('#overlay-content').textContent, /Stash 0\/180/);
ui.hideOverlay();
const attack = document.querySelector('[data-game-action="attack"]');
attack.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true, cancelable: true }));
assert.ok(presses.includes('attack'), 'ability bar must send combat input');
console.log('Ashen Covenant menu/UI smoke test passed.');
