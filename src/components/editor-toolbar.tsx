import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { EditorBridge } from '@10play/tentap-editor';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';

type Props = {
  editor: EditorBridge;
  keyboardHeight: SharedValue<number>;
  onBiblePress: () => void;
};

function ToolbarBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const btnScale = useSharedValue(1);

  const animatedBtn = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <Animated.View style={animatedBtn}>
      <AnimatedPressable
        accessibilityLabel={label}
        haptic="light"
        onPress={() => {
          btnScale.value = withSequence(
            withSpring(1.15, { damping: 12, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 300 })
          );
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={styles.toolbarBtn}>
        <Ionicons color="#1E1B18" name={icon} size={18} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export function EditorToolbar({ editor, keyboardHeight, onBiblePress }: Props) {
  const toolbarStyle = useAnimatedStyle(() => ({
    bottom: withTiming(keyboardHeight.value + 8, { duration: 150 }),
  }));

  return (
    <Animated.View style={[styles.toolbar, toolbarStyle]}>
      <View style={styles.toolbarInner}>
        <ToolbarBtn
          icon="text-outline"
          label="Bold"
          onPress={() => (editor as any).toggleBold?.()}
        />
        <ToolbarBtn
          icon="text-outline"
          label="Italic"
          onPress={() => (editor as any).toggleItalic?.()}
        />
        <ToolbarBtn
          icon="remove-outline"
          label="Underline"
          onPress={() => (editor as any).toggleUnderline?.()}
        />
        <View style={styles.divider} />
        <ToolbarBtn
          icon="chatbox-ellipses-outline"
          label="Quote"
          onPress={() => (editor as any).toggleBlockquote?.()}
        />
        <ToolbarBtn
          icon="list-outline"
          label="Bullet"
          onPress={() => (editor as any).toggleBulletList?.()}
        />
        <ToolbarBtn
          icon="list-circle-outline"
          label="Numbered"
          onPress={() => (editor as any).toggleOrderedList?.()}
        />
        <View style={styles.divider} />
        <ToolbarBtn
          icon="book-outline"
          label="Verse"
          onPress={onBiblePress}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignItems: 'center',
    left: 20,
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  toolbarInner: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  toolbarBtn: {
    alignItems: 'center',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  divider: {
    backgroundColor: '#EAE3DB',
    height: 20,
    width: 1,
  },
});
