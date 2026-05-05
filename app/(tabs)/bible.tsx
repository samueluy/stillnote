import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConcordanceModal } from '@/src/components/concordance-modal';
import {
  Divider,
  EmptyState,
  SearchField,
  Screen,
  TextLink,
  TopBar,
  palette,
} from '@/src/components/primitives';
import { BIBLE_BOOKS } from '@/src/data/bible-books';
import { getConcordanceEntry } from '@/src/data/concordance';
import {
  getBibleChapter,
  getRecentLookups,
  getVerseByReference,
  trackLookup,
} from '@/src/lib/database';
import type { BibleVerse } from '@/src/types/domain';

function VerseLine({
  verse,
  onLookup,
}: {
  verse: BibleVerse;
  onLookup: (entryId: string) => void;
}) {
  if (verse.reference === 'John 1:1') {
    return (
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{verse.verse}</Text>{' '}
        In the{' '}
        <Text onLongPress={() => onLookup('entry-arche')} style={styles.inlineReference}>
          beginning
        </Text>{' '}
        was the Word, and the Word was with God, and the Word was God.
      </Text>
    );
  }

  if (verse.reference === 'John 1:4') {
    return (
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{verse.verse}</Text> In him was life, and the life was the{' '}
        <Text onLongPress={() => onLookup('entry-phos')} style={styles.inlineReference}>
          light
        </Text>{' '}
        of men.
      </Text>
    );
  }

  return (
    <Text style={styles.verseText}>
      <Text style={styles.verseNumber}>{verse.verse}</Text> {verse.text}
    </Text>
  );
}

export default function BibleScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ reference?: string }>();

  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [jumpValue, setJumpValue] = useState('');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [recentLookups, setRecentLookups] = useState<string[]>([]);
  const [lookupEntryId, setLookupEntryId] = useState('entry-arche');
  const [isLookupVisible, setIsLookupVisible] = useState(false);
  const [bookIndex, setBookIndex] = useState(BIBLE_BOOKS.indexOf('John'));

  useEffect(() => {
    if (!params.reference) {
      return;
    }
    const match = params.reference.match(/^(.*)\s+(\d+):(\d+)$/);
    if (!match) {
      return;
    }
    const nextBook = match[1];
    const nextChapter = Number(match[2]);
    setBook(nextBook);
    setChapter(nextChapter);
    setBookIndex(Math.max(0, BIBLE_BOOKS.indexOf(nextBook as (typeof BIBLE_BOOKS)[number])));
  }, [params.reference]);

  const loadChapter = useCallback(async () => {
    setVerses(await getBibleChapter(db, book, chapter));
  }, [book, chapter, db]);

  const loadLookupHistory = useCallback(async () => {
    const history = await getRecentLookups(db);
    setRecentLookups(history.map((item) => item.entryId));
  }, [db]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  useEffect(() => {
    loadLookupHistory();
  }, [loadLookupHistory]);

  const stepBook = (direction: -1 | 1) => {
    const nextIndex = Math.min(BIBLE_BOOKS.length - 1, Math.max(0, bookIndex + direction));
    setBookIndex(nextIndex);
    setBook(BIBLE_BOOKS[nextIndex]);
    setChapter(1);
  };

  const stepChapter = (direction: -1 | 1) => {
    setChapter((current) => Math.max(1, current + direction));
  };

  const jumpToReference = useCallback(async () => {
    const verse = await getVerseByReference(db, jumpValue.trim());
    if (!verse) {
      return;
    }
    setBook(verse.book);
    setChapter(verse.chapter);
    setBookIndex(Math.max(0, BIBLE_BOOKS.indexOf(verse.book as (typeof BIBLE_BOOKS)[number])));
    setJumpValue('');
  }, [db, jumpValue]);

  const handleLookup = useCallback(
    async (entryId: string) => {
      setLookupEntryId(entryId);
      setIsLookupVisible(true);
      await trackLookup(db, entryId);
      await loadLookupHistory();
    },
    [db, loadLookupHistory]
  );

  const lookupEntry = useMemo(() => getConcordanceEntry(lookupEntryId), [lookupEntryId]);

  return (
    <Screen>
      <TopBar title="Bible" />
      <View style={styles.controls}>
        <View style={styles.referenceRow}>
          <TextLink label="Prev Book" onPress={() => stepBook(-1)} />
          <Text style={styles.referenceLabel}>{book}</Text>
          <TextLink label="Next Book" onPress={() => stepBook(1)} />
        </View>
        <View style={styles.referenceRow}>
          <TextLink label="−" onPress={() => stepChapter(-1)} />
          <Text style={styles.referenceLabel}>Chapter {chapter}</Text>
          <TextLink label="+" onPress={() => stepChapter(1)} />
        </View>
        <SearchField
          onChangeText={setJumpValue}
          placeholder="Jump to a verse, e.g. John 1:1"
          value={jumpValue}
        />
        <TextLink label="Go" onPress={jumpToReference} />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={verses}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.reference}
        ListEmptyComponent={<EmptyState subtitle="Choose another reference to continue reading." title="No verses found" />}
        ListHeaderComponent={
          recentLookups.length ? (
            <View style={styles.lookupSection}>
              <Text style={styles.lookupLabel}>Recent concordance lookups</Text>
              <View style={styles.lookupRow}>
                {recentLookups.map((entryId) => {
                  const entry = getConcordanceEntry(entryId);
                  return (
                    <Pressable
                      key={entryId}
                      onPress={() => handleLookup(entryId)}
                      style={({ pressed }) => [styles.lookupChip, pressed && styles.pressed]}>
                      <Text style={styles.lookupChipText}>{entry.strongsId}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.verseRow}>
            <VerseLine onLookup={handleLookup} verse={item} />
          </View>
        )}
      />

      <ConcordanceModal
        entry={lookupEntry}
        onClose={() => setIsLookupVisible(false)}
        visible={isLookupVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  referenceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  referenceLabel: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  verseRow: {
    paddingVertical: 14,
  },
  verseNumber: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  verseText: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 14,
    lineHeight: 25,
  },
  inlineReference: {
    color: palette.text,
    textDecorationLine: 'underline',
  },
  lookupSection: {
    marginBottom: 18,
  },
  lookupLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginBottom: 8,
  },
  lookupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lookupChip: {
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lookupChipText: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  pressed: {
    opacity: 0.7,
  },
});
