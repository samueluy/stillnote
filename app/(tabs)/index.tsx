import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { Card, EmptyState, FloatingActionButton, PageScroll, Pill, Screen, SearchField, SectionTitle, SmartCollectionRow, TagChip, TextButton, ThreadRow, TopBar } from '@/src/components/primitives';
import { createNoteFromTemplate, createTag, createThread, getNotesByCollection, getWorkspaceSnapshot, searchEverything } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { Note, SearchResult, WorkspaceSnapshot } from '@/src/types/domain';

export default function WorkspaceScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, setActiveSpaceId, refreshToken } = useAppState();
  const { colors } = useTheme();

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const collectionSheetRef = useRef<BottomSheetModal>(null);
  const collectionSnapPoints = useMemo(() => ['50%', '92%'], []);
  const scrollRef = useRef<ScrollView>(null);
  const deferredQuery = useDeferredValue(query);

  const fabPulse = useSharedValue(1);
  const fabPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabPulse.value }] }));

  useEffect(() => {
    if (snapshot && snapshot.threads.length === 0) {
      fabPulse.value = withRepeat(withSequence(withTiming(1.05, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
    } else {
      fabPulse.value = withTiming(1);
    }
  }, [snapshot, fabPulse]);

  const loadSnapshot = useCallback(async () => {
    setSnapshot(await getWorkspaceSnapshot(db, activeSpaceId));
  }, [activeSpaceId, db]);

  useFocusEffect(useCallback(() => { loadSnapshot(); }, [loadSnapshot]));
  useEffect(() => { loadSnapshot(); }, [loadSnapshot, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    async function runSearch() {
      if (!deferredQuery.trim()) { setResults([]); return; }
      const nextResults = await searchEverything(db, activeSpaceId, deferredQuery);
      if (!cancelled) setResults(nextResults);
    }
    runSearch();
    return () => { cancelled = true; };
  }, [activeSpaceId, db, deferredQuery]);

  const openCollection = useCallback(async (collection: 'all' | 'favorites' | 'recent', title: string) => {
    const notes = await getNotesByCollection(db, activeSpaceId, collection);
    setCollectionTitle(title);
    setCollectionNotes(notes);
    collectionSheetRef.current?.present();
  }, [activeSpaceId, db]);

  return (
    <Screen>
      <TopBar title="Stillnote" onRightPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
      <PageScroll ref={scrollRef}>
        <View style={styles.spaceRow}>
          {snapshot?.spaces.map((space) => (
            <Pill key={space.id} active={space.id === activeSpaceId} label={space.name} onPress={() => setActiveSpaceId(space.id)} />
          ))}
        </View>

        <SearchField onChangeText={setQuery} placeholder="Search notes, tags, or scripture" value={query} />

        {deferredQuery.trim() ? (
          <Card>
            <SectionTitle title="SEARCH RESULTS" />
            {results.length ? results.map((r) => (
              <AnimatedPressable key={`${r.type}-${r.id}`} onPress={() => r.type === 'note' ? router.push(`/editor/${r.id}`) : router.push({ pathname: '/(tabs)/bible', params: { reference: r.title } })} style={({ pressed }) => [styles.searchResult, pressed && styles.pressed]}>
                <View style={[styles.searchIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons color={colors.accent} name={r.type === 'note' ? 'document-text-outline' : 'book-outline'} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.searchTitle, { color: colors.textPrimary }]}>{r.title}</Text>
                  <Text numberOfLines={2} style={[styles.searchText, { color: colors.textSecondary }]}>{r.body}</Text>
                </View>
              </AnimatedPressable>
            )) : <EmptyState title="Nothing surfaced yet" subtitle="Try a thread name, a theme, or a verse like John 1:1." />}
          </Card>
        ) : null}

        {!deferredQuery.trim() && snapshot ? (
          <>
            <Card>
              <SmartCollectionRow count={snapshot.collectionCounts.allNotes} icon="document-text-outline" label="All Notes" onPress={() => openCollection('all', 'All Notes')} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SmartCollectionRow count={snapshot.collectionCounts.favorites} icon="heart-outline" label="Favorites" onPress={() => openCollection('favorites', 'Favorites')} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SmartCollectionRow count={snapshot.collectionCounts.recent} icon="time-outline" label="Recent" onPress={() => openCollection('recent', 'Recent')} />
            </Card>

            <View style={styles.sectionGap}>
              <SectionTitle title="My Threads" />
              <Card>
                {snapshot.threads.map((thread, i) => (
                  <View key={thread.id}>
                    <ThreadRow accent={thread.accent} count={thread.noteCount} icon={thread.icon as any} name={thread.name} onPress={async () => {
                      const tpl = snapshot.templates.find((t) => t.threadHint === thread.id) ?? snapshot.templates[0];
                      const id = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: thread.id });
                      router.push(`/editor/${id}`);
                    }} />
                    {i < snapshot.threads.length - 1 ? <View style={[styles.threadDiv, { backgroundColor: colors.border }]} /> : null}
                  </View>
                ))}
              </Card>
              <TextButton icon="add-outline" label="New Thread" onPress={async () => {
                const thread = await createThread(db, { spaceId: activeSpaceId });
                const tpl = snapshot.templates.find((t) => t.threadHint === thread.id) ?? snapshot.templates[0];
                const id = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: thread.id, title: `${thread.name} Note` });
                await loadSnapshot();
                router.push(`/editor/${id}`);
              }} />
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="Study Frameworks" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frameworkScroll}>
                {snapshot.templates.map((tpl) => (
                  <AnimatedPressable key={tpl.id} onPress={async () => {
                    const thread = snapshot.threads.find((t) => t.id === tpl.threadHint) ?? snapshot.threads[0];
                    const id = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: thread.id });
                    router.push(`/editor/${id}`);
                  }} style={({ pressed }) => [styles.frameworkCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, pressed && styles.pressed]}>
                    <View style={[styles.frameworkStrip, { backgroundColor: colors.accent }]} />
                    <View style={[styles.frameworkIcon, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons color={colors.accent} name={tpl.icon as any} size={18} />
                    </View>
                    <Text style={[styles.frameworkName, { color: colors.textPrimary }]}>{tpl.name}</Text>
                    <Text style={[styles.frameworkDesc, { color: colors.textSecondary }]} numberOfLines={2}>{tpl.description}</Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>

            {snapshot.dailyVerse ? (
              <View style={styles.sectionGap}>
                <SectionTitle title="Daily Verse" />
                <AnimatedPressable onPress={() => { if (snapshot?.dailyVerse) router.push({ pathname: '/(tabs)/bible', params: { reference: snapshot.dailyVerse.reference } }); }} style={({ pressed }) => [styles.promptCard, { backgroundColor: colors.goldSoft, borderColor: colors.gold + '20' }, pressed && styles.pressed]}>
                  <Text style={[styles.promptRef, { color: colors.gold }]}>{snapshot.dailyVerse.reference}</Text>
                  <Text style={[styles.promptText, { color: colors.textPrimary }]}>{snapshot.dailyVerse.text}</Text>
                </AnimatedPressable>
              </View>
            ) : null}

            <View style={styles.sectionGap}>
              <SectionTitle title="Tags" />
              <View style={styles.tagsWrap}>
                {snapshot.tags.map((tag) => (<TagChip key={tag.id} label={`#${tag.name}`} />))}
                <TagChip label="Tag" outlined onPress={() => {
                  if (Alert.prompt) { Alert.prompt('Create Tag', 'Enter a tag name:', (name) => { if (name?.trim()) createTag(db, name.trim()).then(loadSnapshot); }); }
                  else { Alert.alert('Create Tag', 'Use #hashtag syntax in any note to auto-create it.'); }
                }} />
              </View>
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="Recent Notes" />
              <View style={styles.templateStack}>
                {snapshot.recentNotes.map((note) => (
                  <AnimatedPressable key={note.id} onPress={() => router.push(`/editor/${note.id}`)} style={({ pressed }) => [styles.noteCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
                    <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>{note.title}</Text>
                    <Text numberOfLines={3} style={[styles.noteText, { color: colors.textSecondary }]}>{note.plainText}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </PageScroll>
      <Animated.View style={fabPulseStyle}>
        <FloatingActionButton icon="add-outline" onPress={() => {
          if (!snapshot?.templates.length || !snapshot.threads.length) return;
          const t = snapshot.threads[0];
          const tpl = snapshot.templates.find((x) => x.threadHint === t.id) ?? snapshot.templates[0];
          createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: t.id, title: t.name === 'Personal Journal' ? 'Fresh Reflection' : `New ${t.name} Note` }).then((id) => router.push(`/editor/${id}`));
        }} />
      </Animated.View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  threadDiv: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  sectionGap: { gap: 12 },
  templateStack: { gap: 16 },
  frameworkScroll: { gap: 16, paddingRight: 24 },
  frameworkCard: { borderRadius: 16, borderWidth: 1, width: 150, overflow: 'hidden', gap: 10, paddingHorizontal: 14, paddingVertical: 16 },
  frameworkStrip: { height: 4, marginTop: -16, marginHorizontal: -14, width: '100%' },
  frameworkIcon: { alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  frameworkName: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 14, lineHeight: 20 },
  frameworkDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16 },
  promptCard: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  promptRef: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 14 },
  promptText: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 24 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteCard: { borderRadius: 16, borderWidth: 1, gap: 8, padding: 20 },
  noteTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15 },
  noteText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  searchResult: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  searchIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  searchTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14 },
  searchText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  sheetHandle: { height: 4, width: 36, borderRadius: 100 },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  sheetTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18, paddingBottom: 12, paddingTop: 4 },
  sheetNote: { borderRadius: 14, borderWidth: 1, gap: 6, padding: 14 },
  sheetNoteTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15 },
  sheetNoteText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.85 },
});
