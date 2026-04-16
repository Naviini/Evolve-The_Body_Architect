/**
 * Body Type Detection Engine
 *
 * Detects somatotype (ectomorph / mesomorph / endomorph) from OnboardingProfile
 * using a 4-layer hybrid algorithm:
 *
 *   Layer 1 (25%) — Structural:  Heath-Carter HWR ectomorphy formula
 *   Layer 2 (40%) — Composition: US Navy Body Fat % + wrist frame ratio
 *   Layer 3 (20%) — Lifestyle:   Activity / work / exercise signals
 *   Layer 4 (15%) — Metabolic:   Diet / sleep / stress / blood markers
 *
 * Falls back gracefully to a 3-layer BMI model when circumference data is absent.
 *
 * References:
 *   Heath & Carter (1967) — somatotype rating method
 *   US Navy (Hodgdon & Beckett 1984) — body fat circumference formula
 *   Sheldon (1940) — wrist-to-height frame size ratio
 */

import { OnboardingProfile, BodyType, BodyTypeResult, FrameSize } from '@/src/types';

// ─── Helpers ────────────────────────────────────────────────
function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}

function normalise(ecto: number, meso: number, endo: number) {
    const total = ecto + meso + endo;
    if (total === 0) return { ecto: 33, meso: 34, endo: 33 };
    return {
        ecto: Math.round((ecto / total) * 100),
        meso: Math.round((meso / total) * 100),
        endo: Math.round((endo / total) * 100),
    };
}

// ─── Layer 1: Structural (Heath-Carter HWR) ─────────────────
function structuralScore(heightCm: number, weightKg: number): { ecto: number; meso: number; endo: number } {
    const hwr = heightCm / Math.pow(weightKg, 1 / 3);

    // Heath-Carter ectomorphy formula
    let ectoRaw: number;
    if (hwr >= 40.75) ectoRaw = 0.732 * hwr - 28.58;
    else if (hwr > 38.25) ectoRaw = 0.463 * hwr - 17.63;
    else ectoRaw = 0.1;

    // Normalise to 0–1 (max meaningful ectomorphy ≈ 7)
    const ectoSig = clamp(ectoRaw / 7, 0, 1);

    // BMI for endo/meso signal
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    let bmiBias = 0;
    if (bmi < 18.5) bmiBias = -0.4;       // lean → ecto
    else if (bmi < 22) bmiBias = -0.1;
    else if (bmi < 27.5) bmiBias = 0.2;   // meso zone
    else if (bmi < 32) bmiBias = 0.5;     // endo/meso
    else bmiBias = 0.8;                   // strong endo

    const ecto = ectoSig * 0.7;
    const endo = clamp(bmiBias, 0, 1) * 0.6;
    const meso = clamp(1 - ectoSig - clamp(bmiBias, 0, 1) * 0.5, 0.1, 1);

    return { ecto, meso, endo };
}

// ─── Layer 2: Composition (US Navy BF% + wrist frame) ───────
function compositionScore(
    heightCm: number,
    waistCm: number | null,
    hipCm: number | null,
    neckCm: number | null,
    wristCm: number | null,
    isFemale: boolean,
): { ecto: number; meso: number; endo: number; estimatedBF: number | null; frameSize: FrameSize | null } | null {

    // Need at least waist + neck for the Navy formula
    if (!waistCm || !neckCm) return null;

    // US Navy body fat %
    let bf: number;
    if (isFemale && hipCm) {
        const denom = Math.log10(waistCm + hipCm - neckCm);
        bf = 163.205 * denom - 97.684 * Math.log10(heightCm) - 78.387;
    } else {
        const diff = waistCm - neckCm;
        if (diff <= 0) return null;
        bf = 86.010 * Math.log10(diff) - 70.041 * Math.log10(heightCm) + 36.76;
    }
    bf = clamp(bf, 3, 60);

    // BF% → ecto / meso / endo raw signal
    const lowBF = isFemale ? 20 : 10;
    const mesoMax = isFemale ? 28 : 18;
    const highBF = isFemale ? 35 : 25;

    let ecto = 0, meso = 0, endo = 0;
    if (bf < lowBF) {
        ecto = clamp((lowBF - bf) / lowBF, 0, 1);
        meso = 0.4;
    } else if (bf <= mesoMax) {
        meso = 0.8;
        ecto = 0.2;
    } else if (bf <= highBF) {
        meso = 0.5;
        endo = clamp((bf - mesoMax) / (highBF - mesoMax), 0, 1) * 0.6;
    } else {
        endo = clamp((bf - highBF) / 20, 0, 1) * 0.9 + 0.4;
        meso = 0.2;
    }

    // Wrist frame → reinforces ecto or meso
    let frameSize: FrameSize | null = null;
    if (wristCm) {
        const ratio = wristCm / heightCm;
        if (ratio < 0.100) { frameSize = 'small'; ecto += 0.25; }
        else if (ratio <= 0.115) { frameSize = 'medium'; meso += 0.15; }
        else { frameSize = 'large'; meso += 0.20; endo += 0.10; }
    }

    return { ecto, meso, endo, estimatedBF: Math.round(bf * 10) / 10, frameSize };
}

// ─── Layer 3: Lifestyle ──────────────────────────────────────
function lifestyleScore(p: OnboardingProfile): { ecto: number; meso: number; endo: number } {
    let ecto = 0.3, meso = 0.3, endo = 0.3;

    switch (p.activity_level) {
        case 'very_active': meso += 0.5; endo -= 0.3; break;
        case 'active': meso += 0.3; endo -= 0.1; break;
        case 'moderate': break;
        case 'light': endo += 0.2; meso -= 0.1; break;
        case 'sedentary': endo += 0.4; meso -= 0.2; break;
    }

    switch (p.work_type) {
        case 'physical': meso += 0.3; break;
        case 'standing': meso += 0.15; break;
        case 'desk': endo += 0.2; break;
        case 'retired': endo += 0.15; break;
    }

    const ex = p.exercise_frequency ?? '';
    if (ex.includes('daily') || ex.includes('5') || ex.includes('6') || ex.includes('7')) {
        meso += 0.35;
    } else if (ex.includes('never') || ex.includes('0')) {
        endo += 0.3;
    } else if (ex.includes('1') || ex.includes('2')) {
        endo += 0.1;
    } else if (ex.includes('3') || ex.includes('4')) {
        meso += 0.1;
    }

    return { ecto: clamp(ecto, 0, 1), meso: clamp(meso, 0, 1), endo: clamp(endo, 0, 1) };
}

// ─── Layer 4: Metabolic ──────────────────────────────────────
function metabolicScore(p: OnboardingProfile): { ecto: number; meso: number; endo: number } {
    let ecto = 0.3, meso = 0.3, endo = 0.3;

    switch (p.diet_type) {
        case 'keto': case 'paleo': meso += 0.25; ecto += 0.1; break;
        case 'mediterranean': meso += 0.2; endo -= 0.05; break;
        case 'vegan': case 'vegetarian': ecto += 0.2; break;
        case 'omnivore': break;
    }

    // Cuisine preferences can subtly influence metabolic tendencies.
    const cuisinePrefs = (p.cuisine_preferences ?? []).map(c => c.toLowerCase());
    const hasFlexibleCuisinePreference = cuisinePrefs.includes('other') || cuisinePrefs.includes('no preference');

    if (hasFlexibleCuisinePreference) {
        // User is open to non-listed cuisines: keep metabolic cuisine weighting light and adaptable.
        meso += 0.02;
    } else {
        if (cuisinePrefs.includes('sri lankan')) {
            meso += 0.08;
            ecto += 0.04;
        }
    }

    switch (p.snacking_habit) {
        case 'always': endo += 0.3; break;
        case 'often': endo += 0.15; break;
        case 'never': ecto += 0.2; meso += 0.1; break;
    }

    const sleep = p.sleep_hours ?? 7;
    if (sleep < 6) { endo += 0.25; }
    else if (sleep >= 7 && sleep <= 9) { meso += 0.1; ecto += 0.05; }

    const stress = p.stress_level ?? 3;
    if (stress >= 4) { endo += 0.2; }
    else if (stress <= 2) { meso += 0.1; }

    if (p.blood_sugar_level === 'high') endo += 0.2;
    if (p.cholesterol_level === 'high') endo += 0.15;

    const familyHistory = (p.family_history ?? []).map(v => v.toLowerCase());
    const hasNeutralFamilyHistory =
        familyHistory.includes('none / unknown') ||
        familyHistory.includes('none/unknown') ||
        familyHistory.includes('none unknown') ||
        familyHistory.includes('none') ||
        familyHistory.includes('unknown') ||
        familyHistory.includes('other');

    if (!hasNeutralFamilyHistory) {
        if (familyHistory.includes('diabetes')) endo += 0.08;
        if (familyHistory.includes('hypertension')) endo += 0.06;
        if (familyHistory.includes('heart disease')) endo += 0.06;
        if (familyHistory.includes('obesity')) endo += 0.08;
        if (familyHistory.includes('stroke')) endo += 0.05;
    }

    switch (p.smoking_status) {
        case 'daily': ecto += 0.1; break; // nicotine suppresses appetite
        case 'never': meso += 0.05; break;
    }

    if (p.alcohol_frequency === 'daily') endo += 0.2;
    else if (p.alcohol_frequency === 'never') meso += 0.05;

    return { ecto: clamp(ecto, 0, 1), meso: clamp(meso, 0, 1), endo: clamp(endo, 0, 1) };
}

// ─── Gender correction (research norm: females score endo+) ──
function genderCorrect(scores: { ecto: number; meso: number; endo: number }, isFemale: boolean) {
    if (!isFemale) return scores;
    return {
        ecto: scores.ecto * 0.9,
        meso: scores.meso * 0.95,
        endo: scores.endo * 1.2,
    };
}

// ─── Insight generator ───────────────────────────────────────
function buildInsights(result: Omit<BodyTypeResult, 'insights'>, p: OnboardingProfile): string[] {
    const tips: string[] = [];
    const { dominant, scores, estimatedBF, frameSize } = result;

    if (dominant === 'ectomorph') {
        tips.push('🔥 Your fast metabolism is a gift — fuel it with calorie-dense, nutrient-rich foods.');
        tips.push('💪 Focus on compound lifting (squats, deadlifts) to build mass more efficiently.');
        tips.push('🍚 Prioritise complex carbs like oats, rice, and sweet potato around workouts.');
        if (scores.meso > 30) tips.push('⚡ Your meso traits mean you can build muscle faster than typical ectomorphs.');
    } else if (dominant === 'mesomorph') {
        tips.push('💪 You\'re built for performance — strength and muscle respond quickly to training.');
        tips.push('⚖️ Balance your protein intake (~1.6–2g/kg bodyweight) to maintain your build.');
        tips.push('🏋️ Both cardio and weight training work well for you — mix them for best results.');
        if (scores.endo > 25) tips.push('🥗 Watch refined carb intake — your endo tendency can add fat if training drops.');
    } else {
        tips.push('🏃 Cardio is your best friend — aim for 30+ min, 4–5 days a week.');
        tips.push('🥗 Your body stores energy readily — prioritise whole foods and limit processed sugars.');
        tips.push('🍽️ Smaller, frequent meals can help manage blood sugar and energy levels.');
        if (scores.meso > 25) tips.push('🏋️ Resistance training will help you build a leaner physique faster.');
    }

    if (estimatedBF !== null) {
        tips.push(`📊 Estimated body fat: ~${estimatedBF}% (US Navy method).`);
    }
    if (frameSize === 'small') tips.push('🦴 Small frame: lighter bone structure — focus on nutrition density over volume.');
    if (frameSize === 'large') tips.push('🦴 Large frame: strong bone structure — great foundation for strength sports.');

    if (!p.waist_cm || !p.neck_cm) {
        tips.push('📏 Add your waist & neck measurements in your profile to improve accuracy to ~85%.');
    }

    return tips;
}

// ─── Main Export ─────────────────────────────────────────────
export function detectBodyType(profile: OnboardingProfile): BodyTypeResult | null {
    const h = profile.height_cm;
    const w = profile.weight_kg;
    if (!h || !w || h < 100 || w < 20) return null; // not enough data

    const isFemale = profile.biological_gender === 'female';

    // Weights per layer
    const W = {
        structural: profile.waist_cm && profile.neck_cm ? 0.25 : 0.40,
        composition: profile.waist_cm && profile.neck_cm ? 0.40 : 0,
        lifestyle: profile.waist_cm && profile.neck_cm ? 0.20 : 0.35,
        metabolic: profile.waist_cm && profile.neck_cm ? 0.15 : 0.25,
    };

    // Layer scores
    const L1 = structuralScore(h, w);
    const L2 = compositionScore(h, profile.waist_cm, profile.hip_cm, profile.neck_cm, profile.wrist_cm, isFemale);
    const L3 = lifestyleScore(profile);
    const L4 = metabolicScore(profile);

    // Weighted sum
    let rawEcto = L1.ecto * W.structural + L3.ecto * W.lifestyle + L4.ecto * W.metabolic;
    let rawMeso = L1.meso * W.structural + L3.meso * W.lifestyle + L4.meso * W.metabolic;
    let rawEndo = L1.endo * W.structural + L3.endo * W.lifestyle + L4.endo * W.metabolic;

    if (L2) {
        rawEcto += L2.ecto * W.composition;
        rawMeso += L2.meso * W.composition;
        rawEndo += L2.endo * W.composition;
    }

    // Gender correction
    const corrected = genderCorrect({ ecto: rawEcto, meso: rawMeso, endo: rawEndo }, isFemale);

    // Normalise to percentages
    const scores = normalise(corrected.ecto, corrected.meso, corrected.endo);

    // Dominant type
    const entries = [
        { type: 'ectomorph' as BodyType, score: scores.ecto },
        { type: 'mesomorph' as BodyType, score: scores.meso },
        { type: 'endomorph' as BodyType, score: scores.endo },
    ].sort((a, b) => b.score - a.score);

    const dominant = entries[0].type;
    const second = entries[1];

    // Blend detection: top two within 18%
    const BLEND_NAMES: Record<string, string> = {
        'mesomorph-ectomorph': 'Meso-Ectomorph',
        'ectomorph-mesomorph': 'Meso-Ectomorph',
        'mesomorph-endomorph': 'Meso-Endomorph',
        'endomorph-mesomorph': 'Meso-Endomorph',
        'ectomorph-endomorph': 'Ecto-Endomorph',
        'endomorph-ectomorph': 'Ecto-Endomorph',
    };
    const blend = entries[0].score - second.score <= 18
        ? (BLEND_NAMES[`${dominant}-${second.type}`] ?? null)
        : null;

    const confidence: 'low' | 'medium' | 'high' = L2
        ? 'high'
        : profile.activity_level && profile.diet_type
            ? 'medium'
            : 'low';

    const partial: Omit<BodyTypeResult, 'insights'> = {
        dominant,
        blend,
        scores,
        estimatedBF: L2?.estimatedBF ?? null,
        frameSize: L2?.frameSize ?? null,
        confidence,
    };

    return {
        ...partial,
        insights: buildInsights(partial, profile),
    };
}
