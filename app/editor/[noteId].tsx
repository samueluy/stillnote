import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BibleSheet } from '@/src/components/bible-sheet';
import {
  AttachmentPreview,
  Divider,
  TagChip,
  palette,
} from '@/src/components/primitives';
import {
  buildInsertedVerseText,
  getBibleChapter,
  getNoteById,
  getVerseByReference,
  getVersesForReferences,
  saveNoteDraft,
} from '@/src/lib/database';
import { persistImageAsset } from '@/src/lib/media';
import { detectVerseReferences } from '@/src/lib/verse-references';
import { stripHtml } from '@/src/lib/editor';
import type { BibleVerse, MediaAttachment } from '@/src/types/domain';

type AttachmentDraft = Pick<
  MediaAttachment,
  'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'
>;

type Selection = {
  start: number;
  end: number;
};

function insertAtSelection(
  value: string,
  selection: Selection,
  insertedText: string
) {
  const nextValue = `${value.slice(0, selection.start)}${insertedText}${value.slice(selection.end)}`;
  const nextCursor = selection.start + insertedText.length;
  return {
    nextValue,
    nextSelection: { start: nextCursor, end: nextCursor },
  };
}

export default function EditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bodyInputRef = useRef<TextInput>(null);
  const bibleSheetRef = useRef<BottomSheetModal>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spaceId, setSpaceId] = useState('space-personal');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadName, setThreadName] = useState('Journal');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [chapterBook, setChapterBook] = useState('Genesis');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNote() {
      const payload = await getNoteById(db, noteId);
      if (!payload || cancelled) {
        return;
      }

      const loadedBody = payload.note.markdownBody.includes('<')
        ? stripHtml(payload.note.markdownBody)
        : payload.note.markdownBody;

      setTitle(payload.note.title);
      setBody(loadedBody);
      setSpaceId(payload.note.spaceId);
      setThreadId(payload.note.primaryThreadId);
      setThreadName(payload.thread?.name ?? 'Journal');
      setTemplateId(payload.note.templateId);
      setAttachments(payload.attachments as AttachmentDraft[]);
      setIsReady(true);
    }

    loadNote();
    return () => {
      cancelled = true;
    };
  }, [db, noteId]);

  const references = useMemo(() => detectVerseReferences(body), [body]);
  const hashtags = useMemo(
    () =>
      Array.from(
        new Set(
          Array.from(body.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)).map((match) => `#${match[1]}`)
        )
      ),
    [body]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadChapter() {
      const firstReference = references[0];
      const nextBook = firstReference?.book ?? 'Genesis';
      const nextChapter = firstReference?.chapterStart ?? 1;
      setChapterBook(nextBook);
      setChapterNumber(nextChapter);
      const verses = await getBibleChapter(db, nextBook, nextChapter);
      if (!cancelled) {
        setChapterVerses(verses);
      }
    }

    loadChapter();
    return () => {
      cancelled = true;
    };
  }, [db, references]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeout = setTimeout(async () => {
      await saveNoteDraft(db, {
        id: noteId,
        title: title.trim() || 'Untitled',
        markdownBody: body,
        templateId,
        spaceId,
        threadId,
        attachments,
      });
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      );
    }, 220);

    return () => clearTimeout(timeout);
  }, [attachments, body, db, isReady, noteId, spaceId, templateId, threadId, title]);

  const applyPrefix = useCallback(
    (prefix: string) => {
      const result = insertAtSelection(body, selection, prefix);
      setBody(result.nextValue);
      setSelection(result.nextSelection);
      requestAnimationFrame(() => bodyInputRef.current?.focus());
    },
    [body, selection]
  );

  const handleAttachImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo access is needed to add an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const persisted = await persistImageAsset(result.assets[0]);
    setAttachments((current) => [
      ...current,
      {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        type: 'image',
        ...persisted,
      },
    ]);
  }, []);

  const insertVerseFromSheet = useCallback(
    (verse: BibleVerse) => {
      const result = insertAtSelection(body, selection, `${buildInsertedVerseText([verse])}\n`);
      setBody(result.nextValue);
      setSelection(result.nextSelection);
      bibleSheetRef.current?.dismiss();
      requestAnimationFrame(() => bodyInputRef.current?.focus());
    },
    [body, selection]
  );

  const openVerseReference = useCallback(
    async (reference: string) => {
      const verse = await getVerseByReference(db, reference);
      if (!verse) {
        return;
      }
      setChapterBook(verse.book);
      setChapterNumber(verse.chapter);
      const verses = await getBibleChapter(db, verse.book, verse.chapter);
      setChapterVerses(verses);
      bibleSheetRef.current?.present();
    },
    [db]
  );

  const referencedVerses = useMemo(() => references.map((reference) => `${reference.book} ${reference.chapterStart}:${reference.verseStart}`), [references]);

  useEffect(() => {
    let cancelled = false;
    async function warmReferences() {
      if (!referencedVerses.length) {
        return;
      }
      const verses = await getVersesForReferences(db, referencedVerses);
      if (!cancelled && verses[0]) {
        setChapterBook(verses[0].book);
        setChapterNumber(verses[0].chapter);
      }
    }
    warmReferences();
    return () => {
      cancelled = true;
    };
  }, [db, referencedVerses]);

  if (!isReady) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Preparing note…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Ionicons color={palette.text} name="chevron-back-outline" size={18} />
        </Pressable>
        <Text style={styles.headerLabel}>{threadName}</Text>
        <Pressable
          onPress={() => bibleSheetRef.current?.present()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Ionicons color={palette.text} name="book-outline" size={18} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        keyboardShouldPersistTaps="handled">
        <TextInput
          onChangeText={setTitle}
          placeholder="Untitled"
          placeholderTextColor={palette.textMuted}
          style={styles.titleInput}
          value={title}
        />

        <Divider />

        <TextInput
          multiline
          onChangeText={setBody}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          placeholder="Start typing..."
          placeholderTextColor={palette.textMuted}
          ref={bodyInputRef}
          scrollEnabled={false}
          selection={selection}
          style={styles.bodyInput}
          textAlignVertical="top"
          value={body}
        />

        {references.length ? (
          <View style={styles.referenceRow}>
            {references.map((reference) => (
              <TagChip
                key={reference.normalized}
                label={reference.normalized}
                onPress={() => openVerseReference(`${reference.book} ${reference.chapterStart}:${reference.verseStart}`)}
              />
            ))}
          </View>
        ) : null}

        {hashtags.length ? (
          <View style={styles.referenceRow}>
            {hashtags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        ) : null}

        {attachments.length ? (
          <View style={styles.attachmentStack}>
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                index={index}
                key={attachment.id}
                onRemove={() =>
                  setAttachments((current) =>
                    current.filter((item) => item.id !== attachment.id)
                  )
                }
              />
            ))}
          </View>
        ) : null}

        <Text style={styles.saveState}>
          {lastSavedAt ? `Saved locally at ${lastSavedAt}` : 'Autosave is on'}
        </Text>
      </ScrollView>

      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable onPress={() => applyPrefix('## ')} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
          <Text style={styles.toolbarText}>Aa</Text>
        </Pressable>
        <Pressable onPress={() => applyPrefix('- [ ] ')} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
          <Ionicons color={palette.text} name="checkmark-outline" size={18} />
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Voice notes', 'Voice capture will return in a quieter pass.')}
          style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
          <Ionicons color={palette.text} name="mic-outline" size={18} />
        </Pressable>
        <Pressable onPress={handleAttachImage} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
          <Ionicons color={palette.text} name="image-outline" size={18} />
        </Pressable>
      </View>

      <BibleSheet
        book={chapterBook}
        chapter={chapterNumber}
        onInsertVerse={insertVerseFromSheet}
        ref={bibleSheetRef}
        translationName="King James Version"
        verses={chapterVerses}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleInput: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  bodyInput: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 14,
    lineHeight: 25,
    minHeight: 420,
    paddingTop: 16,
  },
  referenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  attachmentStack: {
    marginTop: 20,
  },
  saveState: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginTop: 20,
  },
  toolbar: {
    alignItems: 'center',
    backgroundColor: palette.background,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  toolbarButton: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  toolbarText: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
