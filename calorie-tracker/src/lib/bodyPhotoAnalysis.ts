/**
 * Body Photo Analysis — Gemini Vision API
 *
 * Sends a body photo to Gemini 2.0 Flash and returns structured
 * fitness insights: estimated BF%, body type, muscle definition,
 * posture observations, and actionable recommendations.
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_ENDPOINT =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Types ────────────────────────────────────────────────────

export interface BodyPhotoAnalysis {
    estimatedBFPercent: number | null;
    bodyTypeEstimate: string | null;
    muscleDefinition: 'low' | 'moderate' | 'high' | null;
    posture: string | null;
    keyObservations: string[];
    recommendations: string[];
    confidence: 'low' | 'medium' | 'high';
    analyzedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Converts an ArrayBuffer to a base64 string without overflowing
 * the call stack (chunks of 32 KB at a time).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const CHUNK = 0x8000; // 32 768 bytes per chunk
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
        binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
}

const ANALYSIS_PROMPT =
    "You are a professional fitness coach and body composition specialist. " +
    "Analyze this body photo and provide a JSON response with: " +
    "estimatedBFPercent (number or null if unsure), " +
    "bodyTypeEstimate (string: 'ectomorph', 'mesomorph', or 'endomorph'), " +
    "muscleDefinition ('low', 'moderate', or 'high'), " +
    "posture (brief description string), " +
    "keyObservations (array of 2-4 strings), " +
    "recommendations (array of 2-3 actionable fitness/diet tips), " +
    "confidence ('low', 'medium', or 'high'). " +
    "Respond with ONLY valid JSON, no markdown.";

// ─── Guard helpers ────────────────────────────────────────────

function isValidMuscleDef(v: unknown): v is 'low' | 'moderate' | 'high' {
    return v === 'low' || v === 'moderate' || v === 'high';
}

function isValidConfidence(v: unknown): v is 'low' | 'medium' | 'high' {
    return v === 'low' || v === 'medium' || v === 'high';
}

function toStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === 'string');
}

// ─── Main Export ──────────────────────────────────────────────

/**
 * Analyzes a body photo using Gemini Vision and returns structured insights.
 * Returns null if the API call fails or the response cannot be parsed.
 *
 * API call structure:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=KEY
 *   Body: { contents: [{ parts: [{ inlineData: { mimeType, data } }, { text }] }] }
 */
export async function analyzeBodyPhoto(localUri: string): Promise<BodyPhotoAnalysis | null> {
    if (!GEMINI_API_KEY) {
        console.warn('bodyPhotoAnalysis: EXPO_PUBLIC_GEMINI_API_KEY is not set');
        return null;
    }

    try {
        // 1. Fetch image bytes
        const imageResponse = await fetch(localUri);
        if (!imageResponse.ok) {
            console.error('bodyPhotoAnalysis: could not fetch image', imageResponse.status);
            return null;
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);

        // 2. Detect MIME type from URI extension; default to jpeg
        const ext = localUri.split('?')[0].split('.').pop()?.toLowerCase();
        const mimeType: string =
            ext === 'png' ? 'image/png' :
            ext === 'webp' ? 'image/webp' :
            ext === 'heic' ? 'image/heic' :
            'image/jpeg';

        // 3. Call Gemini Vision API
        const requestBody = {
            contents: [{
                parts: [
                    {
                        inlineData: {
                            mimeType,
                            data: base64Data,
                        },
                    },
                    { text: ANALYSIS_PROMPT },
                ],
            }],
        };

        const apiResponse = await fetch(GEMINI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!apiResponse.ok) {
            const errText = await apiResponse.text().catch(() => '');
            console.error('bodyPhotoAnalysis: Gemini API error', apiResponse.status, errText);
            return null;
        }

        const apiJson = await apiResponse.json();

        // 4. Extract the text content from Gemini response
        const rawText: string =
            apiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        if (!rawText) {
            console.error('bodyPhotoAnalysis: empty response from Gemini');
            return null;
        }

        // 5. Strip optional markdown fences then parse JSON
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;

        // 6. Build a validated BodyPhotoAnalysis object
        const analysis: BodyPhotoAnalysis = {
            estimatedBFPercent:
                typeof parsed.estimatedBFPercent === 'number' ? parsed.estimatedBFPercent : null,
            bodyTypeEstimate:
                typeof parsed.bodyTypeEstimate === 'string' ? parsed.bodyTypeEstimate : null,
            muscleDefinition: isValidMuscleDef(parsed.muscleDefinition) ? parsed.muscleDefinition : null,
            posture:
                typeof parsed.posture === 'string' ? parsed.posture : null,
            keyObservations: toStringArray(parsed.keyObservations),
            recommendations: toStringArray(parsed.recommendations),
            confidence: isValidConfidence(parsed.confidence) ? parsed.confidence : 'low',
            analyzedAt: new Date().toISOString(),
        };

        return analysis;
    } catch (err: unknown) {
        console.error('bodyPhotoAnalysis: unexpected error', err instanceof Error ? err.message : err);
        return null;
    }
}
