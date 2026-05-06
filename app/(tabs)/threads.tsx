import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { SpaceSwitcher } from '@/src/components/space-switcher';
import { TextEntrySheet } from '@/src/components/text-entry-sheet';
import { Divider, EmptyState, ListRow, Screen, TextLink, TopBar, palette } from '@/src/components/primitives';
import { createFolder, deleteFolder, getSpaces, listFolders, renameFolder } from '@/src/lib/database';
import { confirm, destructive } from '@/src/lib/haptics';
import { useAppState } from '@/src/providers/app-provider';
import type { FolderTreeRow, Space } from '@/src/types/domain';

type NameSheetMode =
  | { kind: 'create-top-level' }
  | { kind: 'create-subfolder'; parentFolderId: string }
  | { kind: 'rename'; folder: FolderTreeRow };

export default function FoldersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, bumpRefreshToken, setActiveSpaceId } = useAppState();

  const typeSheetRef = useRef<BottomSheetModal>(null);
  const parentSheetRef = useRef<BottomSheetModal>(null);
  const nameSheetRef = useRef<BottomSheetModal>(null);

  const [folders, setFolders] = useState<FolderTreeRow[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [nameSheetMode, setNameSheetMode] = useState<NameSheetMode | null>(null);

  const load = useCallback(async () => {
    const [nextFolders, nextSpaces] = await Promise.all([
      listFolders(db, activeSpaceId),
      getSpaces(db),
    ]);
    setFolders(nextFolders);
    setSpaces(nextSpaces);
  }, [activeSpaceId, db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const topLevelFolders = useMemo(
    () => folders.filter((folder) => folder.level === 0),
    [folders]
  );

  const openNameSheet = useCallback((mode: NameSheetMode) => {
    setNameSheetMode(mode);
    requestAnimationFrame(() => nameSheetRef.current?.present());
  }, []);

  const submitFolderName = useCallback(async (value: string) => {
    if (!nameSheetMode) {
      return;
    }

    if (nameSheetMode.kind === 'create-top-level') {
      await createFolder(db, { spaceId: activeSpaceId, name: value });
      bumpRefreshToken();
      await confirm();
    } else if (nameSheetMode.kind === 'create-subfolder') {
      await createFolder(db, {
        spaceId: activeSpaceId,
        name: value,
        parentFolderId: nameSheetMode.parentFolderId,
      });
      bumpRefreshToken();
      await confirm();
    } else {
      await renameFolder(db, nameSheetMode.folder.id, value);
      await confirm();
    }

    nameSheetRef.current?.dismiss();
    setNameSheetMode(null);
    load();
  }, [activeSpaceId, bumpRefreshToken, db, load, nameSheetMode]);

  const openFolderActions = useCallback(
    (folder: FolderTreeRow) => {
      Alert.alert(folder.name, undefined, [
        {
          text: 'Rename',
          onPress: () => openNameSheet({ kind: 'rename', folder }),
        },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteFolder(db, folder.id);
              bumpRefreshToken();
              await destructive();
              load();
            } catch (error) {
              Alert.alert(
                'Cannot delete folder',
                error instanceof Error ? error.message : 'Try emptying the folder first.'
              );
            }
          },
        },
        { style: 'cancel', text: 'Cancel' },
      ]);
    },
    [bumpRefreshToken, db, load, openNameSheet]
  );

  const typeItems = [
    {
      key: 'top-level',
      label: 'Top-level folder',
      description: 'Create a new top-level folder in this space.',
      onPress: () => {
        typeSheetRef.current?.dismiss();
        openNameSheet({ kind: 'create-top-level' });
      },
    },
    {
      key: 'subfolder',
      label: 'Subfolder',
      description: 'Choose a parent folder, then name the subfolder.',
      onPress: () => {
        typeSheetRef.current?.dismiss();
        requestAnimationFrame(() => parentSheetRef.current?.present());
      },
    },
  ];

  const parentItems = topLevelFolders.map((folder) => ({
    key: folder.id,
    label: folder.name,
    description: `${folder.noteCount} notes`,
    onPress: () => {
      parentSheetRef.current?.dismiss();
      openNameSheet({ kind: 'create-subfolder', parentFolderId: folder.id });
    },
  }));

  const nameSheetTitle =
    nameSheetMode?.kind === 'rename'
      ? 'Rename Folder'
      : nameSheetMode?.kind === 'create-subfolder'
        ? 'New Subfolder'
        : 'New Folder';

  const nameSheetPlaceholder =
    nameSheetMode?.kind === 'rename'
      ? nameSheetMode.folder.name
      : nameSheetMode?.kind === 'create-subfolder'
        ? 'Subfolder name'
        : 'Folder name';

  const nameSheetInitialValue =
    nameSheetMode?.kind === 'rename' ? nameSheetMode.folder.name : '';

  return (
    <Screen>
      <TopBar rightIcon="add-outline" title="Folders" onRightPress={() => typeSheetRef.current?.present()} />
      <View style={styles.spaceWrap}>
        <SpaceSwitcher activeSpaceId={activeSpaceId} onChange={setActiveSpaceId} spaces={spaces} />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={folders}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            subtitle="Create a folder for sermon notes, journals, or small group prep."
            title="No folders yet"
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <TextLink hapticIntent="selection" label="New Folder" onPress={() => typeSheetRef.current?.present()} />
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            left={
              <View style={[styles.folderLabelWrap, item.level === 1 && styles.subfolderWrap]}>
                <Text style={styles.folderName}>{item.name}</Text>
              </View>
            }
            onLongPress={() => openFolderActions(item)}
            onPress={() => router.push(`/folders/${item.id}`)}
            right={<Text style={styles.folderCount}>{item.noteCount}</Text>}
          />
        )}
        style={styles.list}
      />

      <PlainListSheet items={typeItems} ref={typeSheetRef} title="New folder" />
      <PlainListSheet items={parentItems} ref={parentSheetRef} title="Choose a parent folder" />
      <TextEntrySheet
        initialValue={nameSheetInitialValue}
        onDismiss={() => setNameSheetMode(null)}
        onSubmit={submitFolderName}
        placeholder={nameSheetPlaceholder}
        ref={nameSheetRef}
        submitLabel={nameSheetMode?.kind === 'rename' ? 'Save' : 'Create'}
        title={nameSheetTitle}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaceWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footer: {
    paddingTop: 12,
  },
  folderLabelWrap: {
    paddingVertical: 2,
  },
  subfolderWrap: {
    paddingLeft: 16,
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
