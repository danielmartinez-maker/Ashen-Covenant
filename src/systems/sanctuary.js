const safeRecord = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeArray = (value) => Array.isArray(value) ? value : [];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const LIGHTING = Object.freeze({
  flame: { id: 'forge-dawn', color: '#d86b43', accent: '#ffbe74', ambient: 0.86 },
  grave: { id: 'funeral-blue', color: '#788e9f', accent: '#c5d4dc', ambient: 0.72 },
  blood: { id: 'scarlet-vigil', color: '#8f394e', accent: '#df8b83', ambient: 0.7 },
  light: { id: 'first-light', color: '#d2c681', accent: '#fff0ac', ambient: 0.94 },
  storm: { id: 'storm-lantern', color: '#668fae', accent: '#a9def4', ambient: 0.78 },
  void: { id: 'mirror-night', color: '#5d527f', accent: '#a48ee6', ambient: 0.64 },
  neutral: { id: 'ash-hearth', color: '#617d79', accent: '#e2ad73', ambient: 0.8 }
});

const ARCHITECTURE = Object.freeze({
  flame: ['ember-brazier', 'forge-banner', 'cinder-obelisk'],
  grave: ['ossuary-bell', 'mourner-cairn', 'funeral-banner'],
  blood: ['bloodroot-basin', 'scarlet-banner', 'tithe-lantern'],
  light: ['dawn-lantern', 'gilded-shrine', 'sun-banner'],
  storm: ['storm-vane', 'arc-brazier', 'tempest-banner'],
  void: ['mirror-arch', 'null-lantern', 'rift-banner'],
  neutral: ['ash-brazier', 'covenant-banner']
});

const OFFER_LIBRARY = Object.freeze({
  'tempering-cache': { id: 'tempering-cache', name: 'Tempering Cache', cost: 140, sourceId: 'stronghold', minRarity: 'rare', detail: 'Forging stock recovered from reclaimed roads.' },
  'road-cache': { id: 'road-cache', name: 'Road Cache', cost: 190, sourceId: 'contracts', minRarity: 'rare', detail: 'A mixed cache from the reopened regional roads.' },
  'covenant-cache': { id: 'covenant-cache', name: 'Metamorphosis Reliquary', cost: 280, sourceId: 'hybrid-trial', minRarity: 'relic', detail: 'Relics chosen to resonate with the current Covenant.' },
  'hunter-cache': { id: 'hunter-cache', name: 'Hunter Bounty Casket', cost: 360, sourceId: 'nemesis', minRarity: 'relic', forceUnique: true, detail: 'Spoils catalogued from persistent adversaries.' },
  'world-memory-cache': { id: 'world-memory-cache', name: 'World Memory Cache', cost: 240, sourceId: 'stronghold', minRarity: 'relic', detail: 'Regional salvage shaped by resolved world events.' }
});

const merchant = (id, name, offerIds) => ({ id, name, offers: offerIds.map((offerId) => ({ ...OFFER_LIBRARY[offerId] })).filter(Boolean) });

const countCampaignCompletions = (campaign) => {
  const chapters = safeRecord(campaign?.chapters);
  return Object.values(chapters).filter((entry) => entry?.complete === true || entry?.completed === true).length;
};

export class SanctuarySystem {
  normalizeStored(value) {
    const stored = safeRecord(value);
    return {
      level: clamp(Math.floor(Number(stored.level) || 1), 1, 5),
      flags: { ...safeRecord(stored.flags) },
      merchants: { ...safeRecord(stored.merchants) },
      npcs: { ...safeRecord(stored.npcs) },
      architecture: safeArray(stored.architecture).map(String).slice(0, 20),
      discoveries: [...new Set(safeArray(stored.discoveries).map(String))].slice(-80)
    };
  }

  resolve(context = {}) {
    const stored = this.normalizeStored(context.sanctuary);
    const covenant = safeRecord(context.covenant);
    const primary = ['flame', 'grave', 'blood', 'light', 'storm', 'void'].includes(covenant.primary) ? covenant.primary : 'neutral';
    const stage = clamp(Math.floor(Number(covenant.stage) || 0), 0, 5);
    const strongholds = Object.values(safeRecord(context.worldProgress?.strongholds)).filter(Boolean).length;
    const factionRanks = Object.values(safeRecord(context.factions)).map((entry) => Math.max(0, Number(entry?.rank) || 0));
    const maxFactionRank = factionRanks.length ? Math.max(...factionRanks) : 0;
    const hunters = safeArray(context.hunters);
    const hunterHistory = hunters.length;
    const defeatedHunters = hunters.filter((hunter) => hunter?.defeated === true || Number(hunter?.defeats) > 0).length;
    const resolvedEvents = safeArray(context.worldV2?.resolvedEvents);
    const activeEvents = safeArray(context.worldV2?.activeEvents);
    const campaignCompletions = countCampaignCompletions(context.campaign);
    const bossDiscoveries = stored.discoveries.filter((entry) => entry.startsWith('boss:')).length;

    let level = 1;
    if (strongholds >= 1 || campaignCompletions >= 1) level += 1;
    if (stage >= 2 || maxFactionRank >= 2 || resolvedEvents.length >= 1) level += 1;
    if (strongholds >= 3 || stage >= 4 || maxFactionRank >= 4 || defeatedHunters >= 1) level += 1;
    if (strongholds >= 5 || campaignCompletions >= 4 || bossDiscoveries >= 3 || resolvedEvents.length >= 5) level += 1;
    level = clamp(Math.max(level, stored.level), 1, 5);

    const architecture = ['ash-gate', 'cinder-forge', ...ARCHITECTURE[primary].slice(0, Math.max(1, Math.min(3, stage || 1)))];
    if (strongholds >= 1) architecture.push('reclaimed-road-banner');
    if (maxFactionRank >= 3) architecture.push('faction-standard');
    if (resolvedEvents.length) architecture.push('memory-stone');
    if (bossDiscoveries) architecture.push('trophy-plinth');

    const services = [
      { id: 'forge', name: 'Cinder Forge' },
      { id: 'stash', name: 'Relic Stash' },
      { id: 'atlas', name: 'Covenant Atlas' }
    ];
    if (campaignCompletions >= 1 || level >= 2) services.push({ id: 'black-road', name: 'Black Road Atlas' });
    if (stage >= 2) services.push({ id: 'mutation-shrine', name: 'Metamorphosis Shrine' });
    if (hunterHistory) services.push({ id: 'hunter-dossiers', name: 'Hunter Dossiers' });
    if (resolvedEvents.length || activeEvents.length) services.push({ id: 'world-memory', name: 'World Memory Ledger' });
    if (maxFactionRank >= 2) services.push({ id: 'faction-embassy', name: 'Faction Embassy' });

    const npcs = [
      { id: 'sister-maelin', name: 'Sister Maelin', job: 'pilgrim', role: 'keeper' },
      { id: 'forgekeeper', name: 'Forgekeeper Aed', job: 'blacksmith', role: 'forge' }
    ];
    if (level >= 2) npcs.push({ id: 'road-quartermaster', name: 'Road Quartermaster', job: 'vendor', role: 'merchant' });
    if (hunterHistory) npcs.push({ id: 'scar-chronicler', name: 'The Scar Chronicler', job: 'scribe', role: 'hunter' });
    if (maxFactionRank >= 2) npcs.push({ id: 'faction-envoy', name: 'Covenant Envoy', job: 'guard', role: 'faction' });
    if (resolvedEvents.length) npcs.push({ id: 'memory-keeper', name: 'Memory Keeper', job: 'scribe', role: 'world' });

    const merchants = [merchant('cinder-smith', 'Cinder Smith', ['tempering-cache'])];
    if (strongholds >= 1 || level >= 2) merchants.push(merchant('road-purveyor', 'Road Purveyor', ['road-cache']));
    if (stage >= 2) merchants.push(merchant('covenant-vendor', `${primary === 'neutral' ? 'Covenant' : primary[0].toUpperCase() + primary.slice(1)} Reliquarian`, ['covenant-cache']));
    if (defeatedHunters >= 1) merchants.push(merchant('hunter-broker', 'Hunter Broker', ['hunter-cache']));
    if (resolvedEvents.length >= 1) merchants.push(merchant('memory-vendor', 'World Memory Curator', ['world-memory-cache']));

    const questHooks = [];
    for (const event of activeEvents.slice(0, 3)) questHooks.push({ id: `active:${event.id}`, kind: 'world-pressure', title: event.name ?? event.typeId, zoneId: event.zoneId });
    for (const event of resolvedEvents.slice(-3)) questHooks.push({ id: `memory:${event.id}`, kind: 'world-memory', title: `Remember ${event.name ?? event.typeId}`, zoneId: event.zoneId, outcome: event.outcome });
    const activeHunter = hunters.find((hunter) => !hunter.defeated);
    if (activeHunter) questHooks.push({ id: `hunter:${activeHunter.id}`, kind: 'hunter', title: `Track ${activeHunter.name}`, hunterId: activeHunter.id });
    if (strongholds < 5) questHooks.push({ id: 'reclaim-road', kind: 'stronghold', title: 'Reclaim the broken roads', progress: strongholds, total: 5 });

    return {
      level,
      primary,
      stage,
      instability: Math.max(0, Number(covenant.instability) || 0),
      lighting: { ...LIGHTING[primary] },
      architecture: [...new Set(architecture)],
      services,
      npcs,
      merchants,
      questHooks,
      discoveries: [...stored.discoveries],
      metrics: { strongholds, maxFactionRank, hunterHistory, defeatedHunters, resolvedEvents: resolvedEvents.length, activeEvents: activeEvents.length, campaignCompletions, bossDiscoveries }
    };
  }

  presentation(resolved = {}) {
    const props = safeArray(resolved.architecture).map((id, index) => {
      const columns = 4;
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        id,
        x: 220 + col * 185 + (row % 2) * 34,
        y: 245 + row * 170 + (col % 2) * 28,
        kind: id.includes('banner') || id.includes('standard') ? 'banner'
          : id.includes('brazier') || id.includes('lantern') ? 'brazier'
            : id.includes('forge') ? 'crates'
              : id.includes('bell') ? 'broken-bell'
                : id.includes('shrine') || id.includes('stone') || id.includes('plinth') ? 'shrine'
                  : id.includes('root') || id.includes('cairn') ? 'grave' : 'tent'
      };
    });
    const npcs = safeArray(resolved.npcs).map((npc, index) => ({
      ...npc,
      x: 350 + (index % 4) * 145,
      y: 500 + Math.floor(index / 4) * 130 + (index % 2) * 24
    }));
    return { props, npcs, lighting: resolved.lighting ?? LIGHTING.neutral };
  }
}
