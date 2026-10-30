// Usage: node tools/verify-layout.mjs [pre-reorganization-commit]
// Prove the public URL tree is byte-identical to the original root layout.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const base = process.argv[2] || '95390be';
const files = execFileSync('git', ['ls-tree', '-rz', base], { maxBuffer: 20e6 }).toString().split('\0').filter(Boolean);
let count = 0;
for (const record of files) {
  const [metadata, name] = record.split('\t');
  if (!(name.startsWith('images/') || (!name.includes('/') && /\.(html|css|js|xml|txt)$/.test(name) && name !== 'middleware.js'))) continue;
  const actual = execFileSync('git', ['hash-object', `public/${name}`]).toString().trim();
  assert.equal(actual, metadata.split(' ')[2], `${name} changed during relocation`);
  count++;
}
assert.equal(execFileSync('git', ['hash-object', 'middleware.js']).toString().trim(),
  execFileSync('git', ['rev-parse', `${base}:middleware.js`]).toString().trim(), 'routing middleware changed');
const vercel = JSON.parse(readFileSync('vercel.json'));
assert.equal(vercel.outputDirectory, 'public');
const firebase = JSON.parse(readFileSync('firebase.json'));
assert.equal(firebase.hosting.public, 'public');
for (const key of ['firestore', 'storage']) assert.ok(existsSync(firebase[key].rules));
assert.ok(!existsSync('public/package.json'), 'tooling must not be public');
assert.ok(!existsSync('public/firestore.rules'), 'rules must not be public');
console.log(`PASS: ${count} public files are byte-identical at the same URLs; middleware unchanged; publishing and rules paths valid.`);
