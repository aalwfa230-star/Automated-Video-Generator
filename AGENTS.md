# AGENTS.md — Operating this repository as an agentic video editor

This project is a **toolkit for making videos**, not a one-shot generator.
Drive it one deliberate step at a time and verify after every step.

> Full operating procedure: **read `skills/agentic-director/SKILL.md` first.**
> This file is the index; that skill is the playbook.

---

## Ground rules

1. **One step at a time.** Acquire → verify → approve/reject → edit → re-verify.
   Do not fire a whole pipeline and hope.
2. **Verify everything.** Every asset and every render gets checked. A step is
   not done until you have looked at the output.
3. **Deterministic by default.** No LLM is required and none is configured by
   default. Use the reproducible heuristics unless the user explicitly asks for
   AI scriptwriting.
4. **Never invent capability.** Check the capability table below before promising
   anything.
5. **No secrets in commits.** `.env` is gitignored — keep it that way.

---

## Capability map (verified, not assumed)

| Capability | Status | How |
|---|---|---|
| Stock images / video | ✅ | `agentic_acquire`; `agentic-batch --mode download-images\|download-videos` |
| Stage assets to `input/visuals/` | ✅ | add **`--to-input`** (required for editor workflow) |
| Music / SFX | ✅ | `--mode download-music` / `download-sfx` |
| Per-asset editing | ✅ | `trim_video`, `crop_video`, `grade_video`, `speed_ramp`, `add_watermark`, `merge_videos`, … |
| Voiceover | ✅ | `make_voiceover` (needs `python -m pip install edge-tts` for natural voice) |
| Visual verification | ⚠️ | only with a vision model configured; otherwise gate reports `unverified: true` |
| Remotion motion graphics | ✅ code / ⚠️ render | `--renderer remotion`; needs Chromium extracted into `node_modules/.remotion/` |
| Screen recording | ✅ | ffmpeg `gdigrab` (present in ffmpeg-static) |
| Web screenshot / browser use | ❌ | **not bundled** — must be added (playwright, or drive Remotion's Chromium) |
| LLM brain | ⚠️ optional | `OPENROUTER_API_KEY` / `OLLAMA_URL`; off by default |

---

## Canonical workflow

```
1. UNDERSTAND   extract topic, goal, platform, tone, length, constraints
2. PLAN         agentic_plan            → plan.json (scenes + keywords)
3. ACQUIRE      one-by-one: images, then videos, then music  (--to-input)
4. VERIFY       agentic_verify_all → approve_asset / reject_asset
5. EDIT         per-asset: trim / crop / grade / reframe / overlay
6. AUTHOR       Remotion components for motion graphics (write code)
7. ARRANGE      order scenes; durations come from the VOICEOVER
8. RENDER       ffmpeg (always) or remotion (motion graphics)
9. VERIFY       probe + blackdetect + audio + LOOK AT FRAMES
```

---

## Command quick reference

```bash
# Preflight
npm run doctor

# Plan / acquire / voice / render (modular, step-by-step)
npx tsx src/adapters/cli/agentic-modular.ts plan    --file <job>.json
npx tsx src/adapters/cli/agentic-modular.ts visuals --file <job>.json
npx tsx src/adapters/cli/agentic-modular.ts voice   --file <job>.json
npx tsx src/adapters/cli/agentic-modular.ts render  --file <job>.json

# Staged download INTO input/visuals (editor workflow)
npx tsx src/adapters/cli/agentic-batch.ts --mode download-images --file <job>.json --to-input
npx tsx src/adapters/cli/agentic-batch.ts --mode download-videos --file <job>.json --to-input
npx tsx src/adapters/cli/agentic-batch.ts --mode download-music  --file <job>.json
npx tsx src/adapters/cli/agentic-batch.ts --mode apply-advanced  --file <job>.json

# Full run (ffmpeg)
npx tsx bin/agentic-run.ts --topic "…" --title "…" --orientation portrait --images

# Full run (Remotion motion graphics)
npx tsx bin/agentic-run.ts --topic "…" --title "…" --orientation portrait --renderer remotion

# Screen record (works today)
node_modules/ffmpeg-static/ffmpeg.exe -f gdigrab -framerate 25 -t 15 \
  -i desktop -pix_fmt yuv420p input/visuals/screen.mp4

# Remotion preview / studio
npm run remotion:studio
```

Input job format: `input/scripts/agentic-scripts.json` (see
`input/scripts/AGENTIC_SCRIPT_FORMAT.md`, `INPUT_FORMAT.md`).

---

## Verification commands (use these — always)

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

**Do not report success on a video you have not opened.** Flat colour gradients
mean zero approved visuals — go back to acquisition.

---

## Quality gates

`tsc --noEmit` must pass before committing.
`npm run test:unit` runs the suite; a few ffmpeg-flaky tests fail on
RAM-constrained hosts (known, tracked in `docs/ROADMAP.md`).

---

## Layout

```
src/agentic/          orchestration, media, AI, delivery
src/lib/              fetchers, ffmpeg helpers, visual-fetcher
src/adapters/         CLI, HTTP, MCP surfaces
remotion/             motion-graphics compositions  ← extend here
input/scripts/        job definitions
input/visuals/        YOUR assets (staged with --to-input)
output/<job>/         rendered MP4s
workspace/jobs/<id>/  per-job intermediates
skills/               agent skills  ← start with agentic-director
```

## Reference

- `skills/agentic-director/SKILL.md` — **the operating procedure**
- `AGENT_EXECUTION_GUIDE.md` — deep execution reference
- `docs/ARCHITECTURE.md`, `docs/MCP_TOOL_REFERENCE.md`, `docs/ROADMAP.md`
- `llms.txt` / `llms-full.txt` — compressed project summaries for agents
