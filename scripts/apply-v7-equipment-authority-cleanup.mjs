import fs from 'node:fs';

const gameUrl = new URL('../src/systems/game.js', import.meta.url);
const lootUrl = new URL('../src/systems/loot.js', import.meta.url);
let game = fs.readFileSync(gameUrl, 'utf8');
let loot = fs.readFileSync(lootUrl, 'utf8');

const assignment = "    player.equipmentPresentation = this.lootSystem.presentationForEquipment(player.equipment, covenantView);\n";
const assignmentIndex = game.indexOf(assignment);
if (assignmentIndex < 0) throw new Error('legacy GameEngine equipmentPresentation assignment not found');
if (game.indexOf(assignment, assignmentIndex + assignment.length) >= 0) throw new Error('legacy GameEngine assignment matched more than once');
game = game.slice(0, assignmentIndex) + game.slice(assignmentIndex + assignment.length);

const methodStart = "  presentationForEquipment(equipment = {}, covenant = null) {\n";
const nextMethod = "  applyBehavior(uniqueId, context = {}) {\n";
const start = loot.indexOf(methodStart);
if (start < 0) throw new Error('LootSystem.presentationForEquipment method not found');
if (loot.indexOf(methodStart, start + methodStart.length) >= 0) throw new Error('presentationForEquipment matched more than once');
const end = loot.indexOf(nextMethod, start);
if (end < 0) throw new Error('applyBehavior boundary not found after presentationForEquipment');
loot = loot.slice(0, start) + loot.slice(end);

fs.writeFileSync(gameUrl, game);
fs.writeFileSync(lootUrl, loot);
console.log('Removed legacy live equipment appearance authority from GameEngine and LootSystem.');
