import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { useTheme } from '@/src/theme/useTheme';
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
  const { colors } = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View style={[styles.modal, { backgroundColor: colors.bgElevated }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={styles.headerEyebrow}>Offline Concordance</Text>
              <Text style={styles.headerTitle}>
                {entry.strongsId}. {entry.transliteration}
              </Text>
            </View>
            <AnimatedPressable onPress={onClose}>
              <Ionicons color={colors.textPrimary} name="close-outline" size={20} />
            </AnimatedPressable>
          </View>

          <View style={styles.content}>
            <View style={styles.wordRow}>
              <Text style={[styles.originalWord, { color: colors.textPrimary }]}>
                {entry.original}
              </Text>
              <View style={styles.pronunciationBlock}>
                <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>
                  Pronunciation
                </Text>
                <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
                  {entry.pronunciation}
                </Text>
              </View>
            </View>

            <View style={[styles.definitionCard, { borderColor: colors.borderStrong }]}>
              <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>
                Lexicon Definition
              </Text>
              <Text style={[styles.definitionText, { color: colors.textPrimary }]}>
                {entry.lexiconDefinition}
              </Text>
            </View>

            <View style={styles.metaGrid}>
              <View style={[styles.metaCard, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>
                  Part of Speech
                </Text>
                <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
                  {entry.partOfSpeech}
                </Text>
              </View>
              <View style={[styles.metaCard, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Root Word</Text>
                <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
                  {entry.rootWord}
                </Text>
              </View>
            </View>

            <View style={styles.usageSection}>
              <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Usage in NT</Text>
              <View style={styles.usageTrack}>
                {entry.usageBreakdown.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.usageSegment,
                      {
                        backgroundColor: index === 2 ? colors.borderStrong : colors.accent,
                        flex: item.value,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.usageLabels}>
                {entry.usageBreakdown.map((item) => (
                  <Text key={item.label} style={[styles.usageLabel, { color: colors.textTertiary }]}>
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
  scrim: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  modal: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', width: '100%' },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerEyebrow: {
    color: 'rgba(19,19,19,0.37)',
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#131313',
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 14,
    marginTop: 4,
  },
  content: { gap: 20, padding: 20 },
  wordRow: { alignItems: 'center', flexDirection: 'row', gap: 20 },
  originalWord: { fontFamily: 'RobotoMono_500Medium', fontSize: 24 },
  pronunciationBlock: { gap: 4 },
  metaLabel: {
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  metaValue: { fontFamily: 'RobotoMono_400Regular', fontSize: 13, lineHeight: 20 },
  definitionCard: { borderWidth: StyleSheet.hairlineWidth, gap: 8, padding: 14 },
  definitionText: {
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
    lineHeight: 22,
  },
  metaGrid: { flexDirection: 'row', gap: 14 },
  metaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  usageSection: { gap: 10 },
  usageTrack: { flexDirection: 'row', height: 6, overflow: 'hidden' },
  usageSegment: { height: '100%' },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageLabel: {
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
