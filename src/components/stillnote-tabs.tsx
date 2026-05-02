import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';

const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Workspace', icon: 'albums-outline' },
  bible: { label: 'Bible', icon: 'book-outline' },
  settings: { label: 'Settings', icon: 'settings-outline' },
};

export function StillnoteTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.shell, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline' };

        return (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="light"
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[styles.item, focused && { backgroundColor: colors.accentSoft }]}>
            <Ionicons
              color={focused ? colors.accent : colors.textTertiary}
              name={meta.icon}
              size={18}
            />
            <Text style={[styles.label, { color: focused ? colors.accent : colors.textTertiary }]}>
              {meta.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  item: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    gap: 4,
    paddingVertical: 8,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
});
