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
      <Text style={[styles.verseNumber, { color: colors.textTertiary }]}>{item.verse}</Text>
      <Text style={[styles.verseText, { color: colors.textPrimary }]}>{item.text}</Text>
      <AnimatedPressable
        haptic="medium"
        onPress={() => onInsertVerse(item)}
        style={({ pressed }) => [styles.insertButton, { borderColor: colors.borderStrong }, pressed && styles.pressed]}>
        <Ionicons color={colors.accent} name="add-outline" size={12} />
        <Text style={[styles.insertButtonText, { color: colors.accent }]}>Insert</Text>
      </AnimatedPressable>
    </View>
  );
}

export const BibleSheet = forwardRef<BottomSheetModal, Props>(function BibleSheet(
  { book, chapter, translationName, verses, onInsertVerse },
  ref
) {
  const animatedIndex = useSharedValue(0);
  const snapPoints = useMemo(() => ['35%', '70%'], []);
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
      backgroundStyle={{ backgroundColor: colors.bg }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.12} />
      )}
      enableDynamicSizing={false}
      handleIndicatorStyle={[styles.handle, { backgroundColor: colors.textTertiary }]}
      snapPoints={snapPoints}>
      <BottomSheetView style={[styles.header]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {book} {chapter}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            {translationName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <AnimatedPressable
            haptic="light"
            onPress={() => { setIsSheetSearchOpen((v) => !v); setSheetSearch(''); }}
            style={styles.headerAction}>
            <Ionicons color={colors.textSecondary} name="search-outline" size={18} />
          </AnimatedPressable>
          <AnimatedPressable onPress={dismissSheet} style={styles.headerAction}>
            <Ionicons color={colors.textSecondary} name="close-outline" size={18} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerTitle: {
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
  },
  headerSubtitle: {
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerAction: {
    alignItems: 'center',
    borderRadius: 100,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
  },
  listContent: { paddingBottom: 48, paddingHorizontal: 12, paddingTop: 14 },
  verseRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  verseNumber: {
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginTop: 3,
    width: 18,
  },
  verseText: {
    flex: 1,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
    lineHeight: 23,
  },
  insertButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insertButtonText: {
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 11,
  },
  pressed: { opacity: 0.75 },
});
