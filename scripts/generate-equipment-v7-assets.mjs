import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EQUIPMENT_SLOT_FAMILIES, UNIQUE_VISUAL_SIGNATURES } from '../src/data/equipment-appearance-v7.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'assets', 'equipment', 'v7');
fs.mkdirSync(out, { recursive: true });

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const hash = (text) => [...String(text)].reduce((value, char) => ((value * 33) ^ char.charCodeAt(0)) >>> 0, 5381);

const rune = (id) => {
  const seed = hash(id);
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2 + ((seed >>> (index * 3)) & 7) * 0.04;
    const radius = 42 + ((seed >>> (index * 4)) & 15) * 2;
    return `${(128 + Math.cos(angle) * radius).toFixed(3)},${(128 + Math.sin(angle) * radius).toFixed(3)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="none" stroke="white" stroke-width="10" stroke-linejoin="round"/><circle cx="128" cy="128" r="18" fill="white" opacity=".82"/>`;
};

const familyShape = (slot, family, cell) => {
  const x = (cell % 4) * 256;
  const y = Math.floor(cell / 4) * 256;
  const body = slot === 'weapon' ? '<path d="M52 188 L174 66 L202 52 L188 80 L76 204 Z"/>'
    : slot === 'offhand' ? '<path d="M64 72 Q128 34 192 72 L178 178 Q128 220 78 178 Z"/>'
      : slot === 'head' ? '<path d="M70 174 L76 74 Q128 38 180 74 L186 174 L154 204 L102 204 Z"/>'
        : slot === 'chest' ? '<path d="M74 62 L112 48 L128 68 L144 48 L182 62 L202 190 L158 214 L98 214 L54 190 Z"/>'
          : slot === 'gloves' ? '<path d="M78 88 L116 66 L144 90 L164 172 L112 202 L76 162 Z"/>'
            : '<path d="M86 54 L150 54 L166 158 L204 190 L188 212 L110 212 L84 178 Z"/>';
  return `<g transform="translate(${x} ${y})" fill="white" opacity=".92">${body}<text x="128" y="238" text-anchor="middle" font-size="18" fill="white">${esc(family)}</text></g>`;
};

const layerEntries = Object.entries(EQUIPMENT_SLOT_FAMILIES)
  .flatMap(([slot, families]) => families.map((family) => [slot, family]));
const layerCells = 24;
const layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">${Array.from({ length: layerCells }, (_, index) => {
  const [slot = 'boots', family = 'neutral'] = layerEntries[index] ?? ['boots', 'neutral'];
  return familyShape(slot, family, index);
}).join('')}</svg>`;
fs.writeFileSync(path.join(out, 'equipment-layers-v7.svg'), `${layerSvg}\n`, 'utf8');

const signatures = Object.values(UNIQUE_VISUAL_SIGNATURES);
const rows = Math.max(1, Math.ceil(signatures.length / 8));
const signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="${rows * 256}" viewBox="0 0 2048 ${rows * 256}">${signatures.map((signature) => {
  const x = (signature.cell % 8) * 256;
  const y = Math.floor(signature.cell / 8) * 256;
  return `<g transform="translate(${x} ${y})">${rune(signature.id)}<text x="128" y="230" text-anchor="middle" font-size="42" fill="white">${esc(signature.glyph)}</text></g>`;
}).join('')}</svg>`;
fs.writeFileSync(path.join(out, 'equipment-signatures-v7.svg'), `${signatureSvg}\n`, 'utf8');

console.log(`Generated ${layerEntries.length} equipment families and ${signatures.length} chase-item signatures.`);
