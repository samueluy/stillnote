import { theme as themeConfig } from './theme';
import { useAppState } from '@/src/providers/app-provider';

export function useTheme() {
  const { themeMode } = useAppState();
  const isDark = false;

  return {
    colors: themeConfig.light,
    isDark,
    themeMode,
  };
}

export { themeConfig as theme };
