import fs from 'node:fs';

const url = new URL('../src/systems/renderer.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');
const before = `      const anchor = layer.slot === 'head' ? anchors.head\n        : layer.slot === 'boots' ? anchors.feet\n          : layer.slot === 'weapon' ? anchors.hand\n            : layer.slot === 'offhand' ? anchors.offhand\n              : anchors.torso;`;
const after = `      const anchor = layer.slot === 'head' ? anchors.head\n        : layer.slot === 'boots' ? anchors.feet\n          : layer.slot === 'weapon' ? anchors.hand\n            : layer.slot === 'offhand' ? anchors.offhand\n              : layer.slot === 'amulet' ? anchors.torso\n                : layer.slot === 'ring' ? anchors.hand\n                  : anchors.torso;`;
const first = source.indexOf(before);
if (first < 0) throw new Error('equipment anchor mapping not found');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('equipment anchor mapping matched more than once');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(url, source);
console.log('Applied v7 accessory signature anchors.');
