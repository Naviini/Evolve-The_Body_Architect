import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function useAppStyles<T>(styleFactory: (colors: any) => T): T {
  const theme = useColorScheme() ?? 'dark';
  const activeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const mergedColors = { ...Colors, ...activeColors };

  // Use theme as dependency because styleFactory is a global constant
  return useMemo(() => styleFactory(mergedColors), [theme, styleFactory]);
}
