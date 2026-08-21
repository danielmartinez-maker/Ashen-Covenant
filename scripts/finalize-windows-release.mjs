import { existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const outputDirectory = resolve(process.argv[2] ?? 'release/win-unpacked');
const gameExecutable = resolve(outputDirectory, 'Ashen Covenant.exe');
const redundantElectronExecutable = resolve(outputDirectory, 'electron.exe');

if (!existsSync(gameExecutable)) throw new Error(`Expected Windows game executable is missing: ${gameExecutable}`);
if (existsSync(redundantElectronExecutable)) rmSync(redundantElectronExecutable);

// electron-builder can leave an unsigned, hidden pre-edit copy beside the
// product executable on Linux-to-Windows builds. It is not loaded by the app
// and nearly doubles the download, so remove only that exact temporary naming
// pattern after confirming the real executable exists.
const temporaryPrefix = `.${basename(gameExecutable)}.`;
for (const entry of readdirSync(outputDirectory)) {
  if (entry.startsWith(temporaryPrefix)) rmSync(resolve(outputDirectory, entry), { force: true });
}

console.log(`Windows release finalized: ${gameExecutable}`);
