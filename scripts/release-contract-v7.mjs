import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.version, '7.0.0', 'release metadata must identify v7.0.0');
assert.equal(typeof pkg.scripts?.['test:v7'], 'string', true, 'package must expose test:v7');
for (const required of ['test:v7:audio', 'v7-embodied-combat.mjs', 'v7-architecture-compatibility.mjs', 'performance-v7.mjs', 'test:file-protocol', 'test:v6']) {
  assert.match(pkg.scripts['test:v7'], new RegExp(required.replaceAll('.', '\\.')), `test:v7 must include ${required}`);
}
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
assert.equal(lock.version, '7.0.0');
assert.equal(lock.packages?.['']?.version, '7.0.0');
const ui = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
const requiem = fs.readFileSync(new URL('../src/data/requiem.js', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const windowsReadme = fs.readFileSync(new URL('../WINDOWS_README.txt', import.meta.url), 'utf8');
assert.match(ui, /The Black Road · v7\.0\.0/);
assert.match(requiem, /version: '7\.0\.0'/);
assert.match(readme, /Version 7\.0\.0/);
assert.match(windowsReadme, /ASHEN COVENANT: THE BLACK ROAD 7\.0\.0/);
assert.equal(fs.existsSync(new URL('../docs/V7_RELEASE_REPORT.md', import.meta.url)), true);
console.log('Ashen Covenant v7 release contract regression passed.');