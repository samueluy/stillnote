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
  TopBar,
  palette,
} from '@/src/components/primitives';
import {
  createNoteFromTemplate,
  createThread,
  getWorkspaceSnapshot,
} from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { Thread, WorkspaceSnapshot } from '@/src/types/domain';

export default function ThreadsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

  const load = useCallback(async () => {
    setSnapshot(await getWorkspaceSnapshot(db, activeSpaceId));
  }, [activeSpaceId, db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openThread = useCallback(
    async (thread: Thread) => {
      if (!snapshot?.templates.length) {
        return;
      }
      const template =
        snapshot.templates.find((item) => item.threadHint === thread.id) ?? snapshot.templates[0];
      const noteId = await createNoteFromTemplate(db, {
        templateId: template.id,
        spaceId: activeSpaceId,
        threadId: thread.id,
        title: `${thread.name} Entry`,
      });
      router.push(`/editor/${noteId}`);
    },
    [activeSpaceId, db, router, snapshot]
  );

  const handleNewThread = useCallback(async () => {
    const thread = await createThread(db, { spaceId: activeSpaceId });
    await load();
    await openThread(thread);
  }, [activeSpaceId, db, load, openThread]);

  return (
    <Screen>
      <TopBar rightIcon="add-outline" title="Folders" onRightPress={handleNewThread} />
      <View style={styles.actionRow}>
        <TextLink label="New Folder" onPress={handleNewThread} />
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={snapshot?.threads ?? []}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Create a folder for sermon notes, journals, or small group prep."
            title="No folders yet"
          />
        }
        renderItem={({ item }) => (
          <ListRow
            left={<Text style={styles.folderName}>{item.name}</Text>}
            onPress={() => openThread(item)}
            right={<Text style={styles.folderCount}>{item.noteCount}</Text>}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  folderName: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
  },
  folderCount: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
  },
});
