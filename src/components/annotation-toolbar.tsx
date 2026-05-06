import { Pressable, StyleSheet, Text, View } from 'react-native';

import { annotationInk } from '@/src/components/annotation-canvas';
import { palette } from '@/src/components/primitives';
import type { AnnotationColorKey, AnnotationTool } from '@/src/types/domain';

export function ColorSwatchRow({
  activeColorKey,
  onSelect,
}: {
  activeColorKey: AnnotationColorKey;
  onSelect: (colorKey: AnnotationColorKey) => void;
}) {
  const colors: AnnotationColorKey[] = ['ochre', 'sage', 'graphite'];

  return (
    <View style={styles.swatchRow}>
      {colors.map((colorKey) => (
        <Pressable
          key={colorKey}
          onPress={() => onSelect(colorKey)}
          style={({ pressed }) => [
            styles.swatchButton,
            activeColorKey === colorKey && styles.swatchButtonActive,
            pressed && styles.pressed,
          ]}>
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: annotationInk[colorKey],
              },
            ]}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function AnnotationToolbar({
  activeColorKey,
  activeTool,
  canUndo,
  onClear,
  onDone,
  onSelectColor,
  onSelectTool,
  onUndo,
}: {
  activeColorKey: AnnotationColorKey;
  activeTool: AnnotationTool;
  canUndo: boolean;
  onClear: () => void;
  onDone: () => void;
  onSelectColor: (colorKey: AnnotationColorKey) => void;
  onSelectTool: (tool: AnnotationTool) => void;
  onUndo: () => void;
}) {
  const tools: { key: AnnotationTool; label: string }[] = [
    { key: 'pan', label: 'Move' },
    { key: 'highlight', label: 'Highlight' },
    { key: 'draw', label: 'Draw' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toolRow}>
        {tools.map((tool) => (
          <Pressable
            key={tool.key}
            onPress={() => onSelectTool(tool.key)}
            style={({ pressed }) => [
              styles.toolButton,
              activeTool === tool.key && styles.toolButtonActive,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.toolLabel}>{tool.label}</Text>
          </Pressable>
        ))}
      </View>

      <ColorSwatchRow activeColorKey={activeColorKey} onSelect={onSelectColor} />

      <View style={styles.actionRow}>
        <Pressable
          disabled={!canUndo}
          onPress={onUndo}
          style={({ pressed }) => [
            styles.actionButton,
            !canUndo && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.actionLabel}>Undo</Text>
        </Pressable>
        <Pressable onPress={onClear} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={styles.actionLabel}>Clear page</Text>
        </Pressable>
        <Pressable onPress={onDone} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={styles.actionLabel}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  toolButtonActive: {
    borderBottomColor: palette.text,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolLabel: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swatchButton: {
    borderColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
  },
  swatchButtonActive: {
    borderColor: palette.text,
  },
  swatch: {
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    height: 18,
    width: 28,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  actionButton: {
    paddingVertical: 8,
  },
  actionLabel: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 12,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
