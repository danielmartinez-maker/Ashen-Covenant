import assert from 'node:assert/strict';
import { CombatSystem, combatProfileForRole } from '../src/systems/combat.js';

const combat = new CombatSystem();
const light = { hp: 100, maxHp: 100, armor: 2, boss: false, ...combatProfileForRole('melee') };
const brute = { hp: 300, maxHp: 300, armor: 12, boss: false, ...combatProfileForRole('brute') };
const boss = { hp: 1000, maxHp: 1000, armor: 18, boss: true, ...combatProfileForRole('boss') };

const hitLight = combat.resolveHit({ source: { x: 0, y: 0 }, target: light, abilityId: 'warden:grave-hew', tags: ['heavy'], damage: 50, damageType: 'physical', stagger: 1, poiseDamage: 60, impulse: 180, guardDamage: 0, executePower: 0, crit: false, position: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, covenantTags: [] });
assert(hitLight.damage > 0);
assert(hitLight.staggered);
assert(hitLight.knockback > 0);
assert.equal(hitLight.knockdown, true);

const hitBrute = combat.resolveHit({ target: brute, damage: 50, poiseDamage: 60, stagger: 1, impulse: 180, guardDamage: 0, executePower: 0.1, crit: false, tags: [] });
assert(!hitBrute.knockdown, 'brutes should absorb a hit that floors a light enemy');
assert(hitBrute.knockback < hitLight.knockback);

boss.guard = boss.guardMax;
const guarded = combat.resolveHit({ target: boss, damage: 120, poiseDamage: 60, stagger: 1, impulse: 300, guardDamage: boss.guardMax * 0.4, executePower: 1, crit: true, tags: ['launch'] });
assert(guarded.guarded);
assert(!guarded.guardBroken);
assert.equal(guarded.launch, false, 'boss anatomy/unstoppable profile blocks launch');
const breaker = combat.resolveHit({ target: boss, damage: 120, poiseDamage: 200, stagger: 2, impulse: 500, guardDamage: boss.guardMax * 2, executePower: 1, crit: true, tags: ['guard-break'] });
assert(breaker.guardBroken);
assert(breaker.presentationTier === 'boss' || breaker.presentationTier === 'heavy');

const executeTarget = { hp: 8, maxHp: 100, armor: 1, boss: false, ...combatProfileForRole('assassin') };
const execution = combat.resolveHit({ target: executeTarget, damage: 1, poiseDamage: 0, stagger: 0, impulse: 0, guardDamage: 0, executePower: 0.12, crit: false, tags: [] });
assert(execution.executeEligible);
console.log('Ashen Covenant normalized HitContext regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
assert(game.combatSystem instanceof CombatSystem, 'GameEngine must own the normalized combat service');
const spawned = game._spawnEnemy('mireling', game.player.x + 85, game.player.y, { level: 1, engaged: true });
assert(spawned.massClass && spawned.poiseMax > 0, 'spawned enemies carry a physical response profile');
let resolvedEvent = null;
const unsubscribe = game.domainEvents.on('combat:hit-resolved', (detail) => { resolvedEvent = detail; });
const hpBefore = spawned.hp;
assert(game._damageEnemy(spawned, 1, { source: 'combat-test', damageType: 'physical', poiseDamage: spawned.poiseMax + 10, impulse: 180, stagger: 1.4 }));
unsubscribe();
assert(spawned.hp < hpBefore);
assert(resolvedEvent?.enemyId === spawned.id, 'live damage path emits normalized hit result');
assert.equal(resolvedEvent.result.staggered, true);
