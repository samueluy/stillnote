import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  Divider,
  EmptyState,
  ListRow,
  Screen,
  SearchField,
  TopBar,
  palette,
} from '@/src/components/primitives';
import { searchEverything } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { SearchResult } from '@/src/types/domain';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const nextResults = await searchEverything(db, activeSpaceId, query);
      if (!cancelled) {
        setResults(nextResults);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeSpaceId, db, query]);

  return (
    <Screen>
      <TopBar title="Search" />
      <View style={styles.searchWrap}>
        <SearchField
          onChangeText={setQuery}
          placeholder="Search notes or scripture"
          value={query}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={results}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState title="Nothing found" subtitle="Try a different word or verse reference." />
          ) : (
            <EmptyState
              subtitle="Find a note by title, theme, or passage reference."
              title="Start with a search"
            />
          )
        }
        renderItem={({ item }) => (
          <ListRow
            left={
              <View>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.resultBody}>
                  {item.body}
                </Text>
              </View>
            }
            onPress={() =>
              item.type === 'note'
                ? router.push(`/editor/${item.id}`)
                : router.push({ pathname: '/(tabs)/bible', params: { reference: item.title } })
            }
            right={<Text style={styles.resultType}>{item.type}</Text>}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 112,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  resultTitle: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
    marginBottom: 4,
  },
  resultBody: {
    color: palette.textSecondary,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 12,
    lineHeight: 20,
    maxWidth: 240,
  },
  resultType: {
    color: palette.textMuted,
    fontFamily: 'RobotoMono_400Regular',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
