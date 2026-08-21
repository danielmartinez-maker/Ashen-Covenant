const phase = (mechanics, { intermission = 0.72, punish = 0.5 } = {}) => ({ mechanics, intermission, punish });

export const BOSS_DEFINITIONS = Object.freeze({
  bellwitness: { thresholds: [0.72, 0.38], phases: [phase(['witness-bolt','witness-cone']), phase(['witness-echo','witness-bellfire','witness-bolt']), phase(['witness-toll','witness-prison','witness-cone'])] },
  tollingabbot: { thresholds: [0.68, 0.31], phases: [phase(['abbot-bolt','abbot-slam','abbot-double-bolt']), phase(['abbot-bellfire','abbot-choir-call','abbot-volley'], { intermission: 0.9 }), phase(['abbot-toll-wave','abbot-judgment','abbot-toll-prison'], { intermission: 1.05, punish: 0.7 })] },
  cryptwarden: { thresholds: [0.64, 0.30], phases: [phase(['crypt-lance','crypt-grave-ring']), phase(['crypt-procession','crypt-tomb-call','crypt-lance'], { intermission: 0.88 }), phase(['crypt-procession','crypt-bone-storm','crypt-tomb-call'], { punish: 0.65 })] },
  bloodmatron: { thresholds: [0.75, 0.42], phases: [phase(['matron-thorn','matron-blood-pool']), phase(['bloodroot-eruption','matron-leech-call','matron-thorn'], { intermission: 0.84 }), phase(['matron-heartburst','bloodroot-eruption','matron-harvest'], { punish: 0.62 })] },
  bogsovereign: { thresholds: [0.7, 0.34], phases: [phase(['sovereign-wave','sovereign-mire']), phase(['rising-blackwater','sovereign-grasp','sovereign-wave']), phase(['sovereign-drown','rising-blackwater','sovereign-grasp'], { punish: 0.6 })] },
  burialengine: { thresholds: [0.62, 0.26], phases: [phase(['engine-slam','engine-spoke']), phase(['rolling-tomb','engine-burial-call','engine-slam'], { intermission: 0.96 }), phase(['engine-ossuary-collapse','rolling-tomb','engine-burial-call'], { punish: 0.72 })] },
  chainregent: { thresholds: [0.73, 0.37], phases: [phase(['regent-chain','regent-command']), phase(['command-chain','regent-iron-call','regent-chain'], { intermission: 0.8 }), phase(['regent-fortress-break','command-chain','regent-chain'], { punish: 0.58 })] },
  mirrorapostle: { thresholds: [0.66, 0.33], phases: [phase(['apostle-lance','apostle-glass']), phase(['mirror-step','mirror-lance','apostle-glass'], { intermission: 0.66 }), phase(['apostle-reflected-barrage','mirror-step','mirror-lance'], { punish: 0.44 })] },
  veiledoracle: { thresholds: [0.78, 0.46], phases: [phase(['oracle-shard','oracle-line']), phase(['fifth-road-shard','erased-road','oracle-shard'], { intermission: 0.74 }), phase(['oracle-null-crossing','fifth-road-shard','erased-road'], { punish: 0.52 })] },
  silenceincarnate: { thresholds: [0.58, 0.22], phases: [phase(['silence-pulse','silence-ring']), phase(['silent-wave','absolute-silence','silence-pulse'], { intermission: 1.0 }), phase(['silence-mute-collapse','absolute-silence','silent-wave'], { intermission: 1.12, punish: 0.76 })] }
});

const affinities = new Set(['flame','grave','blood','light','storm','void']);

export class BossController {
  constructor(domainEvents = null) {
    this.domainEvents = domainEvents;
    this.states = new Map();
  }

  definitionFor(enemyOrId) {
    const id = typeof enemyOrId === 'string' ? enemyOrId : enemyOrId?.templateId;
    return BOSS_DEFINITIONS[id] ?? null;
  }

  update(enemy, { covenant = {}, now = 0, variantOverride = null } = {}) {
    const definition = this.definitionFor(enemy);
    if (!definition || !enemy?.boss) return { phase: enemy?.phase ?? 1, variantId: 'base', modifiers: [], intermission: 0, punishWindow: 0 };
    const ratio = Math.max(0, Number(enemy.hp) / Math.max(1, Number(enemy.maxHp)));
    const phaseNumber = ratio <= definition.thresholds[1] ? 3 : ratio <= definition.thresholds[0] ? 2 : 1;
    const affinity = variantOverride && affinities.has(variantOverride)
      ? variantOverride
      : affinities.has(covenant?.primary) ? covenant.primary : 'base';
    const variantId = affinity === 'base' ? 'base' : `${affinity}-bound`;
    const previous = this.states.get(enemy.id);
    const changed = previous ? previous.phase !== phaseNumber : phaseNumber !== (enemy.phase ?? 1);
    const phaseDef = definition.phases[phaseNumber - 1];
    const state = {
      bossId: enemy.id,
      templateId: enemy.templateId,
      phase: phaseNumber,
      variantId,
      affinity,
      modifiers: affinity === 'base' ? [] : [`${affinity}-pressure`, phaseNumber >= 3 ? `${affinity}-apex` : null].filter(Boolean),
      intermission: changed ? phaseDef.intermission : 0,
      punishWindow: phaseDef.punish,
      enteredAt: changed ? now : previous?.enteredAt ?? now
    };
    this.states.set(enemy.id, state);
    if (changed) this.domainEvents?.emit?.('boss:phase-changed', { bossId: enemy.id, enemyId: enemy.templateId, phase: phaseNumber, variantId });
    return state;
  }

  nextMechanic(enemy, state = null) {
    const definition = this.definitionFor(enemy);
    if (!definition) return { id: 'boss-strike', tags: ['boss'], punishWindow: 0.45 };
    const resolved = state ?? this.states.get(enemy.id) ?? this.update(enemy, {});
    const phaseDef = definition.phases[Math.max(0, Math.min(2, (resolved.phase ?? 1) - 1))];
    const mechanics = phaseDef.mechanics;
    const index = Math.max(0, Number(enemy.attackCount) || 0) % mechanics.length;
    const id = mechanics[index];
    return {
      id,
      tags: ['boss', resolved.affinity !== 'base' ? resolved.affinity : null, `phase-${resolved.phase}`].filter(Boolean),
      punishWindow: phaseDef.punish,
      variantId: resolved.variantId,
      phase: resolved.phase
    };
  }

  clear(enemyId = null) {
    if (enemyId == null) this.states.clear();
    else this.states.delete(enemyId);
  }
}
