const PROFILE_BY_ROLE = Object.freeze({
  melee: { massClass: 'light', mass: 1, poiseMax: 50, guardMax: 0, knockdownable: true, launchable: true },
  ranged: { massClass: 'light', mass: 0.9, poiseMax: 42, guardMax: 0, knockdownable: true, launchable: true },
  healer: { massClass: 'light', mass: 0.95, poiseMax: 46, guardMax: 0, knockdownable: true, launchable: true },
  assassin: { massClass: 'light', mass: 0.78, poiseMax: 38, guardMax: 0, knockdownable: true, launchable: true },
  burrower: { massClass: 'medium', mass: 1.25, poiseMax: 68, guardMax: 0, knockdownable: true, launchable: true },
  summoner: { massClass: 'medium', mass: 1.15, poiseMax: 62, guardMax: 0, knockdownable: true, launchable: true },
  commander: { massClass: 'medium', mass: 1.45, poiseMax: 86, guardMax: 20, knockdownable: true, launchable: true },
  disruptor: { massClass: 'medium', mass: 1.35, poiseMax: 78, guardMax: 14, knockdownable: true, launchable: true },
  shield: { massClass: 'heavy', mass: 1.75, poiseMax: 105, guardMax: 90, knockdownable: true, launchable: false },
  brute: { massClass: 'heavy', mass: 2.55, poiseMax: 145, guardMax: 0, knockdownable: true, launchable: false },
  boss: { massClass: 'boss', mass: 5.25, poiseMax: 320, guardMax: 160, knockdownable: false, launchable: false, unstoppable: true }
});

export function combatProfileForRole(role = 'melee', boss = false) {
  const profile = PROFILE_BY_ROLE[boss ? 'boss' : role] ?? PROFILE_BY_ROLE.melee;
  return {
    ...profile,
    poise: profile.poiseMax,
    guard: profile.guardMax,
    guardClass: profile.guardMax > 0 ? (profile.massClass === 'boss' ? 'boss' : 'guarded') : 'none'
  };
}

const num = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export class CombatSystem {
  resolveHit(context = {}) {
    const target = context.target ?? {};
    const profile = {
      ...combatProfileForRole(target.role ?? (target.boss ? 'boss' : 'melee'), target.boss),
      ...target
    };
    const damage = Math.max(0, num(context.damage));
    const guardBefore = Math.max(0, num(profile.guard, profile.guardMax));
    const guardDamage = Math.max(0, num(context.guardDamage));
    const guarded = guardBefore > 0 && guardDamage > 0;
    const guardAfter = guarded ? Math.max(0, guardBefore - guardDamage) : guardBefore;
    const guardBroken = guarded && guardAfter <= 0;

    const poiseBefore = Math.max(0, num(profile.poise, profile.poiseMax));
    const poiseDamage = Math.max(0, num(context.poiseDamage, damage * num(context.stagger, 0.5)));
    const poiseAfter = Math.max(0, poiseBefore - poiseDamage);
    const staggered = poiseDamage > 0 && poiseAfter <= 0;

    const mass = Math.max(0.35, num(profile.mass, 1));
    const impulse = Math.max(0, num(context.impulse));
    const massResistance = profile.massClass === 'boss' ? 0.2 : profile.massClass === 'heavy' ? 0.55 : profile.massClass === 'medium' ? 0.78 : 1;
    const knockback = impulse * massResistance / mass;
    const knockdown = Boolean(
      profile.knockdownable !== false &&
      !profile.unstoppable &&
      staggered &&
      poiseDamage >= Math.max(24, num(profile.poiseMax, 50) * 0.6)
    );
    const wantsLaunch = context.tags?.includes('launch') || context.tags?.includes('launcher') || num(context.launchPower) > 0;
    const launch = Boolean(profile.launchable !== false && !profile.unstoppable && wantsLaunch && (staggered || impulse >= 260));

    const executePower = Math.max(0, num(context.executePower));
    const hpRatio = num(profile.maxHp) > 0 ? Math.max(0, num(profile.hp) / profile.maxHp) : 1;
    const executeEligible = !profile.boss && executePower > 0 && hpRatio <= executePower;
    const presentationTier = profile.boss || profile.massClass === 'boss'
      ? 'boss'
      : guardBroken || knockdown || context.crit || context.tags?.includes('heavy')
        ? 'heavy'
        : staggered || knockback >= 70
          ? 'medium'
          : 'light';

    return {
      damage,
      damageType: context.damageType ?? 'physical',
      guarded,
      guardBroken,
      guardBefore,
      guardAfter,
      guardDamage,
      poiseBefore,
      poiseAfter,
      poiseDamage,
      staggered,
      knockback,
      knockdown,
      launch,
      executeEligible,
      presentationTier,
      direction: context.direction ?? null,
      position: context.position ?? null,
      abilityId: context.abilityId ?? null,
      covenantTags: [...(context.covenantTags ?? [])]
    };
  }
}
