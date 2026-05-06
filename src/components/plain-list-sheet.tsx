import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Divider, palette } from '@/src/components/primitives';
import type { HapticIntent } from '@/src/lib/haptics';
import { triggerHaptic } from '@/src/lib/haptics';

type Item = {
  key: string;
  label: string;
  description?: string;
  onPress: () => void;
  hapticIntent?: HapticIntent;
};

type Props = {
  title: string;
  items: Item[];
  snapPoints?: string[];
};

export const PlainListSheet = forwardRef<BottomSheetModal, Props>(function PlainListSheet(
  { title, items, snapPoints },
  ref
) {
  const nextSnapPoints = useMemo(() => snapPoints ?? ['70%', '88%'], [snapPoints]);

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
        <Text style={styles.title}>{title}</Text>
        <BottomSheetFlatList
          contentContainerStyle={styles.listContent}
          data={items}
          ItemSeparatorComponent={Divider}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                void triggerHaptic(item.hapticIntent ?? 'selection');
                item.onPress();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.label}>{item.label}</Text>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
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
  handle: {
    backgroundColor: palette.textMuted,
    height: 4,
    width: 36,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    marginBottom: 16,
  },
  listContent: {
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 18,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  label: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  description: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
