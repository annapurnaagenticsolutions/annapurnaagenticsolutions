import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['index.html','styles.css','manifest.webmanifest','sw.js','src/app.js','src/core/progression.js','src/core/play-systems.js','src/games/who-wins.js','src/games/jugaad.js','src/games/what-next.js','src/games/fusion-lab.js','scripts/ai-server.mjs','schemas/intelligence.schemas.json'];
let fail=0;for(const r of required){if(!fs.existsSync(path.join(root,r))){console.error('MISSING',r);fail++;}}
const read=r=>fs.readFileSync(path.join(root,r),'utf8');const app=read('src/app.js'),css=read('styles.css'),battle=read('src/games/who-wins.js'),j=read('src/games/jugaad.js'),adv=read('src/games/what-next.js'),fusion=read('src/games/fusion-lab.js'),core=read('src/core/play-systems.js'),sw=read('sw.js');
for(const [ok,msg] of [
 [/v0\.6/.test(app),'v0.6 identity'],
 [/battleActionAvailability/.test(core)&&/tickBattleCooldowns/.test(core),'cooldown combat helpers'],
 [/combat-console/.test(battle)&&/data-action/.test(battle)&&/telegraph/.test(battle),'telegraphed live battle actions'],
 [/jugaadSpatialBonus/.test(core)&&/bench-grid/.test(j)&&/data-cell/.test(j)&&!/textarea/.test(j),'spatial Jugaad construction'],
 [/adventureSceneSpec/.test(adv)&&/scene-actor/.test(adv)&&/blocked\(/.test(adv),'scene-specific adventure world'],
 [/fusionLineageLayout/.test(fusion)&&/lineage-panel/.test(fusion)&&/data-lineage/.test(fusion),'Fusion lineage map'],
 [/combat-console/.test(css)&&/spatial-bench/.test(css)&&/scene-actor/.test(css)&&/lineage-node/.test(css),'v0.6 styles'],
 [/play-systems\.js/.test(sw),'shared play systems cached']
]){if(!ok){console.error('Missing',msg);fail++;}}
console.log(fail?`AUDIT FAIL (${fail})`:'AUDIT PASS');process.exitCode=fail?1:0;
