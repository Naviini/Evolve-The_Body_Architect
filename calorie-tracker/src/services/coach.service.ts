/**
 * Emotional-support fitness coach — OpenAI chat with local fitness context.
 * Matches scan.service pattern (EXPO_PUBLIC_OPENAI_KEY). Falls back offline when unset.
 * For production, proxy calls through your backend to keep keys private.
 */

import { Platform } from 'react-native';

import {
    getWorkoutStreak,
    getWorkoutHistory,
    getUserRewards,
    getUserHealthProfileForProcessing,
} from '@/src/lib/database';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

function isOpenAIConfigured(): boolean {
    return Boolean(OPENAI_API_KEY) && OPENAI_API_KEY.startsWith('sk-');
}

/** RN multipart uploads on Android often need a file:// or content:// URI, not a bare path. */
function normalizeRecordingUriForUpload(uri: string): string {
    const u = uri.trim();
    if (!u) return u;
    if (Platform.OS === 'android') {
        if (u.startsWith('file://') || u.startsWith('content://')) return u;
        if (u.startsWith('/')) return `file://${u}`;
    }
    return u;
}

/** Serious distress — do not route to the model; show humane boilerplate + resources */
const CRISIS_REGEX =
    /\b(suicid|kill\s+myself|end\s+my\s+life|end\s+it\s+all|self[\s-]?harm|hurt\s+myself|want\s+to\s+die|don't\s+want\s+to\s+live|do\s+not\s+want\s+to\s+live)\b/i;

export const CRISIS_RESPONSE = `I'm really glad you reached out. What you're describing sounds overwhelming, and you deserve real human support — not just an app.

This coach isn't able to help with crisis situations. If you're in immediate danger, please contact local emergency services right away.

If you're struggling emotionally, consider reaching out to a trusted person or a crisis line in your country (many offer confidential chat or calls 24/7).

When you're ready to talk movement or habits another time, I'll be here.`;

const FALLBACK_REPLIES = [
    "Rough patches happen — they don't erase your progress. What's one tiny win we could aim for today, even five minutes of walking?",
    "You showed up before; that muscle memory counts for something. Let's shrink today's goal until it feels doable. What feels realistic?",
    "Motivation dips — discipline doesn't have to. Can we pick one kind choice for your future self (water, sleep, or one nutritious meal)?",
    'Plateaus can mess with your head — they often precede a break-through. Want to vent first, or brainstorm one tweak we try this week?',
    "You're allowed to restart without guilt. Shall we frame tomorrow as day one again — same mountain, fresh footing?",
];

const SYSTEM_PROMPT = `You are Evolve Coach — a warm, concise fitness mindset companion inside a calorie & workout app.

Goals:
- Validate emotions without toxic positivity; normalize setbacks on long journeys.
- Connect encouragement to their actual habits (training streaks, nutrition rhythm), conservatively — avoid sounding invasive or preachy.
- Offer practical micro-steps (today/tomorrow), habit framing, self-compassion, optional reflective questions.
- Mirror sentiment implicitly — acknowledge exhaustion, guilt, frustration, pride, anxiety — tone adapts to the user's wording.

Strict boundaries:
- You are NOT a therapist or clinician. Do not diagnose mental or physical conditions or prescribe supplements/medication.
- No guilt trips about appearance or moral judgments around food.
- Keep replies readable on mobile: ~120–280 words unless the user asks for depth.
- If asked for extreme diets, punishment workouts, or dangerous shortcuts — refuse gently and suggest sustainable pacing.

Respond ONLY as plain conversational prose — no markdown headings or numbered markdown lists unless minimal bullets truly help (prefer short paragraphs).`;

interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

interface OpenAIMessage {
    role: string;
    content: string;
}

interface OpenAIChoice {
    message: OpenAIMessage;
}

interface OpenAIResponse {
    choices?: OpenAIChoice[];
}

export type CoachReplySource = 'ai' | 'fallback' | 'crisis';

export interface CoachReplyResult {
    text: string;
    source: CoachReplySource;
}

export async function buildCoachContextBlock(userId: string): Promise<string> {
    const [streak, history, rewards, profile] = await Promise.all([
        getWorkoutStreak(userId).catch(() => 0),
        getWorkoutHistory(userId, 10).catch(() => []),
        getUserRewards(userId).catch(() => null),
        getUserHealthProfileForProcessing(userId).catch(() => null),
    ]);

    const completedDates = history
        .filter((s) => Boolean(s.completedAt))
        .map((s) => s.dayDate)
        .slice(0, 5);

    const lines: string[] = [
        `Workout streak (days with completed sessions, trailing calendar): ${streak}`,
        rewards
            ? `Gamification snapshot — level ${rewards.level} (${rewards.levelName ?? ''}), total workouts counted ${rewards.totalWorkoutsCompleted}.`
            : 'No rewards row yet — possibly early onboarding.',
        completedDates.length > 0
            ? `Most recent completed workout dates (YYYY-MM-DD): ${completedDates.join(', ')}`
            : 'No completed workouts logged recently in history snapshot.',
    ];

    if (profile) {
        if (profile.dream_weight_kg != null) {
            lines.push(`Dream weight target (kg, user-entered): ${profile.dream_weight_kg}`);
        }
        if (profile.dream_fitness_level) {
            lines.push(`Dream fitness level descriptor: ${profile.dream_fitness_level}`);
        }
        if (profile.exercise_frequency) {
            lines.push(`Self-reported exercise frequency bucket: ${profile.exercise_frequency}`);
        }
        if (profile.stress_level != null) {
            lines.push(`Self-reported stress slider (1–5): ${profile.stress_level}`);
        }
        if (profile.activity_level) {
            lines.push(`General activity level: ${profile.activity_level}`);
        }
    }

    return lines.join('\n');
}

function pickFallback(userMessage: string, streak: number): string {
    const idx =
        (userMessage.length + streak + FALLBACK_REPLIES.length * 7) %
        FALLBACK_REPLIES.length;
    let base = FALLBACK_REPLIES[idx]!;
    if (streak > 1) {
        base += ` (You've stacked ${streak} streak days before — that resilience still belongs to you.)`;
    }
    base +=
        "\n\n— Offline coach note: connect OPENAI API key for full conversational replies.";
    return base;
}

function streakFromContext(block: string): number {
    const m = block.match(/trailing calendar\):\s*(\d+)/i);
    return m ? parseInt(m[1]!, 10) || 0 : 0;
}

async function callOpenAI(systemContent: string, turns: ChatTurn[]): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 450,
            temperature: 0.75,
            messages: [{ role: 'system', content: systemContent }, ...turns],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data: OpenAIResponse = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!raw) throw new Error('Empty assistant reply');
    return raw;
}

async function postWhisperTranscription(form: FormData): Promise<string> {
    if (!isOpenAIConfigured()) {
        throw new Error('Add EXPO_PUBLIC_OPENAI_KEY to use voice input');
    }

    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: form,
    });

    if (!response.ok) {
        const errText = await response.text();
        let detail = errText.slice(0, 400);
        try {
            const parsed = JSON.parse(errText) as { error?: { message?: string } };
            if (parsed?.error?.message) detail = parsed.error.message;
        } catch {
            /* keep trimmed raw */
        }
        if (response.status === 401) {
            throw new Error(
                'OpenAI rejected the API key. Check EXPO_PUBLIC_OPENAI_KEY and restart Expo after editing .env.'
            );
        }
        if (response.status === 429) {
            throw new Error('OpenAI rate limit — wait a moment and try voice again.');
        }
        throw new Error(`Transcription failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim() ?? '';
    if (!text) throw new Error('Nothing recognized — try again closer to the mic');
    return text;
}

/**
 * Transcribe a short voice memo via Whisper (same API key as chat).
 * Caller supplies MIME type / filename appropriate for the recorded file (React Native upload shape).
 */
export async function transcribeCoachAudio(params: {
    uri: string;
    mimeType: string;
    fileName: string;
}): Promise<string> {
    const { mimeType, fileName } = params;
    const uri = normalizeRecordingUriForUpload(params.uri);
    if (!uri?.trim()) throw new Error('Missing recording');

    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('file', {
        uri,
        type: mimeType,
        name: fileName,
    } as unknown as Blob);

    return postWhisperTranscription(form);
}

/**
 * Web / browser: upload a recorded Blob (e.g. from MediaRecorder) to Whisper.
 */
export async function transcribeCoachAudioBlob(blob: Blob, fileName: string): Promise<string> {
    if (!blob || blob.size < 32) {
        throw new Error('No audio captured — allow the microphone and speak for at least a second.');
    }

    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('file', blob, fileName);

    return postWhisperTranscription(form);
}

export async function generateCoachAssistantReply(
    userId: string,
    userMessage: string,
    conversationIncludingLatestUser: ChatTurn[]
): Promise<CoachReplyResult> {
    const trimmed = userMessage.trim();
    if (!trimmed) {
        return { text: 'Tell me what’s on your mind — rough patch, proud moment, or something stuck?', source: 'fallback' };
    }

    if (CRISIS_REGEX.test(trimmed)) {
        return { text: CRISIS_RESPONSE, source: 'crisis' };
    }

    const contextBlock = await buildCoachContextBlock(userId);
    const streak = streakFromContext(contextBlock);

    const systemBundled = `${SYSTEM_PROMPT}

---

Private personalization context (do not quote verbatim; weave subtly):
${contextBlock}`;

    const messagesForApi: ChatTurn[] = conversationIncludingLatestUser.slice(-24);

    if (!isOpenAIConfigured()) {
        return { text: pickFallback(trimmed, streak), source: 'fallback' };
    }

    try {
        const text = await callOpenAI(systemBundled, messagesForApi);
        return { text, source: 'ai' };
    } catch (e) {
        console.warn('Coach OpenAI failed, using fallback:', e);
        return { text: pickFallback(trimmed, streak), source: 'fallback' };
    }
}
