import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function useAppStyles<T>(styleFactory: (colors: any) => T): T {
  const theme = useColorScheme() ?? 'dark';
  const mergedColors = useMemo(
    () => ({ ...Colors, ...(theme === 'dark' ? Colors.dark : Colors.light) }),
    [theme],
  );
  return useMemo(() => styleFactory(mergedColors), [mergedColors, styleFactory]);
}
