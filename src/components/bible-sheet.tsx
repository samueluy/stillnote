import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetScrollableCreator,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { palette } from '@/src/components/primitives';
import type { BibleVerse } from '@/src/types/domain';

type Props = {
  book: string;
  chapter: number;
  translationName: string;
  verses: BibleVerse[];
  onInsertVerse: (verse: BibleVerse) => void;
};

function VerseRow({
  item,
  onInsertVerse,
}: {
  item: BibleVerse;
  onInsertVerse: (verse: BibleVerse) => void;
}) {
  return (
    <View style={styles.verseRow}>
      <Text style={styles.verseNumber}>{item.verse}</Text>
      <Text style={styles.verseText}>{item.text}</Text>
      <Pressable onPress={() => onInsertVerse(item)} style={({ pressed }) => [styles.insertButton, pressed && styles.pressed]}>
        <Ionicons color="#FFFFFF" name="add-outline" size={12} />
        <Text style={styles.insertButtonText}>Insert</Text>
      </Pressable>
    </View>
  );
}

export const BibleSheet = forwardRef<BottomSheetModal, Props>(function BibleSheet(
  { book, chapter, translationName, verses, onInsertVerse },
  ref
) {
  const animatedIndex = useSharedValue(0);
  const snapPoints = useMemo(() => ['62%', '84%'], []);
  const ScrollComponent = useBottomSheetScrollableCreator();
  const dismissSheet = () => {
    if (ref && typeof ref !== 'function') {
      ref.current?.dismiss();
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      animatedIndex={animatedIndex}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
      )}
      enableDynamicSizing={false}
      handleIndicatorStyle={styles.handle}
      snapPoints={snapPoints}>
      <BottomSheetView style={styles.header}>
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {book} {chapter}
            </Text>
            <Ionicons color={palette.textMuted} name="chevron-down-outline" size={14} />
          </View>
          <Text style={styles.headerSubtitle}>{translationName}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerAction}>
            <Ionicons color={palette.text} name="search-outline" size={18} />
          </Pressable>
          <Pressable onPress={dismissSheet} style={styles.headerAction}>
            <Ionicons color={palette.text} name="close-outline" size={20} />
          </Pressable>
        </View>
      </BottomSheetView>

      <FlashList
        data={verses}
        keyExtractor={(item) => item.reference}
        renderItem={({ item }) => <VerseRow item={item} onInsertVerse={onInsertVerse} />}
        renderScrollComponent={ScrollComponent}
        contentContainerStyle={styles.listContent}
      />
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  handle: {
    backgroundColor: '#E9E1DC',
    height: 6,
    width: 48,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#F5ECE7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#695D46',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  listContent: {
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  verseRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  verseNumber: {
    color: '#695D46',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    width: 18,
  },
  verseText: {
    color: palette.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
  },
  insertButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.blue,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  insertButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
});
