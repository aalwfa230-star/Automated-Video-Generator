#!/usr/bin/env tsx
/**
 * bin/agentic-motion.ts — wires `runRemotionController` (which was previously
 * dead code in `hermes-remotion-controller.ts`) as a real CLI operation.
 *
 * For each scene in `motionScenes[]` inside the job JSON:
 *   1. synthesizes the .tsx via authorRemotionComponent()
 *   2. bundles + renders MP4 via @remotion/bundler + @remotion/renderer
 *   3. verifies the clip (signal + optional vision via --vision-check)
 *   4. self-fixes up to --max-retries times (variant seed on each retry)
 *   5. integrates the verified MP4 into input/visuals/<jobId>_s<n>.mp4
 *      so the same [Visual:] resolver picks it up downstream
 *
 * Usage:
 *   npx tsx bin/agentic-motion.ts \
 *     --file input/scripts/ocean_reel_acquire.json \
 *     --job ocean_reel \
 *     --max-retries 2
 */
import * as fs from 'fs';
import * as path from 'path';
import { runRemotionController, type MotionScene } from '../src/agentic/media/hermes-remotion-controller.js';
import { authorRemotionComponent } from '../src/agentic/media/remotion-codegen.js';

function arg(name: string, fallback: any): any {
    const i = process.argv.indexOf('--' + name);
    if (i < 0) return fallback;
    const v = process.argv[i + 1];
    if (v === undefined || v.startsWith('--')) return fallback;
    return v;
}
function has(name: string): boolean { return process.argv.includes('--' + name); }

async function main() {
    const file = arg('file', null);
    const jobId = arg('job', null);
    const maxRetries = Number(arg('max-retries', 3));
    const visionMode = arg('vision-check', 'signal-only') as 'signal-only' | 'stub';
    const width = Number(arg('width', 1920));
    const height = Number(arg('height', 1080));

    if (!file || !jobId) {
        console.error('usage: --file <job.json> --job <id> [--max-retries N] [--vision-check stub] [--width W] [--height H]');
        process.exit(1);
    }
    const jobPath = path.resolve(file);
    const jobs = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) {
        console.error(`Job "${jobId}" not found in ${file}`);
        process.exit(1);
    }
    const motionScenes: MotionScene[] = job.motionScenes ?? [];
    if (!motionScenes.length) {
        console.error(`Job "${jobId}" has no "motionScenes" — add them to the JSON`);
        console.error('Example: "motionScenes": [{"index":1,"kind":"infographic","text":"...","data":[...]}]');
        process.exit(1);
    }

    const visionCheck = visionMode === 'stub'
        ? async (framePng: string, s: { index: number; text: string; kind?: string }) => {
              // signal-only check — accept anything that produced a non-trivial PNG.
              const stat = fs.existsSync(framePng) ? fs.statSync(framePng) : null;
              return { ok: !!stat && stat.size > 5_000, note: `frame ${stat?.size ?? 0}B` };
          }
        : undefined;

    console.log(`\n=== agentic-motion ===`);
    console.log(`  job:      ${jobId}`);
    console.log(`  scenes:   ${motionScenes.length}`);
    console.log(`  retries:  ${maxRetries}`);
    console.log(`  vision:   ${visionMode}`);

    // Print what each scene will synthesize (a sanity check before rendering).
    console.log('\n  --- specs ---');
    for (const s of motionScenes) {
        const ts = authorRemotionComponent({
            index: s.index,
            kind: s.kind,
            title: (s.text ?? '').slice(0, 40),
            caption: s.text ?? '',
            data: s.data,
            labels: s.labels,
            palette: s.palette,
            code: s.code,
            durationInFrames: s.durationInFrames ?? 120,
            width: s.kind === 'infographic' || s.kind === 'map' ? 1920 : 1920,
            height: 1080,
        });
        console.log(`    s${s.index}  ${s.kind?.padEnd(12)} ${ts.length.toString().padStart(5)}ch`);
    }

    const t0 = Date.now();
    const results = await runRemotionController(motionScenes, {
        jobId,
        maxRetries,
        visionCheck,
        width,
        height,
    });

    console.log('\n  --- results ---');
    let ok = 0, fb = 0, sk = 0;
    for (const r of results) {
        const tag = r.status === 'generated' ? '✅' : r.status === 'fallback' ? '⚠️ ' : '⏭ ';
        console.log(`    ${tag} s${r.index}  ${r.status.padEnd(10)}  ${r.note}`);
        if (r.integratedPath) console.log(`         -> ${r.integratedPath}`);
        if (r.status === 'generated') ok++;
        else if (r.status === 'fallback') fb++;
        else sk++;
    }
    console.log(`\n  summary: ${ok} generated, ${fb} fallback, ${sk} skipped   (${Date.now() - t0} ms)`);
    console.log(`  dims:    ${width}x${height}`);
    process.exit(ok === motionScenes.length ? 0 : 1);
}

main().catch((e) => {
    console.error('agentic-motion FAILED:', e?.stack ?? e);
    process.exit(1);
});