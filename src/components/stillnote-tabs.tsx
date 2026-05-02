import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';

const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Journal', icon: 'book-outline', activeIcon: 'book' },
  threads: { label: 'Threads', icon: 'layers-outline', activeIcon: 'layers' },
  bible: { label: 'Study', icon: 'compass-outline', activeIcon: 'compass' },
  search: { label: 'Search', icon: 'search-outline', activeIcon: 'search' },
};

export function StillnoteTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.shell, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
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
              color={focused ? colors.accent : colors.textTertiary}
              name={focused ? meta.activeIcon : meta.icon}
              size={22}
            />
            {focused ? <View style={[styles.indicator, { backgroundColor: colors.accent }]} /> : null}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 28,
    paddingTop: 8,
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
