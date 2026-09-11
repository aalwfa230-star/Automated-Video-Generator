/**
 * remotion-capacity-probe.ts — proves whether the agentic system's Remotion
 * codegen actually produces compilable React/Remotion code for all 12 motion
 * kinds, WITHOUT needing Chromium (webpack bundling only).
 *
 * Run: npx tsx scripts/remotion-capacity-probe.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { authorRemotionComponent, type MotionKind } from '../src/agentic/media/remotion-codegen.js';

const KINDS: MotionKind[] = [
    'kinetic', 'infographic', 'hud', 'diagram', 'ui', 'map',
    'particle', 'procedural', 'logo', 'timeline', 'spectrum', 'abstract',
];

const OUT = path.resolve('workspace/remotion-capacity-probe');

async function main() {
    fs.mkdirSync(OUT, { recursive: true });

    console.log('=== 1. SYNTHESIZE all 12 motion kinds ===');
    const rows: string[] = [];
    for (let i = 0; i < KINDS.length; i++) {
        const kind = KINDS[i];
        const src = authorRemotionComponent({
            index: i,
            kind,
            title: `${kind.toUpperCase()} Demo`,
            caption: 'Agentic motion graphics',
            data: kind === 'infographic' || kind === 'map' ? [42, 68, 55, 91, 76] : undefined,
            labels: ['Alpha', 'Beta', 'Gamma', 'Delta'],
            palette: ['#0a0a12', '#FF6B35', '#4CC9F0'],
            durationInFrames: 90,
            width: 1920,
            height: 1080,
        });
        const file = path.join(OUT, `scene_${i}.tsx`);
        fs.writeFileSync(file, src, 'utf8');

        const uses = (needle: string) => (src.includes(needle) ? 'Y' : '-');
        rows.push(
            `  ${kind.padEnd(12)} ${String(src.length).padStart(5)}ch  ` +
            `useCurrentFrame:${uses('useCurrentFrame()')} spring:${uses('spring(')} ` +
            `interp:${uses('interpolate(')} svg:${uses('<svg')} export:${uses('export const')}`,
        );
    }
    console.log(rows.join('\n'));

    console.log('\n=== 2. PROVIDED mode: agent hand-authored raw .tsx passes through verbatim ===');
    const raw = `import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
export const Scene99: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: \`hsl(\${f},70%,50%)\` }} />;
};
`;
    const provided = authorRemotionComponent({ index: 99, code: raw });
    console.log('  verbatim match:', provided === raw ? 'YES' : 'NO');

    console.log('\n=== 3. Import allowlist (assertSafeImports) rejects unsafe imports ===');
    try {
        authorRemotionComponent({
            index: 98,
            code: `import fs from 'fs';\nexport const Scene98: React.FC = () => null;\n`,
        });
        console.log('  UNSAFE import was NOT blocked  <-- PROBLEM');
    } catch (e: any) {
        console.log('  blocked correctly:', String(e.message).slice(0, 80));
    }

    console.log('\n=== 4. Write a Root that registers all 12 + the provided scene ===');
    const imports = KINDS.map((_, i) => `import { Scene${i} } from './scene_${i}';`).join('\n')
        + `\nimport { Scene99 } from './scene_99';`;
    fs.writeFileSync(path.join(OUT, 'scene_99.tsx'), provided, 'utf8');
    const comps = KINDS.map((k, i) => `      <Composition id="S${i}_${k}" component={Scene${i}} durationInFrames={90} fps={30} width={1920} height={1080} />`)
        .concat([`      <Composition id="S99_provided" component={Scene99} durationInFrames={90} fps={30} width={1920} height={1080} />`])
        .join('\n');
    const root = `import React from 'react';\nimport { Composition } from 'remotion';\n${imports}\n\nexport const RemotionRoot: React.FC = () => (\n  <>\n${comps}\n  </>\n);\n`;
    fs.writeFileSync(path.join(OUT, 'Root.tsx'), root, 'utf8');
    fs.writeFileSync(
        path.join(OUT, 'index.ts'),
        `import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './Root';\n\nregisterRoot(RemotionRoot);\n`,
        'utf8',
    );
    console.log('  wrote', KINDS.length + 1, 'compositions');

    console.log('\n=== 5. BUNDLE with @remotion/bundler (webpack only — no Chromium needed) ===');
    const t0 = Date.now();
    const { bundle } = await import('@remotion/bundler');
    const serveUrl = await bundle(path.join(OUT, 'index.ts'), () => undefined, {
        webpackCacheDisabled: true,
    });
    console.log('  BUNDLE OK ->', serveUrl, `(${Date.now() - t0} ms)`);

    console.log('\n=== 6. selectComposition (needs Chromium — expected to fail in sandbox) ===');
    try {
        const { selectComposition } = await import('@remotion/renderer');
        const c = await selectComposition({ serveUrl, id: 'S0_kinetic', inputProps: {} });
        console.log('  selectComposition OK:', c.id, c.width + 'x' + c.height, c.durationInFrames + 'f');
    } catch (e: any) {
        console.log('  FAILED (expected on this host):', String(e.message).split('\n')[0].slice(0, 140));
    }
}

main().catch((e) => {
    console.error('PROBE FAILED:', e);
    process.exit(1);
});
