import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ui = readFileSync(path.join(root, 'src/ui/ui.js'), 'utf8');
const index = readFileSync(path.join(root, 'index.html'), 'utf8');
const markup = `${index}\n${ui}`;
const ids = new Set([...markup.matchAll(/\bid=["']([A-Za-z0-9_-]+)["']/g)].map((match) => match[1]));
const refs = new Set([
  ...[...ui.matchAll(/getElementById\(["']([A-Za-z0-9_-]+)["']\)/g)].map((match) => match[1]),
  ...[...ui.matchAll(/querySelector(?:All)?\(["']#([A-Za-z0-9_-]+)/g)].map((match) => match[1])
]);
const missing = [...refs].filter((id) => !ids.has(id));
assert.deepEqual(missing, [], `static UI selectors reference missing IDs: ${missing.join(', ')}`);

const duplicateStaticIds = [...ids].filter((id) => (markup.match(new RegExp(`\\bid=["']${id}["']`, 'g')) ?? []).length > 1);
// Dynamic render branches deliberately reuse the same IDs, but the persistent
// shell must remain unique. Guard the fixed title/HUD/overlay anchors explicitly.
for (const id of ['title-screen', 'game-canvas', 'ui-root', 'hud', 'overlay', 'game-title']) {
  assert.ok(ids.has(id), `persistent UI anchor missing: ${id}`);
}

for (const handler of ['updateHud', 'renderOverlayContent', 'renderAbilities', 'syncInputMethod', 'bindGame']) {
  assert.match(ui, new RegExp(`\\b${handler}\\s*\\(`), `UI handler missing: ${handler}`);
}
assert.match(ui, /The Black Road · v6\.0\.0/, 'title screen must expose the current release version');
console.log(`Ashen Covenant static UI integrity passed (${ids.size} static IDs, ${refs.size} selector references, ${duplicateStaticIds.length} branch-reused IDs).`);
