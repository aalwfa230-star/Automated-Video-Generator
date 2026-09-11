/**
 * self-fix.ts — Root-cause analysis → targeted re-render.
 *
 * Given a failed CritiqueVerdict, decide WHAT to fix and HOW.
 * The fix is applied by modifying the pipeline request and re-running
 * the render phase (not the whole pipeline — that would waste research).
 */
import { logInfo, logWarn } from '../../shared/logging/runtime-logging.js';
import type { CritiqueVerdict } from './types.js';
import type { PipelineRequest } from '../orchestrator/types.js';

export interface FixDecision {
    action: 're-render' | 're-acquire' | 're-grade' | 'none';
    /** Human-readable reason for the log */
    reason: string;
    /** Modified request fields to apply before re-render */
    requestPatch: Record<string, unknown>;
}

/**
 * Analyze a failed critique and decide what to fix.
 *
 * Strategy:
 *   - blackdetect fail → the render dropped frames; re-render with
 *     higher frame rate tolerance (or fall back to simpler filters)
 *   - freezedetect fail → last-frame hold issue; re-render with
 *     explicit -t duration matching audio
 *   - astats fail (silent) → voiceover didn't generate; re-run voice
 *     generation with a different backend
 *   - cropdetect fail → wrong orientation; re-grade with correct dims
 */
export function decideFix(verdict: CritiqueVerdict): FixDecision {
    const failedGate = verdict.gates.find(g => !g.pass);

    if (!failedGate) {
        return { action: 'none', reason: 'All gates passed — no fix needed', requestPatch: {} };
    }

    switch (failedGate.id) {
        case 'blackdetect':
            return {
                action: 're-render',
                reason: `Black frames detected: ${failedGate.detail}. Will re-render with safer filter chain (drop heavy grade, reduce motion FX).`,
                requestPatch: { forceGrade: 'neutral', safeFilterMode: true },
            };

        case 'freezedetect':
            return {
                action: 're-render',
                reason: `Freeze detected: ${failedGate.detail}. Will re-render with explicit -t duration and disable last-frame hold.`,
                requestPatch: { explicitDurationHold: false },
            };

        case 'astats':
            return {
                action: 're-acquire',
                reason: `Audio silent/missing: ${failedGate.detail}. Will re-run voice generation with fallback backend.`,
                requestPatch: { voiceBackendFallback: 'edge-tts' },
            };

        case 'cropdetect':
            return {
                action: 're-grade',
                reason: `Wrong aspect ratio: ${failedGate.detail}. Will re-render with correct output dimensions.`,
                requestPatch: { forceOrientationFix: true },
            };

        default:
            return {
                action: 're-render',
                reason: `Unknown gate failure: ${failedGate.id}. Will re-render with conservative settings.`,
                requestPatch: { forceGrade: 'neutral', safeFilterMode: true },
            };
    }
}

/**
 * Apply a fix decision to a pipeline request, returning the modified request.
 */
export function applyFix<T extends Record<string, unknown>>(request: T, fix: FixDecision): T {
    return { ...request, ...fix.requestPatch };
}

/**
 * Apply a fix decision to an agentic PipelineRequest so the NEXT render attempt
 * actually differs from the last one.
 *
 * Why this exists: spreading `requestPatch` alone is not enough. Job-level
 * `grade` is only a *bias* — the per-scene grade that wins comes from the inline
 * `[Grade: …]` / `[Kinetic: …]` / `[Transition: …]` tags in `script`
 * (see orchestrator/render.ts: per-scene `scene.grade` overrides `gradeBias`).
 * So a black-frame failure asking for "neutral" has to rewrite those tags,
 * otherwise the retry re-renders the exact same video and the loop is a no-op.
 */
export function applyFixToRequest(req: PipelineRequest, fix: FixDecision): PipelineRequest {
    const merged: PipelineRequest = { ...req, ...(fix.requestPatch as Partial<PipelineRequest>) };

    if (fix.requestPatch.safeFilterMode && typeof merged.script === 'string') {
        merged.script = merged.script
            .replace(/^\[Grade:[^\]]*\]/m, '[Grade: neutral]')
            .replace(/^\[Kinetic:[^\]]*\]/m, '[Kinetic: off]')
            .replace(/^\[Transition:[^\]]*\]/m, '[Transition: fade]');
    }

    return merged;
}