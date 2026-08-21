import assert from 'node:assert/strict';
import { resolveCovenantPresentationIdentity, covenantVfxPhase, bossSignatureCue } from '../src/presentation/covenant-identity.js';

const grave = resolveCovenantPresentationIdentity({ primary: 'grave', stage: 5, effects: { presentation: { aura: 'grave-mist', eyes: 'pale-violet', markings: 'ossuary-runes', movement: 'mournful-drift', weapon: 'funeral-edge' }, audio: { motif: 'drowned-bell' } } }, { abilityId: 'warden:spirit-nail', mutationId: 'warden:spirit-nail:impaling-vow' });
assert.equal(grave.affinity, 'grave');
assert.equal(grave.stage, 5);
assert(grave.animationKey.includes('grave-stage-5'));
assert.equal(grave.vfx.cast, 'grave-ossuary-cast');
assert.equal(grave.vfx.trail, 'grave-funeral-trail');
assert.equal(grave.vfx.impact, 'grave-bell-impact');
assert.equal(grave.overlays.weapon, 'funeral-edge');
assert.equal(grave.audio.motif, 'drowned-bell');
assert.notEqual(grave.audio.semitoneOffset, 0);
assert.equal(covenantVfxPhase(0.1, grave).id, grave.vfx.cast);
assert.equal(covenantVfxPhase(0.5, grave).id, grave.vfx.trail);
assert.equal(covenantVfxPhase(0.9, grave).id, grave.vfx.impact);
const cue = bossSignatureCue('cryptwarden', 'grave', 3);
assert.equal(cue.id, 'cryptwarden:grave:phase-3');
assert(cue.stinger.includes('grave'));

console.log('Ashen Covenant Covenant presentation identity regression passed.');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) };
const { GameEngine } = await import('../src/systems/game.js');
const { PresentationContextResolver } = await import('../src/presentation/context.js');
const { PresentationEventBus, isPresentationEventType } = await import('../src/presentation/event-bus.js');
const input = { pointer: { active: false, worldX: 0, worldY: 0 }, tick() {}, updateWorldPointer() {}, getMove() { return { x: 0, y: 0, moving: false }; }, isHeld() { return false; }, consume() { return false; }, defer() {}, rumble() {} };
const game = new GameEngine(input, { viewport: { width: 1280, height: 720, scale: 1 } }, { reducedVfx: true });
assert(game.start('warden', 'thornseer'));
for (let i = 0; i < 6; i += 1) game.recordCovenantBehavior(['gravebound'], 10, { regionId: 'gravewake' });
game._refreshPlayerStats(true);
const effect = game._spawnPlayerActionVfx('skillOne', 0.6);
assert.equal(effect.vfxFamily.affinity, 'grave', 'live action VFX must consume Covenant identity');
assert.equal(effect.vfxFamily.stage, 5);
assert.equal(effect.vfxPhases.length, 3, 'runtime effect must stay within a three-phase cast/trail/impact budget');
assert.equal(game.player.covenantPresentation.overlays.weapon, 'funeral-edge', 'stage-five Metamorphosis must visibly reach the equipped weapon');

const bus = new PresentationEventBus({ strict: true });
const resolver = new PresentationContextResolver(bus, { sampleInterval: 0 });
const context = resolver.update(game, 0.1);
assert.equal(context.covenantAffinity, 'grave', 'adaptive presentation context must include Covenant affinity');
assert.equal(context.covenantMotif, 'drowned-bell', 'adaptive music context must include Covenant motif');
assert.equal(context.covenantSemitoneOffset, -2, 'adaptive music must receive Covenant tonal offset');
assert.equal(isPresentationEventType('boss:signature-cue'), true, 'authored boss signature cue must be a valid presentation event');
let received = null;
bus.on('boss:signature-cue', (event) => { received = event.detail; });
bus.emit('boss:signature-cue', cue, { source: 'test' });
assert.equal(received.id, cue.id);

console.log('Ashen Covenant live Covenant presentation regression passed.');
