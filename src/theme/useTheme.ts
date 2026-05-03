import { useColorScheme } from 'react-native';
import { theme as themeConfig } from './theme';
import { useAppState } from '@/src/providers/app-provider';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { themeMode } = useAppState();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? themeConfig.dark : themeConfig.light,
    isDark,
    themeMode,
  };
}

export { themeConfig as theme };
