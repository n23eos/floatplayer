import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const manifest = read('extension/manifest.json'), pkg = read('package.json'), lock = read('package-lock.json');
assert.equal(manifest.version, pkg.version, 'Package and manifest versions differ');
assert.equal(pkg.version, lock.version, 'Lockfile version differs');
assert.equal(pkg.version, lock.packages[''].version, 'Lockfile root version differs');
const required = [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page,
  ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(entry => [...(entry.js || []), ...(entry.css || [])]),
  ...manifest.web_accessible_resources.flatMap(entry => entry.resources)];
for (const file of required) assert.ok(statSync(path.join(root, 'extension', file)).isFile(), `Missing ${file}`);
function walk(dir) { return readdirSync(dir).flatMap(name => { const file = path.join(dir, name); return statSync(file).isDirectory() ? walk(file) : [file]; }); }
const files = walk(path.join(root, 'extension'));
for (const file of files.filter(file => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    assert.ok(statSync(path.resolve(path.dirname(file), match[1])).isFile(), `Missing HTML resource ${match[1]}`);
  }
}
assert.ok(!files.some(file => /(?:\.test\.js|sample\.mp4|\.env)$/.test(file)), 'Development files must not ship');
console.log(`Validated FloatPlayer ${manifest.version}: ${files.length} files, ${required.length} manifest resources, JS syntax and versions.`);
