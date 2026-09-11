/**
 * regen-timeline.ts — re-renders the timeline motion scene using a hand-authored
 * portrait-friendly .tsx (PROVIDED mode in runRemotionController). The stock
 * `timeline` MotionKind hardcodes 1920-wide node spacing; for portrait reels
 * the nodes overflow the canvas. This is exactly the case where the agent
 * writes raw .tsx instead of using a template.
 */
import * as fs from 'fs';
import { runRemotionController } from '../src/agentic/media/hermes-remotion-controller.js';

const STEPS = [
    '1950s — Mass plastic',
    '1970s — Gyres form',
    '1990s — Microplastics',
    'Today — 8M tons/yr',
];

const code = `import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from 'remotion';

const BG = '#0a0a12';
const A = '#FF6B35';
const B = '#4CC9F0';
const STEPS = ${JSON.stringify(STEPS)};

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: 'system-ui', padding: '80px 70px' }}>
      <h1 style={{ color: 'white', fontSize: 78, fontWeight: 800, margin: 0, marginBottom: 50 }}>
        The plastic journey
      </h1>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 36, marginTop: 20 }}>
        <div style={{ position: 'absolute', left: 45, top: 10, bottom: 10, width: 4, background: '#3a4254' }} />
        {STEPS.map((s, i) => {
          const enter = spring({ frame: frame - i * 12, fps, config: { damping: 14 } });
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: enter, transform: 'translateX(' + ((1 - enter) * -40) + 'px)' }}>
              <div style={{ width: 94, height: 94, borderRadius: '50%',
                background: (i % 2 ? A : B),
                boxShadow: '0 0 30px ' + (i % 2 ? A : B) + '88',
                transform: 'scale(' + enter + ')', flexShrink: 0 }} />
              <span style={{ color: 'white', fontSize: 46, fontWeight: 600 }}>{s}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
`;

async function main() {
    const t0 = Date.now();
    const results = await runRemotionController(
        [{ index: 3, text: 'The plastic journey', kind: 'timeline', code, durationInFrames: 180 }],
        { jobId: 'ocean_reel', maxRetries: 1, width: 1080, height: 1920 },
    );
    const r = results[0];
    console.log(`scene 3: ${r.status}  (${Date.now() - t0} ms)`);
    if (r.integratedPath) console.log(`-> ${r.integratedPath}`);
    process.exit(r.status === 'generated' ? 0 : 1);
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1); });