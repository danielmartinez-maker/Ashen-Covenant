import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CLASS_IDS, CLASSES, allHybridPairs, getHybrid } from '../src/data/classes.js';
import { ENEMIES, ENCOUNTER_TEMPLATES } from '../src/data/enemies.js';
import { AFFIXES, ITEM_BASES, LOOT_SOURCES, MASTERWORK_MAX_RANK, MASTERWORK_MILESTONES, MASTERWORK_STAGES, RARITIES, RUNES, SET_COLLECTIONS, UNIQUES } from '../src/data/items.js';
import { ZONES } from '../src/data/world.js';
import { CAMPAIGN_CHAPTERS } from '../src/data/campaign.js';
import { CONTRACTS, CONTRACT_BONUSES, CONTRACT_CACHE_OFFERS, CONTRACT_CLAUSES, CONTRACT_DIFFICULTIES, CONTRACT_LEDGER_RANKS } from '../src/data/contracts.js';

assert.equal(CLASS_IDS.length, 6, 'six selectable base classes are required');
assert.equal(allHybridPairs().length, 15, 'every two-class combination needs a hybrid');
for (let a = 0; a < CLASS_IDS.length; a += 1) {
  for (let b = a + 1; b < CLASS_IDS.length; b += 1) assert.ok(getHybrid(CLASS_IDS[a], CLASS_IDS[b]));
}
assert.ok(Object.values(ENEMIES).some((enemy) => enemy.boss), 'a boss must exist');
assert.ok(ENCOUNTER_TEMPLATES.every((pack) => pack.every((id) => ENEMIES[id])));
assert.ok(UNIQUES.some((item) => item.hybridId), 'hybrid uniques must exist');
assert.ok(UNIQUES.some((item) => item.classId === 'gravebinder'), 'Gravebinder needs authored uniques');
assert.ok(UNIQUES.some((item) => item.classId === 'dawnstrider'), 'Dawnstrider needs authored uniques');
assert.ok(UNIQUES.some((item) => item.rarity === 'mythic'), 'the endgame needs Mythic chase items');
assert.ok(ITEM_BASES.length >= 20, 'loot needs a broad base-item pool');
assert.ok(AFFIXES.length >= 20, 'loot needs a broad affix pool');
assert.ok(RUNES.length >= 12, 'loot needs a meaningful rune pool');
assert.ok(SET_COLLECTIONS.length >= 4 && SET_COLLECTIONS.every((set) => set.bonuses?.length >= 2), 'sets need multi-stage bonuses');
assert.ok(LOOT_SOURCES.length >= 10 && LOOT_SOURCES.every((source) => source.uniqueIds?.length || source.setIds?.length), 'all authored sources must expose meaningful loot');
assert.deepEqual(RARITIES.map((rarity) => rarity.id), ['common', 'magic', 'rare', 'relic', 'unique', 'mythic'], 'rarity progression must remain ordered and explicit');
assert.equal(MASTERWORK_MAX_RANK, 12, 'endgame Masterworking must reach twelve ranks');
assert.deepEqual(MASTERWORK_MILESTONES, [4, 8, 12], 'Masterworking needs three explicit affix-exalt breakpoints');
assert.equal(MASTERWORK_STAGES.length, 3, 'Masterworking needs Foundry, Starlit, and Apex stages');
assert.ok(ZONES.length >= 6, 'the world needs multiple connected regions');
assert.ok(Object.values(CLASSES).every((entry) => entry.tree.length >= 9), 'each class needs a full late-game skill tree');
assert.ok(Object.values(CLASSES).every((entry) => entry.tree.every((node) => node.level && node.tier && node.branch)), 'skill nodes must carry progression metadata');
assert.ok(Object.values(CLASSES).every((entry) => entry.tree.some((node) => node.exclusiveGroup)), 'each class needs a meaningful capstone choice');
assert.ok(CAMPAIGN_CHAPTERS[0]?.stages?.length >= 6, 'the campaign needs a playable first chapter with a complete objective arc');
assert.ok(CAMPAIGN_CHAPTERS[1]?.stages?.length >= 7, 'Chapter II needs a complete multi-stage Bellscar arc');
assert.equal(CONTRACTS.length, 30, 'all thirty regional contract identities must remain available');
assert.equal(CONTRACT_DIFFICULTIES.length, 5, 'the Contract Ledger needs five difficulty bands');
assert.ok(CONTRACT_CLAUSES.length >= 8 && CONTRACT_BONUSES.length >= 4, 'contracts need risk and optional-objective depth');
assert.ok(CONTRACT_CACHE_OFFERS.length >= 8 && CONTRACT_LEDGER_RANKS.at(-1)?.rank === 10, 'contract mastery needs a full reward exchange and ten ranks');
assert.ok(existsSync(new URL('../public/assets/campaign/chapter-one-keyart.png', import.meta.url)), 'Chapter I needs its packaged visual key art');
assert.ok(existsSync(new URL('../public/assets/campaign/chapter-two-keyart.png', import.meta.url)), 'Chapter II needs its packaged Bellscar key art');
for (const asset of [
  'hero-facing-atlas-v5.png', 'enemy-motion-a-v5.png', 'enemy-motion-b-v5.png', 'enemy-motion-c-v5.png', 'enemy-motion-d-v5.png',
  'environment-props-v5.png', 'entrance-atlas-v5.png', 'npc-atlas-v5.png', 'terrain/terrain-atlas-v5.png',
  'attack-vfx-martial-v6.png', 'attack-vfx-sorcery-v6.png', 'attack-vfx-enemy-v6.png'
]) assert.ok(existsSync(new URL(`../public/assets/${asset}`, import.meta.url)), `the 2.5D renderer needs ${asset}`);
assert.ok(!existsSync(new URL('../public/manifest.webmanifest', import.meta.url)), 'Windows build must not retain a PWA manifest');
assert.ok(!existsSync(new URL('../public/service-worker.js', import.meta.url)), 'Windows build must not retain a service worker');
console.log('Ashen Covenant data verification passed.');
