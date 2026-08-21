import { clamp, distance, lerp } from '../core/math.js';
import { districtAt } from '../data/expansion.js';
import { zoneAt } from '../data/world.js';
import { resolveCovenantPresentationIdentity } from './covenant-identity.js';

const WEATHER_BY_REGION = {
  sanctuary: 'ashfall', gravewake: 'fog', redfen: 'rain', cairnreach: 'wind', 'veiled-road': 'rift-fog', bellscar: 'ash-storm'
};

const stableObject = (value) => value && typeof value === 'object' ? value : {};

export class PresentationContextResolver {
  constructor(bus, { sampleInterval = 0.1 } = {}) {
    this.bus = bus;
    this.sampleInterval = sampleInterval;
    this.sampleTimer = 0;
    this.intensity = 0;
    this.rawThreat = 0;
    this.band = 'Silence';
    this.bandCandidate = this.band;
    this.bandHold = 0;
    this.lastSignature = '';
    this.combatDuration = 0;
    this.context = this._empty();
  }

  _empty() {
    return {
      currentRegion: 'sanctuary', currentBiome: 'sanctuary', currentSubregion: null,
      currentDungeon: null, currentDungeonDepth: 0, currentRoomType: 'overworld', currentSettlement: 'Ashen Sanctuary',
      currentQuest: null, currentCampaignChapter: 'chapter-one', currentNarrativeBeat: null,
      currentWorldTier: 1, currentDifficulty: 1, currentEndgameActivity: null,
      timeOfDay: 'day', weatherType: 'ashfall', corruptionLevel: 0,
      playerClass: null, playerSecondaryClass: null, playerWeaponType: null, covenantAffinity: null, covenantStage: 0, covenantMotif: null, covenantSemitoneOffset: 0,
      playerMovementState: 'idle', playerCombatState: 'safe', playerHealthPercent: 1, playerResourcePercent: 1,
      playerCrowdControlState: null, playerInTown: true, playerInCombat: false, playerDead: false,
      playerMounted: false, playerInteracting: false, playerCasting: false, playerUsingUltimate: false,
      nearbyEnemyCount: 0, nearbyEliteCount: 0, nearbyBoss: null, enemyThreatScore: 0,
      combatDuration: 0, encounterWave: 0, bossPhase: 0, bossHealthPercent: 0,
      bossStaggerState: false, bossEnraged: false, localEventActive: false, strongholdState: null,
      cinematicActive: false, menuOpen: true, gamePaused: false, musicOverride: null, animationOverride: null,
      musicState: 'MainMenu', musicIntensity: 0, intensityBand: 'Silence', cameraProfile: 'menu'
    };
  }

  update(game, delta) {
    const dt = clamp(Number(delta) || 0, 0, 0.1);
    this.sampleTimer -= dt;
    if (this.sampleTimer <= 0) {
      this.sampleTimer = this.sampleInterval;
      this._sample(game);
    }
    const debugIntensity = game?.presentation?.debugOverrides?.musicIntensity;
    if (Number.isFinite(debugIntensity)) this.rawThreat = clamp(debugIntensity, 0, 1);
    const attackRate = this.rawThreat > this.intensity ? 3.4 : 1.15;
    this.intensity = lerp(this.intensity, this.rawThreat, 1 - Math.exp(-attackRate * dt));
    this._updateBand(dt);
    this.context.musicIntensity = this.intensity;
    this.context.enemyThreatScore = this.rawThreat;
    this.context.intensityBand = this.band;
    this.combatDuration = this.context.playerInCombat ? this.combatDuration + dt : 0;
    this.context.combatDuration = this.combatDuration;
    return this.context;
  }

  _sample(game) {
    if (!game?.player) {
      const musicState = game?.presentation?.musicOverride ?? (game?.state === 'menu' ? 'MainMenu' : 'Loading');
      this.context = { ...this._empty(), musicState, playerClass: game?.presentation?.characterClassOverride ?? null, menuOpen: true, gamePaused: game?.state === 'paused' };
      this.rawThreat = 0.12;
      this._emitIfChanged();
      return;
    }
    const player = game.player;
    const zone = zoneAt(player.x, player.y);
    const district = districtAt(player.x, player.y);
    const progress = game.getZoneProgress?.(zone.id) ?? {};
    const living = (game.entities?.enemies ?? []).filter((enemy) => !enemy.dead);
    const nearby = living.filter((enemy) => distance(enemy, player) <= (enemy.boss ? 980 : 720));
    const elites = nearby.filter((enemy) => enemy.elite && !enemy.boss);
    const boss = nearby.find((enemy) => enemy.boss) ?? game.getBoss?.() ?? null;
    const health = clamp(player.hp / Math.max(1, player.maxHp), 0, 1);
    const resource = clamp(player.resource / Math.max(1, player.maxResource), 0, 1);
    const populationScore = clamp(nearby.reduce((sum, enemy) => sum + clamp(1 - distance(enemy, player) / 850, 0.1, 1) * (enemy.role === 'brute' ? 1.3 : enemy.role === 'commander' || enemy.role === 'summoner' ? 1.2 : 1), 0) / 13, 0, 0.5);
    const eliteScore = clamp(elites.length * 0.105, 0, 0.3);
    const bossHealth = boss ? clamp(boss.hp / Math.max(1, boss.maxHp), 0, 1) : 1;
    const bossScore = boss ? 0.62 + clamp((boss.phase - 1) * 0.12, 0, 0.24) + (1 - bossHealth) * 0.1 + (1 - health) * 0.06 : 0;
    const dangerScore = player.combatTime > 0 ? clamp((1 - health) * 0.22 + (player.barrier > 0 ? -0.025 : 0), 0, 0.24) : 0;
    const endgameWaveIndex = Math.max(0, Number(game.endgame?.waveIndex) || 0);
    const endgameWaveCount = Math.max(1, Array.isArray(game.endgame?.wavePlan) ? game.endgame.wavePlan.length : 10);
    const waveScore = clamp(endgameWaveIndex / endgameWaveCount * 0.12, 0, 0.12);
    const eventScore = game.worldEvent ? 0.08 : 0;
    const combatBias = nearby.length || player.combatTime > 0 ? 0.36 : 0;
    this.rawThreat = clamp(Math.max(bossScore, populationScore + eliteScore + dangerScore + waveScore + eventScore + combatBias), 0, 1);
    const cycle = ((game.clock ?? 0) / 180) % 1;
    const timeOfDay = cycle < 0.16 ? 'dawn' : cycle < 0.52 ? 'day' : cycle < 0.68 ? 'dusk' : 'night';
    const actionType = player.presentation?.action?.profile?.action ?? player.animation?.type ?? 'idle';
    const movementState = player.presentation?.locomotion?.state ?? (player.dash ? 'dodge' : Math.hypot(player.moveX, player.moveY) > 20 ? 'run' : 'idle');
    const endgame = game.endgame;
    const activityId = typeof endgame?.activity === 'string' ? endgame.activity : endgame?.activity?.id ?? null;
    const waveIndex = Math.max(0, Number(endgame?.waveIndex) || 0);
    const dungeon = endgame?.delveId ?? activityId ?? null;
    const campaign = stableObject(game.getCampaign?.());
    const covenant = game.getCovenantOverview?.() ?? null;
    const covenantIdentity = resolveCovenantPresentationIdentity(covenant ?? {}, {});
    let musicState = 'Exploration';
    if (game.pendingCampaignDialogue || game.presentation?.cinematic?.active) musicState = 'Narrative';
    else if (player.deathTime > 0) musicState = 'PlayerDeath';
    else if (boss) musicState = 'Boss';
    else if (nearby.length || player.combatTime > 0) musicState = 'Combat';
    else if (zone.safe) musicState = 'Settlement';
    else if (dungeon) musicState = 'Dungeon';
    const cameraProfile = player.deathTime > 0 ? 'death' : boss ? 'boss' : elites.length ? 'elite' : nearby.length ? 'combat' : zone.safe ? 'settlement' : 'exploration';
    this.context = {
      currentRegion: zone.id, currentBiome: zone.id, currentSubregion: district.id,
      currentDungeon: dungeon, currentDungeonDepth: waveIndex,
      currentRoomType: endgame ? endgame.contractId ? 'sealed-contract' : endgame.delveId ? 'delve' : 'operation' : 'overworld',
      currentSettlement: zone.safe ? zone.name : null, currentQuest: campaign.stageId ?? null,
      currentCampaignChapter: campaign.chapterId ?? null, currentNarrativeBeat: game.pendingCampaignDialogue,
      currentWorldTier: game._worldOath?.()?.tier ?? 1, currentDifficulty: endgame?.tier ?? zone.level,
      currentEndgameActivity: activityId ?? endgame?.delveId ?? null,
      timeOfDay, weatherType: WEATHER_BY_REGION[zone.id] ?? 'clear', corruptionLevel: progress.corruption ?? 0,
      playerClass: player.primary, playerSecondaryClass: player.secondary, covenantAffinity: covenantIdentity.affinity, covenantStage: covenantIdentity.stage, covenantMotif: covenantIdentity.audio.motif, covenantSemitoneOffset: covenantIdentity.audio.semitoneOffset,
      playerWeaponType: player.presentation?.profile?.weapon ?? null, playerMovementState: movementState,
      playerCombatState: boss ? 'boss' : nearby.length ? 'engaged' : player.combatTime > 0 ? 'alert' : 'safe',
      playerHealthPercent: health, playerResourcePercent: resource, playerCrowdControlState: player.stagger > 0 ? 'staggered' : null,
      playerInTown: zone.safe, playerInCombat: nearby.length > 0 || player.combatTime > 0, playerDead: player.deathTime > 0,
      playerMounted: false, playerInteracting: actionType === 'interaction', playerCasting: ['cast', 'companion', 'hybrid'].includes(actionType),
      playerUsingUltimate: actionType === 'ultimate', nearbyEnemyCount: nearby.length, nearbyEliteCount: elites.length,
      nearbyBoss: boss?.templateId ?? null, enemyThreatScore: this.rawThreat, combatDuration: player.combatTime > 0 ? 5 - player.combatTime : 0,
      encounterWave: waveIndex, bossPhase: boss?.phase ?? 0, bossHealthPercent: boss ? bossHealth : 0,
      bossStaggerState: Boolean(boss?.knockdown > 0), bossEnraged: Boolean(boss?.phase >= 3), localEventActive: Boolean(game.worldEvent),
      strongholdState: progress.liberated ? 'liberated' : null, cinematicActive: Boolean(game.pendingCampaignDialogue || game.presentation?.cinematic?.active),
      menuOpen: game.state === 'menu', gamePaused: game.state === 'paused', musicOverride: game.presentation?.musicOverride ?? null,
      animationOverride: game.presentation?.animationOverride ?? null, musicState, musicIntensity: this.intensity,
      intensityBand: this.band, cameraProfile
    };
    this._emitIfChanged();
  }

  _updateBand(dt) {
    const value = this.intensity;
    const next = value < 0.15 ? 'Silence' : value < 0.3 ? 'Exploration' : value < 0.45 ? 'Uneasy' : value < 0.6 ? 'MinorCombat' : value < 0.75 ? 'StandardCombat' : value < 0.9 ? 'HeavyCombat' : 'Climax';
    if (next !== this.bandCandidate) {
      this.bandCandidate = next;
      this.bandHold = 0;
    } else this.bandHold += dt;
    const rising = ['Silence', 'Exploration', 'Uneasy', 'MinorCombat', 'StandardCombat', 'HeavyCombat', 'Climax'].indexOf(next) > ['Silence', 'Exploration', 'Uneasy', 'MinorCombat', 'StandardCombat', 'HeavyCombat', 'Climax'].indexOf(this.band);
    if (next !== this.band && this.bandHold >= (rising ? 0.2 : 0.85)) {
      this.band = next;
      this.bus?.emit('context:intensity', { intensity: value, band: next }, { source: 'context-resolver' });
    }
  }

  _emitIfChanged() {
    const signature = [this.context.currentRegion, this.context.currentSubregion, this.context.musicState, this.context.currentDungeon, this.context.bossPhase, this.context.playerDead, this.context.gamePaused, this.context.timeOfDay].join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.bus?.emit('context:changed', { ...this.context }, { source: 'context-resolver' });
  }

  snapshot() {
    return { ...this.context, musicIntensity: this.intensity, intensityBand: this.band };
  }
}
