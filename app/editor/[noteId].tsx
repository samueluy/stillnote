import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RichText, useEditorBridge } from '@10play/tentap-editor';
import Animated, {
  useAnimatedKeyboard,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { BibleSheet } from '@/src/components/bible-sheet';
import {
  AttachmentPreview,
  SearchField,
  TagChip,
  palette,
} from '@/src/components/primitives';
import { AnimatedPressable } from '@/src/components/animated-pressable';
import { EditorToolbar } from '@/src/components/editor-toolbar';
import { markdownToHtml, stripHtml } from '@/src/lib/editor';
import {
  buildInsertedVerseText,
  createNoteFromTemplate,
  deleteNote,
  getBibleChapter,
  getNoteById,
  getVerseByReference,
  getVersesForReferences,
  saveNoteDraft,
  toggleNoteFavorite,
  createThread,
} from '@/src/lib/database';
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
  const headerOpacity = useSharedValue(1);
  const bodyRef = useRef('');
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  const headerOpacityStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const enterDistractionFree = useCallback(() => {
    setIsDistractionFree(true);
    headerOpacity.value = withTiming(0, { duration: 300 });
  }, [headerOpacity]);

  const exitDistractionFree = useCallback(() => {
    setIsDistractionFree(false);
    headerOpacity.value = withTiming(1, { duration: 300 });
  }, [headerOpacity]);

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
  const [initialContent, setInitialContent] = useState('');

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent,
    onChange: async () => {
      try {
        const html = await (editor as any).getHTML();
        if (html) {
          bodyRef.current = html;
          setBody(html);
        }
      } catch {
        // getHTML may fail during init
      }
    },
  });

  const { height: keyboardHeight } = useAnimatedKeyboard();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const payload = await getNoteById(db, noteId);
      if (!payload || cancelled) {
        return;
      }

      const rawBody = payload.note.markdownBody || '';
      const isHtml = rawBody.trim().startsWith('<');
      const htmlBody = isHtml ? rawBody : markdownToHtml(rawBody);

      setTitle(payload.note.title);
      setInitialContent(htmlBody);
      setSpaceId(payload.note.spaceId);
      setThreadId(payload.note.primaryThreadId);
      setThreadName(payload.thread?.name ?? 'Study Note');
      setTemplateId(payload.note.templateId);
      setAttachments(payload.attachments as AttachmentDraft[]);
      setIsFavorite(payload.note.isFavorite);
      bodyRef.current = payload.note.markdownBody || '';
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
        markdownBody: bodyRef.current,
        templateId,
        spaceId,
        threadId,
        attachments,
      }).then(() => {
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [attachments, db, isReady, noteId, spaceId, templateId, threadId, title]);

  const insertVerseHtml = useCallback(async (verseHtml: string) => {
    try {
      const current = await (editor as any).getHTML();
      (editor as any).setContent(current + verseHtml);
    } catch {
      // fallback: inject via webview
      editor.webviewRef.current?.injectJavaScript(
        `document.execCommand('insertHTML', false, ${JSON.stringify(verseHtml)}); true;`
      );
    }
  }, [editor]);

  const insertReferenceFromSearch = useCallback(async () => {
    const verse = await getVerseByReference(db, verseSearch.trim());
    if (!verse) {
      Alert.alert('Verse not found', 'Try a full reference like Genesis 1:1.');
      return;
    }

    const text = buildInsertedVerseText([verse]);
    const verseHtml = `<p><em>${text.replace(/\n/g, '<br>')}</em></p><p></p>`;
    await insertVerseHtml(verseHtml);
    setVerseSearch('');
  }, [db, verseSearch, insertVerseHtml]);

  const insertVerseIntoBody = useCallback((verse: BibleVerse) => {
    const text = buildInsertedVerseText([verse]);
    const verseHtml = `<p><em>${text.replace(/\n/g, '<br>')}</em></p><p></p>`;
    insertVerseHtml(verseHtml);
    bottomSheetRef.current?.dismiss();
  }, [insertVerseHtml]);

  const extractToNewNote = useCallback(async () => {
    const currentBody = bodyRef.current;
    if (!stripHtml(currentBody).trim()) {
      Alert.alert('Nothing to extract', 'Write some content first.');
      return;
    }
    Alert.alert('Extract to Note', 'Create a new note from this content?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Extract',
        onPress: async () => {
          const thread = await createThread(db, { spaceId });
          const noteId = await createNoteFromTemplate(db, {
            templateId: templateId ?? '',
            spaceId,
            threadId: thread.id,
            title: title ? `Branch: ${title}` : 'Extracted Note',
          });
          await saveNoteDraft(db, {
            id: noteId,
            title: title ? `Branch: ${title}` : 'Extracted Note',
            markdownBody: currentBody,
            templateId,
            spaceId,
            threadId: thread.id,
          });
          bumpRefreshToken();
          Alert.alert('Note created', 'The new note has been created from this content.');
        },
      },
    ]);
  }, [db, spaceId, templateId, title, bumpRefreshToken]);

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
      <Animated.View style={[styles.header, headerOpacityStyle]}>
        <AnimatedPressable
          onPress={() => {
            if (isDistractionFree) {
              exitDistractionFree();
            } else {
              router.back();
            }
          }}
          style={styles.headerButton}>
          <Ionicons
            color={isDistractionFree ? palette.blue : palette.textMuted}
            name={isDistractionFree ? 'eye-outline' : 'chevron-back-outline'}
            size={20}
          />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Stillnote</Text>
        <View style={styles.headerActions}>
          <AnimatedPressable
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
          </AnimatedPressable>
          <AnimatedPressable
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
          </AnimatedPressable>
          <AnimatedPressable onPress={() => bottomSheetRef.current?.present()} style={styles.headerButton}>
            <Ionicons color={palette.blue} name="book-outline" size={20} />
          </AnimatedPressable>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={headerOpacityStyle}>
          <Text style={styles.breadcrumb}>
            Threads <Text style={styles.breadcrumbAccent}>›</Text> {threadName}
          </Text>
        </Animated.View>

        <TextInput
          onChangeText={setTitle}
          onFocus={enterDistractionFree}
          placeholder="Untitled note"
          placeholderTextColor="#8C847A"
          style={styles.titleInput}
          value={title}
        />

        <AnimatedPressable onPress={extractToNewNote} style={({ pressed }) => [styles.extractButton, pressed && styles.pressed]}>
          <Ionicons color={palette.blue} name="git-branch-outline" size={16} />
          <Text style={styles.extractButtonText}>Extract to New Note</Text>
        </AnimatedPressable>

        <View style={styles.verseSearchCard}>
          <SearchField
            onChangeText={setVerseSearch}
            placeholder="Insert a verse like Genesis 1:1"
            value={verseSearch}
          />
          <AnimatedPressable onPress={insertReferenceFromSearch} style={({ pressed }) => [styles.insertReferenceButton, pressed && styles.pressed]}>
            <Text style={styles.insertReferenceText}>Insert Verse</Text>
          </AnimatedPressable>
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

        <RichText
          editor={editor}
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
      <EditorToolbar
        editor={editor}
        keyboardHeight={keyboardHeight}
        onBiblePress={() => bottomSheetRef.current?.present()}
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
    flex: 1,
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
  extractButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  extractButtonText: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '600',
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
  verseSearchCard: {
    gap: 10,
  },
});
