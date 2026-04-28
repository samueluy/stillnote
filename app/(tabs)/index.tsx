import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import {
  createNoteFromTemplate,
  createThread,
  getWorkspaceSnapshot,
  searchEverything,
} from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { SearchResult, WorkspaceSnapshot } from '@/src/types/domain';

export default function WorkspaceScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, setActiveSpaceId, refreshToken } = useAppState();

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

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

  return (
    <Screen>
      <TopBar title="Stillnote" />
      <PageScroll>
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
                <Pressable
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
                </Pressable>
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
              />
              <View style={styles.divider} />
              <SmartCollectionRow
                count={snapshot.collectionCounts.favorites}
                icon="heart-outline"
                label="Favorites"
              />
              <View style={styles.divider} />
              <SmartCollectionRow
                count={snapshot.collectionCounts.recent}
                icon="time-outline"
                label="Recent"
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
                  <Pressable
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
                  </Pressable>
                ))}
              </View>
            </View>

            {snapshot.dailyVerse ? (
              <View style={styles.sectionGap}>
                <SectionTitle title="Daily Verse Prompt" />
                <View style={styles.promptCard}>
                  <Text style={styles.promptReference}>{snapshot.dailyVerse.reference}</Text>
                  <Text style={styles.promptText}>{snapshot.dailyVerse.text}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionGap}>
              <SectionTitle title="Automated Tags" actionIcon="ellipsis-horizontal" />
              <View style={styles.tagsWrap}>
                {snapshot.tags.map((tag) => (
                  <TagChip key={tag.id} label={`#${tag.name}`} />
                ))}
                <TagChip label="Tag" outlined />
              </View>
            </View>

            <View style={styles.sectionGap}>
              <SectionTitle title="Recent Notes" />
              <View style={styles.templateStack}>
                {snapshot.recentNotes.map((note) => (
                  <Pressable
                    key={note.id}
                    onPress={() => router.push(`/editor/${note.id}`)}
                    style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}>
                    <Text style={styles.noteCardTitle}>{note.title}</Text>
                    <Text numberOfLines={3} style={styles.noteCardText}>
                      {note.plainText}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </PageScroll>
      <FloatingActionButton icon="add-outline" onPress={createQuickNote} />
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
  pressed: {
    opacity: 0.82,
  },
});
