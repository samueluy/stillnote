import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type HapticStyle = 'light' | 'medium' | 'heavy';

type AnimatedPressableProps = PressableProps & {
  haptic?: HapticStyle;
};

const springConfig = { damping: 15, stiffness: 300 };

function fireHaptic(style: HapticStyle) {
  if (style === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function AnimatedPressable({
  children,
  haptic,
  style,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedTransform = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedTransform}>
      <Pressable
        {...props}
        onPress={onPress}
        onPressIn={(e) => {
          scale.value = withSpring(0.96, springConfig);
          if (haptic) fireHaptic(haptic);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, springConfig);
          onPressOut?.(e);
        }}
        style={style as any}>
        {children as any}
      </Pressable>
    </Animated.View>
  );
}
