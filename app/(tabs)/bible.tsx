import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { ConcordanceModal } from '@/src/components/concordance-modal';
import { Card, Screen, SectionTitle, TopBar } from '@/src/components/primitives';
import { BIBLE_BOOKS } from '@/src/data/bible-books';
import { getConcordanceEntry } from '@/src/data/concordance';
import { getBibleChapter, createNoteFromTemplate, getWorkspaceSnapshot, trackLookup, getRecentLookups } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { BibleVerse } from '@/src/types/domain';

function VerseParagraph({ verse, onOpenConcordance, isAnnotated }: { verse: BibleVerse; onOpenConcordance: (id: string) => void; isAnnotated?: boolean }) {
  const { colors } = useTheme();
  const base = [styles.verseText, { color: colors.textPrimary }] as any;
  const nb = [styles.verseNum, { color: colors.gold }];

  if (verse.reference === 'John 1:1') return (
    <Text style={base}><Text style={nb}>{verse.verse} </Text>In the <Text onLongPress={() => onOpenConcordance('entry-arche')} style={[styles.annotated, { backgroundColor: colors.accentSoft, borderBottomColor: colors.accent, color: colors.textPrimary }]}>beginning</Text> was the Word, and the Word was with God, and the Word was God.</Text>
  );
  if (verse.reference === 'John 1:4') return (
    <Text style={base}><Text style={nb}>{verse.verse} </Text>In him was life, and the life was the <Text onLongPress={() => onOpenConcordance('entry-phos')} style={[styles.annotated, { backgroundColor: colors.accentSoft, borderBottomColor: colors.accent, color: colors.textPrimary }]}>light</Text> of men.</Text>
  );
  return (
    <Text onLongPress={() => Alert.alert('Strong\u2019s Concordance', 'No Strong\u2019s entry available for this verse offline.')} style={[base, isAnnotated && { borderBottomColor: colors.borderStrong, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={nb}>{verse.verse} </Text>{verse.text}
    </Text>
  );
}

export default function BibleScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();
  const params = useLocalSearchParams<{ reference?: string }>();
  const { colors } = useTheme();

  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [visibleEntryId, setVisibleEntryId] = useState('entry-arche');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAnnotated, setIsAnnotated] = useState(false);
  const [verseSearchQuery, setVerseSearchQuery] = useState('');
  const [recentLookups, setRecentLookups] = useState<{ entryId: string; lookedUpAt: string }[]>([]);

  const chapterOpacity = useSharedValue(1);
  const chapterStyle = useAnimatedStyle(() => ({ opacity: chapterOpacity.value }));

  useEffect(() => { chapterOpacity.value = 0; chapterOpacity.value = withTiming(1, { duration: 300 }); }, [book, chapter, chapterOpacity]);
  useEffect(() => { if (params.reference) { const m = params.reference.match(/^(.*)\s+(\d+):(\d+)$/); if (m) { setBook(m[1]); setChapter(Number(m[2])); } } }, [params.reference]);
  useEffect(() => { let c = false; getBibleChapter(db, book, chapter).then((r) => { if (!c) setVerses(r); }); return () => { c = true; }; }, [book, chapter, db]);
  useEffect(() => { getRecentLookups(db).then(setRecentLookups); }, [db, isModalVisible]);

  const entry = useMemo(() => getConcordanceEntry(visibleEntryId), [visibleEntryId]);

  const navigateToReference = (ref: string) => {
    for (const bn of BIBLE_BOOKS) { if (ref.startsWith(bn + ' ')) { const r = ref.slice(bn.length + 1); const cm = r.match(/^(\d+)/); if (cm) { setBook(bn); setChapter(Number(cm[1])); return; } } }
  };

  return (
    <Screen>
      <TopBar leftIcon="menu-outline" rightIcon="person-outline" title="Selah Study" onLeftPress={() => setIsBookPickerOpen(true)} onRightPress={() => Alert.alert('Stillnote', 'Private study companion.')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={chapterStyle}>
          <Card>
            <View style={styles.readerCard}>
              <View style={styles.readerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.readerTitle, { color: colors.textPrimary }]}>{book} {chapter}:1-{Math.max(verses.length, 1)}</Text>
                  <Text style={[styles.readerSub, { color: colors.textTertiary }]}>King James Version</Text>
                </View>
                <View style={styles.readerTools}>
                  <AnimatedPressable haptic="light" onPress={async () => { const s = await getWorkspaceSnapshot(db, activeSpaceId); if (s.templates.length && s.threads.length) { const t = s.threads[0]; const tpl = s.templates.find((x) => x.threadHint === t.id) ?? s.templates[0]; const id = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: t.id, title: `${book} ${chapter} Notes` }); router.push(`/editor/${id}`); } }} style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons color={colors.textSecondary} name="create-outline" size={14} />
                  </AnimatedPressable>
                  <AnimatedPressable haptic="light" onPress={() => setIsSearchOpen((v) => !v)} style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons color={colors.textSecondary} name="search-outline" size={14} />
                  </AnimatedPressable>
                  <AnimatedPressable haptic="light" onPress={() => setIsAnnotated((v) => !v)} style={[styles.toolBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, isAnnotated && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                    <Ionicons color={isAnnotated ? colors.accent : colors.textSecondary} name="ellipse-outline" size={14} />
                  </AnimatedPressable>
                </View>
              </View>

              {isSearchOpen ? (
                <View style={[styles.verseSearchBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <TextInput onChangeText={setVerseSearchQuery} placeholder="Search within chapter…" placeholderTextColor={colors.textTertiary} style={[styles.verseSearchInput, { color: colors.textPrimary }]} value={verseSearchQuery} />
                  {verseSearchQuery.trim() ? <AnimatedPressable onPress={() => setVerseSearchQuery('')}><Ionicons color={colors.textSecondary} name="close-outline" size={16} /></AnimatedPressable> : null}
                </View>
              ) : null}

              <View style={styles.readerBody}>
                {verses.filter((v) => verseSearchQuery.trim() ? v.text.toLowerCase().includes(verseSearchQuery.toLowerCase()) || String(v.verse).includes(verseSearchQuery) : true).slice(0, 5).map((v) => (
                  <VerseParagraph key={v.reference} isAnnotated={isAnnotated} onOpenConcordance={(entryId) => { setVisibleEntryId(entryId); setIsModalVisible(true); trackLookup(db, entryId); }} verse={v} />
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        <View style={styles.section}>
          <SectionTitle title="Margin Notes" />
          <View style={[styles.marginCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent + '20' }]}>
            <View style={[styles.marginNote, { borderLeftColor: colors.accent }]}>
              <Text style={[styles.marginEyebrow, { color: colors.textTertiary }]}>v.1 Logos Connection</Text>
              <Text style={[styles.marginText, { color: colors.textPrimary }]}>The Greek word &ldquo;Logos&rdquo; implies both reason and speech. Christ is the communicative heart of God.</Text>
            </View>
            <View style={[styles.marginSticky, { backgroundColor: colors.bgCard, borderColor: colors.borderStrong }]}>
              <Text style={[styles.stickyText, { color: colors.accent }]}>&ldquo;Life and Light&rdquo; themes echo through 1 John too. Connect these passages in your next study.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Recent Lookups" />
          <View style={[styles.lookupCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.lookupIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons color={colors.accent} name="search-outline" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lookupTitle, { color: colors.textPrimary }]}>Recent Lookups</Text>
              {recentLookups.length ? (
                <View style={styles.lookupChips}>
                  {recentLookups.map((l) => { const e = getConcordanceEntry(l.entryId); return (
                    <AnimatedPressable key={l.entryId} onPress={() => { setVisibleEntryId(l.entryId); setIsModalVisible(true); trackLookup(db, l.entryId); }} style={[styles.lookupChip, { backgroundColor: colors.accentSoft }]}>
                      <Text style={[styles.lookupChipText, { color: colors.accent }]}>{e?.transliteration ?? l.entryId}</Text>
                    </AnimatedPressable>
                  );})}
                </View>
              ) : <Text style={[styles.lookupSub, { color: colors.textSecondary }]}>No lookups yet. Long-press a verse.</Text>}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Suggested Verses" />
          <View style={styles.suggestionStack}>
            {['Matthew 6:25-34', 'Psalm 23:1-4', 'Philippians 4:6-7'].map((ref) => (
              <AnimatedPressable key={ref} onPress={() => navigateToReference(ref)} style={({ pressed }) => [styles.suggestionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
                <Text style={[styles.suggestionRef, { color: colors.accent }]}>{ref}</Text>
                <Text style={[styles.suggestionBody, { color: colors.textSecondary }]}>Locally surfaced for study.</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <ConcordanceModal entry={entry} onClose={() => setIsModalVisible(false)} visible={isModalVisible} />

      <Modal animationType="slide" visible={isBookPickerOpen} transparent onRequestClose={() => setIsBookPickerOpen(false)}>
        <View style={[styles.bookScrim, { backgroundColor: colors.scrim }]}>
          <View style={[styles.bookPanel, { backgroundColor: colors.bgElevated }]}>
            <View style={[styles.bookHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.bookTitle, { color: colors.textPrimary }]}>Select Book</Text>
              <AnimatedPressable onPress={() => setIsBookPickerOpen(false)}><Ionicons color={colors.textSecondary} name="close-outline" size={22} /></AnimatedPressable>
            </View>
            <ScrollView contentContainerStyle={styles.bookList}>
              {BIBLE_BOOKS.map((bn) => (
                <AnimatedPressable key={bn} onPress={() => { setBook(bn); setChapter(1); setIsBookPickerOpen(false); }} style={[styles.bookItem, bn === book && { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.bookItemText, { color: bn === book ? colors.accent : colors.textPrimary }, bn === book && { fontFamily: 'DMSans_500Medium' }]}>{bn}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28, paddingBottom: 132, paddingHorizontal: 24, paddingTop: 24 },
  readerCard: { padding: 20 },
  readerHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  readerTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 22 },
  readerSub: { fontFamily: 'DMSans_400Regular', fontSize: 11, letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
  readerTools: { gap: 8 },
  toolBtn: { alignItems: 'center', borderRadius: 100, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 },
  readerBody: { gap: 20 },
  verseText: { fontFamily: 'LibreBaskerville_400Regular', fontSize: 18, lineHeight: 32 },
  verseNum: { fontFamily: 'DMSans_500Medium', fontSize: 10, fontWeight: '700' },
  annotated: { borderBottomWidth: 2 },
  verseSearchBar: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 16, paddingHorizontal: 12, paddingVertical: 8 },
  verseSearchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  section: { gap: 16 },
  marginCard: { borderRadius: 16, borderWidth: 1, gap: 18, padding: 18 },
  marginNote: { borderLeftWidth: 2, gap: 6, paddingLeft: 14 },
  marginEyebrow: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  marginText: { fontFamily: 'DMSans_400Regular', fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  marginSticky: { borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, padding: 14 },
  stickyText: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22 },
  lookupCard: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 16 },
  lookupIcon: { alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  lookupTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14 },
  lookupSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  lookupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  lookupChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  lookupChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  suggestionStack: { gap: 10 },
  suggestionCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  suggestionRef: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 14, marginBottom: 4 },
  suggestionBody: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  bookScrim: { flex: 1, justifyContent: 'flex-end' },
  bookPanel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  bookHeader: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  bookTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18 },
  bookList: { padding: 12, paddingBottom: 40 },
  bookItem: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  bookItemText: { fontFamily: 'DMSans_400Regular', fontSize: 15 },
  pressed: { opacity: 0.85 },
});
