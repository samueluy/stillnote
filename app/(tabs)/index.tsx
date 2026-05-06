import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ActionSheet } from '@/src/components/action-sheet';
import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { SpaceSwitcher } from '@/src/components/space-switcher';
import { Divider, EmptyState, ListRow, Screen, TextLink, palette } from '@/src/components/primitives';
import {
  createNoteFromTemplate,
  deleteNote,
  getNotesByCollection,
  getWorkspaceSnapshot,
  moveNoteToFolder,
} from '@/src/lib/database';
import { complete, destructive } from '@/src/lib/haptics';
import { useAppState } from '@/src/providers/app-provider';
import type { FolderTreeRow, Note, WorkspaceSnapshot } from '@/src/types/domain';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, bumpRefreshToken, setActiveSpaceId } = useAppState();

  const templateSheetRef = useRef<BottomSheetModal>(null);
  const folderSheetRef = useRef<BottomSheetModal>(null);
  const noteActionSheetRef = useRef<BottomSheetModal>(null);
  const deleteNoteSheetRef = useRef<BottomSheetModal>(null);
  const moveNoteSheetRef = useRef<BottomSheetModal>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

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

  const folderChoices = useMemo(
    () => snapshot?.folders ?? [],
    [snapshot]
  );

  const createEntryInFolder = useCallback(
    async (folder: FolderTreeRow) => {
      if (!selectedTemplateId) {
        return;
      }

      const noteId = await createNoteFromTemplate(db, {
        templateId: selectedTemplateId,
        spaceId: activeSpaceId,
        folderId: folder.id,
      });
      folderSheetRef.current?.dismiss();
      setSelectedTemplateId(null);
      bumpRefreshToken();
      await complete();
      router.push(`/editor/${noteId}`);
    },
    [activeSpaceId, bumpRefreshToken, db, router, selectedTemplateId]
  );

  const templateItems =
    snapshot?.templates.map((template) => ({
      key: template.id,
      label: template.name,
      description: template.description,
      onPress: () => {
        setSelectedTemplateId(template.id);
        templateSheetRef.current?.dismiss();
        requestAnimationFrame(() => folderSheetRef.current?.present());
      },
    })) ?? [];

  const folderItems = folderChoices.map((folder) => ({
    key: folder.id,
    label: folder.level === 1 ? `  ${folder.name}` : folder.name,
    description: folder.childCount ? `${folder.childCount} subfolders` : `${folder.noteCount} notes`,
    onPress: () => createEntryInFolder(folder),
  }));

  const moveNoteItems = folderChoices
    .filter((folder) => folder.id !== selectedNote?.folderId)
    .map((folder) => ({
      key: folder.id,
      label: folder.level === 1 ? `  ${folder.name}` : folder.name,
      description: `${folder.noteCount} notes`,
      onPress: async () => {
        if (!selectedNote) {
          return;
        }
        await moveNoteToFolder(db, { folderId: folder.id, noteId: selectedNote.id });
        moveNoteSheetRef.current?.dismiss();
        noteActionSheetRef.current?.dismiss();
        setSelectedNote(null);
        bumpRefreshToken();
        load();
      },
    }));

  const openNoteActions = useCallback((note: Note) => {
    setSelectedNote(note);
    requestAnimationFrame(() => noteActionSheetRef.current?.present());
  }, []);

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
        <SpaceSwitcher
          activeSpaceId={activeSpaceId}
          onChange={setActiveSpaceId}
          spaces={snapshot?.spaces ?? []}
        />
      </View>

      <View style={styles.actionRow}>
        <TextLink
          bordered
          hapticIntent="selection"
          label="New Note"
          onPress={() => templateSheetRef.current?.present()}
        />
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
            hapticIntent="confirm"
            left={
              <Text numberOfLines={1} style={styles.entryTitle}>
                {item.title || 'Untitled'}
              </Text>
            }
            onLongPress={() => openNoteActions(item)}
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

      <PlainListSheet items={templateItems} ref={templateSheetRef} title="Choose a template" />
      <PlainListSheet items={folderItems} ref={folderSheetRef} title="Choose a folder" />
      <PlainListSheet items={moveNoteItems} ref={moveNoteSheetRef} title="Move to folder" />
      <ActionSheet
        description={selectedNote ? `Choose what to do with “${selectedNote.title || 'Untitled'}”.` : undefined}
        items={
          selectedNote
            ? [
                {
                  key: 'open-note',
                  label: 'Open note',
                  onPress: () => {
                    noteActionSheetRef.current?.dismiss();
                    router.push(`/editor/${selectedNote.id}`);
                  },
                },
                {
                  key: 'move-note',
                  label: 'Move to folder',
                  onPress: () => {
                    noteActionSheetRef.current?.dismiss();
                    requestAnimationFrame(() => moveNoteSheetRef.current?.present());
                  },
                },
                {
                  key: 'delete-note',
                  label: 'Delete note',
                  onPress: () => {
                    noteActionSheetRef.current?.dismiss();
                    requestAnimationFrame(() => deleteNoteSheetRef.current?.present());
                  },
                },
              ]
            : []
        }
        ref={noteActionSheetRef}
        title="Note actions"
      />
      <ActionSheet
        description="This removes the note from your journal, search results, tags, and folder lists."
        items={
          selectedNote
            ? [
                {
                  key: 'confirm-delete-note',
                  label: 'Delete note',
                  onPress: async () => {
                    await deleteNote(db, selectedNote.id);
                    deleteNoteSheetRef.current?.dismiss();
                    setSelectedNote(null);
                    bumpRefreshToken();
                    await destructive();
                    load();
                  },
                },
                {
                  key: 'keep-note',
                  label: 'Keep note',
                  onPress: () => {
                    deleteNoteSheetRef.current?.dismiss();
                  },
                },
              ]
            : []
        }
        ref={deleteNoteSheetRef}
        title="Delete this note?"
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
    marginBottom: 10,
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
