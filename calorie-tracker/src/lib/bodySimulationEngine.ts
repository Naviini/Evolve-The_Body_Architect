/**
 * Body Simulation Engine
 *
 * Generates a series of MilestonePhase objects representing the user's body
 * at key points in their transformation journey.
 *
 * Phases:
 *   0 — Current body
 *   1 — Month 1 (adaptation)
 *   2 — Month 3 (noticeable changes)
 *   3 — Month 6 (significant transformation)
 *   4 — Month 12 (major transformation)
 *   5 — Dream body (goal state)
 *
 * The engine interpolates body proportions using eased curves that account
 * for realistic physiological change-rates per body type.
 */

import {
    OnboardingProfile,
    BodyTypeResult,
    BodySimulationParams,
    MilestonePhase,
    DreamBodyStyle,
    BodyType,
} from '@/src/types';
import { detectBodyType } from './bodyTypeEngine';

// ─── Constants ──────────────────────────────────────────────

/** Months corresponding to each milestone (phase 0 = now) */
const MILESTONE_MONTHS = [0, 1, 3, 6, 12];

const PHASE_LABELS = ['Current', 'Month 1', 'Month 3', 'Month 6', 'Year 1', 'Dream'];

const MOTIVATIONAL_MESSAGES = [
    "This is where your journey begins. Every step counts! 💪",
    "Your body is adapting — the foundation is being built! 🏗️",
    "Real changes are emerging. Others are starting to notice! 🌟",
    "You're halfway to your dream — look how far you've come! 🔥",
    "A whole year of dedication pays off. You're a different person now! 🏆",
    "This is your dream body. You've earned every bit of it! ⭐",
];

// ─── Helpers ────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/** Ease-out cubic for realistic body change (fast initial, slowing) */
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/** Ease-in-out for smoother muscle gain curves */
function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ─── Rate-of-change factors per body type ────────────────────

interface ChangeRates {
    fatLossPerMonth: number;       // kg of fat loss per month (max)
    muscleGainPerMonth: number;    // kg of muscle gain per month (max)
    bfDropPerMonth: number;        // body fat % drop per month (max)
}

function getChangeRates(bodyType: BodyType, isFemale: boolean): ChangeRates {
    const genderMod = isFemale ? 0.7 : 1.0;

    switch (bodyType) {
        case 'ectomorph':
            return {
                fatLossPerMonth: 1.5 * genderMod,
                muscleGainPerMonth: 0.6 * genderMod,
                bfDropPerMonth: 0.8,
            };
        case 'mesomorph':
            return {
                fatLossPerMonth: 2.0 * genderMod,
                muscleGainPerMonth: 1.0 * genderMod,
                bfDropPerMonth: 1.2,
            };
        case 'endomorph':
            return {
                fatLossPerMonth: 1.8 * genderMod,
                muscleGainPerMonth: 0.7 * genderMod,
                bfDropPerMonth: 0.6,
            };
    }
}

// ─── Current Body Params ────────────────────────────────────

function computeCurrentParams(
    profile: OnboardingProfile,
    btResult: BodyTypeResult | null,
    isFemale: boolean,
): BodySimulationParams {
    const h = profile.height_cm ?? 170;
    const w = profile.weight_kg ?? 70;
    const bmi = w / Math.pow(h / 100, 2);
    const bf = btResult?.estimatedBF ?? (isFemale ? 28 : 18);

    // Derive normalised proportions from measurements or BMI
    const waistRatio = profile.waist_cm
        ? clamp((profile.waist_cm / h) / 0.6, 0, 1)  // 0.6 waist:height is ~max
        : clamp((bmi - 15) / 25, 0.15, 0.9);

    const hipRatio = profile.hip_cm
        ? clamp((profile.hip_cm / h) / 0.65, 0, 1)
        : (isFemale ? clamp(waistRatio + 0.1, 0.2, 0.85) : waistRatio);

    const shoulderEstimate = isFemale
        ? clamp(0.3 + (1 - waistRatio) * 0.3 + (bmi > 22 ? 0.1 : 0), 0.2, 0.7)
        : clamp(0.35 + (1 - waistRatio) * 0.35 + (bmi > 24 ? 0.1 : 0), 0.25, 0.85);

    // Activity level → muscle tone estimate
    let toneBase = 0.2;
    switch (profile.activity_level) {
        case 'very_active': toneBase = 0.65; break;
        case 'active': toneBase = 0.5; break;
        case 'moderate': toneBase = 0.35; break;
        case 'light': toneBase = 0.25; break;
        case 'sedentary': toneBase = 0.15; break;
    }

    if (btResult?.dominant === 'mesomorph') toneBase += 0.1;
    if (btResult?.dominant === 'ectomorph') toneBase -= 0.05;

    return {
        shoulderWidth: clamp(shoulderEstimate, 0.15, 0.95),
        chestWidth: clamp(shoulderEstimate * 0.9, 0.15, 0.9),
        waistWidth: clamp(waistRatio, 0.1, 0.95),
        hipWidth: clamp(hipRatio, 0.1, 0.95),
        armSize: clamp(toneBase * 0.85, 0.1, 0.9),
        legSize: clamp(toneBase * 0.9 + (isFemale ? 0.05 : 0), 0.1, 0.9),
        muscleTone: clamp(toneBase, 0.05, 0.95),
        bodyFatOverlay: clamp((bf - 5) / 40, 0.05, 0.95),
    };
}

// ─── Dream Body Params ──────────────────────────────────────

function computeDreamParams(
    profile: OnboardingProfile,
    btResult: BodyTypeResult | null,
    isFemale: boolean,
    dreamStyle: DreamBodyStyle | null,
    targetBF: number | null,
): BodySimulationParams {
    const goalBF = targetBF ?? (isFemale ? 20 : 12);

    // Base dream proportions by style
    const stylePresets: Record<DreamBodyStyle, Partial<BodySimulationParams>> = {
        lean_athletic: {
            shoulderWidth: isFemale ? 0.55 : 0.72,
            chestWidth: isFemale ? 0.48 : 0.68,
            waistWidth: isFemale ? 0.28 : 0.32,
            hipWidth: isFemale ? 0.5 : 0.38,
            armSize: isFemale ? 0.42 : 0.55,
            legSize: isFemale ? 0.52 : 0.55,
            muscleTone: 0.72,
            bodyFatOverlay: 0.15,
        },
        muscular: {
            shoulderWidth: isFemale ? 0.62 : 0.85,
            chestWidth: isFemale ? 0.55 : 0.78,
            waistWidth: isFemale ? 0.32 : 0.38,
            hipWidth: isFemale ? 0.48 : 0.42,
            armSize: isFemale ? 0.58 : 0.78,
            legSize: isFemale ? 0.6 : 0.72,
            muscleTone: 0.88,
            bodyFatOverlay: 0.08,
        },
        toned: {
            shoulderWidth: isFemale ? 0.48 : 0.62,
            chestWidth: isFemale ? 0.42 : 0.58,
            waistWidth: isFemale ? 0.25 : 0.3,
            hipWidth: isFemale ? 0.48 : 0.35,
            armSize: isFemale ? 0.35 : 0.45,
            legSize: isFemale ? 0.48 : 0.48,
            muscleTone: 0.6,
            bodyFatOverlay: 0.2,
        },
        slim: {
            shoulderWidth: isFemale ? 0.38 : 0.5,
            chestWidth: isFemale ? 0.35 : 0.45,
            waistWidth: isFemale ? 0.2 : 0.25,
            hipWidth: isFemale ? 0.4 : 0.3,
            armSize: isFemale ? 0.22 : 0.3,
            legSize: isFemale ? 0.35 : 0.35,
            muscleTone: 0.35,
            bodyFatOverlay: 0.15,
        },
        powerlifter: {
            shoulderWidth: isFemale ? 0.68 : 0.9,
            chestWidth: isFemale ? 0.62 : 0.85,
            waistWidth: isFemale ? 0.4 : 0.48,
            hipWidth: isFemale ? 0.55 : 0.48,
            armSize: isFemale ? 0.65 : 0.85,
            legSize: isFemale ? 0.68 : 0.82,
            muscleTone: 0.78,
            bodyFatOverlay: 0.25,
        },
        swimmer: {
            shoulderWidth: isFemale ? 0.58 : 0.78,
            chestWidth: isFemale ? 0.5 : 0.7,
            waistWidth: isFemale ? 0.25 : 0.3,
            hipWidth: isFemale ? 0.42 : 0.35,
            armSize: isFemale ? 0.4 : 0.52,
            legSize: isFemale ? 0.48 : 0.5,
            muscleTone: 0.65,
            bodyFatOverlay: 0.12,
        },
        runner: {
            shoulderWidth: isFemale ? 0.4 : 0.55,
            chestWidth: isFemale ? 0.35 : 0.48,
            waistWidth: isFemale ? 0.22 : 0.25,
            hipWidth: isFemale ? 0.38 : 0.3,
            armSize: isFemale ? 0.22 : 0.28,
            legSize: isFemale ? 0.5 : 0.52,
            muscleTone: 0.55,
            bodyFatOverlay: 0.1,
        },
        custom: {
            shoulderWidth: isFemale ? 0.5 : 0.65,
            chestWidth: isFemale ? 0.45 : 0.6,
            waistWidth: isFemale ? 0.28 : 0.32,
            hipWidth: isFemale ? 0.45 : 0.36,
            armSize: isFemale ? 0.38 : 0.5,
            legSize: isFemale ? 0.45 : 0.5,
            muscleTone: 0.6,
            bodyFatOverlay: 0.18,
        },
    };

    const preset = stylePresets[dreamStyle ?? 'lean_athletic'];

    return {
        shoulderWidth: preset.shoulderWidth ?? 0.6,
        chestWidth: preset.chestWidth ?? 0.55,
        waistWidth: preset.waistWidth ?? 0.3,
        hipWidth: preset.hipWidth ?? 0.4,
        armSize: preset.armSize ?? 0.45,
        legSize: preset.legSize ?? 0.5,
        muscleTone: preset.muscleTone ?? 0.65,
        bodyFatOverlay: clamp((goalBF - 5) / 40, 0.02, 0.5),
    };
}

// ─── Interpolate params with easing ─────────────────────────

function interpolateParams(
    from: BodySimulationParams,
    to: BodySimulationParams,
    t: number,
    easeFunc: (t: number) => number = easeOutCubic,
): BodySimulationParams {
    const e = easeFunc(clamp(t, 0, 1));
    return {
        shoulderWidth: lerp(from.shoulderWidth, to.shoulderWidth, e),
        chestWidth: lerp(from.chestWidth, to.chestWidth, e),
        waistWidth: lerp(from.waistWidth, to.waistWidth, e),
        hipWidth: lerp(from.hipWidth, to.hipWidth, e),
        armSize: lerp(from.armSize, to.armSize, e),
        legSize: lerp(from.legSize, to.legSize, e),
        muscleTone: lerp(from.muscleTone, to.muscleTone, easeInOutQuad(clamp(t, 0, 1))),
        bodyFatOverlay: lerp(from.bodyFatOverlay, to.bodyFatOverlay, e),
    };
}

// ─── Diet & workout focus per phase ─────────────────────────

interface PhaseContext {
    isGaining: boolean;
    bodyType: BodyType;
    isFemale: boolean;
    fitnessLevel: string | null;
    phase: number;
}

function getDietFocus(ctx: PhaseContext): string {
    if (ctx.phase === 0) return 'Baseline assessment — track your current eating habits';

    if (ctx.isGaining) {
        switch (ctx.phase) {
            case 1: return 'Caloric surplus (+300 kcal). Focus on protein-rich whole foods. 1.6g protein/kg.';
            case 2: return 'Moderate surplus (+400 kcal). Introduce meal timing around workouts.';
            case 3: return 'Lean bulk (+350 kcal). Periodise carbs higher on training days.';
            case 4: return 'Fine-tuned surplus. Adjust macros monthly based on progress.';
            case 5: return 'Maintenance calories with high protein to preserve your dream physique.';
            default: return '';
        }
    } else {
        switch (ctx.phase) {
            case 1: return 'Mild deficit (-300 kcal). High protein (2g/kg). Reduce processed foods.';
            case 2: return 'Moderate deficit (-400 kcal). Increase fibre & vegetable volume.';
            case 3: return 'Sustained deficit (-350 kcal). Add refeed days 1x/week.';
            case 4: return 'Controlled deficit. Diet breaks every 8 weeks. Focus on sustainability.';
            case 5: return 'Reverse diet to maintenance. Sustain your results with balanced eating.';
            default: return '';
        }
    }
}

function getWorkoutFocus(ctx: PhaseContext): string {
    if (ctx.phase === 0) return 'Fitness assessment — identify baseline strength and mobility';

    const beginner = ctx.fitnessLevel === 'beginner';

    if (ctx.isGaining) {
        switch (ctx.phase) {
            case 1: return beginner
                ? 'Full body 3x/week. Master compound movements. Build habit consistency.'
                : 'Push/Pull/Legs 4x/week. Progressive overload on big lifts.';
            case 2: return 'Upper/Lower split 4x/week. Increase volume. Add isolation work.';
            case 3: return 'PPL 5x/week. Specialization for lagging muscle groups.';
            case 4: return 'Advanced PPL 5-6x/week. Periodised programming with deload weeks.';
            case 5: return 'Maintenance volume 4x/week. Focus on strength PRs and enjoyment.';
            default: return '';
        }
    } else {
        switch (ctx.phase) {
            case 1: return beginner
                ? 'Full body 3x/week + 20 min walks daily. Build movement habits.'
                : 'Full body 3x/week + 3x cardio (LISS 30 min).';
            case 2: return '3x strength + 3x mixed cardio (2 LISS + 1 HIIT). Increase daily steps.';
            case 3: return '4x strength + 2x HIIT. Preserve muscle while maximising fat loss.';
            case 4: return '4x strength + flexible cardio. Maintain intensity, reduce burnout risk.';
            case 5: return '3-4x strength + active lifestyle. Sustain results with enjoyable activity.';
            default: return '';
        }
    }
}

function getMacroSplit(ctx: PhaseContext, dailyCals: number): { protein: number; carbs: number; fat: number } {
    if (ctx.isGaining) {
        return { protein: 30, carbs: 45, fat: 25 };
    } else {
        return { protein: 35, carbs: 40, fat: 25 };
    }
}

// ─── Daily calorie calculator per phase ─────────────────────

function computePhaseCals(
    currentWeight: number,
    dreamWeight: number,
    phase: number,
    totalPhases: number,
    activityLevel: string | null,
    isGaining: boolean,
): number {
    // Base TDEE estimation
    const actMultiplier: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    const mult = actMultiplier[activityLevel ?? 'moderate'] ?? 1.55;
    const t = clamp(phase / totalPhases, 0, 1);
    const weight = lerp(currentWeight, dreamWeight, easeOutCubic(t));
    const baseTDEE = weight * 22 * mult; // rough estimate

    if (phase === 0) return Math.round(baseTDEE);
    if (phase === totalPhases) return Math.round(baseTDEE); // maintenance at dream

    if (isGaining) {
        const surplus = phase <= 2 ? 300 : 350;
        return Math.round(baseTDEE + surplus);
    } else {
        const deficit = phase <= 2 ? 350 : 300;
        return Math.round(baseTDEE - deficit);
    }
}

// ═══════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════

export interface SimulationInput {
    profile: OnboardingProfile;
    dreamBodyStyle?: DreamBodyStyle | null;
    dreamBodyDescription?: string | null;
    targetBFPercent?: number | null;
}

export function generateBodySimulation(input: SimulationInput): MilestonePhase[] {
    const { profile, dreamBodyStyle, targetBFPercent } = input;

    const h = profile.height_cm ?? 170;
    const w = profile.weight_kg ?? 70;
    const dreamW = profile.dream_weight_kg ?? w;
    const isFemale = profile.biological_gender === 'female';

    // Detect body type
    const btResult = detectBodyType(profile);
    const bodyType: BodyType = btResult?.dominant ?? 'mesomorph';

    // Compute current & dream body params
    const currentParams = computeCurrentParams(profile, btResult, isFemale);
    const dreamParams = computeDreamParams(profile, btResult, isFemale, dreamBodyStyle ?? null, targetBFPercent ?? null);

    const currentBF = btResult?.estimatedBF ?? (isFemale ? 28 : 18);
    const dreamBF = targetBFPercent ?? (isFemale ? 20 : 12);
    const isGaining = dreamW >= w;

    const totalPhases = 5; // 0..5
    const rates = getChangeRates(bodyType, isFemale);

    const phases: MilestonePhase[] = [];

    for (let i = 0; i <= totalPhases; i++) {
        const t = i / totalPhases;
        const months = i < MILESTONE_MONTHS.length ? MILESTONE_MONTHS[i] : (i === totalPhases ? 18 : 12);

        // Weight interpolation with easing
        const estWeight = lerp(w, dreamW, easeOutCubic(t));

        // BF% interpolation
        const estBF = lerp(currentBF, dreamBF, easeOutCubic(t));

        // Body params interpolation
        const params = interpolateParams(currentParams, dreamParams, t);

        const ctx: PhaseContext = {
            isGaining,
            bodyType,
            isFemale,
            fitnessLevel: profile.dream_fitness_level,
            phase: i,
        };

        const dailyCals = computePhaseCals(w, dreamW, i, totalPhases, profile.activity_level, isGaining);

        phases.push({
            phase: i,
            label: PHASE_LABELS[i] ?? `Phase ${i}`,
            monthsFromNow: months,
            estimatedWeightKg: Math.round(estWeight * 10) / 10,
            estimatedBFPercent: Math.round(clamp(estBF, 3, 50) * 10) / 10,
            bodyParams: params,
            dietFocus: getDietFocus(ctx),
            workoutFocus: getWorkoutFocus(ctx),
            motivationalMessage: MOTIVATIONAL_MESSAGES[i] ?? '🎯 Keep pushing toward your goal!',
            macroSplit: getMacroSplit(ctx, dailyCals),
            dailyCalories: dailyCals,
        });
    }

    return phases;
}

/** Quick helper to get just the dream body style from a text description */
export function inferDreamBodyStyle(description: string | null): DreamBodyStyle {
    if (!description) return 'lean_athletic';
    const d = description.toLowerCase();
    if (d.includes('muscul') || d.includes('bulk') || d.includes('big')) return 'muscular';
    if (d.includes('tone') || d.includes('defin') || d.includes('sculpt')) return 'toned';
    if (d.includes('slim') || d.includes('thin') || d.includes('lean') && d.includes('light')) return 'slim';
    if (d.includes('power') || d.includes('strong') || d.includes('lift')) return 'powerlifter';
    if (d.includes('swim')) return 'swimmer';
    if (d.includes('run') || d.includes('marathon') || d.includes('endur')) return 'runner';
    if (d.includes('lean') || d.includes('athlet') || d.includes('fit')) return 'lean_athletic';
    return 'custom';
}
