import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ZONES, zoneAt } from '../src/data/world.js';

const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  localStorage: dom.window.localStorage
});

const [{ GameEngine }, { GameUI }] = await Promise.all([
  import('../src/systems/game.js'),
  import('../src/ui/ui.js')
]);

const input = {
  pointer: { active: true, worldX: 0, worldY: 0 },
  tick() {}, updateWorldPointer() {}, getMove() { return { x: 1, y: 0, moving: true }; }, getAimDirection() { return null; },
  isHeld() { return false; }, consume() { return false; }, consumeUi() { return false; }, defer() {}, press() {}, hold() {}, release() {}, rumble() {}
};
const renderer = { viewport: { width: 1280, height: 720, scale: 1 } };
const game = new GameEngine(input, renderer, { reducedVfx: true, lootFilter: 'all' });
assert.ok(game.start('warden', 'thornseer'));
game.player.level = 30;
game.player.maxHp = 200;
game.player.hp = 200;
game.player.materials = { cinders: 1000, echoes: 100, shards: 100, prisms: 20, marks: 20, alloys: 40, cores: 10 };
game.random = () => 0;

const fatedRelic = {
  id: 'fated-regression-relic', name: 'Conduit of the Bell-Rift', rarity: 'relic', slot: 'weapon', art: 0, itemLevel: 30,
  quality: 'superior', sockets: 2, runeIds: [], masterwork: 0, masterworkFocus: 0, masterworkExalts: [], bondXp: 0, bondRank: 0,
  implicit: { stat: 'power', value: 5, label: 'Conduit power' }, description: 'Regression relic for Fated combat rules.',
  affixes: [
    { stat: 'echoStrike', label: 'Echoing strike', value: 1, percentage: true, tier: 5 },
    { stat: 'projectileFork', label: 'Forking shot', value: 1, percentage: true, tier: 5 },
    { stat: 'criticalBurst', label: 'Rupturing critical', value: 1, percentage: true, tier: 5 },
    { stat: 'wardPulse', label: 'Reprisal ward', value: 1, percentage: true, tier: 5 },
    { stat: 'dashNova', label: 'Rift afterstep', value: 1, percentage: true, tier: 5 },
    { stat: 'executionCascade', label: 'Execution cascade', value: 1, percentage: true, tier: 5 },
    { stat: 'soulLeech', label: 'Soul siphon', value: 0.2, percentage: true, tier: 5 },
    { stat: 'confluenceSurge', label: 'Confluence surge', value: 1, percentage: true, tier: 5 }
  ]
};
game.player.equipment.weapon = fatedRelic;
game._refreshPlayerStats(true);
assert.equal(game.getActiveFatedAffixes().length, 8, 'equipped Fated affixes must be available to the HUD and Codex');

const spawn = (x, y, elite = false) => game._spawnEnemy('mireling', x, y, { level: 1, elite, group: 'fated-test' });
const player = game.player;
player.facing = 0;
input.pointer.worldX = player.x + 300;
input.pointer.worldY = player.y;
const target = spawn(player.x + 60, player.y);
spawn(player.x + 120, player.y + 20);
spawn(player.x + 150, player.y - 40);
game._basicAttack();
assert.ok(game.entities.effects.some((effect) => effect.kind === 'affix-echo-strike'), 'Echoing strike must produce an extra combat action');
assert.ok(game.entities.hazards.some((hazard) => hazard.kind === 'fated-rupture'), 'Rupturing critical must create its area burst');

const forkTarget = spawn(player.x + 245, player.y + 10);
spawn(player.x + 290, player.y + 30);
spawn(player.x + 300, player.y - 40);
game._createProjectile({ owner: 'player', kind: 'fated-test-bolt', x: forkTarget.x, y: forkTarget.y, angle: 0, speed: 0, radius: 9, life: 0.8, damage: 4, pierce: 0, color: '#fff' });
game._updateProjectiles(0.02);
assert.ok(game.entities.effects.some((effect) => effect.kind === 'affix-projectile-fork'), 'Forking shot must branch a projectile hit toward nearby enemies');

game._dodge();
assert.ok(game.entities.hazards.some((hazard) => hazard.kind === 'fated-rift'), 'Rift afterstep must leave a damaging rift');
player.iframes = 0;
player.barrier = 80;
game._damagePlayer(16, 'fated-test');
assert.ok(game.entities.effects.some((effect) => effect.kind === 'affix-ward-pulse'), 'Reprisal ward must pulse after a barrier absorb');

const elite = spawn(player.x + 70, player.y + 70, true);
const barrierBeforeLeech = player.barrier;
game._killEnemy(elite, 'fated-test');
assert.ok(player.barrier > barrierBeforeLeech, 'Soul siphon must restore Barrier after an elite kill');

const executionTarget = spawn(player.x + 75, player.y, false);
executionTarget.knockdown = 1;
game._executeEnemy(executionTarget);
assert.ok(game.entities.effects.some((effect) => effect.kind === 'affix-execution-cascade'), 'Execution cascade must burst from a finished target');

player.confluence = 1;
game._triggerConfluence();
assert.equal(player.confluence, 2, 'Confluence surge must create an additional charge when it procs');

assert.equal(ZONES.length, 6, 'the map must contain all six authored terrain regions');
for (let x = 80; x < 3840; x += 310) {
  for (let y = 80; y < 2520; y += 290) {
    const zone = zoneAt(x, y);
    assert.ok(zone?.terrain?.includes('/assets/terrain/'), `every world position must resolve to a painted terrain region (${x}, ${y})`);
  }
}

const ui = new GameUI(document.querySelector('#root'), game, input, { reducedVfx: true, sound: false, lootFilter: 'all' });
ui.showOverlay('inventory');
assert.ok(document.querySelector('[data-inspect-item-id="fated-regression-relic"]'), 'the Loadout view must present compact selectable item tiles');
assert.ok(document.querySelector('.item-inspector-card .is-fated .affix-effect'), 'the selected-item inspector must explain a Fated affix effect');
document.querySelector('[data-inventory-mode="codex"]').click();
assert.match(document.querySelector('#overlay-content').textContent, /Active fated effects/, 'the Codex must summarize active Fated effects');
ui.showOverlay('map');
assert.equal(document.querySelectorAll('.map-zone').length, 6, 'the world map must surface every painted region');
assert.match(document.querySelector('.map-zone').getAttribute('style'), /--terrain:url\('http:\/\/localhost\/assets\/terrain\//, 'world-map regions must resolve their matching terrain art from the application document');

console.log('Ashen Covenant visual, Fated-affix, and UX regression test passed.');
