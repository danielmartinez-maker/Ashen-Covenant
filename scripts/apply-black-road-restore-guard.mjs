import fs from 'node:fs';

const path = new URL('../src/systems/game.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8');
const before = `  _restoreActiveOperation(operation) {\n    const expedition = BLACK_ROAD_BY_ID[operation?.expeditionId];\n    if (!expedition) return false;\n    this.entities.enemies = [];`;
const after = `  _restoreActiveOperation(operation) {\n    const expedition = BLACK_ROAD_BY_ID[operation?.expeditionId];\n    if (!expedition) return false;\n    const completedStageIds = Array.isArray(operation.completedStageIds)\n      ? [...new Set(operation.completedStageIds.filter((id) => expedition.stages.some((stage) => stage.id === id)))]\n      : [];\n    if (completedStageIds.length >= expedition.stages.length) {\n      const sanctuary = ZONES.find((entry) => entry.safe) ?? ZONES[0];\n      this.endgame = null;\n      this._moveBodyWithGeometry(this.player, sanctuary.x + sanctuary.width * 0.55, sanctuary.y + sanctuary.height * 0.58);\n      this.notify('An invalid Black Road checkpoint was released. You return to Ashen Sanctuary.', 'warning');\n      return false;\n    }\n    this.entities.enemies = [];`;
if (!source.includes(before)) throw new Error('Black Road restore anchor changed; refusing unguarded patch');
let next = source.replace(before, after);
const duplicate = `    const completedStageIds = Array.isArray(operation.completedStageIds) ? operation.completedStageIds.filter((id) => expedition.stages.some((stage) => stage.id === id)) : [];\n`;
if (!next.includes(duplicate)) throw new Error('Expected legacy completedStageIds normalization not found');
next = next.replace(duplicate, '');
if (next === source) throw new Error('Patch made no changes');
fs.writeFileSync(path, next);
console.log('Applied guarded Black Road restore recovery patch.');
