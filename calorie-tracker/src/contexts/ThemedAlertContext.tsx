/**
 * Modal alerts styled like the rest of the app (cards, gradients, borders).
 * Prefer this over RN Alert.alert so web + native match ThemeProvider colors.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ThemedAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type ThemedAlertButton = {
  text: string;
  style?: ThemedAlertButtonStyle;
  onPress?: () => void;
};

type AlertPayload = {
  title: string;
  message?: string;
  buttons: ThemedAlertButton[];
};

type AlertState = AlertPayload & { visible: boolean };

type ThemedAlertContextValue = {
  alert: (title: string, message?: string, buttons?: ThemedAlertButton[]) => void;
};

const ThemedAlertContext = createContext<ThemedAlertContextValue | null>(null);

function normalizeButtons(buttons?: ThemedAlertButton[]): ThemedAlertButton[] {
  if (buttons && buttons.length > 0) return buttons;
  return [{ text: 'OK', style: 'default' }];
}

export function ThemedAlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const queueRef = useRef<AlertPayload[]>([]);

  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: normalizeButtons(),
  });

  const dequeue = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setState({ ...next, visible: true });
    }
  }, []);

  useEffect(() => {
    if (!state.visible && queueRef.current.length > 0) {
      const id = requestAnimationFrame(dequeue);
      return () => cancelAnimationFrame(id);
    }
  }, [state.visible, dequeue]);

  const alertFn = useCallback((title: string, message?: string, buttons?: ThemedAlertButton[]) => {
    const payload: AlertPayload = {
      title,
      message,
      buttons: normalizeButtons(buttons),
    };
    setState((prev) => {
      if (!prev.visible) {
        return { ...payload, visible: true };
      }
      queueRef.current.push(payload);
      return prev;
    });
  }, []);

  const value = useMemo(() => ({ alert: alertFn }), [alertFn]);

  const hasCancel = state.buttons.some((b) => b.style === 'cancel');

  const backdropDismiss = useCallback(() => {
    if (!hasCancel) return;
    const cancelBtn = state.buttons.find((b) => b.style === 'cancel');
    const cb = cancelBtn?.onPress;
    setState((s) => ({ ...s, visible: false }));
    if (cb) queueMicrotask(() => cb());
  }, [hasCancel, state.buttons]);

  const handleRequestClose = useCallback(() => {
    const cancelBtn = state.buttons.find((b) => b.style === 'cancel');
    const cb = cancelBtn?.onPress;
    setState((s) => ({ ...s, visible: false }));
    if (cb) queueMicrotask(() => cb());
  }, [state.buttons]);

  const handleButton = useCallback((btn: ThemedAlertButton) => {
    const cb = btn.onPress;
    setState((s) => ({ ...s, visible: false }));
    if (cb) queueMicrotask(() => cb());
  }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const messageMaxHeight = Math.min(220, windowHeight * 0.35);

  const horizontalActions = state.buttons.length === 2;

  return (
    <ThemedAlertContext.Provider value={value}>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleRequestClose}
      >
        <View
          style={[
            styles.overlayRoot,
            { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={hasCancel ? backdropDismiss : undefined}
            accessibilityRole="button"
            accessibilityLabel={hasCancel ? 'Dismiss dialog' : undefined}
          />
          <View style={styles.cardOuter} pointerEvents="box-none">
            <View style={styles.card}>
              <Text style={styles.title}>{state.title}</Text>
              {state.message ? (
                <ScrollView
                  style={{ maxHeight: messageMaxHeight }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.message}>{state.message}</Text>
                </ScrollView>
              ) : null}

              <View style={horizontalActions ? styles.actionsRow : styles.actionsColumn}>
                {state.buttons.map((btn, i) => (
                  <AlertActionButton
                    key={`${btn.text}-${i}`}
                    btn={btn}
                    horizontal={horizontalActions}
                    colors={colors}
                    styles={styles}
                    onPress={handleButton}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedAlertContext.Provider>
  );
}

function AlertActionButton({
  btn,
  horizontal,
  colors,
  styles,
  onPress,
}: {
  btn: ThemedAlertButton;
  horizontal: boolean;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: (b: ThemedAlertButton) => void;
}) {
  const wrapStyle = horizontal ? { flex: 1, minWidth: 0 as const } : { alignSelf: 'stretch' as const };

  if (btn.style === 'destructive') {
    return (
      <View style={wrapStyle}>
        <TouchableOpacity
          style={[styles.btnBase, styles.btnDestructive]}
          onPress={() => onPress(btn)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnDestructiveText}>{btn.text}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (btn.style === 'cancel') {
    return (
      <View style={wrapStyle}>
        <TouchableOpacity
          style={[styles.btnBase, styles.btnCancel, { borderColor: colors.border, backgroundColor: colors.surfaceLight }]}
          onPress={() => onPress(btn)}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>{btn.text}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      <TouchableOpacity onPress={() => onPress(btn)} activeOpacity={0.92}>
        <LinearGradient
          colors={[...Colors.gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          <Text style={styles.btnPrimaryText}>{btn.text}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlayRoot: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
    },
    cardOuter: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      zIndex: 1,
    },
    card: {
      backgroundColor: colors.cardElevated,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: Colors.primary + '55',
      padding: Spacing.lg,
      ...Shadows.medium,
    },
    title: {
      fontSize: Typography.sizes.subtitle,
      fontWeight: Typography.weights.heavy,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    message: {
      fontSize: Typography.sizes.bodyLarge,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: Spacing.md,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    actionsColumn: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    btnBase: {
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      minHeight: 44,
    },
    btnGradient: {
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      minHeight: 44,
    },
    btnPrimaryText: {
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.heavy,
      color: '#FFF',
    },
    btnCancel: {
      borderWidth: 1,
    },
    btnCancelText: {
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.semibold,
    },
    btnDestructive: {
      borderWidth: 1,
      borderColor: Colors.error + 'AA',
      backgroundColor: Colors.error + '18',
    },
    btnDestructiveText: {
      fontSize: Typography.sizes.bodyLarge,
      fontWeight: Typography.weights.heavy,
      color: Colors.error,
    },
  });
}

export function useThemedAlert(): ThemedAlertContextValue {
  const ctx = useContext(ThemedAlertContext);
  if (!ctx) {
    throw new Error('useThemedAlert must be used within ThemedAlertProvider');
  }
  return ctx;
}
