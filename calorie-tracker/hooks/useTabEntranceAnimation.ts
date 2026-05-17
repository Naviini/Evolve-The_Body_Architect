import { useRef, useCallback, useMemo, useEffect } from 'react';
import { Animated, InteractionManager } from 'react-native';
import { useFocusEffect } from 'expo-router';

export type TabEntranceAnimationOptions = {
  durationMs?: number;
  slidePx?: number;
  /**
   * Replay entrance when these values change (e.g. workout phase / exercise index).
   * First change after mount is skipped so `useFocusEffect` handles the initial entrance.
   */
  replayDeps?: readonly unknown[];
};

/**
 * Fade + slide-up entrance aligned with the Workout tab (500ms ease, 24px offset).
 * Replays when the screen gains focus (e.g. switching bottom tabs).
 */
export function useTabEntranceAnimation(options: TabEntranceAnimationOptions = {}) {
  const durationMs = options.durationMs ?? 500;
  const slidePx = options.slidePx ?? 24;
  const replayDeps = options.replayDeps;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slidePx)).current;

  const runEntrance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: durationMs, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: durationMs, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, durationMs]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(slidePx);
      let cancelled = false;
      let ran = false;
      const fire = () => {
        if (cancelled || ran) return;
        ran = true;
        runEntrance();
      };
      const fallback = setTimeout(fire, 700);
      const handle = InteractionManager.runAfterInteractions(() => {
        clearTimeout(fallback);
        fire();
      });
      return () => {
        cancelled = true;
        clearTimeout(fallback);
        const cancel = (handle as { cancel?: () => void })?.cancel;
        if (typeof cancel === 'function') cancel();
      };
    }, [fadeAnim, slideAnim, slidePx, runEntrance])
  );

  const replaySkipFirst = useRef(true);
  const replayKey =
    replayDeps === undefined ? undefined : replayDeps.map((d) => String(d)).join('|');

  useEffect(() => {
    if (replayKey === undefined) return;
    if (replaySkipFirst.current) {
      replaySkipFirst.current = false;
      return;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(slidePx);
    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) runEntrance();
    });
    return () => {
      cancelled = true;
      const cancel = (handle as { cancel?: () => void })?.cancel;
      if (typeof cancel === 'function') cancel();
    };
  }, [replayKey, fadeAnim, slideAnim, slidePx, runEntrance]);

  const entranceStyle = useMemo(
    () => ({
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }),
    [fadeAnim, slideAnim]
  );

  return { fadeAnim, slideAnim, entranceStyle, runEntrance };
}
