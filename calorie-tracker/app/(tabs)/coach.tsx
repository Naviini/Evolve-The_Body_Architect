/**
 * Mindset Coach — sentiment-aware AI companion for fitness ups & downs.
 * Uses OPENAI via coach.service; messages persist locally in SQLite.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography, Shadows, TAB_SCROLL_GUTTER } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import { useThemedAlert } from '@/src/contexts/ThemedAlertContext';
import {
    getCoachChatMessages,
    appendCoachChatMessage,
    clearCoachChatMessages,
} from '@/src/lib/database';
import {
    generateCoachAssistantReply,
    CRISIS_RESPONSE,
    transcribeCoachAudio,
    transcribeCoachAudioBlob,
} from '@/src/services/coach.service';
import type { CoachChatMessage } from '@/src/types';
import { useAppStyles } from '@/hooks/useAppStyles';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTabEntranceAnimation } from '@/hooks/useTabEntranceAnimation';
import { ScreenTitleRow } from '@/components/ui/screen-title-row';
import {
    useAudioRecorder,
    RecordingPresets,
    useAudioRecorderState,
    setAudioModeAsync,
    requestRecordingPermissionsAsync,
    setIsAudioActiveAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { VoiceRecordingOverlay } from '@/components/coach/VoiceRecordingOverlay';
import { FitBotCoachCompanion } from '@/components/fitbot/FitBotCoachCompanion';
import { pickBestCoachVoice, type CoachSpeechVoice } from '@/src/lib/coachVoiceSpeech';

/** Enables native metering for voice-reactive UI + haptics */
const COACH_RECORDING_HIGH = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true as boolean,
};
const COACH_RECORDING_LOW = {
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true as boolean,
};

function pickWebRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
    ];
    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
}

function getBrowserAudioContextCtor(): typeof AudioContext | undefined {
    if (typeof globalThis === 'undefined') return undefined;
    const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    if (typeof AudioContext !== 'undefined') return AudioContext;
    return g.webkitAudioContext;
}

/** Map expo-audio metering (typically dBFS negatives) or normalized levels to 0–1 */
function meteringToLevel(raw: number | undefined): number {
    if (raw == null || !Number.isFinite(raw)) return 0;
    if (raw >= 0 && raw <= 1) return Math.min(1, Math.max(0, raw));
    const minDb = -58;
    const maxDb = -8;
    const clamped = Math.max(minDb, Math.min(maxDb, raw));
    return (clamped - minDb) / (maxDb - minDb);
}

const MOOD_CHIPS: { label: string; text: string }[] = [
    { label: 'Drained', text: "I've been feeling drained and it's hard to stay consistent with workouts." },
    { label: 'Guilty', text: 'I slipped up with food / missed sessions and I feel guilty about it.' },
    { label: 'Stuck', text: "I feel stuck — like I'm not seeing progress no matter what I do." },
    { label: 'Proud', text: 'Something went well today and I want to celebrate without losing momentum.' },
    { label: 'Anxious', text: "I'm anxious about my body or my goals and it's weighing on me." },
];

export default function CoachScreen() {
    const colors = useThemeColors();
    const styles = useAppStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { entranceStyle } = useTabEntranceAnimation();
    const router = useRouter();
    const { user } = useAuth();
    const { alert } = useThemedAlert();
    const userId = user?.id ?? 'demo-user';

    const [messages, setMessages] = useState<CoachChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const audioRecorder = useAudioRecorder(COACH_RECORDING_HIGH);
    const recorderState = useAudioRecorderState(audioRecorder, 55);

    const webRecorderRef = useRef<MediaRecorder | null>(null);
    const webStreamRef = useRef<MediaStream | null>(null);
    const webChunksRef = useRef<Blob[]>([]);
    const webStartedAtRef = useRef<number>(0);
    const webAudioContextRef = useRef<AudioContext | null>(null);
    const webAnalyserRef = useRef<AnalyserNode | null>(null);
    const webVoiceLevelRef = useRef(0);
    const nativeMeteringRef = useRef<number | undefined>(undefined);
    const smoothedVoiceRef = useRef(0);
    const prevSmoothedForHapticsRef = useRef(0);
    const lastVoiceHapticAtRef = useRef(0);

    nativeMeteringRef.current = recorderState.metering;

    const [isRecording, setIsRecording] = useState(false);
    const [voiceUiLevel, setVoiceUiLevel] = useState(0);
    const [voiceBusy, setVoiceBusy] = useState(false);
    /** Speak assistant replies aloud */
    const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
    const [ttsVoiceId, setTtsVoiceId] = useState<string | undefined>(undefined);
    /** Coach TTS is actively playing (Fit-BOT “talking” animation). */
    const [coachSpeaking, setCoachSpeaking] = useState(false);
    /** Hidden after dismiss until user leaves Coach and opens it again (or app returns foreground). */
    const [coachDisclaimerHidden, setCoachDisclaimerHidden] = useState(false);

    const loadMessages = useCallback(async () => {
        try {
            const rows = await getCoachChatMessages(userId);
            setMessages(rows);
        } catch (e) {
            console.warn('Coach history load failed:', e);
        }
    }, [userId]);

    useEffect(() => {
        Speech.getAvailableVoicesAsync()
            .then((list) => setTtsVoiceId(pickBestCoachVoice(list as CoachSpeechVoice[])))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!voiceReplyEnabled) {
            void Speech.stop();
            setCoachSpeaking(false);
        }
    }, [voiceReplyEnabled]);

    const dismissCoachDisclaimer = useCallback(() => {
        setCoachDisclaimerHidden(true);
    }, []);

    const teardownWebAudioAnalyser = useCallback(async () => {
        webVoiceLevelRef.current = 0;
        try {
            await webAudioContextRef.current?.close();
        } catch {
            /* already closed */
        }
        webAudioContextRef.current = null;
        webAnalyserRef.current = null;
    }, []);

    useEffect(() => {
        if (!isRecording || Platform.OS !== 'web') return;
        const analyser = webAnalyserRef.current;
        if (!analyser) return;
        const buf = new Uint8Array(analyser.fftSize);
        let frame = 0;
        const tick = () => {
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
                const v = (buf[i]! - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            webVoiceLevelRef.current = Math.min(1, rms * 5.8);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording) {
            smoothedVoiceRef.current = 0;
            prevSmoothedForHapticsRef.current = 0;
            lastVoiceHapticAtRef.current = 0;
            setVoiceUiLevel(0);
            return;
        }
        let frame = 0;
        const loop = () => {
            const raw =
                Platform.OS === 'web'
                    ? webVoiceLevelRef.current
                    : meteringToLevel(nativeMeteringRef.current);

            smoothedVoiceRef.current = smoothedVoiceRef.current * 0.78 + raw * 0.22;
            setVoiceUiLevel(smoothedVoiceRef.current);

            if (Platform.OS !== 'web') {
                const now = Date.now();
                const sm = smoothedVoiceRef.current;
                const prev = prevSmoothedForHapticsRef.current;
                const rising = sm - prev;
                prevSmoothedForHapticsRef.current = sm;
                if (rising > 0.06 && sm > 0.16 && now - lastVoiceHapticAtRef.current > 90) {
                    lastVoiceHapticAtRef.current = now;
                    void Haptics.impactAsync(
                        sm > 0.52
                            ? Haptics.ImpactFeedbackStyle.Medium
                            : Haptics.ImpactFeedbackStyle.Light
                    );
                }
            }

            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [isRecording]);

    useFocusEffect(
        useCallback(() => {
            setCoachDisclaimerHidden(false);
            loadMessages();
            return () => {
                Speech.stop();
                if (Platform.OS === 'web') {
                    try {
                        webRecorderRef.current?.stop();
                    } catch {
                        /* inactive */
                    }
                    webStreamRef.current?.getTracks().forEach((t) => t.stop());
                    webRecorderRef.current = null;
                    webStreamRef.current = null;
                    webChunksRef.current = [];
                    void teardownWebAudioAnalyser();
                } else {
                    if (audioRecorder.isRecording) {
                        void audioRecorder.stop();
                    }
                    setAudioModeAsync({
                        allowsRecording: false,
                        playsInSilentMode: true,
                        interruptionMode: 'mixWithOthers',
                        shouldPlayInBackground: false,
                        shouldRouteThroughEarpiece: false,
                    }).catch(() => {});
                }
            };
        }, [loadMessages, audioRecorder, teardownWebAudioAnalyser])
    );

    useEffect(() => {
        const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
        return () => clearTimeout(t);
    }, [messages.length, sending, isRecording, voiceBusy]);

    const speakCoachReply = useCallback(
        (text: string, source: string) => {
            if (!voiceReplyEnabled || source === 'crisis' || !text.trim()) return;
            Speech.stop();
            Speech.speak(text, {
                voice: ttsVoiceId,
                rate: Platform.OS === 'ios' ? 0.92 : 1.02,
                pitch: 1,
                onStart: () => setCoachSpeaking(true),
                onDone: () => setCoachSpeaking(false),
                onStopped: () => setCoachSpeaking(false),
                onError: () => setCoachSpeaking(false),
            });
        },
        [voiceReplyEnabled, ttsVoiceId]
    );

    const confirmClear = () => {
        const run = async () => {
            Speech.stop();
            await clearCoachChatMessages(userId);
            setMessages([]);
        };
        alert('Clear chat?', 'This removes messages from this device only.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => void run() },
        ]);
    };

    const send = async (textOverride?: string) => {
        const body = (textOverride ?? input).trim();
        if (!body || sending) return;

        setSending(true);
        setInput('');

        try {
            await appendCoachChatMessage(userId, 'user', body);
            const rowsAfterUser = await getCoachChatMessages(userId);
            setMessages(rowsAfterUser);

            const turns = rowsAfterUser.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }));

            const { text, source } = await generateCoachAssistantReply(userId, body, turns);

            await appendCoachChatMessage(userId, 'assistant', text);
            await loadMessages();

            speakCoachReply(text, source);

            if (source === 'crisis') {
                alert('Important', 'If you are in immediate danger, please contact local emergency services.');
            }
        } catch (e) {
            console.error(e);
            alert('Coach unavailable', 'Could not send your message. Try again.');
            await loadMessages();
        } finally {
            setSending(false);
        }
    };

    const setCoachAudioMode = async (forRecording: boolean) => {
        if (Platform.OS === 'web') return;
        await setAudioModeAsync({
            allowsRecording: forRecording,
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            /** Duck avoids session conflicts after TTS (expo-speech) or other app audio. */
            interruptionMode: forRecording ? 'duckOthers' : 'mixWithOthers',
            shouldRouteThroughEarpiece: false,
        });
    };

    /** iOS often returns OSStatus 561017449 if prepare runs before the audio session is settled. */
    const waitForIosAudioSession = () =>
        new Promise<void>((resolve) => {
            if (Platform.OS !== 'ios') {
                resolve();
                return;
            }
            setTimeout(resolve, 200);
        });

    const startVoiceRecording = async () => {
        if (sending || voiceBusy || isRecording) return;

        if (Platform.OS === 'web') {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                alert('Voice chat', 'This browser does not support microphone access.');
                return;
            }
            if (typeof MediaRecorder === 'undefined') {
                alert('Voice chat', 'MediaRecorder is not available. Try Chrome or Edge.');
                return;
            }
            try {
                Speech.stop();
                webChunksRef.current = [];
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                webStreamRef.current = stream;
                const mimeType = pickWebRecorderMimeType();
                const recorder = mimeType
                    ? new MediaRecorder(stream, { mimeType })
                    : new MediaRecorder(stream);
                webRecorderRef.current = recorder;
                webStartedAtRef.current = Date.now();
                recorder.ondataavailable = (ev: BlobEvent) => {
                    if (ev.data && ev.data.size > 0) webChunksRef.current.push(ev.data);
                };
                recorder.start(200);

                const Ctor = getBrowserAudioContextCtor();
                if (Ctor) {
                    try {
                        const ctx = new Ctor();
                        webAudioContextRef.current = ctx;
                        await ctx.resume().catch(() => {});
                        const src = ctx.createMediaStreamSource(stream);
                        const analyser = ctx.createAnalyser();
                        analyser.fftSize = 512;
                        analyser.smoothingTimeConstant = 0.72;
                        src.connect(analyser);
                        webAnalyserRef.current = analyser;
                    } catch (ctxErr) {
                        console.warn('Coach web analyser setup failed:', ctxErr);
                        await teardownWebAudioAnalyser();
                    }
                }

                if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate(18);
                }

                setIsRecording(true);
            } catch (e) {
                console.warn('Coach web recording failed:', e);
                webStreamRef.current?.getTracks().forEach((t) => t.stop());
                webStreamRef.current = null;
                webRecorderRef.current = null;
                webChunksRef.current = [];
                setIsRecording(false);
                alert(
                    'Voice chat',
                    'Could not use the microphone. Allow access when prompted and use https:// or localhost.'
                );
            }
            return;
        }

        try {
            Speech.stop();
            const perm = await requestRecordingPermissionsAsync();
            if (!perm.granted) {
                alert('Microphone', 'Allow microphone access to talk with the coach.');
                return;
            }

            if (audioRecorder.isRecording) {
                try {
                    await audioRecorder.stop();
                } catch {
                    /* already stopped */
                }
            }

            await setIsAudioActiveAsync(true);

            // Clear any half-set session (e.g. after TTS or tab blur) before recording.
            await setCoachAudioMode(false).catch(() => {});
            await waitForIosAudioSession();

            await setCoachAudioMode(true);
            await waitForIosAudioSession();

            const tryRecord = async () => {
                await audioRecorder.prepareToRecordAsync();
                audioRecorder.record();
                setIsRecording(true);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            };

            try {
                await tryRecord();
            } catch (firstErr) {
                console.warn('Coach recording HIGH_QUALITY prepare failed, retrying LOW_QUALITY:', firstErr);
                await setCoachAudioMode(false).catch(() => {});
                await waitForIosAudioSession();
                await setCoachAudioMode(true);
                await waitForIosAudioSession();
                await audioRecorder.prepareToRecordAsync(COACH_RECORDING_LOW);
                audioRecorder.record();
                setIsRecording(true);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (e) {
            console.warn('Coach voice recording failed:', e);
            setIsRecording(false);
            const hint =
                Platform.OS === 'ios'
                    ? ' Use a physical device (recording does not work in the iOS Simulator) and ensure Microphone is enabled in Settings → Privacy for this app.'
                    : '';
            alert(
                'Voice chat',
                `Could not start recording.${hint}`,
            );
            await setCoachAudioMode(false).catch(() => {});
        }
    };

    const stopVoiceRecordingAndSend = async () => {
        if (Platform.OS === 'web') {
            if (!isRecording && !webRecorderRef.current) return;

            const recorder = webRecorderRef.current;
            const stream = webStreamRef.current;
            const startedAt = webStartedAtRef.current;

            setIsRecording(false);
            setVoiceBusy(true);

            try {
                const elapsedSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;

                if (recorder && recorder.state !== 'inactive') {
                    await new Promise<void>((resolve, reject) => {
                        const done = () => resolve();
                        recorder.addEventListener('stop', done, { once: true });
                        recorder.addEventListener(
                            'error',
                            () => reject(new Error('Recording failed')),
                            { once: true }
                        );
                        try {
                            recorder.stop();
                        } catch (err) {
                            reject(err instanceof Error ? err : new Error(String(err)));
                        }
                    });
                }

                stream?.getTracks().forEach((t) => t.stop());
                webRecorderRef.current = null;
                webStreamRef.current = null;
                await teardownWebAudioAnalyser();

                const mimeType = recorder?.mimeType || 'audio/webm';
                const blob = new Blob(webChunksRef.current, { type: mimeType });
                webChunksRef.current = [];

                if (elapsedSec < 0.45) {
                    alert(
                        'Voice chat',
                        'Recording was very short. Hold the mic for about a second, speak, then release.'
                    );
                    return;
                }

                let ext = 'webm';
                if (mimeType.includes('mp4')) ext = 'mp4';
                else if (mimeType.includes('ogg')) ext = 'ogg';

                const transcript = await transcribeCoachAudioBlob(blob, `recording.${ext}`);
                await send(transcript);
            } catch (e: unknown) {
                console.warn(e);
                const msg = e instanceof Error ? e.message : 'Could not transcribe audio.';
                alert('Voice chat', msg);
            } finally {
                webChunksRef.current = [];
                setVoiceBusy(false);
            }
            return;
        }

        if (!isRecording && !audioRecorder.isRecording) return;

        /** Too-short clips often yield empty Whisper text or a missing file URI on some devices. */
        const recordedSeconds = audioRecorder.currentTime;
        const tooShort = recordedSeconds < 0.45;

        setIsRecording(false);
        setVoiceBusy(true);

        try {
            try {
                await audioRecorder.stop();
            } catch {
                /* not recording or already stopped */
            }

            let uri = audioRecorder.uri;
            if (!uri) {
                await new Promise<void>((r) => setTimeout(r, 120));
                uri = audioRecorder.uri;
            }

            await setCoachAudioMode(false);

            if (tooShort) {
                alert(
                    'Voice chat',
                    'Recording was very short. Hold the mic for about a second, speak, then release.'
                );
                return;
            }

            if (!uri) throw new Error('No audio file — try recording again on a physical device with mic access.');

            const baseName = uri.split('/').pop()?.split('?')[0] ?? 'recording.m4a';
            const lower = baseName.toLowerCase();
            /** Whisper accepts mp4/m4a; audio/mp4 matches AAC-in-M4A reliably across platforms. */
            let mimeType = 'audio/mp4';
            if (lower.endsWith('.caf')) mimeType = 'audio/x-caf';
            else if (lower.endsWith('.wav')) mimeType = 'audio/wav';
            else if (lower.endsWith('.webm')) mimeType = 'audio/webm';
            else if (lower.endsWith('.m4a') || lower.endsWith('.mp4') || lower.endsWith('.aac'))
                mimeType = 'audio/mp4';

            const transcript = await transcribeCoachAudio({
                uri,
                mimeType,
                fileName: baseName.includes('.') ? baseName : `${baseName}.m4a`,
            });

            await send(transcript);
        } catch (e: unknown) {
            console.warn(e);
            const msg = e instanceof Error ? e.message : 'Could not transcribe audio.';
            alert('Voice chat', msg);
            await setCoachAudioMode(false).catch(() => {});
        } finally {
            setVoiceBusy(false);
        }
    };

    const cancelVoiceRecording = useCallback(async () => {
        if (!isRecording) return;

        if (Platform.OS === 'web') {
            setIsRecording(false);
            try {
                webRecorderRef.current?.stop();
            } catch {
                /* inactive */
            }
            webStreamRef.current?.getTracks().forEach((t) => t.stop());
            webRecorderRef.current = null;
            webStreamRef.current = null;
            webChunksRef.current = [];
            await teardownWebAudioAnalyser();
            return;
        }

        setIsRecording(false);
        try {
            await audioRecorder.stop();
        } catch {
            /* inactive */
        }
        await setCoachAudioMode(false).catch(() => {});
    }, [isRecording, audioRecorder, teardownWebAudioAnalyser]);

    const toggleVoiceCapture = () => {
        if (isRecording) void stopVoiceRecordingAndSend();
        else void startVoiceRecording();
    };

    const voiceCaptureBlocked = Boolean((voiceBusy && !isRecording) || (sending && !isRecording));

    const recordingDurationMillis =
        isRecording && Platform.OS === 'web'
            ? Math.max(0, Date.now() - webStartedAtRef.current)
            : isRecording
              ? recorderState.durationMillis
              : 0;

    return (
        <KeyboardAvoidingView
            style={[styles.root, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
            <LinearGradient
                colors={['#1a1535', colors.background]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.25 }}
            />

            <Animated.View style={[{ flex: 1 }, entranceStyle]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="chevron-back" size={26} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <ScreenTitleRow title="Mindset Coach" icon="sparkles-outline" />
                </View>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setVoiceReplyEnabled((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                        voiceReplyEnabled ? 'Mute spoken coach replies' : 'Enable spoken coach replies'
                    }
                >
                    <Ionicons
                        name={voiceReplyEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
                        size={22}
                        color={voiceReplyEnabled ? Colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={confirmClear} hitSlop={12}>
                    <Ionicons name="trash-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Mood shortcuts */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsRow}
            >
                {MOOD_CHIPS.map((m) => (
                    <TouchableOpacity
                        key={m.label}
                        style={[styles.chip, (sending || voiceBusy || isRecording) && styles.chipDisabled]}
                        onPress={() => !sending && !voiceBusy && !isRecording && send(m.text)}
                        disabled={sending || voiceBusy || isRecording}
                    >
                        <Text style={styles.chipText}>{m.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.messagesPane}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesScroll}
                    contentContainerStyle={styles.messagesContent}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={!isRecording}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                {!coachDisclaimerHidden ? (
                    <View style={styles.disclaimerBanner}>
                        <Ionicons name="information-circle-outline" size={18} color={Colors.accent} style={styles.disclaimerLeadingIcon} />
                        <Text style={styles.disclaimerText}>
                            Not therapy or medical advice — an AI companion for motivation and habits. For crises, reach out to a professional or emergency services. Tap the mic to speak; use the speaker icon for voice replies.
                        </Text>
                        <TouchableOpacity
                            onPress={dismissCoachDisclaimer}
                            style={styles.disclaimerCloseBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss disclaimer"
                        >
                            <Ionicons name="close-circle-outline" size={22} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                ) : null}

                {messages.length === 0 && !sending ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyEmoji}>💬</Text>
                        <Text style={styles.emptyTitle}>What{"'"}s going on?</Text>
                        <Text style={styles.emptyBody}>
                            Share how you feel — rough day, plateaus, guilt after missing a workout, or a win you want
                            to anchor. I{"'"}ll respond with warmth and practical next steps tied to your journey.
                        </Text>
                    </View>
                ) : null}

                {messages.map((m) => {
                    const isUser = m.role === 'user';
                    const crisisBubble = !isUser && m.content === CRISIS_RESPONSE;
                    return (
                        <View
                            key={m.id}
                            style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssist]}
                        >
                            <View
                                style={[
                                    styles.bubble,
                                    isUser ? styles.bubbleUser : styles.bubbleAssist,
                                    crisisBubble && styles.bubbleCrisis,
                                ]}
                            >
                                {!isUser ? (
                                    <Text style={styles.bubbleRole}>Coach</Text>
                                ) : null}
                                <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{m.content}</Text>
                            </View>
                        </View>
                    );
                })}

                {sending ? (
                    <View style={[styles.bubbleWrap, styles.bubbleWrapAssist]}>
                        <View style={[styles.bubble, styles.bubbleAssist, styles.typingBubble]}>
                            <ActivityIndicator color={Colors.primary} size="small" />
                            <Text style={styles.typingText}>Thinking…</Text>
                        </View>
                    </View>
                ) : null}
                </ScrollView>
                <FitBotCoachCompanion
                    active={messages.length > 0 || sending}
                    paused={isRecording}
                    thinking={sending}
                    speaking={coachSpeaking}
                />
                <VoiceRecordingOverlay
                    visible={isRecording}
                    audioLevel={voiceUiLevel}
                    durationMillis={recordingDurationMillis}
                    onStop={() => void stopVoiceRecordingAndSend()}
                    onCancel={() => void cancelVoiceRecording()}
                    palette={{
                        primary: Colors.primary,
                        primaryLight: Colors.primaryLight,
                        accent: Colors.accent,
                        text: colors.text,
                        textSecondary: colors.textSecondary,
                        textTertiary: colors.textTertiary,
                        card: colors.card,
                        surfaceLight: colors.surfaceLight,
                        border: colors.border,
                        scrim: colors.overlay,
                        canvas: colors.background,
                    }}
                />
            </View>
            </Animated.View>

            {/* Composer */}
            <View
                style={[
                    styles.composer,
                    {
                        paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.sm + Spacing.xs),
                    },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.voiceMicBtn,
                        isRecording && styles.voiceMicRecording,
                        voiceCaptureBlocked && !isRecording && styles.voiceMicDisabled,
                    ]}
                    onPress={toggleVoiceCapture}
                    disabled={voiceCaptureBlocked && !isRecording}
                    accessibilityRole="button"
                    accessibilityLabel={isRecording ? 'Stop and send voice message' : 'Record voice message'}
                >
                    {voiceBusy && !isRecording ? (
                        <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                        <Ionicons
                            name={isRecording ? 'stop-circle' : 'mic-outline'}
                            size={24}
                            color={isRecording ? Colors.error : Colors.primary}
                        />
                    )}
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Type anything…"
                    placeholderTextColor={colors.textTertiary}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={2000}
                    editable={!sending}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || sending || voiceBusy) && styles.sendBtnDisabled]}
                    onPress={() => send()}
                    disabled={!input.trim() || sending || voiceBusy}
                >
                    <LinearGradient
                        colors={Colors.gradients.primary}
                        style={styles.sendGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {sending ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Ionicons name="send" size={20} color="#FFF" />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: TAB_SCROLL_GUTTER,
            paddingVertical: Spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
        },
        backBtn: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerCenter: {
            flex: 1,
            alignItems: 'center',
        },
        chipsScroll: {
            maxHeight: 52,
            flexGrow: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
        },
        chipsRow: {
            paddingHorizontal: TAB_SCROLL_GUTTER,
            paddingVertical: Spacing.sm,
            gap: Spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            alignContent: 'center',
        },
        chip: {
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.round,
            backgroundColor: colors.surfaceLight,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        },
        chipDisabled: {
            opacity: 0.5,
        },
        chipText: {
            fontSize: 13,
            fontWeight: Typography.weights.semibold,
            color: colors.text,
        },
        /** Chat list + voice overlay — overlay stays within this region (below chips, above composer). */
        messagesPane: {
            flex: 1,
            position: 'relative',
            /** Allow FIT-BOT fly/peek paths to extend slightly past pane bounds without clipping */
            overflow: 'visible',
        },
        messagesScroll: {
            flex: 1,
            zIndex: 1,
            elevation: 1,
        },
        messagesContent: {
            paddingHorizontal: TAB_SCROLL_GUTTER,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.lg + Spacing.sm,
            flexGrow: 1,
        },
        disclaimerBanner: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: Spacing.sm,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            paddingRight: Spacing.sm,
            borderRadius: BorderRadius.md,
            backgroundColor: colors.surfaceLight,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            marginBottom: Spacing.sm + Spacing.xs,
            overflow: 'hidden',
            ...Shadows.card,
        },
        disclaimerLeadingIcon: {
            marginTop: 2,
        },
        disclaimerCloseBtn: {
            marginLeft: Spacing.xs,
            padding: Spacing.xs,
            marginTop: -2,
        },
        disclaimerText: {
            flex: 1,
            fontSize: 11,
            lineHeight: 16,
            color: colors.textSecondary,
        },
        emptyWrap: {
            alignItems: 'center',
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.sm,
            marginTop: Spacing.sm,
        },
        emptyEmoji: {
            fontSize: 40,
            marginBottom: Spacing.sm + Spacing.xs,
        },
        emptyTitle: {
            fontSize: Typography.sizes.subtitle,
            fontWeight: Typography.weights.bold,
            color: colors.text,
            marginBottom: Spacing.sm,
        },
        emptyBody: {
            fontSize: Typography.sizes.body,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
        },
        bubbleWrap: {
            marginBottom: Spacing.md,
            flexDirection: 'row',
        },
        bubbleWrapUser: {
            justifyContent: 'flex-end',
        },
        bubbleWrapAssist: {
            justifyContent: 'flex-start',
        },
        bubble: {
            maxWidth: '88%',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm + Spacing.xs,
            borderRadius: BorderRadius.lg,
        },
        bubbleUser: {
            backgroundColor: Colors.primary,
            borderBottomRightRadius: 4,
            ...Shadows.small,
        },
        bubbleAssist: {
            backgroundColor: colors.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            borderBottomLeftRadius: 4,
            ...Shadows.card,
        },
        bubbleCrisis: {
            borderColor: Colors.warning + '80',
            backgroundColor: colors.surfaceLight,
            borderWidth: StyleSheet.hairlineWidth,
        },
        bubbleRole: {
            fontSize: 10,
            fontWeight: Typography.weights.bold,
            color: Colors.primary,
            marginBottom: Spacing.xs + 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        bubbleText: {
            fontSize: Typography.sizes.body,
            color: colors.text,
            lineHeight: 22,
        },
        bubbleTextUser: {
            color: '#FFF',
        },
        typingBubble: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
        },
        typingText: {
            fontSize: Typography.sizes.caption,
            color: colors.textSecondary,
        },
        composer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: Spacing.sm + Spacing.xs,
            paddingHorizontal: TAB_SCROLL_GUTTER,
            paddingTop: Spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            position: 'relative',
        },
        voiceMicBtn: {
            width: 46,
            height: 46,
            borderRadius: 23,
            marginBottom: Spacing.xs + 2,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: Colors.primary,
            backgroundColor: colors.surfaceLight,
        },
        voiceMicRecording: {
            borderColor: Colors.error + 'CC',
            backgroundColor: colors.surfaceLight,
        },
        voiceMicDisabled: {
            opacity: 0.4,
        },
        input: {
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            paddingVertical: Platform.OS === 'ios' ? 12 : 8,
            backgroundColor: colors.surfaceLight,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            color: colors.text,
            fontSize: Typography.sizes.body,
        },
        sendBtn: {
            marginBottom: Spacing.xs + 2,
        },
        sendBtnDisabled: {
            opacity: 0.45,
        },
        sendGradient: {
            width: 46,
            height: 46,
            borderRadius: 23,
            justifyContent: 'center',
            alignItems: 'center',
            ...Shadows.glow,
        },
    });
