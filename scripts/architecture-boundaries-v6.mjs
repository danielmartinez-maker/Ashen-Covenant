import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LootSystem } from '../src/systems/loot.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameSource = fs.readFileSync(path.join(root, 'src/systems/game.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

const subsystemDirs = ['src/systems', 'src/presentation'];
for (const dir of subsystemDirs) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (!name.endsWith('.js') || name === 'game.js') continue;
    const source = fs.readFileSync(path.join(root, dir, name), 'utf8');
    assert.equal(/from\s+['"][^'"]*\/game\.js['"]/.test(source), false, `${dir}/${name} must not reverse-import GameEngine`);
  }
}

const loot = new LootSystem();
const eligible = loot.isUniqueEligible.bind(loot);
const context = { verdict: 'mercy', hybridId: 'warden-thornseer', primary: 'warden', secondary: 'thornseer' };
assert.equal(eligible({ id: 'verdict-ok', campaignId: 'chapter-two', verdict: 'mercy' }, context), true);
assert.equal(eligible({ id: 'verdict-bad', campaignId: 'chapter-two', verdict: 'dominion' }, context), false);
assert.equal(eligible({ id: 'hybrid-ok', hybridId: 'warden-thornseer' }, context), true);
assert.equal(eligible({ id: 'hybrid-bad', hybridId: 'warden-gravebinder' }, context), false);
assert.equal(eligible({ id: 'class-primary', classId: 'warden' }, context), true);
assert.equal(eligible({ id: 'class-secondary', classId: 'thornseer' }, context), true);
assert.equal(eligible({ id: 'class-bad', classId: 'gravebinder' }, context), false);
assert.equal(eligible({ id: 'global' }, context), true);

const eligibleMethod = gameSource.match(/_isUniqueEligible\(unique\)\s*\{([\s\S]*?)\n  \}/)?.[1] ?? '';
assert.match(eligibleMethod, /this\.lootSystem\.isUniqueEligible/);
assert.equal(/unique\.campaignId|unique\.hybridId|unique\.classId/.test(eligibleMethod), false, 'GameEngine must not own Unique eligibility rules');

assert.match(gameSource, /this\.covenantSystem\.getRegionResponse/);
assert.match(gameSource, /this\.covenantSystem\.getBossVariant/);
assert.match(gameSource, /this\.covenantSystem\.getRewardBias/);
assert.match(mainSource, /window\.ashenCovenant\s*=\s*Object\.freeze\(/, 'browser runtime facade must be frozen');

console.log('Ashen Covenant v6 architecture boundary regression passed.');
