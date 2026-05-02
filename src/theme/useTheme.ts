import { useColorScheme } from 'react-native';
import { theme as themeConfig } from './theme';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? themeConfig.dark : themeConfig.light,
    isDark,
  };
}

export { themeConfig as theme };
