import assert from 'node:assert/strict';
import { PresentationCombatContextResolver, neutralPresentationCombatContext } from '../src/presentation/combat-context-v7.js';

const player = {
  id: 'player-1', primary: 'warden', secondary: 'thornseer', x: 100, y: 200, facing: Math.PI / 2,
  elevation: 12, grounded: true, moveX: 160, moveY: 0,
  equipment: {
    weapon: { id: 'weapon-1', slot: 'weapon', baseId: 'iron-cleaver', rarity: 'unique', uniqueId: 'bell-sunder', masterwork: 8, corruption: 2 },
    chest: { id: 'chest-1', slot: 'chest', baseId: 'cairn-plate', rarity: 'relic', masterwork: 4 }
  },
  presentation: {
    profile: { weapon: 'cleaver' },
    locomotion: { state: 'combat-run', speedRatio: 0.8, visualFacing: Math.PI / 2 },
    action: { elapsed: 0.31, phase: 'active', profile: { id: 'warden-attack-2', action: 'attack', duration: 0.62, comboIndex: 2 } }
  }
};
const target = { id: 'enemy-1', role: 'brute', x: 170, y: 200, material: 'plate', elite: true };
const game = {
  player, clock: 12.5,
  settings: { reducedMotion: true, reducedFlashing: true, reducedVfx: true },
  getCovenantOverview: () => ({ primary: 'grave', secondary: 'blood', stage: 5, instability: 17, ruptureActive: false })
};

const resolver = new PresentationCombatContextResolver();
const context = resolver.resolve(game, {
  action: 'attack', comboIndex: 2,
  hitWeight: 'heavy', damageType: 'physical', critical: true,
  hitResult: { guarded: true, guardBroken: true, poiseBroken: true, staggered: true, knockdown: false }
}, { actor: player, eventType: 'combat:attack-impact', target });

assert.equal(Object.isFrozen(context), true);
assert.equal(context.actorKind, 'player');
assert.equal(context.primaryClass, 'warden');
assert.equal(context.secondaryClass, 'thornseer');
assert.equal(context.actionId, 'attack');
assert.equal(context.comboIndex, 2);
assert.equal(context.phase, 'active');
assert.equal(context.actionProgress, 0.5);
assert.equal(context.facingLane, 2);
assert.equal(context.movementState, 'combat-run');
assert.equal(context.contactMaterial, 'plate');
assert.equal(context.eventType, 'combat:attack-impact');
assert.equal(context.hitWeight, 'heavy');
assert.equal(context.guardBroken, true);
assert.equal(context.poiseBroken, true);
assert.equal(context.staggered, true);
assert.equal(context.critical, true);
assert.equal(context.covenantPrimary, 'grave');
assert.equal(context.covenantSecondary, 'blood');
assert.equal(context.covenantStage, 5);
assert.equal(context.covenantInstability, 17);
assert.equal(context.covenantIdentity.affinity, 'grave');
assert.equal(context.settings.reducedMotion, true);
assert.equal(context.settings.reducedFlashing, true);
assert.equal(context.settings.reducedVfx, true);
assert.equal(Object.isFrozen(context.visibleEquipment), true);
const visibleWeapon = context.visibleEquipment.find((item) => item.slot === 'weapon');
assert.equal(visibleWeapon.uniqueId, 'bell-sunder');
assert.equal(visibleWeapon.visualSignatureId, 'unique:bell-sunder');
assert.equal(visibleWeapon.masterworkRank, 8);
assert.equal(visibleWeapon.corruption, 2);
assert.ok(context.visualSignatureIds.includes('unique:bell-sunder'));
assert.equal(context.masterworkRank, 8, 'context derives maximum visible Masterwork rank');
assert.equal(context.corruptionLevel, 2, 'context derives maximum visible corruption rank');

const textCorruptedPlayer = {
  ...player,
  id: 'player-corrupted',
  equipment: {
    amulet: {
      id: 'amulet-corrupted', slot: 'amulet', baseId: 'obelisk-charm', rarity: 'unique', uniqueId: 'bloodroot-idol',
      corruption: 'Forbidden precision; Fractured armor'
    }
  }
};
const textCorruptionContext = resolver.resolve({ ...game, player: textCorruptedPlayer }, {}, { actor: textCorruptedPlayer, eventType: 'frame' });
const corruptedAmulet = textCorruptionContext.visibleEquipment.find((item) => item.slot === 'amulet');
assert.equal(corruptedAmulet.corruption, 1, 'production text-form corruption must normalize to a nonzero presentation level');
assert.equal(textCorruptionContext.corruptionLevel, 1, 'aggregate combat presentation must retain production corruption state');
assert.ok(textCorruptionContext.visualSignatureIds.includes('unique:bloodroot-idol'), 'accessory Unique signatures must remain visible to presentation context');

const neutral = neutralPresentationCombatContext();
assert.equal(Object.isFrozen(neutral), true);
assert.equal(neutral.actorKind, 'unknown');
assert.equal(neutral.covenantPrimary, 'unbound');
assert.equal(neutral.actionProgress, 0);
assert.equal(neutral.settings.reducedMotion, false);

console.log('Ashen Covenant v7 presentation combat context regression passed.');
