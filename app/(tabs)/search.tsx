import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { SpaceSwitcher } from '@/src/components/space-switcher';
import {
  Divider,
  EmptyState,
  ListRow,
  Screen,
  SearchField,
  TopBar,
  palette,
} from '@/src/components/primitives';
import { getAllTags, getSpaces, searchNotes } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import type { SearchResult, Space, Tag } from '@/src/types/domain';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId, setActiveSpaceId } = useAppState();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    let cancelled = false;

    getSpaces(db).then((nextSpaces) => {
      if (!cancelled) {
        setSpaces(nextSpaces);
      }
    });

    getAllTags(db, activeSpaceId).then((nextTags) => {
      if (!cancelled) {
        setTags(nextTags);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, db]);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const nextResults = await searchNotes(db, {
        spaceId: activeSpaceId,
        query,
      });
      if (!cancelled) {
        setResults(nextResults);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeSpaceId, db, query]);

  return (
    <Screen>
      <TopBar title="Search" />
      <View style={styles.spaceWrap}>
        <SpaceSwitcher activeSpaceId={activeSpaceId} onChange={setActiveSpaceId} spaces={spaces} />
      </View>
      <View style={styles.searchWrap}>
        <SearchField
          onChangeText={setQuery}
          placeholder="Search notes, tags, or references"
          value={query}
        />
      </View>

      <FlatList<SearchResult | Tag>
        contentContainerStyle={styles.listContent}
        data={(query.trim() ? results : tags) as (SearchResult | Tag)[]}
        ItemSeparatorComponent={Divider}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState title="Nothing found" subtitle="Try a different word or verse reference." />
          ) : (
            <EmptyState
              subtitle="Your tags will gather here for quiet browsing."
              title="No tags yet"
            />
          )
        }
        renderItem={({ item }) =>
          query.trim() ? (
            <ListRow
              hapticIntent="confirm"
              left={
                <View>
                  <Text style={styles.resultTitle}>{(item as SearchResult).title}</Text>
                  <Text numberOfLines={1} style={styles.resultBody}>
                    {(item as SearchResult).preview}
                  </Text>
                </View>
              }
              onPress={() => router.push(`/editor/${(item as SearchResult).id}`)}
              right={
                <Text style={styles.resultType}>
                  {new Date((item as SearchResult).updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              }
            />
          ) : (
            <ListRow
              hapticIntent="selection"
              left={<Text style={styles.tagName}>#{(item as Tag).name}</Text>}
              onPress={() => setQuery(`#${(item as Tag).name}`)}
              right={<Text style={styles.resultType}>{(item as Tag).noteCount ?? 0}</Text>}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaceWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  },
  tagName: {
    color: palette.text,
    fontFamily: 'RobotoMono_500Medium',
    fontSize: 13,
  },
});
