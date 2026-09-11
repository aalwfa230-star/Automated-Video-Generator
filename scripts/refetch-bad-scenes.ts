/**
 * refetch-bad-scenes.ts — direct calls to searchImages with proper multi-word
 * queries for the two scenes that the [Visual:] parser collapsed to garbage.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

import { searchImages } from '../src/lib/visual-fetcher/search.js';

const OUT = path.resolve('input/visuals');

const TASKS = [
    { scene: 1, query: 'aerial ocean waves from above', cand: 1 },
    { scene: 5, query: 'sea turtle swimming underwater', cand: 1 },
];

async function main() {
    for (const t of TASKS) {
        console.log(`\n=== scene ${t.scene} — "${t.query}" ===`);
        const results = await searchImages(t.query, 4);
        if (!results.length) {
            console.log('  NO RESULTS — try a different query');
            continue;
        }
        console.log(`  got ${results.length} candidates:`);
        results.forEach((r, i) => console.log(`    ${i + 1}. ${r.title || r.id}  ${r.localPath ?? r.url}`));
        const best = results[0];
        const src = best.localPath ?? best.url;
        if (!src) continue;
        const ext = path.extname(src).split('?')[0] || '.jpeg';
        const destName = `ocean_reel_scene_${t.scene}_cand_1${ext.startsWith('.') ? ext : '.jpeg'}`;
        const dest = path.join(OUT, destName);
        if (best.localPath && fs.existsSync(best.localPath)) {
            fs.copyFileSync(best.localPath, dest);
        } else {
            const res = await fetch(best.url);
            const buf = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(dest, buf);
        }
        const size = fs.statSync(dest).size;
        console.log(`  -> ${destName}  ${(size / 1024).toFixed(0)} KB`);
    }
}

main().catch((e) => {
    console.error('REFETCH FAILED:', e);
    process.exit(1);
});