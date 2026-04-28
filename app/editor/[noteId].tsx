import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BibleSheet } from '@/src/components/bible-sheet';
import {
  AttachmentPreview,
  SearchField,
  TagChip,
  ToolbarButton,
  palette,
} from '@/src/components/primitives';
import { applyFormat, type FormatAction, type Selection } from '@/src/lib/editor';
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
import type { BibleVerse, MediaAttachment } from '@/src/types/domain';

type AttachmentDraft = Pick<
  MediaAttachment,
  'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'
>;

export default function EditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spaceId, setSpaceId] = useState('space-personal');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadName, setThreadName] = useState('Thread');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [chapterBook, setChapterBook] = useState('Genesis');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [verseSearch, setVerseSearch] = useState('');
  const [referenceVerses, setReferenceVerses] = useState<BibleVerse[]>([]);

  const titleInputRef = useRef<TextInput>(null);
  const bodyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const payload = await getNoteById(db, noteId);
      if (!payload || cancelled) {
        return;
      }

      setTitle(payload.note.title);
      setBody(payload.note.markdownBody);
      setSpaceId(payload.note.spaceId);
      setThreadId(payload.note.primaryThreadId);
      setThreadName(payload.thread?.name ?? 'Study Note');
      setTemplateId(payload.note.templateId);
      setAttachments(payload.attachments as AttachmentDraft[]);
      setIsReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [db, noteId]);

  const references = useMemo(() => detectVerseReferences(body), [body]);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveChapter() {
      const firstReference = references[0];
      const book = firstReference?.book ?? 'Genesis';
      const chapter = firstReference?.chapterStart ?? 1;
      setChapterBook(book);
      setChapterNumber(chapter);
      const verses = await getBibleChapter(db, book, chapter);
      if (!cancelled) {
        setChapterVerses(verses);
      }
    }

    loadActiveChapter();
    return () => {
      cancelled = true;
    };
  }, [db, references]);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceChips() {
      if (!references.length) {
        setReferenceVerses([]);
        return;
      }

      const verses = await getVersesForReferences(
        db,
        references.map((reference) => `${reference.book} ${reference.chapterStart}:${reference.verseStart}`)
      );

      if (!cancelled) {
        setReferenceVerses(verses);
      }
    }

    loadReferenceChips();
    return () => {
      cancelled = true;
    };
  }, [db, references]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timeout = setTimeout(() => {
      saveNoteDraft(db, {
        id: noteId,
        title: title.trim() || 'Untitled Note',
        markdownBody: body,
        templateId,
        spaceId,
        threadId,
        attachments,
      }).then(() => {
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [attachments, body, db, isReady, noteId, spaceId, templateId, threadId, title]);

  const handleFormat = useCallback(
    (action: FormatAction) => {
      const result = applyFormat(body, selection, action);
      setBody(result.nextText);
      setSelection(result.nextSelection);
      requestAnimationFrame(() => bodyInputRef.current?.focus());
    },
    [body, selection]
  );

  const insertTextAtSelection = useCallback(
    (textToInsert: string) => {
      const nextBody = `${body.slice(0, selection.start)}${textToInsert}${body.slice(selection.end)}`;
      const nextCursor = selection.start + textToInsert.length;
      setBody(nextBody);
      setSelection({ start: nextCursor, end: nextCursor });
      requestAnimationFrame(() => bodyInputRef.current?.focus());
    },
    [body, selection]
  );

  const addAttachmentFromAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const persisted = await persistImageAsset(asset);
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

  const openImageLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo access is needed to attach images to notes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await addAttachmentFromAsset(result.assets[0]);
    }
  }, [addAttachmentFromAsset]);

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to capture note attachments.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await addAttachmentFromAsset(result.assets[0]);
    }
  }, [addAttachmentFromAsset]);

  const insertReferenceFromSearch = useCallback(async () => {
    const verse = await getVerseByReference(db, verseSearch.trim());
    if (!verse) {
      Alert.alert('Verse not found', 'Try a full reference like Genesis 1:1.');
      return;
    }

    insertTextAtSelection(`${verse.reference} — ${verse.text}\n`);
    setVerseSearch('');
  }, [db, insertTextAtSelection, verseSearch]);

  if (!isReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Preparing your study note...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color={palette.textMuted} name="chevron-back-outline" size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Stillnote</Text>
        <Pressable onPress={() => bottomSheetRef.current?.present()} style={styles.headerButton}>
          <Ionicons color={palette.blue} name="book-outline" size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.breadcrumb}>
          Threads <Text style={styles.breadcrumbAccent}>›</Text> {threadName}
        </Text>

        <TextInput
          onChangeText={setTitle}
          placeholder="Untitled note"
          placeholderTextColor="#8C847A"
          ref={titleInputRef}
          style={styles.titleInput}
          value={title}
        />

        <View style={styles.toolbarRow}>
          <ToolbarButton icon="text-outline" label="Bold" onPress={() => handleFormat('bold')} />
          <ToolbarButton icon="text-outline" label="Italic" onPress={() => handleFormat('italic')} />
          <ToolbarButton icon="remove-outline" label="Underline" onPress={() => handleFormat('underline')} />
        </View>

        <View style={styles.toolbarRow}>
          <ToolbarButton
            icon="list-outline"
            label="Bullets"
            onPress={() => handleFormat('bulleted-list')}
          />
          <ToolbarButton
            icon="list-circle-outline"
            label="Numbers"
            onPress={() => handleFormat('numbered-list')}
          />
          <ToolbarButton
            icon="chatbox-ellipses-outline"
            label="Quote"
            onPress={() => handleFormat('blockquote')}
          />
        </View>

        <View style={styles.toolbarRow}>
          <ToolbarButton icon="attach-outline" label="Photo" onPress={openImageLibrary} />
          <ToolbarButton icon="camera-outline" label="Capture" onPress={openCamera} />
          <ToolbarButton icon="book-outline" label="Bible" onPress={() => bottomSheetRef.current?.present()} />
        </View>

        <View style={styles.verseSearchCard}>
          <SearchField
            onChangeText={setVerseSearch}
            placeholder="Insert a verse like Genesis 1:1"
            value={verseSearch}
          />
          <Pressable onPress={insertReferenceFromSearch} style={({ pressed }) => [styles.insertReferenceButton, pressed && styles.pressed]}>
            <Text style={styles.insertReferenceText}>Insert Verse</Text>
          </Pressable>
        </View>

        {referenceVerses.length ? (
          <View style={styles.referenceChipRow}>
            {referenceVerses.map((verse) => (
              <TagChip
                key={verse.reference}
                label={verse.reference}
                onPress={() => {
                  setChapterBook(verse.book);
                  setChapterNumber(verse.chapter);
                  bottomSheetRef.current?.present();
                }}
              />
            ))}
          </View>
        ) : null}

        <TextInput
          multiline
          onChangeText={setBody}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          placeholder="Write what you are learning in the Word..."
          placeholderTextColor="#A8A29E"
          ref={bodyInputRef}
          scrollEnabled={false}
          selection={selection}
          style={styles.bodyInput}
          textAlignVertical="top"
          value={body}
        />

        {attachments.length ? (
          <View style={styles.attachmentStack}>
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                index={index}
                key={attachment.id}
                onRemove={() =>
                  setAttachments((current) => current.filter((item) => item.id !== attachment.id))
                }
              />
            ))}
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {lastSavedAt ? `Saved locally at ${lastSavedAt}` : 'Autosave is active'}
          </Text>
          <Text style={styles.statusText}>{attachments.length} attachments</Text>
        </View>
      </ScrollView>

      <BibleSheet
        book={chapterBook}
        chapter={chapterNumber}
        onInsertVerse={(verse) => {
          insertTextAtSelection(`${buildInsertedVerseText([verse])}\n`);
          bottomSheetRef.current?.dismiss();
        }}
        ref={bottomSheetRef}
        translationName="King James Version"
        verses={chapterVerses}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentStack: {
    gap: 10,
  },
  bodyInput: {
    color: '#414754',
    fontSize: 18,
    lineHeight: 32,
    minHeight: 380,
    paddingBottom: 40,
  },
  breadcrumb: {
    color: '#727785',
    fontSize: 14,
    fontWeight: '600',
  },
  breadcrumbAccent: {
    color: '#B7BCC9',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: palette.backgroundAlt,
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 56,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderBottomColor: 'rgba(231,229,228,0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 58,
    paddingBottom: 14,
  },
  headerButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  insertReferenceButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.blue,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  insertReferenceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingText: {
    color: palette.textMuted,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.82,
  },
  referenceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  statusText: {
    color: '#8C847A',
    fontSize: 12,
  },
  titleInput: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    paddingVertical: 0,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  verseSearchCard: {
    gap: 10,
  },
});
