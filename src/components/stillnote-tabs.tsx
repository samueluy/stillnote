import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';

const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Journal', icon: 'create-outline', activeIcon: 'create' },
  threads: { label: 'Threads', icon: 'layers-outline', activeIcon: 'layers' },
  bible: { label: 'Study', icon: 'compass-outline', activeIcon: 'compass' },
  search: { label: 'Search', icon: 'search-outline', activeIcon: 'search' },
};

export function StillnoteTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeColor = '#22C55E';
  const inactiveColor = '#71717A';

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.shell,
        {
          paddingBottom: Math.max(insets.bottom, 8) + 8,
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        },
        isDark ? { backgroundColor: 'rgba(11,11,12,0.88)' } : { backgroundColor: 'rgba(255,255,255,0.75)' },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline', activeIcon: 'ellipse' };

        return (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="light"
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.item}>
            <Ionicons
              color={focused ? activeColor : inactiveColor}
              name={focused ? meta.activeIcon : meta.icon}
              size={22}
            />
            {focused ? <View style={[styles.indicator, { backgroundColor: activeColor }]} /> : null}
          </AnimatedPressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    paddingVertical: 6,
  },
  indicator: {
    borderRadius: 1,
    height: 2,
    width: 20,
  },
});
