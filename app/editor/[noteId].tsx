import { RichText, TenTapStartKit, useEditorBridge } from '@10play/tentap-editor';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnotationCanvas } from '@/src/components/annotation-canvas';
import { AnnotationToolbar } from '@/src/components/annotation-toolbar';
import { BibleSheet } from '@/src/components/bible-sheet';
import { ActionSheet } from '@/src/components/action-sheet';
import { BibleGlyph } from '@/src/components/bible-glyph';
import { ImageViewerModal } from '@/src/components/image-viewer-modal';
import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { Divider, palette } from '@/src/components/primitives';
import {
  buildNoteAnnotationTargetKey,
  buildInsertedVerseBlockquoteMarkdown,
  clearAnnotationStrokes,
  getAnnotationStrokes,
  getNoteById,
  getTagSuggestions,
  getVerseByReference,
  getVersesForReferenceRange,
  replaceAnnotationStrokes,
  saveNoteDraft,
} from '@/src/lib/database';
import { htmlToMarkdown, markdownToHtml } from '@/src/lib/editor';
import { destructive, insert, tapSubtle } from '@/src/lib/haptics';
import { persistImageAsset } from '@/src/lib/media';
import { buildDefaultNoteTitle } from '@/src/lib/note-title';
import { InsertContentBridge } from '@/src/lib/rich-editor-bridge';
import { detectVerseReferences } from '@/src/lib/verse-references';
import { useAppState } from '@/src/providers/app-provider';
import type {
  AnnotationColorKey,
  AnnotationStroke,
  AnnotationTool,
  BibleTranslationCode,
  BibleVerse,
  MediaAttachment,
  TagSuggestion,
} from '@/src/types/domain';

type AttachmentDraft = Pick<
  MediaAttachment,
  'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'
>;

type SaveState = 'idle' | 'saving' | 'saved';
type PendingEditorCommand = () => void;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeHtmlToMarkdown(
  richHtml: string,
  attachments: AttachmentDraft[]
) {
  let nextHtml = richHtml;
  for (const attachment of attachments) {
    const uriPattern = escapeRegExp(attachment.uri);
    nextHtml = nextHtml.replace(
      new RegExp(`<img([^>]*?)src="${uriPattern}"([^>]*?)>`, 'g'),
      `<img$1src="${attachment.uri}" data-attachment-id="${attachment.id}"$2>`
    );
  }
  return htmlToMarkdown(nextHtml);
}

function buildEditorCss() {
  return `
    html, body, .ProseMirror {
      font-family: Roboto Mono, Menlo, monospace;
      color: #131313;
      background: #F8F4EE;
      font-size: 14px;
      line-height: 1.8;
      margin: 0;
      min-height: 100%;
    }
    .ProseMirror {
      min-height: 100%;
      padding: 12px 0 24px;
    }
    .ProseMirror p {
      margin: 0 0 12px;
    }
    .ProseMirror h1, .ProseMirror h2 {
      font-weight: 500;
      margin: 0 0 10px;
    }
    .ProseMirror h2 {
      font-size: 16px;
    }
    .ProseMirror ul, .ProseMirror ol {
      padding-left: 20px;
      margin: 0 0 12px;
    }
    .ProseMirror blockquote {
      border-left: 1px solid #131313;
      margin: 0 0 12px;
      padding-left: 12px;
    }
    .ProseMirror img {
      display: block;
      height: auto;
      margin: 12px 0;
      max-width: 100%;
      width: 100%;
    }
    .ProseMirror aside[data-scripture-quote="true"] {
      background: rgba(255, 255, 255, 0.42);
      border: 1px solid rgba(19,19,19,0.12);
      margin: 0 0 14px;
      padding: 14px 16px;
    }
    .ProseMirror aside[data-scripture-quote="true"] p {
      font-family: Libre Baskerville, Georgia, serif;
      font-size: 15px;
      line-height: 1.9;
      margin: 0;
    }
  `;
}

function buildEditorAnnotationMetricsScript() {
  return `
    (() => {
      if (window.__stillnoteAnnotationMetricsInstalled) {
        window.__stillnoteSendAnnotationMetrics?.();
        true;
        return;
      }

      window.__stillnoteAnnotationMetricsInstalled = true;

      const post = (payload) => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'stillnote-annotation-metrics',
          payload,
        }));
      };

      const getMetrics = () => {
        const proseMirror = document.querySelector('.ProseMirror');
        const scrollElement = document.scrollingElement || document.documentElement || document.body;
        const scrollY = window.scrollY || scrollElement.scrollTop || 0;
        const contentHeight = Math.max(
          proseMirror?.scrollHeight || 0,
          scrollElement.scrollHeight || 0,
          document.body?.scrollHeight || 0,
          window.innerHeight
        );
        const contentWidth = Math.max(
          proseMirror?.scrollWidth || 0,
          scrollElement.scrollWidth || 0,
          document.body?.scrollWidth || 0,
          window.innerWidth
        );

        post({
          contentHeight,
          contentWidth,
          scrollY,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        });
      };

      let frame = null;
      const schedule = () => {
        if (frame) {
          return;
        }

        frame = requestAnimationFrame(() => {
          frame = null;
          getMetrics();
        });
      };

      window.__stillnoteSendAnnotationMetrics = getMetrics;
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);

      const proseMirror = document.querySelector('.ProseMirror');
      if (proseMirror) {
        proseMirror.addEventListener('input', schedule);
        proseMirror.addEventListener('touchend', schedule, { passive: true });
      }

      const observerTarget = proseMirror || document.body;
      if (observerTarget) {
        new MutationObserver(schedule).observe(observerTarget, {
          characterData: true,
          childList: true,
          subtree: true,
        });
      }

      getMetrics();
      true;
    })();
  `;
}

export default function EditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    activeTranslationCode,
    lastBibleReference,
    setLastBibleReference,
  } = useAppState();

  const titleInputRef = useRef<TextInput>(null);
  const imageSheetRef = useRef<BottomSheetModal>(null);
  const bibleSheetRef = useRef<BottomSheetModal>(null);
  const attachmentActionSheetRef = useRef<BottomSheetModal>(null);
  const saveCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCaptionOpacity = useRef(new Animated.Value(0)).current;
  const pendingEditorCommandsRef = useRef<PendingEditorCommand[]>([]);
  const editorLoadCountRef = useRef(0);
  const hasHydratedEditorRef = useRef(false);
  const bridgeExtensions = useMemo(() => [...TenTapStartKit, InsertContentBridge], []);

  const [editorReady, setEditorReady] = useState(false);
  const [title, setTitle] = useState('');
  const [richBodyHtml, setRichBodyHtml] = useState('<p></p>');
  const [plainText, setPlainText] = useState('');
  const [spaceId, setSpaceId] = useState('space-personal');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('Folder');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [sheetVerses, setSheetVerses] = useState<BibleVerse[]>([]);
  const [sheetReferenceTitle, setSheetReferenceTitle] = useState('John 1:1');
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [activeTagPrefix, setActiveTagPrefix] = useState('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentDraft | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false);
  const [selectSeedTitleOnFocus, setSelectSeedTitleOnFocus] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pan');
  const [annotationColorKey, setAnnotationColorKey] = useState<AnnotationColorKey>('ochre');
  const [annotationStrokes, setAnnotationStrokes] = useState<AnnotationStroke[]>([]);
  const [editorViewportWidth, setEditorViewportWidth] = useState(1);
  const [editorViewportHeight, setEditorViewportHeight] = useState(1);
  const [editorContentWidth, setEditorContentWidth] = useState(1);
  const [editorContentHeight, setEditorContentHeight] = useState(1);
  const [editorScrollY, setEditorScrollY] = useState(0);

  const noteAnnotationTargetKey = useMemo(() => buildNoteAnnotationTargetKey(noteId), [noteId]);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    bridgeExtensions,
    dynamicHeight: false,
    initialContent: '<p></p>',
    onChange: () => {
      if (saveCaptureTimeoutRef.current) {
        clearTimeout(saveCaptureTimeoutRef.current);
      }
      saveCaptureTimeoutRef.current = setTimeout(async () => {
        const html = await editor.getHTML();
        const text = await editor.getText();
        setRichBodyHtml(html);
        setPlainText(text);
      }, 60);
    },
  });

  const markdownBody = useMemo(
    () => serializeHtmlToMarkdown(richBodyHtml, attachments),
    [attachments, richBodyHtml]
  );
  const references = useMemo(() => detectVerseReferences(markdownBody), [markdownBody]);
  const titleCharacterCount = title.length;
  const shouldShowTitleCount = titleCharacterCount >= 65;
  const bodyIsEmpty = !plainText.trim();

  const flushPendingEditorCommands = useCallback(() => {
    if (!editor.webviewRef.current || !editorReady) {
      return;
    }

    const pending = [...pendingEditorCommandsRef.current];
    pendingEditorCommandsRef.current = [];

    for (const action of pending) {
      try {
        action();
      } catch {
        // Ignore single command failures so the queue can continue.
      }
    }
  }, [editor, editorReady]);

  const runWhenEditorReady = useCallback(
    (action: PendingEditorCommand) => {
      if (editorReady && editor.webviewRef.current) {
        action();
        return;
      }

      pendingEditorCommandsRef.current.push(action);
    },
    [editor, editorReady]
  );

  const focusTitleField = useCallback(() => {
    titleInputRef.current?.focus();
  }, []);

  const focusBodyEditor = useCallback(
    (position: 'start' | 'end' | 'all' | number | boolean | null = 'end') => {
      runWhenEditorReady(() => {
        editor.focus(position);
      });
    },
    [editor, runWhenEditorReady]
  );

  const toggleFormattingToolbar = useCallback(() => {
    void tapSubtle();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFormattingToolbarOpen((current) => !current);
  }, []);

  const persistAnnotationStrokes = useCallback(
    async (nextStrokes: AnnotationStroke[]) => {
      await replaceAnnotationStrokes(db, {
        strokes: nextStrokes,
        targetKey: noteAnnotationTargetKey,
        targetType: 'note',
      });
    },
    [db, noteAnnotationTargetKey]
  );

  const handleCommitAnnotationStroke = useCallback(
    (stroke: Omit<AnnotationStroke, 'targetKey' | 'targetType'>) => {
      const nextStroke: AnnotationStroke = {
        ...stroke,
        targetKey: noteAnnotationTargetKey,
        targetType: 'note',
      };
      setAnnotationStrokes((current) => {
        const next = [...current, nextStroke];
        void persistAnnotationStrokes(next);
        return next;
      });
    },
    [noteAnnotationTargetKey, persistAnnotationStrokes]
  );

  const undoAnnotationStroke = useCallback(() => {
    setAnnotationStrokes((current) => {
      const next = current.slice(0, -1);
      void persistAnnotationStrokes(next);
      return next;
    });
  }, [persistAnnotationStrokes]);

  const clearAllAnnotationStrokes = useCallback(() => {
    setAnnotationStrokes([]);
    void clearAnnotationStrokes(db, {
      targetKey: noteAnnotationTargetKey,
      targetType: 'note',
    });
  }, [db, noteAnnotationTargetKey]);

  const handleEditorMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;
      if (typeof raw !== 'string') {
        return;
      }

      try {
        const message = JSON.parse(raw) as {
          type?: string;
          payload?: {
            contentHeight?: number;
            contentWidth?: number;
            scrollY?: number;
            viewportHeight?: number;
            viewportWidth?: number;
          };
        };

        if (message.type !== 'stillnote-annotation-metrics' || !message.payload) {
          return;
        }

        setEditorContentHeight(Math.max(message.payload.contentHeight ?? 1, 1));
        setEditorContentWidth(Math.max(message.payload.contentWidth ?? 1, editorViewportWidth));
        setEditorScrollY(Math.max(message.payload.scrollY ?? 0, 0));
        if (message.payload.viewportHeight) {
          setEditorViewportHeight(Math.max(message.payload.viewportHeight, 1));
        }
        if (message.payload.viewportWidth) {
          setEditorViewportWidth(Math.max(message.payload.viewportWidth, 1));
        }
      } catch {
        // Ignore editor bridge messages we don't own.
      }
    },
    [editorViewportWidth]
  );

  const showSavedFeedback = useCallback(() => {
    if (saveFeedbackTimeoutRef.current) {
      clearTimeout(saveFeedbackTimeoutRef.current);
    }

    saveCaptionOpacity.stopAnimation();
    saveCaptionOpacity.setValue(1);
    setSaveState('saved');

    saveFeedbackTimeoutRef.current = setTimeout(() => {
      Animated.timing(saveCaptionOpacity, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setSaveState('idle');
        }
      });
    }, 1500);
  }, [saveCaptionOpacity]);

  const handleEditorLoad = useCallback(() => {
    editorLoadCountRef.current += 1;
    const readyThreshold = Platform.OS === 'ios' ? 2 : 1;
    if (editorLoadCountRef.current >= readyThreshold) {
      setEditorReady(true);
    }
  }, []);

  useEffect(() => {
    editorLoadCountRef.current = 0;
    pendingEditorCommandsRef.current = [];
    hasHydratedEditorRef.current = false;
    setEditorReady(false);
    setCanPersist(false);
    setIsAnnotating(false);
    setAnnotationTool('pan');
    setEditorScrollY(0);
  }, [noteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadNote() {
      const [payload, strokes] = await Promise.all([
        getNoteById(db, noteId),
        getAnnotationStrokes(db, {
          targetKey: noteAnnotationTargetKey,
          targetType: 'note',
        }),
      ]);
      if (!payload || cancelled) {
        return;
      }

      const defaultTitle = buildDefaultNoteTitle();
      const nextRichHtml =
        payload.note.richBodyHtml?.trim() || markdownToHtml(payload.note.markdownBody);
      const nextIsNewNote =
        payload.note.createdAt === payload.note.updatedAt &&
        !payload.note.plainText.trim() &&
        payload.attachments.length === 0;
      const nextTitle = payload.note.title.trim() || defaultTitle;

      setTitle(nextTitle);
      setRichBodyHtml(nextRichHtml);
      setPlainText(payload.note.plainText);
      setSpaceId(payload.note.spaceId);
      setFolderId(payload.note.folderId);
      setFolderName(payload.folder?.name ?? 'Folder');
      setTemplateId(payload.note.templateId);
      setAttachments(payload.attachments as AttachmentDraft[]);
      setIsNewNote(nextIsNewNote);
      setSelectSeedTitleOnFocus(nextIsNewNote && nextTitle === defaultTitle);
      setAnnotationStrokes(strokes);
      setIsReady(true);

      if (nextIsNewNote) {
        setTimeout(() => {
          focusTitleField();
        }, 200);
      }
    }

    loadNote();
    return () => {
      cancelled = true;
    };
  }, [db, focusTitleField, noteAnnotationTargetKey, noteId]);

  useEffect(() => {
    if (!isReady || !editorReady || hasHydratedEditorRef.current) {
      return;
    }

    runWhenEditorReady(() => {
      editor.setContent(richBodyHtml || '<p></p>');
      editor.injectCSS(buildEditorCss());
      editor.injectJS(buildEditorAnnotationMetricsScript());
      hasHydratedEditorRef.current = true;
      setCanPersist(true);
      flushPendingEditorCommands();
    });
  }, [editor, editorReady, flushPendingEditorCommands, isReady, richBodyHtml, runWhenEditorReady]);

  useEffect(() => {
    if (plainText.trim()) {
      setSelectSeedTitleOnFocus(false);
    }
  }, [plainText]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsFormattingToolbarOpen(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    runWhenEditorReady(() => {
      editor.setEditable(!isAnnotating);
      editor.injectJS(buildEditorAnnotationMetricsScript());
    });

    if (isAnnotating) {
      Keyboard.dismiss();
      setIsFormattingToolbarOpen(false);
    }
  }, [editor, isAnnotating, runWhenEditorReady]);

  useEffect(() => {
    if (!plainText.trim()) {
      setTagSuggestions([]);
      setActiveTagPrefix('');
      return;
    }

    const match = plainText.match(/(?:^|\s)#([\p{L}\p{N}_-]*)$/u);
    if (!match) {
      setTagSuggestions([]);
      setActiveTagPrefix('');
      return;
    }

    const prefix = match[1] ?? '';
    setActiveTagPrefix(prefix);

    let cancelled = false;
    getTagSuggestions(db, {
      spaceId,
      prefix,
    }).then((nextSuggestions) => {
      if (!cancelled) {
        setTagSuggestions(nextSuggestions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [db, plainText, spaceId]);

  useEffect(() => {
    if (!isReady || !canPersist) {
      return;
    }

    const timeout = setTimeout(async () => {
      setSaveState('saving');
      await saveNoteDraft(db, {
        id: noteId,
        title: title.trim() || 'Untitled',
        markdownBody,
        richBodyHtml,
        templateId,
        spaceId,
        folderId,
        attachments,
      });
      showSavedFeedback();
    }, 260);

    return () => clearTimeout(timeout);
  }, [attachments, canPersist, db, folderId, isReady, markdownBody, noteId, richBodyHtml, showSavedFeedback, spaceId, templateId, title]);

  useEffect(() => {
    return () => {
      if (saveCaptureTimeoutRef.current) {
        clearTimeout(saveCaptureTimeoutRef.current);
      }
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const openReference = useCallback(
    async (referenceLabel: string) => {
      const match = detectVerseReferences(referenceLabel)[0];
      if (!match) {
        return;
      }

      const verses = await getVersesForReferenceRange(db, {
        translationCode: activeTranslationCode as BibleTranslationCode,
        book: match.book,
        chapter: match.chapterStart,
        verseStart: match.verseStart,
        verseEnd: match.verseEnd,
      });
      setSheetReferenceTitle(match.normalized);
      setSheetVerses(verses);
      setLastBibleReference(match.normalized);
      bibleSheetRef.current?.present();
    },
    [activeTranslationCode, db, setLastBibleReference]
  );

  const openLastBibleReference = useCallback(async () => {
    const verse = await getVerseByReference(db, {
      reference: lastBibleReference,
      translationCode: activeTranslationCode as BibleTranslationCode,
    });
    if (!verse) {
      return;
    }
    const verses = await getVersesForReferenceRange(db, {
      translationCode: verse.translationCode,
      book: verse.book,
      chapter: verse.chapter,
      verseStart: verse.verse,
    });
    setSheetReferenceTitle(lastBibleReference);
    setSheetVerses(verses);
    bibleSheetRef.current?.present();
  }, [activeTranslationCode, db, lastBibleReference]);

  const insertBlockquoteVerse = useCallback(
    (verses: BibleVerse[]) => {
      const blockquoteMarkdown = buildInsertedVerseBlockquoteMarkdown(verses);
      runWhenEditorReady(() => {
        editor.insertContent(`${markdownToHtml(blockquoteMarkdown)}<p></p>`);
      });
    },
    [editor, runWhenEditorReady]
  );

  const insertSheetVerses = useCallback(() => {
    if (!sheetVerses.length) {
      return;
    }

    insertBlockquoteVerse(sheetVerses);
    void insert();
    bibleSheetRef.current?.dismiss();
    setTimeout(() => {
      focusBodyEditor('end');
    }, 140);
  }, [focusBodyEditor, insertBlockquoteVerse, sheetVerses]);

  const handlePickImage = useCallback(
    async (mode: 'camera' | 'library') => {
      imageSheetRef.current?.dismiss();

      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Camera access is needed to capture a photo.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Photo access is needed to add an image.');
          return;
        }
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              cameraType: ImagePicker.CameraType.back,
              mediaTypes: ['images'],
              quality: 0.9,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.9,
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const persisted = await persistImageAsset(result.assets[0]);
      const attachment: AttachmentDraft = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        type: 'image',
        ...persisted,
      };

      setAttachments((current) => [...current, attachment]);
      runWhenEditorReady(() => {
        editor.insertContent(
          `<img alt="image" src="${attachment.uri}" data-attachment-id="${attachment.id}" /><p></p>`
        );
      });
      void insert();
      setTimeout(() => {
        focusBodyEditor('end');
      }, 80);
    },
    [editor, focusBodyEditor, runWhenEditorReady]
  );

  const removeAttachment = useCallback(
    async (attachment: AttachmentDraft) => {
      const nextAttachments = attachments.filter((item) => item.id !== attachment.id);
      const nextHtml = richBodyHtml.replace(
        new RegExp(`<img[^>]*src="${escapeRegExp(attachment.uri)}"[^>]*>`, 'g'),
        ''
      );

      setAttachments(nextAttachments);
      setRichBodyHtml(nextHtml);

      runWhenEditorReady(() => {
        editor.setContent(nextHtml || '<p></p>');
      });
      await destructive();
      attachmentActionSheetRef.current?.dismiss();
      setSelectedAttachment(null);
      setTimeout(() => {
        focusBodyEditor('end');
      }, 80);
    },
    [attachments, editor, focusBodyEditor, richBodyHtml, runWhenEditorReady]
  );

  const imageItems = [
    {
      key: 'camera',
      label: 'Take Photo',
      onPress: () => handlePickImage('camera'),
    },
    {
      key: 'library',
      label: 'Choose from Library',
      onPress: () => handlePickImage('library'),
    },
  ];

  const tagSuggestionItems = tagSuggestions.map((suggestion) => ({
    key: suggestion.id,
    label: suggestion.label,
    description: `${suggestion.noteCount ?? 0} notes`,
    onPress: () => {
      if (!activeTagPrefix && !plainText.endsWith('#')) {
        return;
      }
      const suffix = suggestion.name.slice(activeTagPrefix.length);
      runWhenEditorReady(() => {
        editor.insertContent(`${suffix} `);
      });
      setTagSuggestions([]);
      setActiveTagPrefix('');
      setTimeout(() => {
        focusBodyEditor('end');
      }, 40);
    },
  }));

  const createTagItem =
    activeTagPrefix && !tagSuggestions.some((item) => item.name === activeTagPrefix.toLowerCase())
      ? {
          key: `create-${activeTagPrefix}`,
          label: `#${activeTagPrefix}`,
          description: 'Create new tag',
          onPress: () => {
            runWhenEditorReady(() => {
              editor.insertContent(' ');
            });
            setTagSuggestions([]);
            setActiveTagPrefix('');
            setTimeout(() => {
              focusBodyEditor('end');
            }, 40);
          },
        }
      : null;

  const titleSuffix = shouldShowTitleCount ? (
    <Text style={styles.titleCount}>{titleCharacterCount}/80</Text>
  ) : null;

  const toggleAnnotateMode = () => {
    void tapSubtle();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAnnotating((current) => {
      const next = !current;
      if (!next) {
        setTimeout(() => {
          focusBodyEditor('end');
        }, 80);
      }
      return next;
    });
  };

  const formatAction = (action: () => void) => () => {
    void tapSubtle();
    runWhenEditorReady(action);
  };

  const formattingButtons = [
    { key: 'bold', label: 'B', onPress: formatAction(() => editor.toggleBold()) },
    { key: 'italic', label: 'I', onPress: formatAction(() => editor.toggleItalic()) },
    { key: 'underline', label: 'U', onPress: formatAction(() => editor.toggleUnderline()) },
    { key: 'blockquote', label: '"', onPress: formatAction(() => editor.toggleBlockquote()) },
    { key: 'bullet', label: '•', onPress: formatAction(() => editor.toggleBulletList()) },
    { key: 'numbered', label: '1.', onPress: formatAction(() => editor.toggleOrderedList()) },
  ];

  if (!isReady) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Preparing note…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Text style={styles.headerIcon}>{'<'}</Text>
        </Pressable>

        <View style={styles.headerMeta}>
          <Text style={styles.headerLabel}>{folderName}</Text>
          <Animated.Text
            style={[
              styles.savedCaption,
              {
                opacity: saveState === 'saved' ? saveCaptionOpacity : 0,
              },
            ]}>
            Saved
          </Animated.Text>
        </View>

        <Pressable
          onPress={openLastBibleReference}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <BibleGlyph />
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <TextInput
          autoCapitalize="sentences"
          autoCorrect={false}
          blurOnSubmit={false}
          onChangeText={(nextTitle) => {
            if (selectSeedTitleOnFocus) {
              setSelectSeedTitleOnFocus(false);
            }
            setTitle(nextTitle);
          }}
          onSubmitEditing={() => focusBodyEditor('end')}
          placeholder="Untitled"
          placeholderTextColor={palette.textMuted}
          ref={titleInputRef}
          returnKeyType="next"
          selectTextOnFocus={isNewNote && selectSeedTitleOnFocus}
          style={styles.titleInput}
          value={title}
        />
        {titleSuffix}
      </View>

      <Divider />

      <View style={styles.editorSection}>
        <View style={styles.editorSurface}>
          <View
            onLayout={(event) => {
              setEditorViewportWidth(Math.max(event.nativeEvent.layout.width, 1));
              setEditorViewportHeight(Math.max(event.nativeEvent.layout.height, 1));
            }}
            style={styles.editorWrap}>
            <RichText
              editor={editor}
              exclusivelyUseCustomOnMessage={false}
              onLoad={handleEditorLoad}
              onMessage={handleEditorMessage}
              scrollEnabled={false}
              style={styles.richText}
            />
            {bodyIsEmpty ? (
              <View pointerEvents="none" style={styles.placeholderOverlay}>
                <Text style={styles.placeholder}>Start writing...</Text>
              </View>
            ) : null}
            {isAnnotating ? (
              <AnnotationCanvas
                activeColorKey={annotationColorKey}
                activeTool={annotationTool}
                contentHeight={Math.max(editorContentHeight, editorViewportHeight)}
                contentWidth={Math.max(editorContentWidth, editorViewportWidth)}
                onCommitStroke={handleCommitAnnotationStroke}
                scrollY={editorScrollY}
                strokes={annotationStrokes}
              />
            ) : null}
          </View>
        </View>

        {references.length ? (
          <View style={styles.referenceRow}>
            {references.map((reference) => (
              <Pressable
                key={reference.normalized}
                onPress={() => openReference(reference.normalized)}
                style={({ pressed }) => [styles.referenceLink, pressed && styles.pressed]}>
                <Text style={styles.referenceText}>{reference.normalized}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {(createTagItem || tagSuggestionItems.length) ? (
          <View style={styles.suggestionWrap}>
            <Text style={styles.suggestionLabel}>Tag suggestions</Text>
            <View style={styles.suggestionList}>
              {[...(createTagItem ? [createTagItem] : []), ...tagSuggestionItems].map((item, index) => (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  style={({ pressed }) => [styles.suggestionRow, index > 0 && styles.suggestionBorder, pressed && styles.pressed]}>
                  <Text style={styles.suggestionText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {attachments.length ? (
          <View style={styles.attachmentSection}>
            <Text style={styles.suggestionLabel}>Attached images</Text>
            <View style={styles.suggestionList}>
              {attachments.map((attachment, index) => (
                <Pressable
                  key={attachment.id}
                  onLongPress={() => {
                    setSelectedAttachment(attachment);
                    requestAnimationFrame(() => attachmentActionSheetRef.current?.present());
                  }}
                  onPress={() => setViewerUri(attachment.uri)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    index > 0 && styles.suggestionBorder,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.suggestionText}>Image {index + 1}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.toolbar,
          isAnnotating && styles.annotationToolbarShell,
          {
            paddingBottom: keyboardHeight > 0 ? 10 : Math.max(insets.bottom, 10),
          },
        ]}>
        {isAnnotating ? (
          <AnnotationToolbar
            activeColorKey={annotationColorKey}
            activeTool={annotationTool}
            canUndo={annotationStrokes.length > 0}
            onClear={clearAllAnnotationStrokes}
            onDone={toggleAnnotateMode}
            onSelectColor={setAnnotationColorKey}
            onSelectTool={setAnnotationTool}
            onUndo={undoAnnotationStroke}
          />
        ) : isFormattingToolbarOpen ? (
          <>
            <Pressable onPress={toggleFormattingToolbar} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
              <Text style={styles.toolbarText}>Aa</Text>
            </Pressable>
            {formattingButtons.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
                <Text style={styles.toolbarText}>{item.label}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Pressable onPress={toggleFormattingToolbar} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
              <Text style={styles.toolbarText}>Aa</Text>
            </Pressable>
            <Pressable onPress={toggleAnnotateMode} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
              <Text style={styles.toolbarText}>Ink</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void tapSubtle();
                runWhenEditorReady(() => {
                  editor.insertContent('- [ ] ');
                });
              }}
              style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
              <Text style={styles.toolbarText}>✓</Text>
            </Pressable>
            <Pressable onPress={() => imageSheetRef.current?.present()} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]}>
              <Text style={styles.toolbarText}>Img</Text>
            </Pressable>
          </>
        )}
      </View>

      <PlainListSheet items={imageItems} ref={imageSheetRef} title="Add image" />
      <ActionSheet
        description="Open the image or remove it from this note."
        items={
          selectedAttachment
            ? [
                {
                  key: 'open-image',
                  label: 'Open image',
                  onPress: () => {
                    attachmentActionSheetRef.current?.dismiss();
                    setViewerUri(selectedAttachment.uri);
                  },
                },
                {
                  key: 'delete-image',
                  label: 'Delete image',
                  onPress: () => {
                    void removeAttachment(selectedAttachment);
                  },
                },
              ]
            : []
        }
        ref={attachmentActionSheetRef}
        title="Image actions"
      />
      <BibleSheet
        onInsertVerses={insertSheetVerses}
        ref={bibleSheetRef}
        referenceTitle={sheetReferenceTitle}
        verses={sheetVerses}
      />
      <ImageViewerModal onClose={() => setViewerUri(null)} uri={viewerUri} visible={Boolean(viewerUri)} />
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
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  headerButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerIcon: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  headerMeta: {
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
  },
  headerLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  savedCaption: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 10,
  },
  titleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleInput: {
    backgroundColor: 'transparent',
    color: palette.text,
    flex: 1,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 20,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  titleCount: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    paddingBottom: 3,
  },
  editorSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  editorSurface: {
    backgroundColor: palette.background,
    flex: 1,
  },
  editorWrap: {
    backgroundColor: palette.background,
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  richText: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  placeholderOverlay: {
    left: 0,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  placeholder: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 14,
  },
  referenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  referenceLink: {
    alignSelf: 'flex-start',
  },
  referenceText: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  suggestionWrap: {
    marginTop: 16,
  },
  attachmentSection: {
    marginTop: 16,
  },
  suggestionLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    marginBottom: 8,
  },
  suggestionList: {
    borderColor: palette.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 12,
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
  annotationToolbarShell: {
    alignItems: 'stretch',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  toolbarButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  toolbarText: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
