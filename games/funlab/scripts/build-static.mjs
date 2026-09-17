import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const entries = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'assets', 'src', 'schemas'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of entries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

console.log(`FunLab static bundle ready: ${path.relative(root, output)}`);
