import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { EmptyState, Screen, TopBar } from '@/src/components/primitives';
import { createNoteFromTemplate, createThread, getWorkspaceSnapshot } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { Note, Thread, WorkspaceSnapshot } from '@/src/types/domain';

export default function ThreadsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();
  const { colors } = useTheme();

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadNotes, setThreadNotes] = useState<Note[]>([]);
  const notesSheetRef = useRef<BottomSheetModal>(null);
  const collectionSnapPoints = useMemo(() => ['40%', '75%'], []);

  const load = useCallback(async () => {
    setSnapshot(await getWorkspaceSnapshot(db, activeSpaceId));
  }, [activeSpaceId, db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const openThread = useCallback(async (thread: Thread) => {
    setSelectedThread(thread);
    const snap = await getWorkspaceSnapshot(db, activeSpaceId);
    setThreadNotes(snap.recentNotes.filter(() => true)); // placeholder
    notesSheetRef.current?.present();
  }, [activeSpaceId, db]);

  const handleNewThread = useCallback(async () => {
    const thread = await createThread(db, { spaceId: activeSpaceId });
    const snap = await getWorkspaceSnapshot(db, activeSpaceId);
    const tpl = snap.templates.find((t) => t.threadHint === thread.id) ?? snap.templates[0];
    const noteId = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: thread.id, title: `${thread.name} Note` });
    await load();
    router.push(`/editor/${noteId}`);
  }, [activeSpaceId, db, load, router]);

  const threads = snapshot?.threads ?? [];
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });

  return (
    <Screen>
      <TopBar title="Threads" rightIcon="add-outline" onRightPress={handleNewThread} scrollY={scrollY} />
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={[styles.content, { backgroundColor: colors.bg, paddingTop: 72 }]}>
        {threads.length ? threads.map((thread) => (
          <AnimatedPressable
            key={thread.id}
            haptic="light"
            onPress={async () => {
              const snap = await getWorkspaceSnapshot(db, activeSpaceId);
              const tpl = snap.templates.find((t) => t.threadHint === thread.id) ?? snap.templates[0];
              const noteId = await createNoteFromTemplate(db, { templateId: tpl.id, spaceId: activeSpaceId, threadId: thread.id });
              router.push(`/editor/${noteId}`);
            }}
            style={({ pressed }) => [styles.threadCard, { backgroundColor: colors.bgCard, borderColor: colors.border, borderLeftColor: thread.accent }, pressed && styles.pressed]}>
            <View style={[styles.threadIcon, { backgroundColor: thread.accent + '20' }]}>
              <Ionicons color={thread.accent} name={thread.icon as any} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.threadName, { color: colors.textPrimary }]}>{thread.name}</Text>
              <Text style={[styles.threadCount, { color: colors.textTertiary }]}>{thread.noteCount} {thread.noteCount === 1 ? 'note' : 'notes'}</Text>
            </View>
            <Ionicons color={colors.borderStrong} name="chevron-forward-outline" size={16} />
          </AnimatedPressable>
        )) : (
          <EmptyState title="No threads yet" subtitle="Create a thread to organize your studies." />
        )}
      </Animated.ScrollView>

      <BottomSheetModal ref={notesSheetRef} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />} handleIndicatorStyle={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} snapPoints={collectionSnapPoints}>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{selectedThread?.name ?? 'Notes'}</Text>
          {threadNotes.length ? threadNotes.map((note) => (
            <AnimatedPressable key={note.id} haptic="light" onPress={() => { notesSheetRef.current?.dismiss(); router.push(`/editor/${note.id}`); }} style={({ pressed }) => [styles.sheetNote, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.sheetNoteTitle, { color: colors.textPrimary }]}>{note.title}</Text>
              <Text numberOfLines={2} style={[styles.sheetNoteText, { color: colors.textSecondary }]}>{note.plainText || 'Empty note'}</Text>
            </AnimatedPressable>
          )) : <EmptyState title="No notes" subtitle="Create a note in this thread." />}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  threadCard: { alignItems: 'center', borderRadius: 14, borderLeftWidth: 4, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  threadIcon: { alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  threadName: { fontFamily: 'DMSans_500Medium', fontSize: 16 },
  threadCount: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 2 },
  sheetHandle: { borderRadius: 100, height: 4, width: 36 },
  sheetContent: { gap: 8, paddingBottom: 40, paddingHorizontal: 16 },
  sheetTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18, paddingBottom: 12, paddingTop: 4 },
  sheetNote: { borderRadius: 14, borderWidth: 1, gap: 6, padding: 14 },
  sheetNoteTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15 },
  sheetNoteText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.85 },
});
