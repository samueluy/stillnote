import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetScrollableCreator,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { forwardRef, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';
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
  const { colors } = useTheme();
  return (
    <View style={styles.verseRow}>
      <Text style={[styles.verseNumber, { color: colors.gold }]}>{item.verse}</Text>
      <Text style={[styles.verseText, { color: colors.textPrimary }]}>{item.text}</Text>
      <AnimatedPressable
        haptic="light"
        onPress={() => onInsertVerse(item)}
        style={[styles.insertButton, { backgroundColor: colors.accent }]}>
        <Ionicons color="#FFFFFF" name="add-circle" size={12} />
        <Text style={styles.insertButtonText}>Insert</Text>
      </AnimatedPressable>
    </View>
  );
}

export const BibleSheet = forwardRef<BottomSheetModal, Props>(function BibleSheet(
  { book, chapter, translationName, verses, onInsertVerse },
  ref
) {
  const animatedIndex = useSharedValue(0);
  const snapPoints = useMemo(() => ['38%', '58%'], []);
  const ScrollComponent = useBottomSheetScrollableCreator();
  const [sheetSearch, setSheetSearch] = useState('');
  const [isSheetSearchOpen, setIsSheetSearchOpen] = useState(false);
  const { colors } = useTheme();

  const filteredVerses = useMemo(() => {
    if (!sheetSearch.trim()) return verses;
    const q = sheetSearch.toLowerCase();
    return verses.filter(
      (v) => v.text.toLowerCase().includes(q) || String(v.verse).includes(q)
    );
  }, [verses, sheetSearch]);

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
      handleIndicatorStyle={[styles.handle, { backgroundColor: colors.textTertiary }]}
      snapPoints={snapPoints}>
      <BottomSheetView style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {book} {chapter}
            </Text>
            <Ionicons color={colors.textSecondary} name="chevron-down-outline" size={14} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            {translationName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <AnimatedPressable
            onPress={() => { setIsSheetSearchOpen((v) => !v); setSheetSearch(''); }}
            style={styles.headerAction}>
            <Ionicons color={colors.textSecondary} name="search-outline" size={18} />
          </AnimatedPressable>
          <AnimatedPressable onPress={dismissSheet} style={styles.headerAction}>
            <Ionicons color={colors.textSecondary} name="close-outline" size={20} />
          </AnimatedPressable>
        </View>
      </BottomSheetView>

      {isSheetSearchOpen ? (
        <View style={[styles.searchRow, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
          <TextInput
            autoFocus
            onChangeText={setSheetSearch}
            placeholder="Search verses…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={sheetSearch}
          />
          {sheetSearch.trim() ? (
            <AnimatedPressable onPress={() => setSheetSearch('')}>
              <Ionicons color={colors.textSecondary} name="close-outline" size={16} />
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}

      <FlashList
        data={filteredVerses}
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
    height: 4,
    width: 36,
    borderRadius: 100,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  headerTitle: {
    fontFamily: 'LibreBaskerville_700Bold',
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerAction: {
    alignItems: 'center',
    borderRadius: 100,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  searchRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  listContent: { paddingBottom: 48, paddingHorizontal: 12, paddingTop: 14 },
  verseRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  verseNumber: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    width: 16,
  },
  verseText: {
    flex: 1,
    fontFamily: 'LibreBaskerville_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  insertButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  insertButtonText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
});
