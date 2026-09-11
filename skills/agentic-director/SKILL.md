---
name: agentic-director
description: Complete operating skill for AI agents. The agent (LLM) owns understanding, planning, scriptwriting, ALL verification using its own vision, AND authoring Remotion code/images/animation/motion-graphics compositions. This project is the editing suite and render farm: downloads images/videos separately, edits them one-by-one, runs the Remotion codegen→bundle→render→integrate loop, then assembles and renders.
version: 7.1.0
---

# AGENTIC DIRECTOR — Complete Skill (v7.1 — Remotion-focused)

## DIVISION OF LABOUR

| Responsibility | Who does it |
|---|---|
| Understand the brief, infer intent | **YOU (the LLM)** |
| Plan scenes, write the script, pick keywords | **YOU** |
| Decide tone, pacing, narrative order | **YOU** |
| **Verify every asset visually** | **YOU — with your own vision** |
| **Verify the final rendered video** | **YOU — with your own vision** |
| **Write or request Remotion .tsx for any scene** | **YOU** (PROVIDED mode verbatim, or pick from 12 motion kinds) |
| Download images (separately) | **PROJECT** |
| Download videos (separately) | **PROJECT** |
| Edit each asset one-by-one (trim/crop/grade/reframe/overlay) | **PROJECT** |
| Generate voiceover, music, captions | **PROJECT** |
| Render generated motion graphics → MP4 or PNG | **PROJECT** (`@remotion/bundler` + `@remotion/renderer`) |
| Assemble + render final MP4 | **PROJECT** |

**You are the director AND the motion-graphics artist.**
You do not delegate judgement. You delegate bytes and pixels.

---

# PART A — YOUR WORK (LLM responsibilities)

## A1. Understand the brief

Extract and state explicitly before acting:
- **Subject** — what is this about
- **Goal** — educate / sell / entertain / document / inspire
- **Platform** — 9:16 shorts / 16:9 landscape / 1:1 square (drives ALL dimensions)
- **Tone** — calm / energetic / cinematic / corporate / playful
- **Length & scene count**
- **Mandatory assets** — logos, product shots, specific URLs, screenshots
- **Constraints** — language, voice, license, runtime cap
- **Motion-graphic needs** — infographics, diagrams, charts, logo stings, animated HUD, particle fields, timelines, spectrum visualizers, kinetic text

If any is ambiguous, ask. Do not guess on platform or tone.

## A2. Plan + write the script

Produce a scene list. For each scene:
- `sceneNumber`
- `voiceoverText` — 12–20 words, spoken naturally
- `searchKeywords` — **3–5 concrete NOUN PHRASES**, visual and literal
- `motionKind` (optional) — one of `kinetic | infographic | hud | diagram | ui | map | particle | procedural | logo | timeline | spectrum | abstract` OR omit (use a stock image/video)
- `motionCode` (optional) — raw .tsx for novel compositions the synthesizer doesn't cover

**Keyword quality is the single biggest driver of output quality.**
A scene keyed on a bare verb fetches garbage.

- ❌ `"grow"`, `"change"`, `"process"`, `"how it works"`
- ✅ `"coral reef"`, `"wild coral reef"`, `"coral reef close up"`, `"tropical fish reef"`

Rules: name the physical subject; add a context word (wild / close up /
underwater / aerial / urban); never use abstract nouns alone; match the platform
orientation.

## A3. Verify every asset — YOU, with your own vision

This is non-delegable. For each downloaded asset:

1. **Open it.** Read the image, or extract frames from the video.
2. **Judge it:**
   - Is the subject actually in frame?
   - Correct orientation for the target platform?
   - Resolution usable (≥720px short edge)?
   - Watermarks, UI chrome, black bars, captions burned in?
   - Does it match the tone?
3. **Decide:** approve / reject / re-acquire.

**Reject aggressively.** One wrong image ruins a scene; a re-fetch costs seconds.
A 3 KB JPEG is a failed download, not an asset.

Video frame extraction:
```bash
node_modules/ffmpeg-static/ffmpeg.exe -y -i clip.mp4 \
  -vf "fps=1/2,scale=400:-1" -q:v 3 frames_%02d.png
```

## A4. Decide the edits (per asset, based on what you see)

Look at the asset, then prescribe: trim length, crop/reframe, grade/mood,
speed, overlays, watermark. Prescribe per asset — never a blanket filter.

## A5. Decide motion graphics — write or compose

For any scene that needs animation that stock media can't supply:

| Need | Pick | Or write |
|---|---|---|
| Animated bar / pie / line chart | `infographic` | — |
| Radar / pulse / status display | `hud` | — |
| Flow diagram (Input→Process→Output) | `diagram` | — |
| App / browser / OS UI mockup | `ui` | — |
| Route / path animation on map background | `map` | — |
| Confetti / snow / dust / energy field | `particle` | — |
| Geometric / kaleidoscope background | `procedural` | — |
| Brand mark or icon with spring entrance | `logo` | — |
| Step-by-step progress / chapter markers | `timeline` | — |
| Music-reactive equalizer | `spectrum` | — |
| Cinematic title card with glow | `kinetic` | — |
| Soft abstract gradient with text | `abstract` | — |
| Anything else (novel layout, custom animation) | — | hand-author raw `.tsx` (see A6) |

## A6. Write raw Remotion code when you must

You can author any composition you want. Two facts:

1. The synthesizer (`authorRemotionComponent()` in
   `src/agentic/media/remotion-codegen.ts`) accepts a `code` field and uses it
   **verbatim**. You write the `.tsx`, it goes straight into the bundle.
2. The import allowlist (`assertSafeImports()`) blocks anything outside
   `remotion`, `react`, `@remotion/*`, `./`, `../`. No `fs`, no network, no
   native modules. **This is a safety gate, not a creativity limit.**

Minimal template you can copy:
```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: '#0a0a12', justifyContent: 'center', alignItems: 'center' }}>
      <span style={{
        fontFamily: 'system-ui', fontWeight: 900, fontSize: 120, color: 'white',
        opacity: enter, transform: `scale(${interpolate(enter, [0,1], [0.7, 1])})`,
        textShadow: '0 0 50px #FF6B35',
      }}>YOUR HEADLINE</span>
    </AbsoluteFill>
  );
};
```

Conventions:
- Export `Scene<index>` (number from the scene plan).
- Use `useCurrentFrame()` + `useVideoConfig()` for animation.
- Use `AbsoluteFill` as the root container.
- Use inline styles only (Remotion 4 — no Tailwind by default).
- Keep it deterministic — no `Math.random()` or `Date.now()` in render path.

---

# PART B — THE PROJECT'S WORK (execution)

## B1. Write the job file

`input/scripts/<job>.json`:
```json
[
  {
    "id": "my_job",
    "title": "My Video",
    "topic": "subject",
    "script": "Scene one narration. [Visual: coral reef]\nScene two narration. [Motion: infographic: 42,68,55,91,76|Q1,Q2,Q3,Q4,Q5]",
    "orientation": "portrait",
    "candidatesPerAsset": 2,
    "captions": "burned",
    "musicIntensity": "mid"
  }
]
```

`[Motion: kind: data|labels|palette]` declares a synthesized motion-graphic
scene. `[Visual: ...]` resolves to a downloaded/edited asset.

## B2. Download IMAGES separately

```bash
npx tsx src/adapters/cli/agentic-batch.ts \
  --mode download-images --file input/scripts/<job>.json --to-input
```
→ `input/visuals/<jobId>_scene_<n>_cand_<k>.<ext>`

## B3. Download VIDEOS separately

```bash
npx tsx src/adapters/cli/agentic-batch.ts \
  --mode download-videos --file input/scripts/<job>.json --to-input
```

## B4. Music / SFX

```bash
npx tsx src/adapters/cli/agentic-batch.ts --mode download-music --file input/scripts/<job>.json
npx tsx src/adapters/cli/agentic-batch.ts --mode download-sfx   --file input/scripts/<job>.json
```

> **`--to-input` is mandatory.** It stages into `input/visuals/` where the
> local-asset path can see them. Without it, files hide in `workspace/jobs/<id>/`
> and never reach the render.

## B5. Edit each asset ONE BY ONE

Only edit approved assets. Re-verify after every edit.

| Need | Operation |
|---|---|
| Tighten / shorten | `trim_video`, `split_video`, `remove_silence` |
| Reframe for platform | `crop_video`, `resize_video`, `auto_reframe` |
| Fix orientation | `rotate_video` |
| Mood / look | `grade_video`, `apply_brand_kit` |
| Pacing | `slow_motion`, `speed_ramp` |
| Overlays | `add_watermark`, `add_lower_third`, `add_progress_bar` |
| Audio | `extract_audio`, `add_audio_track`, `add_music`, `reduce_noise` |
| Scenes | `detect_scenes`, `make_voiceover`, `localize_video` |
| Assembly | `merge_videos`, `derive_outputs`, `add_captions` |

Batch per-asset edits: `--mode apply-advanced`.

**Edit → re-verify → accept or revert.** Editing can introduce letterboxing,
wrong duration, or silent audio.

## B6. Render generated motion graphics (PART G — see below)

If any scene is `[Motion: ...]`, run the Remotion codegen + render loop first.
The resulting MP4 lands in `input/visuals/<jobId>_s<n>.mp4`, ready to be picked
up by the same `[Visual: file]` resolver the downloaded assets use.

```bash
npx tsx src/agentic/operations/hermes-remotion-driver.ts --job my_job
# (driver is exposed as the standalone harness CLI; see PART G for full command)
```

If you only need a generated IMAGE (cover, lower-third, thumbnail) and not a
video clip:

```bash
npx tsx -e "import('./src/agentic/media/remotion-sequence.js').then(m=>m.renderStillClip(
  { index:0, kind:'infographic', text:'REVENUE GROWTH',
    data:[42,68,55,91,76], labels:['Q1','Q2','Q3','Q4','Q5'],
    palette:['#0a0a12','#FF6B35','#4CC9F0'] },
  { jobId:'my_job', outName:'cover.png' }
))"
```

## B7. Render the assembled video

```bash
# ffmpeg — always works
npx tsx bin/agentic-run.ts --topic "…" --title "…" --orientation portrait --images

# Remotion — full agentic composition (advanced features A1-A11)
npx tsx bin/agentic-run.ts --topic "…" --title "…" --orientation portrait --renderer remotion
```

## B8. Screen capture (available now)

ffmpeg-static ships `gdigrab` + `dshow`:
```bash
node_modules/ffmpeg-static/ffmpeg.exe -f gdigrab -framerate 25 -t 15 \
  -i desktop -pix_fmt yuv420p input/visuals/screen.mp4
```

---

# PART C — FINAL VERIFICATION (you, always)

**Never report success on a video you have not opened.**

```bash
FF=node_modules/ffmpeg-static/ffmpeg.exe
FP=node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe

"$FP" -v error -show_entries format=duration,size \
  -show_entries stream=codec_type,codec_name,width,height \
  -of default=noprint_wrappers=1 out.mp4

"$FF" -i out.mp4 -vf "blackdetect=d=0.3:pix_th=0.05" -f null -   # expect NO output
"$FF" -i out.mp4 -af volumedetect -f null -                      # audio present
"$FF" -y -i out.mp4 -vf "fps=1/3,scale=400:-1" -q:v 3 qa_%02d.png  # then LOOK
```

Checklist:
- [ ] Correct dimensions for the platform
- [ ] Duration matches the plan (audio-driven)
- [ ] Zero black frames
- [ ] Audio present and non-silent
- [ ] Captions legible and in sync
- [ ] **Frames inspected visually — real imagery, not placeholder gradients**
- [ ] Motion-graphic scenes render the intended chart / diagram / text
- [ ] No unintended letterbox/pillarbox

**Flat colour gradients = zero approved visuals.** Acquisition or the gate
failed. Go back to B2. Do not ship it.

---

# PART D — THE LOOP

```
UNDERSTAND → PLAN + SCRIPT → (repeat per scene)
   ACQUIRE image/video        → YOU VERIFY → approve/reject
                              → EDIT per your judgement → YOU RE-VERIFY
   [if Motion] AUTHOR .tsx    → codegen → bundle → render → YOU VERIFY FRAMES
                              → integrate into input/visuals/
   ARRANGE (duration from voiceover) → RENDER FINAL → YOU VERIFY FINAL
```

**Verify at every arrow.** That discipline is the entire difference between
this and pressing "generate".

---

# PART E — FAILURE RECOVERY

| Symptom | Cause | Fix |
|---|---|---|
| `X2 missing scenes` | no approved visuals | re-run B2/B3; confirm `--to-input` |
| Files in `workspace/jobs/` | forgot `--to-input` | re-run with the flag |
| Placeholder gradient output | acquisition returned nothing | check `PEXELS_API_KEY` / network |
| Robotic narration | edge-tts missing | `python -m pip install edge-tts` |
| Remotion `delayRender` timeout | first Chrome launch cold | rerun — warms in ~15 s |
| `Chromium EPERM` extracting | sandbox blocked | free `node_modules/.remotion/`; retry outside sandbox |
| Render dies at cleanup | temp-file removal blocked | MP4 usually exists in `workspace/jobs/<id>/render/` — rescue it |
| Assets irrelevant | bad keywords | rewrite as concrete noun phrases (A2) |
| Synthesized motion renders black | wrong durationInFrames / no enter spring | pick a different kind or write raw .tsx (A6) |

---

# PART F — CAPABILITY FACTS (verified today)

| Capability | Status | Notes |
|---|---|---|
| Stock images / video (Pexels w/ key) | ✅ | 12 images / 1.8 s typical |
| Keyless fallback (Openverse, Wikimedia, IA) | ✅ | works, slower |
| `--to-input` staging | ✅ | real assets land in `input/visuals/` |
| Per-asset edit ops | ✅ | ~30 ops, batch via `--mode apply-advanced` |
| Screen recording (gdigrab/dshow) | ✅ | available now on Windows |
| **Remotion codegen — 12 motion kinds** | ✅ | kinetic/infographic/hud/diagram/ui/map/particle/procedural/logo/timeline/spectrum/abstract — all synthesized |
| **Remotion PROVIDED mode (raw .tsx)** | ✅ | verbatim pass-through, import allowlist enforced |
| **Remotion `@remotion/bundler`** | ✅ | bundles generated .tsx in 6–30 s (no Chrome needed) |
| **Remotion `renderMedia` → h264 MP4** | ✅ | 60-frame clip ≈ 8–15 s under software GL |
| **Remotion `renderStill` → PNG** | ✅ | generated cover / lower-third / thumbnail |
| **Agentic-video composition (A1–A11)** | ✅ | full pipeline renderer with transitions, grading, captions, music ducking |
| `crossZoom`/`filmBurn`/`linearBlur` shader transitions | ⚠️ | downgraded to `slide` for headless safety; enable with GPU host |
| Web screenshot / browser automation | ❌ | not bundled — would need Playwright |
| LLM brain | ⚠️ | optional, OFF by default (deterministic path) |

Libraries: `kinetic-text`, `transitions`, `motion-effects`, `path-morph`,
`shape-accents`, `animated-entrances`, `KaraokeCaptions`, `VoiceoverWaveform`,
`SubtitleOverlay`, `IntroOutroCards`, `AgenticVideo`.

Probes (reproducible today):
- `scripts/remotion-capacity-probe.ts` — synthesizes 12 kinds, bundles, proves compile
- `scripts/remotion-render-probe.ts` — renders 4 sample MP4s + 1 PNG end-to-end
- Outputs: `workspace/remotion-render-probe/out/Scene{0,1,2,3}.mp4`,
  `input/visuals/remotion_generated_cover.png`

---

# PART G — REMOTION CAPACITY (the headline)

The agentic system **does** write Remotion code and **does** generate images,
videos, animations, and motion graphics. Verified end-to-end today on this host
(Sept 11, 2026): the codegen bundle compiles, the renderer produces real MP4s,
and `renderStill` produces real PNGs.

## G1. What you can do

### Author raw .tsx (the brain's pen)
The synthesizer's `code` field uses your raw `.tsx` verbatim. You author the
animation; the system bundles and renders it. The only constraint is the
import allowlist (`remotion | react | @remotion/* | ./ | ../`), which keeps
generation safe.

### Pick from 12 motion kinds
`synthesize()` produces a complete composition for any of these — pass a
`SceneSpec` with `kind`, `title`, optional `data`, `labels`, `palette`:

| Kind | Best for | Built from |
|---|---|---|
| `kinetic` | bold title card with glow | `spring` + scale |
| `infographic` | animated bar chart | SVG/HTML bars, `spring` |
| `hud` | radar / pulse / status | `<svg>` circles + rotating line |
| `diagram` | flow diagram with blocks | `<svg>` rects + `<text>` |
| `ui` | browser/app mockup | divs + slide-in spring |
| `map` | route animation on dark BG | SVG `<path>` + animated `<circle>` |
| `particle` | confetti / dust / energy field | 150 absolutely-positioned divs |
| `procedural` | rotating geometric pattern | SVG `<rect>` ring |
| `logo` | brand mark with spring | gradient box + text |
| `timeline` | step-by-step progress | SVG circles on a line |
| `spectrum` | audio-reactive equalizer | 64 div bars, sine mixing |
| `abstract` | soft gradient + text | CSS gradient blobs |

### Generate images (PNG)
`renderStill()` produces a single PNG from any composition — cover art,
thumbnail, lower-third, social card. Lands in `input/visuals/`.

### Generate videos (MP4)
`renderMedia()` produces h264 MP4 with audio passthrough. 60-frame clips take
~8–15 s under software GL.

### Self-fix loop
`runRemotionController()` (in `hermes-remotion-controller.ts`) wraps the whole
process with a per-scene retry loop. Each retry gets a new `variant` seed so
the synthesized output differs; the optional `visionCheck` callback lets you
verify frames visually and force another retry if content doesn't match.

### Full agentic render
`renderAgenticWithRemotion()` (in `orchestrator/remotion.ts`) renders the
manifest through the 508-line `AgenticVideo` composition with A1–A11 advanced
features (transitions, color grading, kinetic text, gradients, music ducking,
aspect-aware, branded fallback). Used via `--renderer remotion` on
`bin/agentic-run.ts`.

## G2. What's NOT yet wired

| Gap | What it means | Recommended fix |
|---|---|---|
| `runRemotionController` has no CLI op | Per-scene controller loop can't be invoked from the CLI | Add `bin/agentic-run.ts --remotion-autonomous` or new CLI/MCP tool `agentic_remotion_generate` |
| `renderSequence` and `renderStillClip` aren't wired | Native `<TransitionSeries>` + PNG generation unreachable from CLI | Add `bin/agentic-run.ts --motion-sequence` / `--motion-still` |
| No default `visionCheck` | Self-fix loop falls back to signal-only verification | Wire `AgentBrain` as default when `aiVerify.verifyOnRender` is set |
| `remotion` + `@remotion/bundler` not declared in package.json | Relies on transitive deps of `@remotion/renderer` | Add `"remotion": "^4.0.504"` and `"@remotion/bundler": "^4.0.504"` |
| 12-kind templates are fixed templates | Agents get 12 looks, not arbitrary layouts | Use A6 / PROVIDED mode for novel layouts; or extend the synthesizer |
| Shader transitions (`crossZoom`/`filmBurn`/`linearBlur`) disabled | Defaulted to `slide` (pure CSS) for headless safety | Add `REMOTION_GPU=1` env to opt in on a GPU host |

## G3. Failure modes you'll actually hit

1. **`delayRender` timeout on first run** — Chromium cold-launch takes 30+ s.
   The 5-minute `timeoutInMilliseconds` will catch it. Re-run; warms in ~15 s.
2. **EPERM extracting Chrome** — sandbox blocks. Run outside the sandbox.
3. **`Composition id` validation error** — only `[a-zA-Z0-9-CJK-]` allowed.
   The current code uses `Scene<index>` and `Sequence` so this is fine; if
   you author your own Root, obey that rule.

---

# ADVANCED PROMPT (paste to direct a run)

```
You are an expert AI Video Editor + Motion-Graphics Artist operating in
C:\one\Automated-Video-Generator.

You own: understanding the brief, planning scenes, writing the script,
choosing keywords, verifying EVERY asset with your own vision, prescribing
per-asset edits, AND authoring Remotion code/images/animation/motion graphics.
The project owns: downloading images and videos separately, applying edits,
generating voice/music/captions, rendering generated motion graphics (Remotion),
and assembling/rendering the final video.

LAWS:
1. Verify one asset at a time. Never move on until you have looked at it.
2. Reject anything that doesn't clearly show the subject. Re-acquire immediately.
3. Edit per asset based on what you see — never apply blanket filters.
4. Re-verify after every edit.
5. For any scene that needs motion graphics the synthesizer covers, pick from
   the 12 kinds (kinetic/infographic/hud/diagram/ui/map/particle/procedural/
   logo/timeline/spectrum/abstract). For anything else, hand-author raw .tsx.
6. Verify every generated MP4/PNG visually. Re-render with a new variant
   seed if the output doesn't match your brief.
7. Never report success on a video you have not opened and inspected.

WORKFLOW:
1. State the brief: subject, goal, platform, tone, length, constraints.
2. Write the scene list. Mark which scenes are stock `[Visual: ...]` and
   which are motion `[Motion: kind: ...]`. Keywords must be concrete noun
   phrases ("coral reef", not "grow").
3. For motion scenes: synthesize or hand-author .tsx -> bundle -> render ->
   inspect frames -> integrate.
4. Download images separately (--to-input). Verify each.
5. Download videos separately (--to-input). Verify each.
6. Edit each approved asset. Re-verify each.
7. Arrange: durations come from the voiceover, picture is cut to audio.
8. Render.
9. Probe (dimensions, duration, blackdetect, audio), extract frames, LOOK.
10. Report only after step 9 passes.

Deliver a video that is visually correct, licensed, correctly formatted for
the target platform, with real imagery — and motion graphics that match the
narrative, not placeholder gradients.
```