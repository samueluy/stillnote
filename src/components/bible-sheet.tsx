import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSQLiteContext } from 'expo-sqlite';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnnotationCanvas } from '@/src/components/annotation-canvas';
import { AnnotationToolbar } from '@/src/components/annotation-toolbar';
import { Divider, palette } from '@/src/components/primitives';
import {
  buildBibleAnnotationTargetKey,
  clearAnnotationStrokes,
  getAnnotationStrokes,
  replaceAnnotationStrokes,
} from '@/src/lib/database';
import { tapSubtle } from '@/src/lib/haptics';
import type {
  AnnotationColorKey,
  AnnotationStroke,
  AnnotationTool,
  BibleTranslationCode,
  BibleVerse,
} from '@/src/types/domain';

type Props = {
  referenceTitle: string;
  verses: BibleVerse[];
  onInsertVerses: () => void;
  onDismiss?: () => void;
};

export const BibleSheet = forwardRef<BottomSheetModal, Props>(function BibleSheet(
  { referenceTitle, verses, onDismiss, onInsertVerses },
  ref
) {
  const db = useSQLiteContext();
  const snapPoints = useMemo(() => ['50%'], []);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pan');
  const [annotationColorKey, setAnnotationColorKey] = useState<AnnotationColorKey>('ochre');
  const [annotationStrokes, setAnnotationStrokes] = useState<AnnotationStroke[]>([]);
  const [contentHeight, setContentHeight] = useState(1);
  const [contentWidth, setContentWidth] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(1);

  const annotationTargetKey = useMemo(() => {
    const firstVerse = verses[0];
    if (!firstVerse) {
      return null;
    }

    return buildBibleAnnotationTargetKey({
      book: firstVerse.book,
      chapter: firstVerse.chapter,
      translationCode: firstVerse.translationCode as BibleTranslationCode,
    });
  }, [verses]);

  useEffect(() => {
    let cancelled = false;

    if (!annotationTargetKey) {
      setAnnotationStrokes([]);
      return;
    }

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

  useEffect(() => {
    setIsAnnotating(false);
    setAnnotationTool('pan');
    setScrollY(0);
  }, [referenceTitle]);

  const dismissSheet = () => {
    if (ref && typeof ref !== 'function') {
      ref.current?.dismiss();
    }
  };

  const persistStrokes = useCallback(
    async (nextStrokes: AnnotationStroke[]) => {
      if (!annotationTargetKey) {
        return;
      }

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
      if (!annotationTargetKey) {
        return;
      }

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
    if (!annotationTargetKey) {
      return;
    }
    void clearAnnotationStrokes(db, {
      targetKey: annotationTargetKey,
      targetType: 'bible',
    });
  }, [annotationTargetKey, db]);

  return (
    <BottomSheetModal
      ref={ref}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
      )}
      handleIndicatorStyle={styles.handle}
      onDismiss={onDismiss}
      snapPoints={snapPoints}>
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{referenceTitle}</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                void tapSubtle();
                setIsAnnotating((current) => !current);
              }}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeLabel}>{isAnnotating ? 'Done' : 'Annotate'}</Text>
            </Pressable>
            <Pressable onPress={dismissSheet} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeLabel}>X</Text>
            </Pressable>
          </View>
        </View>

        <Divider />

        <View
          onLayout={(event) => {
            setViewportHeight(Math.max(event.nativeEvent.layout.height, 1));
            setViewportWidth(Math.max(event.nativeEvent.layout.width, 1));
          }}
          style={styles.readerShell}>
          <FlatList
            contentContainerStyle={styles.listContent}
            data={verses}
            keyExtractor={(item) => item.reference}
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
                  <Text style={styles.verseNumber}>{item.verse}</Text> {item.text}
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

        <Divider />

        <Pressable onPress={onInsertVerses} style={({ pressed }) => [styles.insertButton, pressed && styles.pressed]}>
          <Text style={styles.insertLabel}>Insert verse</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: palette.background,
    borderTopColor: palette.borderStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    backgroundColor: 'rgba(19,19,19,0.3)',
    height: 4,
    width: 36,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerTitle: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  closeLabel: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 12,
  },
  readerShell: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  listContent: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  verseRow: {
    paddingVertical: 10,
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
  insertButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  insertLabel: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
