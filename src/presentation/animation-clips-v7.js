import { clamp } from '../core/math.js';
import { PLAYER_ANIMATION_CLIPS, clipById } from '../data/animation-v7.js';

const semanticFor = (context) => {
  if (context.actionId === 'death') return 'death';
  if (context.knockdown) return 'knockdown';
  if (context.staggered) return context.hitWeight === 'heavy' ? 'hit-heavy' : 'hit-light';
  if (context.execution) return 'execution';
  if (context.actionId === 'dodge') return 'dodge';
  if (context.actionId === 'rise' || context.actionId === 'resurrection') return 'rise';
  if (context.actionId === 'attack') return `attack${Math.max(1, Math.min(3, Number(context.comboIndex) || 1))}`;
  if (context.actionId === 'heavy' || context.actionId === 'empowered') return 'heavy';
  if (['skillOne', 'skillTwo', 'cast', 'potion'].includes(context.actionId)) return 'cast';
  if (context.actionId === 'companion') return 'companion';
  if (context.actionId === 'hybrid') return 'hybrid';
  if (context.actionId === 'ultimate') return 'ultimate';
  if (context.actionId === 'guard' || context.actionId === 'ward') return 'guard';
  if (['pivot', 'start', 'stop'].includes(context.movementState)) return 'turn';
  if (context.movementState === 'run' || context.movementState === 'combat-run') return context.settings?.reducedMotion ? 'walk' : 'run';
  if (context.movementState === 'walk') return 'walk';
  return 'idle';
};

const sampleWindow = (window, progress) => {
  const [from, to] = window;
  const count = Math.abs(to - from) + 1;
  const bounded = clamp(Number(progress) || 0, 0, 0.999999);
  const offset = Math.min(count - 1, Math.floor(bounded * count));
  return from <= to ? from + offset : from - offset;
};

const locomotionSemantic = new Set(['idle', 'walk', 'run', 'turn', 'guard']);

export class AnimationClipResolver {
  resolve(context = {}) {
    try {
      const semanticState = semanticFor(context);
      const requestedClass = context.primaryClass ?? 'warden';
      const classId = PLAYER_ANIMATION_CLIPS[`${requestedClass}:${semanticState}`] ? requestedClass : 'warden';
      const clip = clipById(`${classId}:${semanticState}`);
      const progress = clamp(Number(locomotionSemantic.has(semanticState)
        ? context.locomotionProgress ?? context.movementProgress ?? context.movementIntensity ?? 0
        : context.actionProgress ?? 0) || 0, 0, 1);
      const facingLane = Math.max(0, Math.min(7, Math.floor(Number(context.facingLane) || 0)));
      return Object.freeze({
        clipId: clip.id,
        assetId: clip.assetId,
        semanticState,
        sourcePath: clip.sourcePath,
        row: clip.rowBase * 8 + facingLane,
        facingLane,
        frame: sampleWindow(clip.frameWindow, clip.loop ? progress % 1 : progress),
        frameCount: clip.frameCount,
        progress,
        anchors: clip.anchors,
        loop: clip.loop,
        marker: clip.marker
      });
    } catch {
      const clip = clipById('warden:idle');
      return Object.freeze({
        clipId: clip.id, assetId: clip.assetId, semanticState: 'idle', sourcePath: clip.sourcePath,
        row: clip.rowBase * 8, facingLane: 0, frame: clip.frameWindow[0], frameCount: clip.frameCount,
        progress: 0, anchors: clip.anchors, loop: true, marker: null
      });
    }
  }
}
