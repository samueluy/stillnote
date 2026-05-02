import { useColorScheme } from 'react-native';
import { darkPalette, palette } from '@/src/components/primitives';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  return {
    colors: colorScheme === 'dark' ? darkPalette : palette,
    isDark: colorScheme === 'dark',
  };
}
