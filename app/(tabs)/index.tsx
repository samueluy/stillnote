import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';

import {
  Card,
  EmptyState,
  FloatingActionButton,
  PageScroll,
  Pill,
  Screen,
  SearchField,
  SectionTitle,
  SmartCollectionRow,
  TagChip,
  TextButton,
  ThreadRow,
  TopBar,
  palette,
} from '@/src/components/primitives';
import { AnimatedPressable } from '@/src/components/animated-pressable';
import {
  createNoteFromTemplate,
  createTag,
  createThread,
  getNotesByCollection,
  getWorkspaceSnapshot,
  searchEverything,
} from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { Note, SearchResult, WorkspaceSnapshot } from '@/src/types/domain';

export default function WorkspaceScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, setActiveSpaceId, refreshToken } = useAppState();

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const collectionSheetRef = useRef<BottomSheetModal>(null);
  const collectionSnapPoints = useMemo(() => ['45%', '90%'], []);

  const scrollRef = useRef<ScrollView>(null);

  const deferredQuery = useDeferredValue(query);

  const loadSnapshot = useCallback(async () => {
    setSnapshot(await getWorkspaceSnapshot(db, activeSpaceId));
  }, [activeSpaceId, db]);

  useFocusEffect(
    useCallback(() => {
      loadSnapshot();
    }, [loadSnapshot])
  );

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!deferredQuery.trim()) {
        setResults([]);
        return;
      }

      const nextResults = await searchEverything(db, activeSpaceId, deferredQuery);
      if (!cancelled) {
        setResults(nextResults);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, db, deferredQuery]);

  const createQuickNote = useCallback(async () => {
    if (!snapshot?.templates.length || !snapshot.threads.length) {
      return;
    }

    const thread = snapshot.threads[0];
    const template =
      snapshot.templates.find((item) => item.threadHint === thread.id) ?? snapshot.templates[0];
    const noteId = await createNoteFromTemplate(db, {
      templateId: template.id,
      spaceId: activeSpaceId,
      threadId: thread.id,
      title: thread.name === 'Personal Journal' ? 'Fresh Reflection' : `New ${thread.name} Note`,
    });
    router.push(`/editor/${noteId}`);
  }, [activeSpaceId, db, router, snapshot]);

  const openCollection = useCallback(async (collection: 'all' | 'favorites' | 'recent', title: string) => {
    const notes = await getNotesByCollection(db, activeSpaceId, collection);
    setCollectionTitle(title);
    setCollectionNotes(notes);
    collectionSheetRef.current?.present();
  }, [activeSpaceId, db]);

  return (
    <Screen>
      <TopBar
        title="Stillnote"
        onLeftPress={() =>
          Alert.alert('Stillnote', 'Private study companion.\nYour notes stay on your device.')
        }
        onRightPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
      />
      <PageScroll ref={scrollRef}>
        <View style={styles.spaceRow}>
          {snapshot?.spaces.map((space) => (
            <Pill
              active={space.id === activeSpaceId}
              key={space.id}
              label={space.name}
              onPress={() => setActiveSpaceId(space.id)}
            />
          ))}
        </View>

        <SearchField
          onChangeText={setQuery}
          placeholder="Search notes, tags, or scripture"
          value={query}
        />

        {deferredQuery.trim() ? (
          <Card>
            <SectionTitle title="Search Results" />
            {results.length ? (
              results.map((result) => (
                <AnimatedPressable
                  key={`${result.type}-${result.id}`}
                  onPress={() =>
                    result.type === 'note'
                      ? router.push(`/editor/${result.id}`)
                      : router.push({
                          pathname: '/(tabs)/bible',
                          params: { reference: result.title },
                        })
                  }
                  style={({ pressed }) => [styles.searchResult, pressed && styles.pressed]}>
                  <View style={styles.searchResultIcon}>
                    <Ionicons
                      color={result.type === 'note' ? palette.blue : palette.success}
                      name={result.type === 'note' ? 'document-text-outline' : 'book-outline'}
                      size={16}
                    />
                  </View>
                  <View style={styles.searchResultBody}>
                    <Text style={styles.searchResultTitle}>{result.title}</Text>
                    <Text numberOfLines={2} style={styles.searchResultText}>
                      {result.body}
                    </Text>
                  </View>
                </AnimatedPressable>
              ))
            ) : (
              <EmptyState
                subtitle="Try a thread name, a theme, or a verse like John 1:1."
                title="Nothing surfaced yet"
              />
            )}
          </Card>
        ) : null}

        {!deferredQuery.trim() && snapshot ? (
          <>
            <Card>
              <SmartCollectionRow
                count={snapshot.collectionCounts.allNotes}
                icon="document-text-outline"
                label="All Notes"
                onPress={() => openCollection('all', 'All Notes')}
              />
              <View style={styles.divider} />
              <SmartCollectionRow
                count={snapshot.collectionCounts.favorites}
                icon="heart-outline"
                label="Favorites"
                onPress={() => openCollection('favorites', 'Favorites')}
              />
              <View style={styles.divider} />
              <SmartCollectionRow
                count={snapshot.collectionCounts.recent}
                icon="time-outline"
                label="Recent"
                onPress={() => openCollection('recent', 'Recent')}
              />
            </Card>

            <View style={styles.sectionGap}>
              <SectionTitle title="My Threads" />
              <Card>
                {snapshot.threads.map((thread, index) => (
                  <View key={thread.id}>
                    <ThreadRow
                      accent={thread.accent}
                      count={thread.noteCount}
                      icon={thread.icon as any}
                      name={thread.name}
                      onPress={async () => {
                        const template =
                          snapshot.templates.find((item) => item.threadHint === thread.id) ??
                          snapshot.templates[0];
                        const noteId = await createNoteFromTemplate(db, {
                          templateId: template.id,
                          spaceId: activeSpaceId,
                          threadId: thread.id,
                        });
                        router.push(`/editor/${noteId}`);
                      }}
                    />
                    {index < snapshot.threads.length - 1 ? <View style={styles.threadDivider} /> : null}
                  </View>
                ))}
              </Card>
              <TextButton
                icon="add-outline"
                label="New Thread"
                onPress={async () => {
                  const thread = await createThread(db, { spaceId: activeSpaceId });
                  const template =
                    snapshot.templates.find((item) => item.threadHint === thread.id) ??
                    snapshot.templates[0];
                  const noteId = await createNoteFromTemplate(db, {
                    templateId: template.id,
                    spaceId: activeSpaceId,
                    threadId: thread.id,
                    title: `${thread.name} Note`,
                  });
                  await loadSnapshot();
                  router.push(`/editor/${noteId}`);
                }}
              />
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="Study Frameworks" />
              <View style={styles.templateStack}>
                {snapshot.templates.map((template) => (
                  <AnimatedPressable
                    key={template.id}
                    onPress={async () => {
                      const thread =
                        snapshot.threads.find((item) => item.id === template.threadHint) ??
                        snapshot.threads[0];
                      const noteId = await createNoteFromTemplate(db, {
                        templateId: template.id,
                        spaceId: activeSpaceId,
                        threadId: thread.id,
                      });
                      router.push(`/editor/${noteId}`);
                    }}
                    style={({ pressed }) => [styles.templateCard, pressed && styles.pressed]}>
                    <View style={styles.templateIconWrap}>
                      <Ionicons color={palette.blue} name={template.icon as any} size={18} />
                    </View>
                    <View style={styles.templateBody}>
                      <Text style={styles.templateTitle}>{template.name}</Text>
                      <Text style={styles.templateText}>{template.description}</Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            {snapshot.dailyVerse ? (
              <View style={styles.sectionGap}>
                <SectionTitle title="Daily Verse Prompt" />
                <AnimatedPressable
                  onPress={() => {
                    if (snapshot?.dailyVerse) {
                      router.push({
                        pathname: '/(tabs)/bible',
                        params: { reference: snapshot.dailyVerse.reference },
                      });
                    }
                  }}
                  style={({ pressed }) => [styles.promptCard, pressed && styles.pressed]}>
                  <Text style={styles.promptReference}>{snapshot.dailyVerse.reference}</Text>
                  <Text style={styles.promptText}>{snapshot.dailyVerse.text}</Text>
                </AnimatedPressable>
              </View>
            ) : null}

            <View style={styles.sectionGap}>
              <SectionTitle
                title="Automated Tags"
                actionIcon="ellipsis-horizontal"
                onActionPress={() =>
                  Alert.alert('Tags', 'Tags are auto-extracted from #hashtags typed in your notes. Type # followed by a word in any note body to create a tag.')
                }
              />
              <View style={styles.tagsWrap}>
                {snapshot.tags.map((tag) => (
                  <TagChip key={tag.id} label={`#${tag.name}`} />
                ))}
                <TagChip
                  label="Tag"
                  outlined
                  onPress={() => {
                    if (Alert.prompt) {
                      Alert.prompt('Create Tag', 'Enter a tag name:', (name) => {
                        if (name?.trim()) {
                          createTag(db, name.trim()).then(loadSnapshot);
                        }
                      });
                    } else {
                      Alert.alert('Create Tag', 'Tag creation from notes uses #tag syntax. Type #YourTag in any note to auto-create it.');
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="Recent Notes" />
              <View style={styles.templateStack}>
                {snapshot.recentNotes.map((note) => (
                  <AnimatedPressable
                    key={note.id}
                    onPress={() => router.push(`/editor/${note.id}`)}
                    style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}>
                    <Text style={styles.noteCardTitle}>{note.title}</Text>
                    <Text numberOfLines={3} style={styles.noteCardText}>
                      {note.plainText}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </PageScroll>
      <FloatingActionButton icon="add-outline" onPress={createQuickNote} />

      <BottomSheetModal
        ref={collectionSheetRef}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />
        )}
        handleIndicatorStyle={styles.sheetHandle}
        snapPoints={collectionSnapPoints}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{collectionTitle}</Text>
          </View>
          {collectionNotes.length ? (
            collectionNotes.map((note) => (
              <AnimatedPressable
                key={note.id}
                haptic="light"
                onPress={() => {
                  collectionSheetRef.current?.dismiss();
                  router.push(`/editor/${note.id}`);
                }}
                style={({ pressed }) => [styles.sheetNote, pressed && styles.pressed]}>
                <Text style={styles.sheetNoteTitle}>{note.title}</Text>
                <Text numberOfLines={2} style={styles.sheetNoteText}>
                  {note.plainText || 'Empty note'}
                </Text>
              </AnimatedPressable>
            ))
          ) : (
            <EmptyState subtitle="No notes found in this collection." title="Nothing here yet" />
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: 'rgba(193,198,214,0.2)',
    height: 1,
    marginLeft: 60,
  },
  threadDivider: {
    backgroundColor: 'rgba(193,198,214,0.2)',
    height: 1,
    marginLeft: 68,
  },
  spaceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionGap: {
    gap: 14,
  },
  templateStack: {
    gap: 12,
  },
  templateCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  templateIconWrap: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  templateBody: {
    flex: 1,
    gap: 4,
  },
  templateTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  templateText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  promptCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  promptReference: {
    color: palette.success,
    fontSize: 14,
    fontWeight: '700',
  },
  promptText: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 26,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  noteCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    gap: 8,
    padding: 18,
  },
  noteCardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  noteCardText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  searchResult: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  searchResultIcon: {
    alignItems: 'center',
    backgroundColor: '#F5F5F4',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  searchResultBody: {
    flex: 1,
    gap: 4,
  },
  searchResultTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  searchResultText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sheetHandle: {
    backgroundColor: palette.borderStrong,
    height: 5,
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  sheetHeader: {
    paddingBottom: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  sheetTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetNote: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  sheetNoteTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetNoteText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  modalScrim: { display: 'none' },
  modalPanel: { display: 'none' },
  modalHeader: { display: 'none' },
  modalTitle: { display: 'none' },
  modalList: { display: 'none' },
  modalNoteCard: { display: 'none' },
  modalNoteTitle: { display: 'none' },
  modalNoteText: { display: 'none' },
  pressed: { opacity: 0.75 },
});
