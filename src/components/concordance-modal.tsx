import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Divider, palette } from '@/src/components/primitives';
import type { ConcordanceEntry } from '@/src/types/domain';

export function ConcordanceModal({
  entry,
  visible,
  onClose,
}: {
  entry: ConcordanceEntry | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!entry) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.scrim}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Offline Strong’s</Text>
              <Text style={styles.title}>
                {entry.strongsId} · {entry.transliteration}
              </Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <Divider />

          <View style={styles.content}>
            <Text style={styles.original}>{entry.original}</Text>
            <Text style={styles.pronunciation}>{entry.pronunciation}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Part of speech</Text>
                <Text style={styles.metaValue}>{entry.partOfSpeech}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Root word</Text>
                <Text style={styles.metaValue}>{entry.rootWord}</Text>
              </View>
            </View>

            <View style={styles.definitionBlock}>
              <Text style={styles.metaLabel}>Gloss</Text>
              <Text style={styles.definition}>{entry.gloss}</Text>
            </View>

            <View style={styles.definitionBlock}>
              <Text style={styles.metaLabel}>Definition</Text>
              <Text style={styles.definition}>{entry.lexiconDefinition}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.background,
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeLabel: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 12,
  },
  content: {
    gap: 16,
    padding: 20,
  },
  definition: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
    lineHeight: 22,
  },
  definitionBlock: {
    gap: 6,
  },
  eyebrow: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  metaBlock: {
    flex: 1,
    gap: 6,
  },
  metaLabel: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaValue: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  original: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 28,
  },
  pressed: {
    opacity: 0.7,
  },
  pronunciation: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
  },
  scrim: {
    alignItems: 'center',
    backgroundColor: 'rgba(19,19,19,0.18)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    marginTop: 4,
  },
});
