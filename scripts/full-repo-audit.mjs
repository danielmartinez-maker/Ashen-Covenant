import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tracked = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.wav', '.mp3', '.ogg', '.zip', '.7z', '.exe', '.dll', '.asar', '.bin']);
const javascriptExtensions = new Set(['.js', '.mjs', '.cjs']);
const textFiles = [];
const binaryFiles = [];
const errors = [];
const warnings = [];
const categoryCounts = new Map();
const topLevel = new Map();
let totalLines = 0;
let totalBytes = 0;

const addWarning = (kind, file, line, text) => {
  const key = `${kind}`;
  categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  if (warnings.length < 500) warnings.push({ kind, file, line, text: String(text).trim().slice(0, 220) });
};
const addError = (kind, file, line, text) => errors.push({ kind, file, line, text: String(text).trim().slice(0, 320) });
const isProbablyBinary = (file, buffer) => binaryExtensions.has(path.extname(file).toLowerCase()) || buffer.includes(0);

const resolveRelative = (fromFile, specifier) => {
  const base = path.resolve(root, path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.json`, path.join(base, 'index.js'), path.join(base, 'index.mjs'), path.join(base, 'index.cjs')];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

const importPattern = /(?:\bimport\s+(?:[^'";]*?\s+from\s+)?|\bexport\s+[^'";]*?\s+from\s+|\bimport\s*\()(['"])(\.{1,2}\/[^'"\n]+)\1/g;
const assetPattern = /(?:['"`(])((?:\/)?assets\/[A-Za-z0-9_./ -]+\.(?:png|svg|jpg|jpeg|webp|wav|mp3|ogg|ico))(?:['"`)])/g;
const conflictPattern = /^(?:<<<<<<< |=======\s*$|>>>>>>> )/;
const hardSecurityPatterns = [
  [/\bnodeIntegration\s*:\s*true\b/, 'electron-node-integration'],
  [/\bcontextIsolation\s*:\s*false\b/, 'electron-context-isolation-disabled'],
  [/\bwebSecurity\s*:\s*false\b/, 'electron-web-security-disabled'],
  [/\ballowRunningInsecureContent\s*:\s*true\b/, 'electron-insecure-content'],
  [/\beval\s*\(/, 'runtime-eval'],
  [/\bnew\s+Function\s*\(/, 'runtime-new-function']
];
const candidatePatterns = [
  [/\b(?:TODO|FIXME|HACK|XXX|BUG)\b/i, 'unfinished-marker'],
  [/\bMath\.random\s*\(/, 'nondeterministic-math-random'],
  [/\bDate\.now\s*\(/, 'wall-clock-dependency'],
  [/\bsetInterval\s*\(/, 'interval-lifecycle'],
  [/\bsetTimeout\s*\(/, 'timeout-lifecycle'],
  [/\brequestAnimationFrame\s*\(/, 'raf-lifecycle'],
  [/\.addEventListener\s*\(/, 'listener-lifecycle'],
  [/\.(?:innerHTML|outerHTML)\s*=/, 'html-assignment'],
  [/\binsertAdjacentHTML\s*\(/, 'html-insertion'],
  [/\bJSON\.parse\s*\(/, 'json-parse-boundary'],
  [/\blocalStorage\b/, 'storage-boundary'],
  [/\bPromise\.all\s*\(/, 'promise-all-failure-boundary'],
  [/\.forEach\s*\(\s*async\b/, 'async-foreach'],
  [/\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/, 'empty-catch'],
  [/\bcatch\s*\{/, 'anonymous-catch'],
  [/\bconsole\.(?:error|warn)\s*\(/, 'runtime-console-error'],
  [/\bdebugger\s*;?/, 'debugger-statement']
];

for (const file of tracked) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    addError('tracked-file-missing', file, 0, 'git lists this path but it does not exist');
    continue;
  }
  const stat = fs.statSync(absolute);
  if (!stat.isFile()) continue;
  totalBytes += stat.size;
  const buffer = fs.readFileSync(absolute);
  if (isProbablyBinary(file, buffer)) {
    binaryFiles.push(file);
    continue;
  }
  const text = buffer.toString('utf8');
  textFiles.push(file);
  if (text.includes('\uFFFD')) addError('invalid-utf8-replacement', file, 0, 'decoded text contains U+FFFD replacement characters');
  const lines = text.split(/\r?\n/);
  totalLines += lines.length;
  const bucket = file.includes('/') ? file.split('/')[0] : '(root)';
  topLevel.set(bucket, (topLevel.get(bucket) ?? 0) + lines.length);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (conflictPattern.test(line)) addError('merge-conflict-marker', file, lineNumber, line);
    if (line.includes('\u0000')) addError('nul-in-text', file, lineNumber, line);
    const runtimeFile = /^(?:src|desktop)\//.test(file);
    if (runtimeFile) {
      for (const [pattern, kind] of hardSecurityPatterns) if (pattern.test(line)) addError(kind, file, lineNumber, line);
    }
    for (const [pattern, kind] of candidatePatterns) if (pattern.test(line)) addWarning(kind, file, lineNumber, line);
  });

  if (javascriptExtensions.has(path.extname(file).toLowerCase())) {
    try {
      execFileSync(process.execPath, ['--check', absolute], { cwd: root, stdio: 'pipe' });
    } catch (error) {
      addError('javascript-syntax', file, 0, error.stderr?.toString() || error.message);
    }
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[2];
      if (!resolveRelative(file, specifier)) addError('unresolved-relative-import', file, text.slice(0, match.index).split(/\r?\n/).length, specifier);
    }
  }

  if (path.extname(file).toLowerCase() === '.json') {
    try { JSON.parse(text); }
    catch (error) { addError('invalid-json', file, 0, error.message); }
  }

  for (const match of text.matchAll(assetPattern)) {
    const ref = match[1].replace(/^\//, '');
    const assetPath = path.join(root, 'public', ref);
    if (!fs.existsSync(assetPath)) addError('missing-static-asset', file, text.slice(0, match.index).split(/\r?\n/).length, ref);
  }
}

const lowerPaths = new Map();
for (const file of tracked) {
  const lower = file.toLowerCase();
  const previous = lowerPaths.get(lower);
  if (previous && previous !== file) addError('windows-case-collision', file, 0, `collides with ${previous}`);
  lowerPaths.set(lower, file);
  if (file.length > 220) addWarning('long-windows-path', file, 0, `${file.length} characters`);
}

for (const forbidden of ['node_modules/', 'dist/', 'release/']) {
  const leaked = tracked.filter((file) => file.startsWith(forbidden));
  if (leaked.length) addError('generated-output-tracked', leaked[0], 0, `${leaked.length} tracked paths under ${forbidden}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  for (const match of command.matchAll(/\b(?:node|electron)\s+(?:--[^\s]+\s+)*((?:scripts|desktop)\/[A-Za-z0-9_.\/-]+\.(?:mjs|cjs|js))/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) addError('missing-package-script-target', 'package.json', 0, `${name}: ${match[1]}`);
  }
}

const pythonFiles = tracked.filter((file) => file.endsWith('.py'));
for (const file of pythonFiles) {
  try {
    execFileSync('python', ['-m', 'py_compile', path.join(root, file)], { cwd: root, stdio: 'pipe' });
  } catch (error) {
    addError('python-syntax', file, 0, error.stderr?.toString() || error.message);
  }
}

const workflowFiles = tracked.filter((file) => file.startsWith('.github/workflows/') && /\.ya?ml$/.test(file));
for (const file of workflowFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (/node-version:\s*(?:['"])?(?:1[0-9]|20)(?:\.|['"\s]|$)/.test(text)) addError('unsupported-node-workflow', file, 0, 'workflow pins a Node version below 22.12');
}

console.log(`FULL REPOSITORY LINE AUDIT`);
console.log(`tracked files: ${tracked.length}`);
console.log(`text files read line-by-line: ${textFiles.length}`);
console.log(`binary files validated by presence/classification: ${binaryFiles.length}`);
console.log(`text lines inspected: ${totalLines}`);
console.log(`tracked bytes inspected/classified: ${totalBytes}`);
console.log('line coverage by top-level path:');
for (const [bucket, count] of [...topLevel.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${bucket}: ${count}`);
console.log('manual-review candidate counts:');
for (const [kind, count] of [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${kind}: ${count}`);
if (warnings.length) {
  console.log('manual-review candidates (capped at 500):');
  for (const item of warnings) console.log(`  [${item.kind}] ${item.file}:${item.line} ${item.text}`);
}
if (errors.length) {
  console.error(`hard audit failures: ${errors.length}`);
  for (const item of errors) console.error(`  [${item.kind}] ${item.file}:${item.line} ${item.text}`);
}
assert.equal(errors.length, 0, `${errors.length} hard repository audit failure(s)`);
console.log('Full repository line audit passed hard invariants.');
