import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/components/primitives';
import type { ConcordanceEntry } from '@/src/types/domain';

export function ConcordanceModal({
  entry,
  visible,
  onClose,
}: {
  entry: ConcordanceEntry;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.scrim}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>Offline Concordance</Text>
              <Text style={styles.headerTitle}>
                {entry.strongsId}. {entry.transliteration}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons color="#FFFFFF" name="close-outline" size={20} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.wordRow}>
              <Text style={styles.originalWord}>{entry.original}</Text>
              <View style={styles.pronunciationBlock}>
                <Text style={styles.metaLabel}>Pronunciation</Text>
                <Text style={styles.metaValue}>{entry.pronunciation}</Text>
              </View>
            </View>

            <View style={styles.definitionCard}>
              <Text style={styles.metaLabel}>Lexicon Definition</Text>
              <Text style={styles.definitionText}>{entry.lexiconDefinition}</Text>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Part of Speech</Text>
                <Text style={styles.metaValue}>{entry.partOfSpeech}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Root Word</Text>
                <Text style={styles.metaValue}>{entry.rootWord}</Text>
              </View>
            </View>

            <View style={styles.usageSection}>
              <Text style={styles.metaLabel}>Usage in NT</Text>
              <View style={styles.usageTrack}>
                {entry.usageBreakdown.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.usageSegment,
                      {
                        backgroundColor: index === 2 ? '#D6D3D1' : palette.blue,
                        flex: item.value,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.usageLabels}>
                {entry.usageBreakdown.map((item) => (
                  <Text key={item.label} style={styles.usageLabel}>
                    {item.label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    alignItems: 'center',
    backgroundColor: palette.scrim,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    backgroundColor: palette.text,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  headerEyebrow: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 0.4,
    opacity: 0.82,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 6,
  },
  content: {
    gap: 24,
    padding: 32,
  },
  wordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
  },
  originalWord: {
    color: palette.text,
    fontSize: 36,
  },
  pronunciationBlock: {
    gap: 4,
  },
  metaLabel: {
    color: '#A8A29E',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#44403C',
    fontSize: 16,
    lineHeight: 24,
  },
  definitionCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    gap: 8,
    padding: 16,
  },
  definitionText: {
    color: '#44403C',
    fontSize: 16,
    lineHeight: 25,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metaCard: {
    borderColor: '#F5F5F4',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  usageSection: {
    gap: 10,
  },
  usageTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
  },
  usageSegment: {
    height: '100%',
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageLabel: {
    color: '#A8A29E',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
