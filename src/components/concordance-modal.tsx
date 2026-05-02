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
          <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
            <View>
              <Text style={styles.headerEyebrow}>Offline Concordance</Text>
              <Text style={styles.headerTitle}>
                {entry.strongsId}. {entry.transliteration}
              </Text>
            </View>
            <AnimatedPressable onPress={onClose}>
              <Ionicons color="#FFFFFF" name="close-outline" size={20} />
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

            <View style={[styles.definitionCard, { backgroundColor: colors.accentSoft }]}>
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
  modal: { borderRadius: 20, overflow: 'hidden', width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 22,
  },
  headerEyebrow: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.82,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'LibreBaskerville_700Bold',
    fontSize: 22,
    marginTop: 4,
  },
  content: { gap: 22, padding: 28 },
  wordRow: { alignItems: 'center', flexDirection: 'row', gap: 20 },
  originalWord: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 32 },
  pronunciationBlock: { gap: 4 },
  metaLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  metaValue: { fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22 },
  definitionCard: { borderRadius: 14, gap: 8, padding: 16 },
  definitionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 24,
  },
  metaGrid: { flexDirection: 'row', gap: 14 },
  metaCard: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  usageSection: { gap: 10 },
  usageTrack: { borderRadius: 100, flexDirection: 'row', height: 8, overflow: 'hidden' },
  usageSegment: { height: '100%' },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
