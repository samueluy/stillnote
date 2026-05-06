import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/src/components/primitives';
import { selectionChange } from '@/src/lib/haptics';

const TAB_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }
> = {
  index: { icon: 'home-outline', activeIcon: 'home' },
  threads: { icon: 'folder-open-outline', activeIcon: 'folder-open' },
  bible: { icon: 'compass-outline', activeIcon: 'compass' },
  search: { icon: 'search-outline', activeIcon: 'search' },
  settings: { icon: 'settings-outline', activeIcon: 'settings' },
};

export function StillnoteTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? {
          icon: 'ellipse-outline',
          activeIcon: 'ellipse',
        };

        return (
          <Pressable
            accessibilityRole="button"
            key={route.key}
            onPress={() => {
              if (!focused) {
                void selectionChange();
                navigation.navigate(route.name);
              }
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Ionicons
              color={palette.text}
              name={focused ? meta.activeIcon : meta.icon}
              size={focused ? 21 : 19}
              style={focused ? styles.activeIcon : undefined}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: palette.background,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
  },
  activeIcon: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
