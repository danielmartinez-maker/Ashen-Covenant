const FAMILY = Object.freeze({
  flame: { cast: 'flame-cinder-cast', trail: 'flame-pyre-trail', impact: 'flame-brand-impact', semitoneOffset: 3 },
  grave: { cast: 'grave-ossuary-cast', trail: 'grave-funeral-trail', impact: 'grave-bell-impact', semitoneOffset: -2 },
  blood: { cast: 'blood-vein-cast', trail: 'blood-scarlet-trail', impact: 'blood-heart-impact', semitoneOffset: -1 },
  light: { cast: 'light-dawn-cast', trail: 'light-radiant-trail', impact: 'light-sun-impact', semitoneOffset: 5 },
  storm: { cast: 'storm-static-cast', trail: 'storm-arc-trail', impact: 'storm-thunder-impact', semitoneOffset: 7 },
  void: { cast: 'void-null-cast', trail: 'void-rift-trail', impact: 'void-collapse-impact', semitoneOffset: -5 }
});

const DEFAULT = { cast: 'covenant-neutral-cast', trail: 'covenant-neutral-trail', impact: 'covenant-neutral-impact', semitoneOffset: 0 };
const clone = (value) => JSON.parse(JSON.stringify(value));

export function resolveCovenantPresentationIdentity(covenant = {}, ability = {}) {
  const affinity = FAMILY[covenant?.primary] ? covenant.primary : 'unbound';
  const stage = Math.max(0, Math.min(5, Math.floor(Number(covenant?.stage) || 0)));
  const family = FAMILY[affinity] ?? DEFAULT;
  const presentation = covenant?.effects?.presentation ?? {};
  const audio = covenant?.effects?.audio ?? {};
  return {
    affinity,
    stage,
    animationKey: `${affinity}-stage-${stage}:${ability?.abilityId ?? ability?.slot ?? 'action'}${ability?.mutationId ? `:${ability.mutationId}` : ''}`,
    vfx: clone({ cast: family.cast, trail: family.trail, impact: family.impact }),
    overlays: {
      aura: stage >= 1 ? presentation.aura ?? null : null,
      markings: stage >= 2 ? presentation.markings ?? null : null,
      eyes: stage >= 3 ? presentation.eyes ?? null : null,
      movement: stage >= 4 ? presentation.movement ?? null : null,
      weapon: stage >= 5 ? presentation.weapon ?? null : null
    },
    audio: { motif: audio.motif ?? null, intensity: Number(audio.intensity) || 0, semitoneOffset: family.semitoneOffset }
  };
}

export function covenantVfxPhase(progress, identity) {
  const value = Math.max(0, Math.min(0.999, Number(progress) || 0));
  if (value < 0.3) return { id: identity?.vfx?.cast ?? DEFAULT.cast, phase: 'cast' };
  if (value < 0.74) return { id: identity?.vfx?.trail ?? DEFAULT.trail, phase: 'trail' };
  return { id: identity?.vfx?.impact ?? DEFAULT.impact, phase: 'impact' };
}

export function bossSignatureCue(bossId, affinity = 'unbound', phase = 1) {
  const safeAffinity = FAMILY[affinity] ? affinity : 'unbound';
  const safePhase = Math.max(1, Math.min(3, Math.floor(Number(phase) || 1)));
  return {
    id: `${bossId}:${safeAffinity}:phase-${safePhase}`,
    bossId,
    affinity: safeAffinity,
    phase: safePhase,
    stinger: `boss-${safeAffinity}-phase-${safePhase}`,
    cameraImpulse: safePhase === 3 ? 1.18 : safePhase === 2 ? 1 : 0.82
  };
}
