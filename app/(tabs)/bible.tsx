import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import strongsTokenMap from '@/assets/data/strongs/kjv-token-map.json';
import { AnnotationCanvas } from '@/src/components/annotation-canvas';
import { AnnotationToolbar } from '@/src/components/annotation-toolbar';
import { ConcordanceModal } from '@/src/components/concordance-modal';
import { PlainListSheet } from '@/src/components/plain-list-sheet';
import { Divider, EmptyState, Screen, TextLink, TopBar, palette } from '@/src/components/primitives';
import {
  buildBibleAnnotationTargetKey,
  clearAnnotationStrokes,
  getBibleChapter,
  getBibleChapterCount,
  getBibleBooks,
  getAnnotationStrokes,
  getStrongsEntryForToken,
  getInstalledTranslations,
  replaceAnnotationStrokes,
} from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type {
  AnnotationColorKey,
  AnnotationStroke,
  AnnotationTool,
  BibleTranslationCode,
  BibleVerse,
  ConcordanceEntry,
  InstalledTranslation,
} from '@/src/types/domain';

function normalizeToken(value: string) {
  return value.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase();
}

function buildVerseSegments(verse: BibleVerse) {
  const mappedTokens =
    verse.translationCode === 'KJV'
      ? (strongsTokenMap as Record<string, { strongsId: string; text: string; tokenIndex: number }[]>)[
          verse.reference
        ] ?? []
      : [];

  if (!mappedTokens.length) {
    return [{ key: `${verse.reference}-plain`, text: verse.text, tokenIndex: null }];
  }

  const sourceTokens = verse.text.match(/[A-Za-z']+|[^A-Za-z']+/g) ?? [verse.text];
  let mappedIndex = 0;

  return sourceTokens.map((token, index) => {
    if (!/[A-Za-z']/.test(token)) {
      return {
        key: `${verse.reference}-sep-${index}`,
        text: token,
        tokenIndex: null,
      };
    }

    const candidate = mappedTokens[mappedIndex];
    if (candidate && normalizeToken(candidate.text) === normalizeToken(token)) {
      mappedIndex += 1;
      return {
        key: `${verse.reference}-word-${candidate.tokenIndex}`,
        text: token,
        tokenIndex: candidate.tokenIndex,
      };
    }

    return {
      key: `${verse.reference}-word-${index}`,
      text: token,
      tokenIndex: null,
    };
  });
}

export default function BibleScreen() {
  const params = useLocalSearchParams<{ reference?: string }>();
  const db = useSQLiteContext();
  const translationSheetRef = useRef<BottomSheetModal>(null);
  const bookSheetRef = useRef<BottomSheetModal>(null);
  const chapterSheetRef = useRef<BottomSheetModal>(null);
  const { activeTranslationCode, setActiveTranslationCode, lastBibleReference, setLastBibleReference } =
    useAppState();

  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [books, setBooks] = useState<string[]>([]);
  const [chapterCount, setChapterCount] = useState(1);
  const [installedTranslations, setInstalledTranslations] = useState<InstalledTranslation[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ConcordanceEntry | null>(null);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pan');
  const [annotationColorKey, setAnnotationColorKey] = useState<AnnotationColorKey>('ochre');
  const [annotationStrokes, setAnnotationStrokes] = useState<AnnotationStroke[]>([]);
  const [contentHeight, setContentHeight] = useState(1);
  const [contentWidth, setContentWidth] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(1);

  const annotationTargetKey = useMemo(
    () =>
      buildBibleAnnotationTargetKey({
        translationCode: activeTranslationCode as BibleTranslationCode,
        book,
        chapter,
      }),
    [activeTranslationCode, book, chapter]
  );

  const applyReference = useCallback((reference: string) => {
    const match = reference.match(/^(.*)\s+(\d+):(\d+)$/);
    if (!match) {
      return false;
    }

    setBook(match[1]);
    setChapter(Number(match[2]));
    return true;
  }, []);

  useEffect(() => {
    if (params.reference && applyReference(params.reference)) {
      setLastBibleReference(params.reference);
      return;
    }

    applyReference(lastBibleReference);
  }, [applyReference, lastBibleReference, params.reference, setLastBibleReference]);

  const loadStaticData = useCallback(async () => {
    const [nextBooks, nextTranslations] = await Promise.all([
      getBibleBooks(db, activeTranslationCode as BibleTranslationCode),
      getInstalledTranslations(db),
    ]);
    setBooks(nextBooks);
    setInstalledTranslations(nextTranslations);
  }, [activeTranslationCode, db]);

  const loadChapterData = useCallback(async () => {
    const [nextChapterCount, nextVerses] = await Promise.all([
      getBibleChapterCount(db, {
        translationCode: activeTranslationCode as BibleTranslationCode,
        book,
      }),
      getBibleChapter(db, {
        translationCode: activeTranslationCode as BibleTranslationCode,
        book,
        chapter,
      }),
    ]);

    setChapterCount(nextChapterCount);
    setVerses(nextVerses);
    setLastBibleReference(`${book} ${chapter}:1`);
  }, [activeTranslationCode, book, chapter, db, setLastBibleReference]);

  useEffect(() => {
    loadChapterData();
  }, [loadChapterData]);

  useEffect(() => {
    let cancelled = false;

    getAnnotationStrokes(db, {
      targetKey: annotationTargetKey,
      targetType: 'bible',
    }).then((strokes) => {
      if (!cancelled) {
        setAnnotationStrokes(strokes);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [annotationTargetKey, db]);

  useFocusEffect(
    useCallback(() => {
      loadStaticData();
    }, [loadStaticData])
  );

  const translationItems = useMemo(
    () =>
      installedTranslations.map((translation) => ({
        key: translation.code,
        label: translation.name,
        description: translation.code,
        onPress: () => {
          setActiveTranslationCode(translation.code);
          translationSheetRef.current?.dismiss();
        },
      })),
    [installedTranslations, setActiveTranslationCode]
  );

  const bookItems = useMemo(
    () =>
      books.map((bookName) => ({
        key: bookName,
        label: bookName,
        onPress: () => {
          setBook(bookName);
          setChapter(1);
          bookSheetRef.current?.dismiss();
        },
      })),
    [books]
  );

  const chapterItems = useMemo(
    () =>
      Array.from({ length: chapterCount }, (_, index) => {
        const value = index + 1;
        return {
          key: String(value),
          label: `Chapter ${value}`,
          onPress: () => {
            setChapter(value);
            chapterSheetRef.current?.dismiss();
          },
        };
      }),
    [chapterCount]
  );

  const openTokenStudy = useCallback(
    async (verse: BibleVerse, tokenIndex: number | null) => {
      if (isAnnotating || tokenIndex === null || verse.translationCode !== 'KJV') {
        return;
      }

      const entry = await getStrongsEntryForToken(db, {
        reference: verse.reference,
        tokenIndex,
        translationCode: 'KJV',
      });
      if (!entry) {
        return;
      }

      setSelectedEntry({
        gloss: entry.definition,
        id: entry.id,
        lexiconDefinition: entry.definition,
        original: entry.original,
        partOfSpeech: entry.testament === 'OT' ? 'Hebrew' : 'Greek',
        pronunciation: entry.pronunciation,
        rootWord: entry.strongsId,
        strongsId: entry.strongsId,
        transliteration: entry.transliteration,
        usageBreakdown: [],
      });
    },
    [db, isAnnotating]
  );

  const persistStrokes = useCallback(
    async (nextStrokes: AnnotationStroke[]) => {
      await replaceAnnotationStrokes(db, {
        strokes: nextStrokes,
        targetKey: annotationTargetKey,
        targetType: 'bible',
      });
    },
    [annotationTargetKey, db]
  );

  const commitStroke = useCallback(
    (stroke: Omit<AnnotationStroke, 'targetKey' | 'targetType'>) => {
      const nextStroke: AnnotationStroke = {
        ...stroke,
        targetKey: annotationTargetKey,
        targetType: 'bible',
      };

      setAnnotationStrokes((current) => {
        const next = [...current, nextStroke];
        void persistStrokes(next);
        return next;
      });
    },
    [annotationTargetKey, persistStrokes]
  );

  const undoStroke = useCallback(() => {
    setAnnotationStrokes((current) => {
      const next = current.slice(0, -1);
      void persistStrokes(next);
      return next;
    });
  }, [persistStrokes]);

  const clearStrokes = useCallback(() => {
    setAnnotationStrokes([]);
    void clearAnnotationStrokes(db, {
      targetKey: annotationTargetKey,
      targetType: 'bible',
    });
  }, [annotationTargetKey, db]);

  return (
    <Screen>
      <TopBar title="Bible" />
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Book</Text>
          <TextLink
            hapticIntent="selection"
            label={book}
            onPress={() => bookSheetRef.current?.present()}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Chapter</Text>
          <TextLink
            hapticIntent="selection"
            label={`Chapter ${chapter}`}
            onPress={() => chapterSheetRef.current?.present()}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Translation</Text>
          <TextLink
            hapticIntent="selection"
            label={
              installedTranslations.find((item) => item.code === activeTranslationCode)?.code ??
              activeTranslationCode
            }
            onPress={() => translationSheetRef.current?.present()}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Markings</Text>
          <TextLink
            hapticIntent="selection"
            label={isAnnotating ? 'Done' : 'Annotate'}
            onPress={() => setIsAnnotating((current) => !current)}
          />
        </View>
      </View>

      <View
        onLayout={(event) => {
          setViewportHeight(Math.max(event.nativeEvent.layout.height, 1));
          setViewportWidth(Math.max(event.nativeEvent.layout.width, 1));
        }}
        style={styles.readerShell}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={verses}
          ItemSeparatorComponent={Divider}
          keyExtractor={(item) => item.reference}
          ListEmptyComponent={<EmptyState subtitle="Choose another reference to continue reading." title="No verses found" />}
          onContentSizeChange={(width, height) => {
            setContentWidth(Math.max(width, viewportWidth, 1));
            setContentHeight(Math.max(height, viewportHeight, 1));
          }}
          onScroll={(event) => {
            setScrollY(event.nativeEvent.contentOffset.y);
          }}
          renderItem={({ item }) => (
            <View style={styles.verseRow}>
              <Text style={styles.verseText}>
                <Text style={styles.verseNumber}>{item.verse}</Text>{' '}
                {buildVerseSegments(item).map((segment) =>
                  segment.tokenIndex === null ? (
                    <Text key={segment.key} style={styles.verseText}>
                      {segment.text}
                    </Text>
                  ) : (
                    <Text
                      key={segment.key}
                      onLongPress={() => void openTokenStudy(item, segment.tokenIndex)}
                      style={styles.verseText}>
                      {segment.text}
                    </Text>
                  )
                )}
              </Text>
            </View>
          )}
          scrollEventThrottle={16}
        />
        {isAnnotating ? (
          <AnnotationCanvas
            activeColorKey={annotationColorKey}
            activeTool={annotationTool}
            contentHeight={Math.max(contentHeight, viewportHeight)}
            contentWidth={Math.max(contentWidth, viewportWidth)}
            onCommitStroke={commitStroke}
            scrollY={scrollY}
            strokes={annotationStrokes}
          />
        ) : null}
      </View>

      {isAnnotating ? (
        <AnnotationToolbar
          activeColorKey={annotationColorKey}
          activeTool={annotationTool}
          canUndo={annotationStrokes.length > 0}
          onClear={clearStrokes}
          onDone={() => setIsAnnotating(false)}
          onSelectColor={setAnnotationColorKey}
          onSelectTool={setAnnotationTool}
          onUndo={undoStroke}
        />
      ) : null}

      <PlainListSheet items={bookItems} ref={bookSheetRef} title="Choose a book" />
      <PlainListSheet items={chapterItems} ref={chapterSheetRef} title="Choose a chapter" />
      <PlainListSheet items={translationItems} ref={translationSheetRef} title="Installed translations" />
      <ConcordanceModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} visible={Boolean(selectedEntry)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  controlRow: {
    alignItems: 'center',
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 8,
  },
  controlLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  readerShell: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  verseRow: {
    paddingVertical: 14,
  },
  verseNumber: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
  verseText: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 14,
    lineHeight: 25,
  },
});
