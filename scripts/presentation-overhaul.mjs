import assert from 'node:assert/strict';
import { GameEngine } from '../src/systems/game.js';
import { GamePresentationSystem } from '../src/presentation/system.js';
import { CLASS_PRESENTATION_PROFILES, DESTRUCTIBLE_PROFILES } from '../src/data/presentation.js';
import { validatePresentationData, validatePresentationRuntime } from '../src/presentation/validator.js';

const move = { x: 0, y: 0, moving: false };
const queued = [];
const input = {
  pointer: { active: false, worldX: 0, worldY: 0 },
  queue: queued, tick(delta) { queued.forEach((entry) => { entry.time -= delta; }); }, updateWorldPointer() {},
  getMove() { return move; }, getAimDirection() { return null; }, isHeld() { return false; },
  consume(action) { const index = queued.findIndex((entry) => entry.action === action); if (index < 0) return false; queued.splice(index, 1); return true; },
  defer(action, time = .18) { this.press(action, time); }, press(action, time = .22) { queued.push({ action, time }); }, rumble() {}
};
const renderer = { viewport: { width: 1440, height: 900, scale: 1 } };
const settings = { sound: false, reducedVfx: true, graphicsQuality: 'high', cameraShakeScale: 0, hitStopScale: .5, reducedFlashing: true, presentationDebug: true };
const game = new GameEngine(input, renderer, settings);
const presentation = new GamePresentationSystem(game, { input, settings, audio: null, strictEvents: true });
assert.ok(game.start('warden', 'thornseer'));

const validation = validatePresentationData();
assert.equal(validation.valid, true, validation.issues.map((entry) => `${entry.code}: ${entry.message}`).join('\n'));
assert.equal(validation.summary.classes, 6);
assert.equal(validation.summary.attacks, 18);
assert.equal(validation.summary.actions, 10);
assert.ok(validation.summary.cues >= 35);

// Weapon identities and their timing profiles must be mechanically distinct.
assert.equal(new Set(Object.values(CLASS_PRESENTATION_PROFILES).map((profile) => profile.weapon)).size, 6);
assert.equal(new Set(Object.values(CLASS_PRESENTATION_PROFILES).map((profile) => profile.attacks[2].duration)).size, 6);
Object.values(CLASS_PRESENTATION_PROFILES).forEach((profile) => {
  profile.attacks.forEach((attack) => {
    assert.ok(attack.startup < attack.active && attack.active < attack.duration);
    assert.ok(attack.cancelWindows.dodge[0] >= attack.active);
  });
});

// Basic damage resolves on the authored hit event instead of input press.
game.entities.enemies = [];
const target = game._spawnEnemy('mireling', game.player.x + 52, game.player.y, { level: 1, group: 'presentation-test' });
target.speed = 0; target.recoveryLeft = 99;
const originalHp = target.hp;
assert.ok(game._basicAttack());
const attack = presentation.animationDirector.timeline.current;
assert.ok(attack);
assert.equal(target.hp, originalHp, 'input press cannot deal damage before the active frame');
game.update(Math.max(.01, attack.profile.active - .035));
assert.equal(target.hp, originalHp, 'anticipation must remain non-damaging');
game.update(.05);
assert.ok(target.hp < originalHp, 'the EnableHitbox event must resolve damage');
assert.ok(presentation.eventBus.recent('combat:attack-impact', 1).length === 1);
while (presentation.animationDirector.timeline.current?.elapsed < attack.profile.cancelWindows.dodge[0] + .002) {
  game.hitStop = 0;
  game.update(.01);
}
assert.equal(presentation.canPerformAction('dodge'), true, 'dodge becomes available only inside the authored cancel window');

game._dodge();
assert.ok(game.player.dash);
assert.ok(game.player.iframes <= game.player.dash.time && game.player.dash.time - game.player.iframes <= .011, 'dodge immunity must match visible displacement');

// Skills commit through the same event timeline: no resource or projectile is
// produced until the authored release frame, and hit stop cannot skip it.
game.hitStop = 0; game.player.dash = null; game.player.iframes = 0;
presentation.animationDirector.timeline.clear(game);
game.player.resource = game.player.maxResource;
game.player.cooldowns.skillOne = 0;
const resourceBeforeSkill = game.player.resource;
const projectileCount = game.entities.projectiles.length;
assert.equal(game._skillOne(), true);
const skill = presentation.animationDirector.timeline.current;
assert.equal(skill.profile.action, 'skillOne');
assert.equal(game.entities.projectiles.length, projectileCount);
assert.equal(game.player.resource, resourceBeforeSkill);
while (presentation.animationDirector.timeline.current.elapsed < skill.profile.active - .021) game.update(.03);
assert.equal(game.entities.projectiles.length, projectileCount);
game.update(.03);
assert.ok(game.entities.projectiles.length > projectileCount, JSON.stringify({ timeline: presentation.animationDirector.timeline.debug(), errors: presentation.errorLog, events: presentation.eventBus.recent(null, 12) }, null, 2));
assert.ok(game.player.resource < resourceBeforeSkill);

// Acceleration, starts/stops, pivots, and foot-contact events share the locomotion controller.
game.entities.enemies = [];
game.player.dash = null; game.player.iframes = 0; game.hitStop = 0;
presentation.animationDirector.timeline.clear(game);
move.x = 1; move.y = 0; move.moving = true;
const maximumSpeed = game.getStats().speed;
game.update(1 / 60); presentation.update(1 / 60);
assert.ok(game.player.moveX > 0 && game.player.moveX < maximumSpeed, 'movement must accelerate instead of snapping to maximum speed');
assert.equal(game.player.presentation.locomotion.state, 'start');
for (let index = 0; index < 75; index += 1) { game.update(1 / 60); presentation.update(1 / 60); }
assert.ok(['run', 'combat-run'].includes(game.player.presentation.locomotion.state));
assert.ok(presentation.eventBus.recent('animation:footstep', 20).length >= 2, 'footsteps must be emitted from stride contacts');
move.x = 0; move.moving = false;
game.update(1 / 60); presentation.update(1 / 60);
assert.ok(game.player.moveX > 0, 'releasing movement must decelerate instead of snapping to zero');
for (let index = 0; index < 45 && game.player.presentation.locomotion.state !== 'stop'; index += 1) {
  game.update(1 / 60);
  presentation.update(1 / 60);
}
assert.equal(game.player.presentation.locomotion.state, 'stop');

// Telegraph, transition, reaction, impact, and destruction events are typed and bounded.
const archer = game._spawnEnemy('ashbow', game.player.x + 220, game.player.y, { group: 'presentation-enemy' });
game._startEnemyAttack(archer);
assert.equal(archer.telegraph.shape, 'line');
assert.ok(presentation.eventBus.recent('combat:enemy-telegraph', 1).length === 1);
const boss = game._spawnEnemy('cryptwarden', game.player.x + 320, game.player.y, { group: 'presentation-boss', elite: true });
boss.hp = boss.maxHp * .6;
game._updateBossPhase(boss);
assert.equal(boss.phase, 2);
assert.ok(boss.phaseTransition > 0 && boss.state === 'phase-transition');
const transitionLeft = boss.phaseTransition;
game._updateEnemies(.1);
assert.ok(boss.phaseTransition < transitionLeft && boss.windupLeft === 0, 'boss gameplay must hold during a visible phase transition');

game.hitStop = 0; game.camera.flash = 0;
presentation.requestImpact('critical', { x: game.player.x, y: game.player.y });
assert.ok(game.hitStop > .02 && game.hitStop < .024, 'hit-stop accessibility scale must modify the shared impact profile');
assert.ok(game.camera.flash <= .025, 'reduced flashing must constrain impact flash');

const destructible = game.entities.destructibles.find((entry) => entry.kind === 'urn');
assert.ok(destructible && DESTRUCTIBLE_PROFILES.urn);
game._damageDestructible(destructible, 1, 'test-strike');
assert.equal(destructible.broken, true);
assert.ok(presentation.eventBus.recent('combat:attack-impact', 2).some((event) => event.detail.entityId === destructible.id));

presentation.update(.1);
assert.ok(presentation.getContext().nearbyEnemyCount >= 1);
assert.ok(presentation.getContext().enemyThreatScore > 0);
assert.ok(presentation.animationDirector.getAmbientActors({ playerInTown: true }).length >= 12);
assert.ok(presentation.animationDirector.getAmbientActors({ playerInTown: false, strongholdState: 'liberated', currentRegion: 'gravewake' }).length >= 3);

presentation.cinematic.start('presentation-test', { game });
assert.equal(presentation.cinematic.active, true);
assert.ok(presentation.skipCinematic());
assert.equal(presentation.cinematic.active, false);
assert.ok(presentation.eventBus.recent('cinematic:skip', 1).length === 1);

const runtime = validatePresentationRuntime(game, presentation);
assert.equal(runtime.valid, true, runtime.issues.map((entry) => entry.message).join('\n'));
const debug = presentation.getDebugSnapshot();
assert.ok(debug.performance.currentMs >= 0 && debug.animation.budget.activeActors >= 1);
assert.ok(debug.activeDestructibles >= 1);

console.log('Ashen Covenant unified presentation overhaul test passed.');
