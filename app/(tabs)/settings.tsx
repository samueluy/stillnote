import { StyleSheet, Text, View } from 'react-native';
import { Card, PageScroll, Screen, SectionTitle, TopBar } from '@/src/components/primitives';
import { useTheme } from '@/src/theme/useTheme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <TopBar leftIcon="settings-outline" rightIcon="shield-checkmark-outline" title="Settings" />
      <PageScroll>
        <View style={styles.section}>
          <SectionTitle title="Local-First by Design" />
          <Card>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your study stays on device</Text>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                Notes, tags, templates, Bible content, and concordance lookups are persisted locally in SQLite for this first slice.
              </Text>
            </View>
          </Card>
        </View>
        <View style={styles.section}>
          <SectionTitle title="What This Slice Includes" />
          <Card>
            <View style={styles.bulletBlock}>
              {['Workspace and Threads', 'Template-backed rich markdown editor', 'Autosave on every keystroke', 'Inline verse insertion via slide-over Bible sheet', "Offline KJV seed + scoped Strong's preview"].map((item) => (
                <Text key={item} style={[styles.bullet, { color: colors.textPrimary }]}>• {item}</Text>
              ))}
            </View>
          </Card>
        </View>
        <View style={styles.section}>
          <SectionTitle title="Coming Later" />
          <Card>
            <View style={styles.bulletBlock}>
              {['Thread share cards', 'Biometric vault lock', 'Encrypted export', 'Semantic search', 'Downloaded translation management'].map((item) => (
                <Text key={item} style={[styles.bulletMuted, { color: colors.textSecondary }]}>• {item}</Text>
              ))}
            </View>
          </Card>
        </View>
      </PageScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 20 },
  cardBody: { gap: 10, padding: 18 },
  cardTitle: { fontFamily: 'LibreBaskerville_700Bold', fontSize: 16 },
  cardText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
  bulletBlock: { gap: 10, padding: 18 },
  bullet: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  bulletMuted: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
});
