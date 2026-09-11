# Agentic Director — Enhanced Plan

**Goal:** evolve Automated Video Generator from a *pipeline* into an *editor* that an
AI agent drives one verified step at a time — planning, acquiring, capturing,
verifying, editing, authoring motion graphics, arranging and rendering.

Companion docs: `AGENTS.md` (index), `skills/agentic-director/SKILL.md` (procedure).

---

## 1. Where we are today (verified, not assumed)

Measured on this repository, September 2026.

### Works
| Area | Evidence |
|---|---|
| Stock acquisition | Pexels with key: 12 images / 1.8 s. Keyless: Openverse 240 results, no key. |
| Staged one-by-one download | `--mode download-images` → `scene_1_cand_1.jpeg` … `scene_5_cand_1.jpeg` |
| Stage into `input/visuals/` | `--to-input` (added): produced real 1.4 MB / 2.5 MB Pexels JPEGs |
| Per-asset editing | `trim_video`, `crop_video`, `grade_video`, `speed_ramp`, `add_watermark`, `merge_videos`, … (~30 ops) |
| Rendering | 720×1280 h264+aac, 18 s, 1.5 MB, **0 black frames**, burned captions |
| Remotion components | kinetic-text, transitions, motion-effects, path-morph, shape-accents, animated-entrances, KaraokeCaptions, VoiceoverWaveform, SubtitleOverlay, IntroOutroCards, AgenticVideo |
| Screen recording | ffmpeg `gdigrab` + `dshow` present in ffmpeg-static |
| Type safety | `tsc --noEmit` exit 0 |

### Gaps (what "enhance" must build)
| Gap | Impact | Difficulty |
|---|---|---|
| **No browser / web screenshot** | can't grab a site, dashboard, or app UI as an asset | Medium — add playwright, or drive Remotion's Chromium |
| **Remotion render blocked** | Chromium can't extract into `node_modules/.remotion/` (sandbox) | Low on a normal host |
| **Remotion not agent-authored** | motion graphics are configured, not *written*, by the agent | Medium — needs a codegen + validate + render loop |
| **No per-asset edit loop** | edits exist as ops but nothing drives them asset-by-asset with re-verification | Medium |
| **Visual verification needs a model** | without one, gate is `unverified` — agent must self-inspect | Low (procedural) |
| **Self-fix partially inert** | `voiceBackendFallback` / `explicitDurationHold` declared, not consumed | Low–Medium |

---

## 2. Target architecture

```
                        ┌──────────────────────────┐
                        │   DIRECTOR AGENT (loop)  │
                        │  plan → act → verify →   │
                        │  accept/revise → repeat  │
                        └────────────┬─────────────┘
                                     │
   ┌───────────┬─────────────┬───────┴──────┬──────────────┬─────────────┐
   │  PLANNER  │  ACQUIRER   │   CAPTURE    │    EDITOR    │   AUTHOR    │
   ├───────────┼─────────────┼──────────────┼──────────────┼─────────────┤
   │ brief →   │ stock one-  │ browser      │ per-asset    │ Remotion    │
   │ scenes,   │ by-one,     │ screenshot,  │ trim/crop/   │ component   │
   │ keywords, │ --to-input  │ screen rec.  │ grade/speed  │ codegen     │
   │ durations │ (image,     │ (gdigrab)    │ overlay      │ (motion     │
   │           │  video,     │              │              │  graphics)  │
   │           │  music,SFX) │              │              │             │
   └─────┬─────┴──────┬──────┴──────┬───────┴──────┬───────┴──────┬──────┘
         │            │             │              │              │
         └────────────┴─────┬───────┴──────────────┴──────────────┘
                            ▼
                 ┌────────────────────────┐
                 │  ASSET REGISTRY        │
                 │  input/visuals/ +      │
                 │  per-asset status:     │
                 │  acquired/verified/    │
                 │  edited/approved       │
                 └───────────┬────────────┘
                             ▼
                 ┌────────────────────────┐
                 │  ARRANGE → RENDER      │
                 │  ffmpeg | remotion     │
                 └───────────┬────────────┘
                             ▼
                 ┌────────────────────────┐
                 │  FINAL VERIFY          │
                 │  probe, blackdetect,   │
                 │  audio, frame review   │
                 └────────────────────────┘
```

### The invariant
**Every arrow is followed by a verification step.** An asset that hasn't been
looked at is not approved. A render that hasn't been probed and eyeballed is not
delivered.

---

## 3. The agent loop (pseudocode)

```
brief = understand(request)
plan  = plan_scenes(brief)

for scene in plan.scenes:
    for attempt in 1..3:
        asset = acquire(scene, channel=choose(stock|capture|generate))
        if not verify(asset):        continue
        if user_requires_edits:
            asset = edit(asset, ops)          # trim/crop/grade/reframe
            if not verify(asset):    continue
        approve(asset, scene)
        break
    if scene has no approved asset:
        escalate("scene N: no acceptable asset", scene)

timeline = arrange(approved_assets, durations_from_voiceover)
if motion_graphics_required:
    timeline = author_remotion(timeline)      # write/extend components
video = render(timeline)
final_verify(video)                            # probe + blackdetect + frames
```

---

## 4. Capability build-out

### 4.1 Browser & computer use *(not bundled — highest-value addition)*
- **Screen record (available now):** `ffmpeg -f gdigrab -i desktop` / `-i title="…"`,
  plus `dshow` for webcam/mic. Verified present in ffmpeg-static.
- **Web screenshot (to build):** add `playwright`, or drive the Chrome headless
  shell Remotion already downloads to `node_modules/.remotion/chrome-headless-shell/`.
- **Proposed surface:**
  ```
  capture_screenshot(url, viewport, waitFor) → input/visuals/<slug>.png
  capture_screen(seconds, region|window)      → input/visuals/<slug>.mp4
  ```
  Both must land in `input/visuals/` so everything downstream works unchanged.

### 4.2 Remotion as a generation surface (not just a renderer)
Today: agent *configures* `AgenticVideo`.
Target: agent *writes* compositions.

Requirements:
1. **Codegen contract** — agent emits a `.tsx` component + registers it in
   `Root.tsx` with a `<Composition id=…>`.
2. **Safety** — `assertSafeImports` already allowlists imports; keep components
   pure: no network, no `Math.random()`, no `Date.now()` inside render
   (breaks frame-accuracy and determinism). Animate from `useCurrentFrame()`.
3. **Validate → render → inspect → iterate** loop.
4. Reuse the shipped primitives (kinetic-text, transitions, path-morph,
   shape-accents, animated-entrances) rather than writing raw SVG each time.

### 4.3 Per-asset edit loop
Wrap the ~30 existing ops so each edit is: apply → re-probe → re-inspect →
accept/revert. Add a per-asset status so the agent always knows what's pending.

### 4.4 Visual verification
- With a vision model: `agentic_verify_all` → approve/reject as today.
- Without: agent extracts frames/previews and inspects them itself.
- Either way the gate must never claim `pass: true` when nothing ran —
  it reports `unverified: true` (already implemented).

---

## 5. Phased roadmap

### Phase 1 — Foundation ✅ largely done
- [x] Fix keyless `searchImages`/`searchVideos` returning `[]`
- [x] `--to-input` staging into `input/visuals/`
- [x] Honest gate (`unverified` instead of fake pass)
- [x] onetake actually renders
- [x] Parallel media verification (`mapPool`)
- [x] Topic-aware keyword expansion

### Phase 2 — Editor loop
- [ ] Per-asset edit driver: apply → re-verify → accept/revert
- [ ] Asset registry with per-asset status
- [ ] Consume remaining self-fix fields (`voiceBackendFallback`, `explicitDurationHold`)
- [ ] Screen-capture ops wired as first-class assets (gdigrab)

### Phase 3 — Browser use
- [ ] `capture_screenshot` / `capture_screen` tools
- [ ] Chromium lifecycle management (unblock `node_modules/.remotion/`)
- [ ] Assets land in `input/visuals/`

### Phase 4 — Remotion authorship
- [ ] Codegen contract + validation
- [ ] Agent writes/extends compositions
- [ ] Render → frame-inspect → iterate loop
- [ ] Unblock Remotion rendering on normal hosts

### Phase 5 — Full autonomy
- [ ] Agent plans, acquires, captures, authors, arranges, renders, verifies
      end-to-end with no human in the loop
- [ ] Every step logged and reproducible

---

## 6. Non-negotiables

1. **Verify after every step.** Assets and renders both.
2. **Deterministic by default.** No `Math.random()` / `Date.now()` in generation
   paths; seeded where randomness is genuinely needed.
3. **No fake passes.** A skipped check reports `unverified`, never `true`.
4. **Assets live in `input/visuals/`.** That is the contract the editor loop
   depends on.
5. **Never ship placeholder output.** Flat gradients mean acquisition failed.
6. **No secrets committed.** `.env` stays gitignored.

---

## 7. Open questions for the user

1. Browser use: add `playwright`, or drive Remotion's bundled Chromium?
2. Vision verification: configure a local model, or rely on agent self-inspection?
3. Screen recording needed on macOS/Linux too, or Windows-first?
4. Should the agent be allowed to *write new Remotion files* freely, or only
   extend a reviewed set of templates?
