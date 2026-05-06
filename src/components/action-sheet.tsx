import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Divider, palette } from '@/src/components/primitives';
import type { HapticIntent } from '@/src/lib/haptics';
import { triggerHaptic } from '@/src/lib/haptics';

type ActionItem = {
  key: string;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  hapticIntent?: HapticIntent;
};

type Props = {
  description?: string;
  items: ActionItem[];
  snapPoints?: string[];
  title: string;
};

export const ActionSheet = forwardRef<BottomSheetModal, Props>(function ActionSheet(
  { description, items, snapPoints, title },
  ref
) {
  const nextSnapPoints = useMemo(() => snapPoints ?? ['34%'], [snapPoints]);

  return (
    <BottomSheetModal
      ref={ref}
      backgroundStyle={styles.background}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.12} />
      )}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.handle}
      snapPoints={nextSnapPoints}>
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <Divider />
        <BottomSheetScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {items.map((item, index) => (
            <View key={item.key}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => {
                  void triggerHaptic(item.hapticIntent ?? (item.destructive ? 'destructive' : 'selection'));
                  item.onPress();
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Text style={[styles.label, item.destructive && styles.labelDestructive]}>{item.label}</Text>
                {item.description ? <Text style={styles.rowDescription}>{item.description}</Text> : null}
              </Pressable>
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: palette.background,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
  },
  description: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
  },
  handle: {
    backgroundColor: palette.textMuted,
    height: 4,
    width: 36,
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  labelDestructive: {
    color: palette.text,
  },
  listContent: {
    paddingBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowDescription: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
  },
  title: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
  },
});
