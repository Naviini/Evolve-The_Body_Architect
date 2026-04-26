import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function useThemeColors() {
  const theme = useColorScheme() ?? 'dark';
  const activeColors = theme === 'dark' ? Colors.dark : Colors.light;
  return { ...Colors, ...activeColors };
}
