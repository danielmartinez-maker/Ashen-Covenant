import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.version, '6.0.0', 'release metadata must identify v6.0.0');
assert.equal(typeof pkg.scripts?.['test:v6'], 'string', true, 'package must expose test:v6');
for (const required of ['migration-matrix-v6.mjs', 'performance-v6.mjs', 'architecture-boundaries-v6.mjs', 'covenant-presentation-v6.mjs']) {
  assert.match(pkg.scripts['test:v6'], new RegExp(required.replaceAll('.', '\\.')), `test:v6 must include ${required}`);
}
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
assert.equal(lock.version, '6.0.0', 'lockfile root version must match release');
assert.equal(lock.packages?.['']?.version, '6.0.0', 'lockfile package version must match release');
const ui = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
const requiem = fs.readFileSync(new URL('../src/data/requiem.js', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const windowsReadme = fs.readFileSync(new URL('../WINDOWS_README.txt', import.meta.url), 'utf8');
assert.match(ui, /The Black Road · v6\.0\.0/, 'title screen must show v6.0.0');
assert.match(requiem, /version: '6\.0\.0'/, 'runtime release overview must show v6.0.0');
assert.match(readme, /Version 6\.0\.0/, 'README must describe v6.0.0');
assert.match(windowsReadme, /ASHEN COVENANT: THE BLACK ROAD 6\.0\.0/, 'Windows readme must show v6.0.0');
assert.equal(fs.existsSync(new URL('../docs/V6_RELEASE_REPORT.md', import.meta.url)), true, 'v6 release report must exist');
console.log('Ashen Covenant v6 release contract regression passed.');
