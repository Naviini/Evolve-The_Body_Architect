import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useAppTheme } from '@/src/contexts/ThemeContext';

export function useColorScheme() {
	const systemScheme = useSystemColorScheme();
	const { theme } = useAppTheme();

	return theme ?? systemScheme ?? 'dark';
}
