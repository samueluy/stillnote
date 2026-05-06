import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';

import { Divider, ListRow, Screen, TextLink, TopBar, palette } from '@/src/components/primitives';
import { installTranslation, listTranslations } from '@/src/lib/database';
import { complete } from '@/src/lib/haptics';
import type { InstalledTranslation } from '@/src/types/domain';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [translations, setTranslations] = useState<InstalledTranslation[]>([]);

  const load = useCallback(async () => {
    setTranslations(await listTranslations(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleInstall = useCallback(
    async (translation: InstalledTranslation) => {
      if (translation.isDownloaded) {
        return;
      }

      await installTranslation(db, translation.code);
      load();
      await complete();
      Alert.alert('Installed', `${translation.name} is now available offline.`);
    },
    [db, load]
  );

  return (
    <Screen>
      <TopBar title="Settings" />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={translations}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListRow
            left={<Text style={styles.name}>{item.name}</Text>}
            onPress={() => handleInstall(item)}
            right={
              item.isDownloaded ? (
                <Text style={styles.state}>{item.isBundled ? 'Bundled' : 'Installed'}</Text>
              ) : (
                <TextLink hapticIntent="selection" label="Download" onPress={() => handleInstall(item)} />
              )
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  name: {
    color: palette.text,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 13,
  },
  state: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
  },
});
