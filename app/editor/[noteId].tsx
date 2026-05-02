import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RichText, useEditorBridge } from '@10play/tentap-editor';
import Animated, { useAnimatedKeyboard, useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { AnimatedChip, AnimatedChipRow } from '@/src/components/animated-chip';
import { BibleSheet } from '@/src/components/bible-sheet';
import { AttachmentPreview, SearchField } from '@/src/components/primitives';
import { markdownToHtml, stripHtml } from '@/src/lib/editor';
import { buildInsertedVerseText, createNoteFromTemplate, deleteNote, getBibleChapter, getNoteById, getVerseByReference, getVersesForReferences, saveNoteDraft, toggleNoteFavorite, createThread } from '@/src/lib/database';
import { detectVerseReferences } from '@/src/lib/verse-references';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { BibleVerse, MediaAttachment } from '@/src/types/domain';

type AttachmentDraft = Pick<MediaAttachment, 'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'>;

export default function EditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { bumpRefreshToken } = useAppState();
  const { colors, isDark } = useTheme();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const bodyRef = useRef('');
  const headerY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  const headerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: headerY.value }], opacity: headerOpacity.value }));
  const breadcrumbStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value, transform: [{ translateY: withSpring(headerOpacity.value === 1 ? 0 : -10, { damping: 20 }) }] }));

  const enterDistractionFree = useCallback(() => {
    setIsDistractionFree(true);
    headerOpacity.value = withTiming(0, { duration: 300 });
    headerY.value = withSpring(-20, { damping: 20, stiffness: 300 });
  }, [headerOpacity, headerY]);

  const exitDistractionFree = useCallback(() => {
    setIsDistractionFree(false);
    headerOpacity.value = withTiming(1, { duration: 300 });
    headerY.value = withSpring(0, { damping: 20, stiffness: 300 });
  }, [headerOpacity, headerY]);

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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [verseSearch, setVerseSearch] = useState('');
  const [referenceVerses, setReferenceVerses] = useState<BibleVerse[]>([]);
  const [initialContent, setInitialContent] = useState('');
  const [titleFocused, setTitleFocused] = useState(false);

  const saveDotOpacity = useSharedValue(0);
  const titleUnderlineWidth = useSharedValue(0);
  const saveDotStyle = useAnimatedStyle(() => ({ opacity: saveDotOpacity.value }));
  const titleUnderlineStyle = useAnimatedStyle(() => ({ width: `${titleUnderlineWidth.value * 100}%` }));

  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent,
    onChange: async () => {
      try { const html = await (editor as any).getHTML(); if (html) { bodyRef.current = html; setBody(html); } } catch {}
    },
  });

  const { height: keyboardHeight } = useAnimatedKeyboard();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const payload = await getNoteById(db, noteId);
      if (!payload || cancelled) return;
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
      bodyRef.current = htmlBody;
      setIsReady(true);
    }
    load();
    return () => { cancelled = true; };
  }, [db, noteId]);

  const plainText = useMemo(() => stripHtml(body), [body]);
  const references = useMemo(() => detectVerseReferences(plainText), [plainText]);
  const hashtags = useMemo(() => {
    const matches = plainText.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu);
    return new Set(Array.from(matches, (m) => m[1].toLowerCase()));
  }, [plainText]);

  useEffect(() => {
    let cancelled = false;
    async function loadCh() {
      const first = references[0];
      const book = first?.book ?? 'Genesis';
      const ch = first?.chapterStart ?? 1;
      setChapterBook(book); setChapterNumber(ch);
      const verses = await getBibleChapter(db, book, ch);
      if (!cancelled) setChapterVerses(verses);
    }
    loadCh();
    return () => { cancelled = true; };
  }, [db, references]);

  useEffect(() => {
    let cancelled = false;
    async function loadChips() {
      if (!references.length) { setReferenceVerses([]); return; }
      const verses = await getVersesForReferences(db, references.map((r) => `${r.book} ${r.chapterStart}:${r.verseStart}`));
      if (!cancelled) setReferenceVerses(verses);
    }
    loadChips();
    return () => { cancelled = true; };
  }, [db, references]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = setTimeout(async () => {
      setSaveState('saving');
      await saveNoteDraft(db, { id: noteId, title: title.trim() || 'Untitled Note', markdownBody: bodyRef.current, templateId, spaceId, threadId, attachments });
      setSaveState('saved');
    }, 400);
    return () => clearTimeout(timeout);
  }, [attachments, body, db, isReady, noteId, spaceId, templateId, threadId, title]);

  useEffect(() => {
    if (saveState === 'saving') saveDotOpacity.value = 1;
    else if (saveState === 'saved') { saveDotOpacity.value = 1; saveDotOpacity.value = withTiming(0, { duration: 1400 }); }
  }, [saveState, saveDotOpacity]);

  const insertVerseHtml = useCallback(async (verseHtml: string) => {
    try {
      const current = await (editor as any).getHTML();
      (editor as any).setContent(current + verseHtml);
    } catch {
      editor.webviewRef.current?.injectJavaScript(`document.execCommand('insertHTML', false, ${JSON.stringify(verseHtml)}); true;`);
    }
  }, [editor]);

  const insertReferenceFromSearch = useCallback(async () => {
    const verse = await getVerseByReference(db, verseSearch.trim());
    if (!verse) { Alert.alert('Verse not found', 'Try a reference like Genesis 1:1.'); return; }
    const text = buildInsertedVerseText([verse]);
    await insertVerseHtml(`<p><em>${text.replace(/\n/g, '<br>')}</em></p><p></p>`);
    setVerseSearch('');
  }, [db, verseSearch, insertVerseHtml]);

  const insertVerseIntoBody = useCallback((verse: BibleVerse) => {
    const text = buildInsertedVerseText([verse]);
    insertVerseHtml(`<p><em>${text.replace(/\n/g, '<br>')}</em></p><p></p>`);
    bottomSheetRef.current?.dismiss();
  }, [insertVerseHtml]);

  const extractToNewNote = useCallback(async () => {
    const currentBody = bodyRef.current;
    if (!stripHtml(currentBody).trim()) { Alert.alert('Nothing to extract', 'Write some content first.'); return; }
    Alert.alert('Extract to Note', 'Create a new note from this content?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Extract', onPress: async () => {
      const thread = await createThread(db, { spaceId });
      const noteId = await createNoteFromTemplate(db, { templateId: templateId ?? '', spaceId, threadId: thread.id, title: title ? `Branch: ${title}` : 'Extracted Note' });
      await saveNoteDraft(db, { id: noteId, title: title ? `Branch: ${title}` : 'Extracted Note', markdownBody: currentBody, templateId, spaceId, threadId: thread.id });
      bumpRefreshToken();
      Alert.alert('Note created', 'The new note has been created from this content.');
    } }]);
  }, [body, db, spaceId, templateId, title, bumpRefreshToken]);

  if (!isReady) {
    return <View style={[styles.container, styles.centered, { backgroundColor: colors.bg }]}><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing your study note…</Text></View>;
  }

  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }, headerStyle]}>
        <AnimatedPressable onPress={() => isDistractionFree ? exitDistractionFree() : router.back()} style={styles.headerBtn}>
          <Ionicons color={isDistractionFree ? colors.accent : colors.textSecondary} name={isDistractionFree ? 'eye-outline' : 'chevron-back-outline'} size={20} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Stillnote</Text>
        <View style={styles.headerActions}>
          <AnimatedPressable haptic="light" onPress={async () => { await toggleNoteFavorite(db, noteId); setIsFavorite((v) => !v); bumpRefreshToken(); }} style={styles.headerBtn}>
            <Ionicons color={isFavorite ? '#E74C3C' : colors.textSecondary} name={isFavorite ? 'heart' : 'heart-outline'} size={20} />
          </AnimatedPressable>
          <AnimatedPressable haptic="heavy" onPress={() => Alert.alert('Delete Note', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNote(db, noteId); bumpRefreshToken(); router.back(); } }])} style={styles.headerBtn}>
            <Ionicons color={colors.coral} name="trash-outline" size={20} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => bottomSheetRef.current?.present()} style={styles.headerBtn}>
            <Ionicons color={colors.accent} name="book-outline" size={20} />
          </AnimatedPressable>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={breadcrumbStyle}>
          <Text style={[styles.breadcrumb, { color: colors.textTertiary }]}>Threads <Text style={{ color: colors.borderStrong }}>›</Text> {threadName}</Text>
        </Animated.View>

        <TextInput onBlur={() => { exitDistractionFree(); setTitleFocused(false); titleUnderlineWidth.value = withTiming(0, { duration: 350 }); }} onChangeText={setTitle} onFocus={() => { enterDistractionFree(); setTitleFocused(true); titleUnderlineWidth.value = withTiming(1, { duration: 350 }); }} placeholder="Untitled" placeholderTextColor={colors.textTertiary} selectionColor={colors.accent} style={[styles.titleInput, { color: colors.textPrimary }]} value={title} />
        <Animated.View style={[styles.titleUnderline, { backgroundColor: colors.accent }, titleUnderlineStyle, titleFocused && { backgroundColor: colors.accent }]} />

        <EditorToolbar editor={editor} keyboardHeight={keyboardHeight} onBiblePress={() => bottomSheetRef.current?.present()} colors={colors} isDark={isDark} />

        <AnimatedPressable onPress={extractToNewNote} style={({ pressed }) => [styles.extractBtn, { backgroundColor: colors.coralSoft }, pressed && styles.pressed]}>
          <Ionicons color={colors.coral} name="git-branch-outline" size={14} />
          <Text style={[styles.extractText, { color: colors.coral }]}>Extract to Note</Text>
        </AnimatedPressable>

        <View style={styles.verseSearchCard}>
          <SearchField onChangeText={setVerseSearch} placeholder="Insert a verse like Genesis 1:1" value={verseSearch} />
          <AnimatedPressable onPress={insertReferenceFromSearch} style={({ pressed }) => [styles.insertVerseBtn, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
            <Text style={styles.insertVerseText}>Insert Verse</Text>
          </AnimatedPressable>
        </View>

        {referenceVerses.length ? <AnimatedChipRow>{referenceVerses.map((v) => (<AnimatedChip key={v.reference} accent={colors.gold} bg={colors.goldSoft} icon="book-outline" label={v.reference} onPress={() => { setChapterBook(v.book); setChapterNumber(v.chapter); bottomSheetRef.current?.present(); }} />))}</AnimatedChipRow> : null}
        {hashtags.size ? <AnimatedChipRow>{Array.from(hashtags).map((t) => (<AnimatedChip key={t} accent={colors.accent} bg={colors.accentSoft} icon="pricetag-outline" label={`#${t}`} />))}</AnimatedChipRow> : null}

        <RichText editor={editor} style={styles.editor} />

        {attachments.length ? <View style={styles.attachmentStack}>{attachments.map((a, i) => (<AttachmentPreview key={a.id} index={i} onRemove={() => setAttachments((c) => c.filter((x) => x.id !== a.id))} />))}</View> : null}

        <View style={styles.statusRow}>
          <View style={styles.saveIndicator}>
            <Animated.View style={[styles.saveDot, saveDotStyle, { backgroundColor: saveState === 'saved' ? colors.accent : saveState === 'saving' ? colors.coral : colors.textTertiary }]} />
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}</Text>
          </View>
          <Text style={[styles.statusText, { color: colors.textTertiary }]}>{wordCount} words · {Math.max(1, Math.ceil(wordCount / 200))} min · {hashtags.size} tags</Text>
        </View>
      </ScrollView>

      <BibleSheet book={chapterBook} chapter={chapterNumber} onInsertVerse={insertVerseIntoBody} ref={bottomSheetRef} translationName="King James Version" verses={chapterVerses} />
    </KeyboardAvoidingView>
  );
}

function EditorToolbar({ editor, keyboardHeight, onBiblePress, colors, isDark }: any) {
  const toolbarStyle = useAnimatedStyle(() => ({ bottom: withTiming(keyboardHeight.value + 8, { duration: 150 }) }));
  const btns = [
    { icon: 'text-outline' as const, action: () => (editor as any).toggleBold?.() },
    { icon: 'text-outline' as const, action: () => (editor as any).toggleItalic?.() },
    { icon: 'remove-outline' as const, action: () => (editor as any).toggleUnderline?.() },
    { icon: 'chatbox-ellipses-outline' as const, action: () => (editor as any).toggleBlockquote?.() },
    { icon: 'list-outline' as const, action: () => (editor as any).toggleBulletList?.() },
    { icon: 'list-circle-outline' as const, action: () => (editor as any).toggleOrderedList?.() },
    { icon: 'book-outline' as const, action: onBiblePress },
  ];

  return (
    <Animated.View style={[styles.toolbar, toolbarStyle]}>
      <View style={[styles.toolbarInner, { backgroundColor: isDark ? 'rgba(26,23,18,0.92)' : 'rgba(255,255,255,0.88)', borderColor: colors.border }]}>
        {btns.map((btn, i) => (
          <AnimatedPressable key={i} haptic="light" onPress={btn.action} style={styles.toolBtn}>
            <Ionicons color={colors.textSecondary} name={btn.icon} size={18} />
          </AnimatedPressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 58, paddingBottom: 12 },
  headerBtn: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  headerTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 18 },
  headerActions: { flexDirection: 'row', gap: 4 },
  content: { gap: 20, paddingBottom: 56, paddingHorizontal: 24, paddingTop: 24 },
  breadcrumb: { fontFamily: 'DMSans_400Regular', fontSize: 11, letterSpacing: 0.5 },
  titleInput: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 28, lineHeight: 36, paddingVertical: 0 },
  titleUnderline: { height: 2, marginTop: -6, width: 0 },
  editor: { flex: 1, minHeight: 400 },
  toolbar: { left: 20, position: 'absolute', right: 20, zIndex: 100 },
  toolbarInner: { alignItems: 'center', borderRadius: 100, borderWidth: 1, flexDirection: 'row', gap: 2, paddingHorizontal: 10, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  toolBtn: { alignItems: 'center', borderRadius: 100, height: 36, justifyContent: 'center', width: 38 },
  extractBtn: { alignItems: 'center', alignSelf: 'center', borderRadius: 100, flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  extractText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  verseSearchCard: { gap: 10 },
  insertVerseBtn: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9 },
  insertVerseText: { color: '#FFF', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  attachmentStack: { gap: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  saveIndicator: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveDot: { borderRadius: 100, height: 7, width: 7 },
  statusText: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  loadingText: { fontFamily: 'DMSans_400Regular', fontSize: 15 },
  pressed: { opacity: 0.85 },
});
