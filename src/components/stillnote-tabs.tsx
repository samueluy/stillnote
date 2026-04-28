import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/components/primitives';

const TAB_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: 'Workspace', icon: 'albums-outline' },
  bible: { label: 'Bible', icon: 'book-outline' },
  settings: { label: 'Settings', icon: 'settings-outline' },
};

export function StillnoteTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.shell}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] ?? { label: route.name, icon: 'ellipse-outline' };

        return (
          <Pressable
            accessibilityRole="button"
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && styles.itemPressed]}>
            <Ionicons
              color={focused ? palette.blue : '#A8A29E'}
              name={meta.icon}
              size={18}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopColor: '#F5F5F4',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  item: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    gap: 4,
    paddingVertical: 8,
  },
  itemActive: {
    backgroundColor: palette.blueSoft,
  },
  itemPressed: {
    opacity: 0.82,
  },
  label: {
    color: '#A8A29E',
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: palette.blue,
  },
});
