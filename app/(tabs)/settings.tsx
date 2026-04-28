import { StyleSheet, Text, View } from 'react-native';

import { Card, PageScroll, Screen, SectionTitle, TopBar, palette } from '@/src/components/primitives';

export default function SettingsScreen() {
  return (
    <Screen>
      <TopBar leftIcon="settings-outline" rightIcon="shield-checkmark-outline" title="Settings" />
      <PageScroll>
        <View style={styles.section}>
          <SectionTitle title="Local-first by design" />
          <Card>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Your study stays on device</Text>
              <Text style={styles.cardText}>
                Notes, tags, templates, Bible content, and concordance lookups are persisted locally in SQLite for this first slice.
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle title="What this slice includes" />
          <Card>
            <View style={styles.bulletBlock}>
              {[
                'Workspace and Threads',
                'Template-backed rich markdown editor',
                'Autosave on every keystroke',
                'Inline verse insertion via slide-over Bible sheet',
                "Offline KJV seed + scoped Strong's preview",
              ].map((item) => (
                <Text key={item} style={styles.bullet}>
                  • {item}
                </Text>
              ))}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Coming later" />
          <Card>
            <View style={styles.bulletBlock}>
              {[
                'Thread share cards',
                'Biometric vault lock',
                'Encrypted export',
                'Semantic search',
                'Downloaded translation management',
              ].map((item) => (
                <Text key={item} style={styles.bulletMuted}>
                  • {item}
                </Text>
              ))}
            </View>
          </Card>
        </View>
      </PageScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  cardBody: {
    gap: 10,
    padding: 20,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletBlock: {
    gap: 10,
    padding: 20,
  },
  bullet: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  bulletMuted: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
