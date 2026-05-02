import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { PageScroll, Screen, TopBar } from '@/src/components/primitives';
import { getWorkspaceSnapshot } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { Space, WorkspaceSnapshot } from '@/src/types/domain';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { activeSpaceId, setActiveSpaceId } = useAppState();
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

  useFocusEffect(useCallback(() => {
    getWorkspaceSnapshot(db, activeSpaceId).then(setSnapshot);
  }, [activeSpaceId, db]));

  return (
    <Screen>
      <TopBar title="You" />
      <PageScroll>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Spaces</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {snapshot?.spaces.map((space) => (
              <AnimatedPressable
                key={space.id}
                haptic="light"
                onPress={() => setActiveSpaceId(space.id)}
                style={[styles.spaceRow, space.id === activeSpaceId && { backgroundColor: colors.accentSoft }]}>
                <View style={[styles.spaceDot, { backgroundColor: space.id === activeSpaceId ? colors.accent : colors.borderStrong }]} />
                <Text style={[styles.spaceName, { color: space.id === activeSpaceId ? colors.accent : colors.textPrimary }]}>
                  {space.name}
                </Text>
                {space.id === activeSpaceId ? (
                  <Ionicons color={colors.accent} name="checkmark-outline" size={16} />
                ) : null}
              </AnimatedPressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>About</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your study stays on device</Text>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                Notes, tags, templates, Bible content, and concordance lookups are persisted locally in SQLite.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>What&rsquo;s included</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.listBlock}>
              {['Journal with template-backed editor', 'Autosave on every keystroke', 'Inline verse insertion via Bible sheet', 'Offline KJV with Strong\'s preview', 'Threads for organizing studies'].map((item) => (
                <Text key={item} style={[styles.bullet, { color: colors.textPrimary }]}>• {item}</Text>
              ))}
            </View>
          </View>
        </View>
      </PageScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  sectionTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 1 },
  spaceRow: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  spaceDot: { borderRadius: 100, height: 8, width: 8 },
  spaceName: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15 },
  cardBody: { gap: 10, padding: 20 },
  cardTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 16 },
  cardText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
  listBlock: { gap: 8, padding: 20 },
  bullet: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
});
