import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import type { AnnotationColorKey, AnnotationStroke, AnnotationTool } from '@/src/types/domain';

type Point = {
  x: number;
  y: number;
};

type Props = {
  activeColorKey: AnnotationColorKey;
  activeTool: AnnotationTool;
  contentHeight: number;
  contentWidth: number;
  scrollY?: number;
  strokes: AnnotationStroke[];
  onCommitStroke: (
    stroke: Omit<AnnotationStroke, 'targetKey' | 'targetType'>
  ) => void;
  style?: object;
};

export const annotationInk = {
  graphite: 'rgba(19,19,19,0.92)',
  ochre: 'rgba(204,171,102,0.36)',
  sage: 'rgba(126,144,113,0.32)',
} satisfies Record<AnnotationColorKey, string>;

const DEFAULT_STROKE = {
  draw: {
    opacity: 0.92,
    strokeWidth: 4,
  },
  highlight: {
    opacity: 0.36,
    strokeWidth: 18,
  },
} as const;

function makeId() {
  return `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampRatio(value: number) {
  return Math.max(0, Math.min(1, value));
}

function toPath(points: Point[]) {
  if (!points.length) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y + 0.01}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    const midY = (previous.y + current.y) / 2;
    path += ` Q ${previous.x} ${previous.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}

function projectStroke(
  stroke: AnnotationStroke,
  contentWidth: number,
  contentHeight: number,
  scrollY: number
) {
  return stroke.points.map((point) => ({
    x: point.x * contentWidth,
    y: point.y * contentHeight - scrollY,
  }));
}

export const AnnotationCanvas = memo(function AnnotationCanvas({
  activeColorKey,
  activeTool,
  contentHeight,
  contentWidth,
  onCommitStroke,
  scrollY = 0,
  strokes,
  style,
}: Props) {
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const layoutRef = useRef({ height: 0, width: 0 });
  const activePointsRef = useRef<Point[]>([]);
  const [activePath, setActivePath] = useState('');

  const updateActivePath = useCallback(() => {
    if (rafRef.current) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setActivePath(toPath(activePointsRef.current));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    const nextHeight = event.nativeEvent.layout.height;
    if (
      layoutRef.current.width !== nextWidth ||
      layoutRef.current.height !== nextHeight
    ) {
      layoutRef.current = {
        width: nextWidth,
        height: nextHeight,
      };
    }
  };

  const beginStroke = useCallback((x: number, y: number) => {
    activePointsRef.current = [
      {
        x,
        y,
      },
    ];
    updateActivePath();
  }, [updateActivePath]);

  const appendPoint = useCallback((x: number, y: number) => {
    activePointsRef.current.push({
      x,
      y,
    });
    updateActivePath();
  }, [updateActivePath]);

  const endStroke = useCallback(() => {
    const nextPoints = activePointsRef.current.map((point) => ({
      x: clampRatio(point.x / Math.max(contentWidth, 1)),
      y: clampRatio((scrollY + point.y) / Math.max(contentHeight, 1)),
    }));

    if (nextPoints.length >= 2 && activeTool !== 'pan') {
      const now = new Date().toISOString();
      onCommitStroke({
        id: makeId(),
        tool: activeTool,
        colorKey: activeColorKey,
        strokeWidth: DEFAULT_STROKE[activeTool].strokeWidth,
        opacity: DEFAULT_STROKE[activeTool].opacity,
        points: nextPoints,
        canvasWidth: contentWidth,
        canvasHeight: contentHeight,
        createdAt: now,
        updatedAt: now,
      });
    }

    activePointsRef.current = [];
    setActivePath('');
  }, [activeColorKey, activeTool, contentHeight, contentWidth, onCommitStroke, scrollY]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(activeTool !== 'pan')
        .minDistance(0)
        .runOnJS(true)
        .onBegin((event) => {
          beginStroke(event.x, event.y);
        })
        .onUpdate((event) => {
          appendPoint(event.x, event.y);
        })
        .onFinalize(() => {
          endStroke();
        }),
    [activeTool, appendPoint, beginStroke, endStroke]
  );

  const renderedStrokes = useMemo(
    () =>
      strokes.map((stroke) => ({
        color: annotationInk[stroke.colorKey],
        id: stroke.id,
        opacity: stroke.opacity,
        path: toPath(projectStroke(stroke, contentWidth, contentHeight, scrollY)),
        strokeWidth: stroke.strokeWidth,
      })),
    [contentHeight, contentWidth, scrollY, strokes]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={handleLayout}
        pointerEvents={activeTool === 'pan' ? 'none' : 'auto'}
        style={[styles.overlay, style]}>
        <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
          {renderedStrokes.map((stroke) => (
            <Path
              key={stroke.id}
              d={stroke.path}
              fill="none"
              opacity={stroke.opacity}
              stroke={stroke.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={stroke.strokeWidth}
            />
          ))}
          {activePath ? (
            <Path
              d={activePath}
              fill="none"
              opacity={DEFAULT_STROKE[activeTool === 'pan' ? 'draw' : activeTool].opacity}
              stroke={annotationInk[activeColorKey]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={DEFAULT_STROKE[activeTool === 'pan' ? 'draw' : activeTool].strokeWidth}
            />
          ) : null}
        </Svg>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
