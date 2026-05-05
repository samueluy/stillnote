import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  Divider,
  EmptyState,
  ListRow,
  Screen,
  TextLink,
  palette,
} from '@/src/components/primitives';
import {
  createNoteFromTemplate,
  getNotesByCollection,
  getWorkspaceSnapshot,
} from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { Note, WorkspaceSnapshot } from '@/src/types/domain';

export default function JournalScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();

  const [notes, setNotes] = useState<Note[]>([]);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

  const load = useCallback(async () => {
    const [allNotes, nextSnapshot] = await Promise.all([
      getNotesByCollection(db, activeSpaceId, 'all'),
      getWorkspaceSnapshot(db, activeSpaceId),
    ]);
    setNotes(allNotes);
    setSnapshot(nextSnapshot);
  }, [activeSpaceId, db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const createEntry = useCallback(async () => {
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
      title: 'New Entry',
    });
    router.push(`/editor/${noteId}`);
  }, [activeSpaceId, db, router, snapshot]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Text style={styles.spaceName}>
          {snapshot?.spaces.find((space) => space.id === activeSpaceId)?.name ?? 'Stillnote'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TextLink bordered label="New Entry" onPress={createEntry} />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={notes}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Create your first journal entry and let the page stay quiet around it."
            title="No entries yet"
          />
        }
        renderItem={({ item }) => (
          <ListRow
            left={
              <Text numberOfLines={1} style={styles.entryTitle}>
                {item.title || 'Untitled'}
              </Text>
            }
            onPress={() => router.push(`/editor/${item.id}`)}
            right={
              <Text style={styles.entryDate}>
                {new Date(item.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            }
          />
        )}
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  date: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
    marginBottom: 6,
  },
  spaceName: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  actionRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  list: {
    flex: 1,
    marginTop: 18,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
  },
  entryTitle: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  entryDate: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
});
