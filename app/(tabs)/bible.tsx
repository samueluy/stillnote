import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConcordanceModal } from '@/src/components/concordance-modal';
import { Card, Screen, SectionTitle, TopBar, palette } from '@/src/components/primitives';
import { getConcordanceEntry } from '@/src/data/concordance';
import { getBibleChapter } from '@/src/lib/database';
import type { BibleVerse } from '@/src/types/domain';
import { BIBLE_BOOKS } from '@/src/data/bible-books';
import { Ionicons } from '@expo/vector-icons';

function VerseParagraph({
  verse,
  onOpenConcordance,
}: {
  verse: BibleVerse;
  onOpenConcordance: (entryId: string) => void;
}) {
  if (verse.reference === 'John 1:1') {
    return (
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{verse.verse} </Text>
        In the{' '}
        <Text onLongPress={() => onOpenConcordance('entry-arche')} style={styles.annotatedWord}>
          beginning
        </Text>{' '}
        was the Word, and the Word was with God, and the Word was God.
      </Text>
    );
  }

  if (verse.reference === 'John 1:4') {
    return (
      <Text style={styles.verseText}>
        <Text style={styles.verseNumber}>{verse.verse} </Text>
        In him was life, and the life was the{' '}
        <Text onLongPress={() => onOpenConcordance('entry-phos')} style={styles.annotatedWord}>
          light
        </Text>{' '}
        of men.
      </Text>
    );
  }

  return (
    <Text onLongPress={() => onOpenConcordance('entry-logos')} style={styles.verseText}>
      <Text style={styles.verseNumber}>{verse.verse} </Text>
      {verse.text}
    </Text>
  );
}

export default function BibleScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ reference?: string }>();
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [visibleEntryId, setVisibleEntryId] = useState('entry-arche');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);

  useEffect(() => {
    if (params.reference) {
      const match = params.reference.match(/^(.*)\s+(\d+):(\d+)$/);
      if (match) {
        setBook(match[1]);
        setChapter(Number(match[2]));
      }
    }
  }, [params.reference]);

  useEffect(() => {
    let cancelled = false;
    getBibleChapter(db, book, chapter).then((rows) => {
      if (!cancelled) {
        setVerses(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, db]);

  const entry = useMemo(() => getConcordanceEntry(visibleEntryId), [visibleEntryId]);

  const navigateToReference = (ref: string) => {
    for (const bookName of BIBLE_BOOKS) {
      if (ref.startsWith(bookName + ' ')) {
        const rest = ref.slice(bookName.length + 1);
        const chapterMatch = rest.match(/^(\d+)/);
        if (chapterMatch) {
          setBook(bookName);
          setChapter(Number(chapterMatch[1]));
          return;
        }
      }
    }
  };

  return (
    <Screen>
      <TopBar
        leftIcon="menu-outline"
        rightIcon="person-outline"
        title="Selah Study"
        onLeftPress={() => setIsBookPickerOpen(true)}
        onRightPress={() =>
          Alert.alert('Stillnote', 'Private study companion.\nYour notes stay on your device.')
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.readerCard}>
            <View style={styles.readerHeader}>
              <View>
                <Text style={styles.readerTitle}>
                  {book} {chapter}:1-{Math.max(verses.length, 1)}
                </Text>
                <Text style={styles.readerSubtitle}>English Standard-style study layout, KJV text</Text>
              </View>
              <View style={styles.readerTools}>
                <View style={styles.toolBubble}>
                  <Text style={styles.toolIcon}>✎</Text>
                </View>
                <View style={styles.toolBubble}>
                  <Text style={styles.toolIcon}>⌕</Text>
                </View>
                <View style={styles.toolBubble}>
                  <Text style={styles.toolIcon}>◎</Text>
                </View>
              </View>
            </View>

            <View style={styles.readerBody}>
              {verses.slice(0, 5).map((verse) => (
                <VerseParagraph
                  key={verse.reference}
                  onOpenConcordance={(entryId) => {
                    setVisibleEntryId(entryId);
                    setIsModalVisible(true);
                  }}
                  verse={verse}
                />
              ))}
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionTitle title="Margin Notes" actionIcon="ellipsis-horizontal" />
          <View style={styles.marginCard}>
            <View style={styles.marginNote}>
              <Text style={styles.marginEyebrow}>v.1 Logos Connection</Text>
              <Text style={styles.marginText}>
                The Greek word &quot;Logos&quot; implies both reason and speech. Christ is the communicative heart of God.
              </Text>
            </View>
            <View style={styles.marginSticky}>
              <Text style={styles.stickyText}>
                &quot;Life and Light&quot; themes echo through 1 John too. Connect these passages in your next study.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Recent Lookups" />
          <View style={styles.lookupCard}>
            <View style={styles.lookupIconWrap}>
              <Text style={styles.lookupIcon}>⌕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lookupTitle}>Recent Lookups</Text>
              <Text style={styles.lookupSubtitle}>Logos, Arche, Phos</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Suggested Verses" />
          <View style={styles.suggestionStack}>
            {['Matthew 6:25-34', 'Psalm 23:1-4', 'Philippians 4:6-7'].map((reference) => (
              <Pressable
                key={reference}
                onPress={() => navigateToReference(reference)}
                style={({ pressed }) => [styles.suggestionCard, pressed && styles.pressed]}>
                <Text style={styles.suggestionRef}>{reference}</Text>
                <Text style={styles.suggestionBody}>Locally surfaced for anxiety, care, and peace during transition.</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <ConcordanceModal entry={entry} onClose={() => setIsModalVisible(false)} visible={isModalVisible} />

      <Modal animationType="slide" onRequestClose={() => setIsBookPickerOpen(false)} transparent visible={isBookPickerOpen}>
        <View style={styles.modalScrim}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Book</Text>
              <Pressable onPress={() => setIsBookPickerOpen(false)}>
                <Ionicons color={palette.textMuted} name="close-outline" size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {BIBLE_BOOKS.map((bookName) => (
                <Pressable
                  key={bookName}
                  onPress={() => {
                    setBook(bookName);
                    setChapter(1);
                    setIsBookPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.bookItem,
                    bookName === book && styles.bookItemActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.bookItemText, bookName === book && styles.bookItemTextActive]}>
                    {bookName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 28,
    paddingBottom: 132,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  readerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
  },
  readerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  readerTitle: {
    color: '#292524',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  readerSubtitle: {
    color: '#A8A29E',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  readerTools: {
    gap: 8,
  },
  toolBubble: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    elevation: 2,
    height: 34,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    width: 34,
  },
  toolIcon: {
    color: '#44403C',
    fontSize: 14,
  },
  readerBody: {
    gap: 18,
  },
  verseText: {
    color: '#44403C',
    fontSize: 18,
    lineHeight: 29,
  },
  verseNumber: {
    color: '#44403C',
    fontSize: 12,
    fontWeight: '700',
  },
  annotatedWord: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 2,
    color: '#44403C',
  },
  section: {
    gap: 14,
  },
  marginCard: {
    backgroundColor: '#FBF2ED',
    borderColor: 'rgba(231,229,228,0.4)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
    padding: 24,
  },
  marginNote: {
    borderLeftColor: '#E5E7EB',
    borderLeftWidth: 2,
    gap: 6,
    paddingLeft: 18,
  },
  marginEyebrow: {
    color: '#A8A29E',
    fontSize: 12,
  },
  marginText: {
    color: '#57534E',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  marginSticky: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderColor: '#D6D3D1',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 16,
  },
  stickyText: {
    color: 'rgba(37,99,235,0.8)',
    fontSize: 18,
    lineHeight: 24,
  },
  lookupCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F5F5F4',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 24,
  },
  lookupIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  lookupIcon: {
    color: palette.blue,
    fontSize: 20,
  },
  lookupTitle: {
    color: '#292524',
    fontSize: 16,
    fontWeight: '500',
  },
  lookupSubtitle: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 2,
  },
  suggestionStack: {
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  suggestionRef: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionBody: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  modalScrim: {
    backgroundColor: palette.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalList: {
    padding: 12,
    paddingBottom: 40,
  },
  bookItem: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bookItemActive: {
    backgroundColor: palette.blueSoft,
  },
  bookItemText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '500',
  },
  bookItemTextActive: {
    color: palette.blue,
    fontWeight: '700',
  },
});
