import fs from 'node:fs';

const url = new URL('../src/data/items.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');
const before = "];\n\nexport const uniqueById = (id) => UNIQUES.find((unique) => unique.id === id) ?? null;";
const after = "];\n\nexport const UNIQUE_VISUAL_SIGNATURE_IDS = Object.freeze(Object.fromEntries(\n  UNIQUES.map((unique) => [unique.id, `unique:${unique.id}`])\n));\n\nexport const uniqueById = (id) => UNIQUES.find((unique) => unique.id === id) ?? null;";
const first = source.indexOf(before);
if (first < 0) throw new Error('Unique declaration terminator not found');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('Unique declaration terminator matched more than once');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(url, source);
console.log('Added stable v7 Unique/Mythic visual signature IDs without changing item gameplay data.');
