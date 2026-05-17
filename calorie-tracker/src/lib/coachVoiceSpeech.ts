/**
 * Shared TTS voice selection — mirrors onboarding coach narration preference ranking.
 */

export type CoachSpeechVoice = {
    identifier?: string;
    language?: string;
    name?: string;
    quality?: string;
};

export function pickBestCoachVoice(voices: CoachSpeechVoice[]): string | undefined {
    if (!voices?.length) return undefined;

    const scoreVoice = (voice: CoachSpeechVoice): number => {
        const language = (voice.language ?? '').toLowerCase();
        const name = (voice.name ?? '').toLowerCase();
        const identifier = (voice.identifier ?? '').toLowerCase();
        const quality = (voice.quality ?? '').toLowerCase();

        let score = 0;
        if (language.startsWith('en-us')) score += 10;
        else if (language.startsWith('en')) score += 6;

        if (quality.includes('enhanced') || quality.includes('premium')) score += 8;
        if (name.includes('siri') || identifier.includes('siri')) score += 5;
        if (name.includes('natural') || identifier.includes('natural')) score += 4;
        if (name.includes('neural') || identifier.includes('neural')) score += 4;
        if (name.includes('google') || identifier.includes('google')) score += 2;

        return score;
    };

    const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return sorted[0]?.identifier;
}
