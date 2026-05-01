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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

import { BibleSheet } from '@/src/components/bible-sheet';
import {
  AttachmentPreview,
  SearchField,
  TagChip,
  palette,
} from '@/src/components/primitives';
import { stripHtml } from '@/src/lib/editor';
import {
  buildInsertedVerseText,
  deleteNote,
  getBibleChapter,
  getNoteById,
  getVerseByReference,
  getVersesForReferences,
  saveNoteDraft,
  toggleNoteFavorite,
} from '@/src/lib/database';
import { persistImageAsset } from '@/src/lib/media';
import { detectVerseReferences } from '@/src/lib/verse-references';
import type { BibleVerse, MediaAttachment } from '@/src/types/domain';
import { useAppState } from '@/src/providers/app-provider';

type AttachmentDraft = Pick<
  MediaAttachment,
  'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'
>;

export default function EditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { bumpRefreshToken } = useAppState();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const richTextRef = useRef<RichEditor>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spaceId, setSpaceId] = useState('space-personal');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadName, setThreadName] = useState('Thread');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [chapterBook, setChapterBook] = useState('Genesis');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [verseSearch, setVerseSearch] = useState('');
  const [referenceVerses, setReferenceVerses] = useState<BibleVerse[]>([]);

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
      setIsFavorite(payload.note.isFavorite);
      setIsReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [db, noteId]);

  const plainText = useMemo(() => stripHtml(body), [body]);
  const references = useMemo(() => detectVerseReferences(plainText), [plainText]);

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
    }, 400);

    return () => clearTimeout(timeout);
  }, [attachments, body, db, isReady, noteId, spaceId, templateId, threadId, title]);

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

  const insertReferenceFromSearch = useCallback(async () => {
    const verse = await getVerseByReference(db, verseSearch.trim());
    if (!verse) {
      Alert.alert('Verse not found', 'Try a full reference like Genesis 1:1.');
      return;
    }

    const text = buildInsertedVerseText([verse]);
    richTextRef.current?.insertHTML(`<div><em>${text.replace(/\n/g, '<br>')}</em></div><div><br></div>`);
    setVerseSearch('');
  }, [db, verseSearch]);

  const insertVerseIntoBody = useCallback((verse: BibleVerse) => {
    const text = buildInsertedVerseText([verse]);
    richTextRef.current?.insertHTML(`<div><em>${text.replace(/\n/g, '<br>')}</em></div><div><br></div>`);
    bottomSheetRef.current?.dismiss();
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Preparing your study note...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons color={palette.textMuted} name="chevron-back-outline" size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Stillnote</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={async () => {
              await toggleNoteFavorite(db, noteId);
              setIsFavorite((v) => !v);
              bumpRefreshToken();
            }}
            style={styles.headerButton}>
            <Ionicons
              color={isFavorite ? '#E74C3C' : palette.textMuted}
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('Delete Note', 'Are you sure you want to delete this note? This action cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteNote(db, noteId);
                    bumpRefreshToken();
                    router.back();
                  },
                },
              ]);
            }}
            style={styles.headerButton}>
            <Ionicons color={palette.textMuted} name="trash-outline" size={20} />
          </Pressable>
          <Pressable onPress={() => bottomSheetRef.current?.present()} style={styles.headerButton}>
            <Ionicons color={palette.blue} name="book-outline" size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.breadcrumb}>
          Threads <Text style={styles.breadcrumbAccent}>›</Text> {threadName}
        </Text>

        <TextInput
          onChangeText={setTitle}
          placeholder="Untitled note"
          placeholderTextColor="#8C847A"
          style={styles.titleInput}
          value={title}
        />

        <RichToolbar
          editor={richTextRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.setParagraph,
            'insertImage',
          ]}
          iconMap={{
            [actions.setBold]: ({ tintColor }: { tintColor: string }) => (
              <Text style={[styles.toolIcon, { color: tintColor }]}>B</Text>
            ),
            [actions.setItalic]: ({ tintColor }: { tintColor: string }) => (
              <Text style={[styles.toolIcon, { color: tintColor, fontStyle: 'italic' }]}>I</Text>
            ),
            [actions.setUnderline]: ({ tintColor }: { tintColor: string }) => (
              <Text style={[styles.toolIcon, { color: tintColor, textDecorationLine: 'underline' }]}>U</Text>
            ),
            [actions.insertBulletsList]: ({ tintColor }: { tintColor: string }) => (
              <Ionicons color={tintColor} name="list-outline" size={16} />
            ),
            [actions.insertOrderedList]: ({ tintColor }: { tintColor: string }) => (
              <Ionicons color={tintColor} name="list-circle-outline" size={16} />
            ),
            [actions.setParagraph]: ({ tintColor }: { tintColor: string }) => (
              <Ionicons color={tintColor} name="chatbox-ellipses-outline" size={16} />
            ),
            insertImage: ({ tintColor }: { tintColor: string }) => (
              <Ionicons color={tintColor} name="image-outline" size={16} />
            ),
          }}
          insertImage={openImageLibrary}
          selectedButtonStyle={{ backgroundColor: palette.blueSoft }}
          style={styles.richToolbar}
        />

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

        <RichEditor
          ref={richTextRef}
          initialContentHTML={body}
          initialHeight={400}
          onChange={(html) => setBody(html)}
          placeholder="Write what you are learning in the Word..."
          editorStyle={{
            backgroundColor: palette.backgroundAlt,
            color: '#414754',
            placeholderColor: '#A8A29E',
            contentCSSText: 'font-size: 17px; line-height: 1.75; font-family: -apple-system, system-ui, sans-serif;',
            initialCSSText: 'body { padding: 0; margin: 0; }',
          }}
          style={styles.editor}
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
        onInsertVerse={insertVerseIntoBody}
        ref={bottomSheetRef}
        translationName="King James Version"
        verses={chapterVerses}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  attachmentStack: {
    gap: 10,
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
    gap: 16,
    paddingBottom: 56,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editor: {
    minHeight: 400,
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
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
  richToolbar: {
    backgroundColor: palette.backgroundAlt,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
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
  toolIcon: {
    fontSize: 15,
    fontWeight: '700',
  },
  verseSearchCard: {
    gap: 10,
  },
});
