import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';

type ChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  bg: string;
  onPress?: () => void;
};

export function AnimatedChip({ icon, label, accent, bg, onPress }: ChipProps) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
    opacity.value = withSpring(1, { damping: 12, stiffness: 250 });
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable haptic="light" onPress={onPress} style={[styles.chip, { backgroundColor: bg }]}>
        <Ionicons color={accent} name={icon} size={12} />
        <Text style={[styles.chipText, { color: accent }]}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function AnimatedChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
