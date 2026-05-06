import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ActionSheet } from '@/src/components/action-sheet';
import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { Divider, EmptyState, ListRow, Screen, TextLink, TopBar, palette } from '@/src/components/primitives';
import { createNoteFromTemplate, deleteNote, getFolderById, getNotesByFolder, getTemplates, listFolders, moveNoteToFolder } from '@/src/lib/database';
import { complete, destructive } from '@/src/lib/haptics';
import { useAppState } from '@/src/providers/app-provider';
import type { FolderTreeRow, Note, Template } from '@/src/types/domain';

export default function FolderDetailScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, bumpRefreshToken } = useAppState();

  const templateSheetRef = useRef<BottomSheetModal>(null);
  const noteActionSheetRef = useRef<BottomSheetModal>(null);
  const deleteNoteSheetRef = useRef<BottomSheetModal>(null);
  const moveNoteSheetRef = useRef<BottomSheetModal>(null);

  const [folderName, setFolderName] = useState('Folder');
  const [folders, setFolders] = useState<FolderTreeRow[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  const load = useCallback(async () => {
    const [folder, folderNotes, nextTemplates, nextFolders] = await Promise.all([
      getFolderById(db, folderId),
      getNotesByFolder(db, folderId),
      getTemplates(db),
      listFolders(db, activeSpaceId),
    ]);
    setFolderName(folder?.name ?? 'Folder');
    setFolders(nextFolders);
    setNotes(folderNotes);
    setTemplates(nextTemplates);
  }, [activeSpaceId, db, folderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const templateItems = useMemo(
    () =>
      templates.map((template) => ({
        key: template.id,
        label: template.name,
        description: template.description,
        onPress: async () => {
          const noteId = await createNoteFromTemplate(db, {
            templateId: template.id,
            spaceId: activeSpaceId,
            folderId,
          });
          templateSheetRef.current?.dismiss();
          bumpRefreshToken();
          await complete();
          router.push(`/editor/${noteId}`);
        },
      })),
    [activeSpaceId, bumpRefreshToken, db, folderId, router, templates]
  );

  const moveNoteItems = folders
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
      <TopBar leftIcon="chevron-back-outline" onLeftPress={() => router.back()} title={folderName} />

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
            subtitle="Create the first note in this folder."
            title="No notes yet"
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
      />

      <PlainListSheet items={templateItems} ref={templateSheetRef} title="Choose a template" />
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
  actionRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
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
