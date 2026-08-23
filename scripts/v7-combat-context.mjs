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

// Non-player actor context must never inherit the player's class/loadout/Covenant identity.
const enemyActor = {
  id: 'enemy-actor', role: 'brute', x: 240, y: 210, facing: Math.PI,
  elevation: 0, grounded: true, state: 'windup', animation: { type: 'attack', duration: 0.8, time: 0.4 },
  presentation: { visualFacing: Math.PI }
};
const enemyContext = resolver.resolve(game, { damageType: 'physical' }, { actor: enemyActor, eventType: 'combat:enemy-telegraph', target: player });
assert.equal(enemyContext.actorKind, 'enemy');
assert.equal(enemyContext.enemyRole, 'brute');
assert.equal(enemyContext.primaryClass, null, 'enemy actor must not inherit player primary class');
assert.equal(enemyContext.secondaryClass, null, 'enemy actor must not inherit player secondary class');
assert.equal(enemyContext.hybridId, null, 'enemy actor must not inherit player hybrid');
assert.equal(enemyContext.weaponFamily, null, 'enemy actor must not inherit player weapon family');
assert.equal(enemyContext.offhandFamily, null, 'enemy actor must not inherit player offhand');
assert.deepEqual(enemyContext.visibleEquipment, [], 'enemy actor must not inherit player equipment');
assert.deepEqual(enemyContext.visualSignatureIds, [], 'enemy actor must not inherit player Unique signatures');
assert.equal(enemyContext.masterworkRank, 0, 'enemy actor must not inherit player Masterwork');
assert.equal(enemyContext.corruptionLevel, 0, 'enemy actor must not inherit player corruption');
assert.equal(enemyContext.covenantPrimary, 'unbound', 'enemy actor must not inherit player Covenant affinity');
assert.equal(enemyContext.covenantSecondary, null);
assert.equal(enemyContext.covenantStage, 0);
assert.equal(enemyContext.covenantInstability, 0);

const hunterActor = { ...enemyActor, id: 'hunter-actor', hunterId: 'ash-pursuer' };
const hunterContext = resolver.resolve(game, {}, { actor: hunterActor, eventType: 'hunter:intrusion' });
assert.equal(hunterContext.actorKind, 'hunter');
assert.equal(hunterContext.hunterId, 'ash-pursuer');
assert.equal(hunterContext.primaryClass, null);

const neutral = neutralPresentationCombatContext();
assert.equal(Object.isFrozen(neutral), true);
assert.equal(neutral.actorKind, 'unknown');
assert.equal(neutral.covenantPrimary, 'unbound');
assert.equal(neutral.actionProgress, 0);
assert.equal(neutral.settings.reducedMotion, false);

console.log('Ashen Covenant v7 presentation combat context regression passed.');
