const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const project = path.resolve(__dirname, '..');
const prefix = path.join(os.tmpdir(), 'oneiric-meta-test-');
const output = fs.mkdtempSync(prefix);
after(() => {
  const resolved = path.resolve(output);
  if (!resolved.startsWith(path.resolve(prefix))) throw new Error('Unexpected test output path');
  fs.rmSync(resolved, { recursive: true, force: true });
});
fs.writeFileSync(path.join(output, 'package.json'), '{"type":"commonjs"}');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'),
  'src/meta/MetaProgression.ts', '--outDir', output, '--module', 'commonjs',
  '--moduleResolution', 'node', '--target', 'ES2022', '--skipLibCheck', '--strict'],
  { cwd: project, stdio: 'pipe' });
const { MetaProgression: Meta } = require(path.join(output, 'meta/MetaProgression.js'));
let saved = null;
global.localStorage = { getItem: () => saved, setItem: (_key, value) => { saved = value; }, removeItem: () => { saved = null; } };
function load(value) { saved = JSON.stringify(value); return Meta.load(); }

test('valid saves preserve currency, upgrade levels, counters, and owned totems', () => {
  const value = Meta.getDefault();
  value.totalFragments = 250; value.upgrades.startingStability = 3;
  value.unlockedTotems = ['top', 'coin']; value.activeTotemId = 'coin'; value.runsCompleted = 12;
  Meta.save(value);
  assert.deepEqual(Meta.load(), value);
});

for (const value of [-1, 0.5, 5, 1e300, '2', null]) {
  test(`invalid saved upgrade ${JSON.stringify(value)} resets safely`, () => {
    const meta = load({ totalFragments: 100, upgrades: { totemSpinSpeed: value } });
    assert.equal(meta.upgrades.totemSpinSpeed, 0);
    const result = Meta.purchaseUpgrade(meta, 'totemSpinSpeed');
    assert.equal(result.success, true); assert.equal(result.newMeta.totalFragments, 80);
  });
}

test('malformed currency and counters cannot become negative, fractional or unsafe', () => {
  for (const value of [-10, 0.5, 1e300, '100']) {
    const meta = load({ totalFragments: value, runsCompleted: value, bestDepth: value, bestFragments: value });
    assert.equal(meta.totalFragments, 0); assert.equal(meta.runsCompleted, 0);
    assert.equal(meta.bestDepth, 0); assert.equal(meta.bestFragments, 0);
    assert.equal(Meta.purchaseUpgrade(meta, 'totemSpinSpeed').success, false);
  }
});

test('unknown and duplicate totems are discarded and active totem must be owned', () => {
  const meta = load({ unlockedTotems: ['coin', 'coin', 'unknown', 42], activeTotemId: 'ring' });
  assert.deepEqual(meta.unlockedTotems, ['top', 'coin']); assert.equal(meta.activeTotemId, 'top');
  assert.equal(Meta.unlockTotem(meta, 'unknown'), meta);
  assert.equal(Meta.setActiveTotem(meta, 'unknown'), meta);
});

test('purchase rejects invalid runtime levels and currency without mutation or NaN', () => {
  for (const value of [-1, 0.5, 5, Infinity, NaN]) {
    const meta = Meta.getDefault(); meta.totalFragments = 100; meta.upgrades.totemSpinSpeed = value;
    const result = Meta.purchaseUpgrade(meta, 'totemSpinSpeed');
    assert.equal(result.success, false); assert.equal(result.newMeta, meta);
    assert.equal(Meta.getUpgradeCost(meta, 'totemSpinSpeed'), null);
  }
  for (const value of [-1, 0.5, Infinity, NaN]) {
    const meta = Meta.getDefault(); meta.totalFragments = value;
    assert.equal(Meta.purchaseUpgrade(meta, 'totemSpinSpeed').success, false);
  }
});

test('unknown and prototype upgrade names fail closed', () => {
  const meta = Meta.getDefault(); meta.totalFragments = 1000;
  for (const name of ['unknown', '__proto__', 'constructor', 'toString']) {
    assert.equal(Meta.purchaseUpgrade(meta, name).success, false);
    assert.equal(Meta.getUpgradeCost(meta, name), null);
  }
});

test('normal purchases preserve the input and maxed upgrades cannot spend currency', () => {
  const meta = Meta.getDefault(); meta.totalFragments = 100;
  const result = Meta.purchaseUpgrade(meta, 'totemSpinSpeed');
  assert.equal(result.success, true); assert.equal(result.newMeta.upgrades.totemSpinSpeed, 1);
  assert.equal(result.newMeta.totalFragments, 80); assert.equal(meta.totalFragments, 100);
  meta.upgrades.totemSpinSpeed = 4;
  assert.equal(Meta.purchaseUpgrade(meta, 'totemSpinSpeed').error, 'MAXED');
  assert.equal(Meta.getUpgradeCost(meta, 'totemSpinSpeed'), null);
});

test('empty and invalid save shapes recover to defaults', () => {
  for (const value of [null, [], 5, 'invalid', { upgrades: [] }]) {
    assert.deepEqual(load(value), Meta.getDefault());
  }
});
