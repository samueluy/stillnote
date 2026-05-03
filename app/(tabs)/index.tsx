import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { EmptyState, Screen, SearchField, TopBar } from '@/src/components/primitives';
import { createNoteFromTemplate, getNotesByCollection, getWorkspaceSnapshot, searchEverything } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { Note, SearchResult, WorkspaceSnapshot } from '@/src/types/domain';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WorkspaceScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, setActiveSpaceId, refreshToken, themeMode, setThemeMode } = useAppState();
  const { colors } = useTheme();

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const collectionSheetRef = useRef<BottomSheetModal>(null);
  const collectionSnapPoints = useMemo(() => ['40%', '75%'], []);
  const scrollRef = useRef<ScrollView>(null);
  const deferredQuery = useDeferredValue(query);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const loadSnapshot = useCallback(async () => {
    setSnapshot(await getWorkspaceSnapshot(db, activeSpaceId));
  }, [activeSpaceId, db]);

  useFocusEffect(useCallback(() => { loadSnapshot(); }, [loadSnapshot]));
  useEffect(() => { loadSnapshot(); }, [loadSnapshot, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    async function runSearch() {
      if (!deferredQuery.trim()) { setResults([]); return; }
      const r = await searchEverything(db, activeSpaceId, deferredQuery);
      if (!cancelled) setResults(r);
    }
    runSearch();
    return () => { cancelled = true; };
  }, [activeSpaceId, db, deferredQuery]);

  const [isSpacePickerOpen, setIsSpacePickerOpen] = useState(false);

  const createQuickNote = useCallback(async () => {
    if (!snapshot?.templates.length || !snapshot.threads.length) return;
    const t = snapshot.threads[0];
    const tpl = snapshot.templates.find((x) => x.threadHint === t.id) ?? snapshot.templates[0];
    const id = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: t.id, title: t.name === 'Personal Journal' ? 'Fresh Reflection' : `New ${t.name} Note` });
    router.push(`/editor/${id}`);
  }, [activeSpaceId, db, router, snapshot]);

  const openCollection = useCallback(async (collection: 'all' | 'favorites' | 'recent', title: string) => {
    const notes = await getNotesByCollection(db, activeSpaceId, collection);
    setCollectionTitle(title);
    setCollectionNotes(notes);
    collectionSheetRef.current?.present();
  }, [activeSpaceId, db]);

  const allNotes = snapshot?.recentNotes ?? [];

  return (
    <Screen>
      <TopBar
        title={snapshot?.spaces.find((s) => s.id === activeSpaceId)?.name ?? 'Journal'}
        rightIcon="settings-outline"
        onRightPress={() => setIsSpacePickerOpen(true)}
        scrollY={scrollY}
      />
      <PageScroll innerRef={scrollRef} onScroll={scrollHandler} paddingTop={72}>
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: colors.textPrimary }]}>{getGreeting()}</Text>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <AnimatedPressable haptic="medium" onPress={createQuickNote} style={({ pressed }) => [styles.ctaCard, { backgroundColor: colors.bgElevated }, pressed && styles.pressed]}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons color={colors.accent} name="add-outline" size={22} />
          </View>
          <View style={styles.ctaBody}>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>New Entry</Text>
            <Text style={[styles.ctaSubtitle, { color: colors.textTertiary }]}>Start writing your reflection…</Text>
          </View>
          <Ionicons color={colors.accent} name="chevron-forward-outline" size={16} />
        </AnimatedPressable>

        <SearchField onChangeText={setQuery} placeholder="Search notes, tags, or scripture" value={query} />

        {deferredQuery.trim() ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Results</Text>
            {results.length ? results.map((r) => (
              <AnimatedPressable key={`${r.type}-${r.id}`} onPress={() => r.type === 'note' ? router.push(`/editor/${r.id}`) : router.push({ pathname: '/(tabs)/bible', params: { reference: r.title } })} style={({ pressed }) => [styles.resultCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
                <View style={[styles.resultIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons color={colors.accent} name={r.type === 'note' ? 'document-text-outline' : 'book-outline'} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{r.title}</Text>
                  <Text numberOfLines={2} style={[styles.resultText, { color: colors.textSecondary }]}>{r.body}</Text>
                </View>
              </AnimatedPressable>
            )) : <EmptyState title="Nothing surfaced" subtitle="Try a different search term." />}
          </View>
        ) : null}

        {!deferredQuery.trim() && snapshot ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Entries</Text>
              {allNotes.length ? allNotes.map((note) => (
                <AnimatedPressable key={note.id} haptic="light" onPress={() => router.push(`/editor/${note.id}`)} style={({ pressed }) => [styles.noteCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>{note.title || 'Untitled'}</Text>
                    <Text style={[styles.noteTime, { color: colors.textTertiary }]}>
                      {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.notePreview, { color: colors.textSecondary }]}>{note.plainText || 'Empty note'}</Text>
                </AnimatedPressable>
              )) : (
                <EmptyState title="Your journal is waiting" subtitle="Tap 'Start writing' above to create your first entry." />
              )}
            </View>

            {snapshot.dailyVerse ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Daily Verse</Text>
                <AnimatedPressable onPress={() => router.push({ pathname: '/(tabs)/bible', params: { reference: snapshot.dailyVerse!.reference } })} style={({ pressed }) => [styles.verseCard, { backgroundColor: colors.goldSoft, borderColor: colors.gold + '20' }, pressed && styles.pressed]}>
                  <Text style={[styles.verseRef, { color: colors.gold }]}>{snapshot.dailyVerse.reference}</Text>
                  <Text style={[styles.verseText, { color: colors.textPrimary }]}>{snapshot.dailyVerse.text}</Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </>
        ) : null}
      </PageScroll>

      <BottomSheetModal ref={collectionSheetRef} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />} handleIndicatorStyle={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} snapPoints={collectionSnapPoints}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{collectionTitle}</Text>
          {collectionNotes.length ? collectionNotes.map((note) => (
            <AnimatedPressable key={note.id} haptic="light" onPress={() => { collectionSheetRef.current?.dismiss(); router.push(`/editor/${note.id}`); }} style={({ pressed }) => [styles.sheetNote, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.sheetNoteTitle, { color: colors.textPrimary }]}>{note.title}</Text>
              <Text numberOfLines={2} style={[styles.sheetNoteText, { color: colors.textSecondary }]}>{note.plainText || 'Empty note'}</Text>
            </AnimatedPressable>
          )) : <EmptyState title="Nothing here yet" subtitle="No notes found in this collection." />}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <Modal animationType="slide" visible={isSpacePickerOpen} transparent onRequestClose={() => setIsSpacePickerOpen(false)}>
        <View style={[styles.spaceScrim, { backgroundColor: colors.scrim }]}>
          <View style={[styles.spacePanel, { backgroundColor: colors.bgElevated }]}>
            <View style={[styles.spaceHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.spaceTitle, { color: colors.textPrimary }]}>Spaces & Settings</Text>
              <AnimatedPressable onPress={() => setIsSpacePickerOpen(false)}>
                <Ionicons color={colors.textSecondary} name="close-outline" size={22} />
              </AnimatedPressable>
            </View>
            <ScrollView contentContainerStyle={styles.spaceList}>
              <Text style={[styles.spaceSectionTitle, { color: colors.textTertiary }]}>Your Spaces</Text>
              {snapshot?.spaces.map((space) => (
                <AnimatedPressable key={space.id} haptic="light" onPress={() => { setActiveSpaceId(space.id); setIsSpacePickerOpen(false); }} style={[styles.spaceRow, { backgroundColor: space.id === activeSpaceId ? colors.accentSoft : 'transparent' }]}>
                  <View style={[styles.spaceDot, { backgroundColor: space.id === activeSpaceId ? colors.accent : colors.borderStrong }]} />
                  <Text style={[styles.spaceName, { color: space.id === activeSpaceId ? colors.accent : colors.textPrimary }]}>{space.name}</Text>
                  {space.id === activeSpaceId ? <Ionicons color={colors.accent} name="checkmark-outline" size={16} /> : null}
                </AnimatedPressable>
              ))}
              <View style={[styles.spaceDiv, { backgroundColor: colors.border }]} />
              <Text style={[styles.spaceSectionTitle, { color: colors.textTertiary }]}>Theme</Text>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <AnimatedPressable
                  key={mode}
                  haptic="light"
                  onPress={() => setThemeMode(mode)}
                  style={[styles.spaceRow, { backgroundColor: themeMode === mode ? colors.accentSoft : 'transparent' }]}>
                  <View style={[styles.spaceDot, { backgroundColor: themeMode === mode ? colors.accent : colors.borderStrong }]} />
                  <Text style={[styles.spaceName, { color: themeMode === mode ? colors.accent : colors.textPrimary }]}>
                    {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                  </Text>
                  {themeMode === mode ? <Ionicons color={colors.accent} name="checkmark-outline" size={16} /> : null}
                </AnimatedPressable>
              ))}
              <View style={[styles.spaceDiv, { backgroundColor: colors.border }]} />
              <Text style={[styles.spaceSectionTitle, { color: colors.textTertiary }]}>About</Text>
              <View style={styles.aboutBlock}>
                <Text style={[styles.aboutText, { color: colors.textSecondary }]}>Your notes, tags, Bible content, and concordance lookups stay on your device — persisted in SQLite.</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function PageScroll({ children, innerRef, onScroll, paddingTop }: { children: React.ReactNode; innerRef?: React.RefObject<ScrollView | null>; onScroll?: any; paddingTop?: number }) {
  const { colors } = useTheme();
  return (
    <Animated.ScrollView
      ref={innerRef as any}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg, paddingTop: paddingTop ?? 0 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4, gap: 28 },
  greeting: { gap: 4, paddingTop: 8 },
  greetingText: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 24, lineHeight: 32 },
  dateText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
  ctaCard: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingVertical: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  ctaIcon: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  ctaBody: { flex: 1, gap: 4 },
  ctaTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 17 },
  ctaSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13 },
  quickActions: { display: 'none' },
  quickBtn: { display: 'none' },
  quickLabel: { display: 'none' },
  section: { gap: 16 },
  sectionTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  resultCard: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  resultIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  resultTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14 },
  resultText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  noteCard: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 16, marginBottom: 4 },
  noteHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  noteTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 16 },
  noteTime: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  notePreview: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  verseCard: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 18 },
  verseRef: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 14 },
  verseText: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 24 },
  sheetHandle: { borderRadius: 100, height: 4, width: 36 },
  sheetContent: { gap: 8, paddingBottom: 40, paddingHorizontal: 16 },
  sheetTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18, paddingBottom: 12, paddingTop: 4 },
  sheetNote: { borderRadius: 14, borderWidth: 1, gap: 6, padding: 14 },
  sheetNoteTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15 },
  sheetNoteText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.85 },
  spaceScrim: { flex: 1, justifyContent: 'flex-end' },
  spacePanel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  spaceHeader: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  spaceTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18 },
  spaceList: { gap: 4, padding: 16, paddingBottom: 40 },
  spaceSectionTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13, marginBottom: 4 },
  spaceRow: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  spaceDot: { borderRadius: 100, height: 8, width: 8 },
  spaceName: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15 },
  spaceDiv: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  aboutBlock: { padding: 4 },
  aboutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
});
