import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/animated-pressable';
import { EmptyState, Screen } from '@/src/components/primitives';
import { searchEverything } from '@/src/lib/database';
import { useAppState } from '@/src/providers/app-provider';
import { useTheme } from '@/src/theme/useTheme';
import type { SearchResult } from '@/src/types/domain';

type FilterType = 'all' | 'notes' | 'verses';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'notes', label: 'Notes' },
  { key: 'verses', label: 'Verses' },
];

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { activeSpaceId } = useAppState();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!query.trim()) { setResults([]); return; }
      const r = await searchEverything(db, activeSpaceId, query);
      if (!cancelled) setResults(r);
    }
    const t = setTimeout(run, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, activeSpaceId, db]);

  const filtered = filter === 'all' ? results : results.filter((r) => filter === 'notes' ? r.type === 'note' : r.type === 'verse');

  return (
    <Screen>
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons color={colors.textTertiary} name="search-outline" size={18} />
          <TextInput
            autoFocus
            onChangeText={setQuery}
            placeholder="Search notes, verses, tags…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
          />
          {query.length > 0 ? (
            <AnimatedPressable onPress={() => setQuery('')}>
              <Ionicons color={colors.textTertiary} name="close-outline" size={16} />
            </AnimatedPressable>
          ) : null}
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <AnimatedPressable
              key={f.key}
              haptic="light"
              onPress={() => setFilter(f.key)}
              style={[styles.filterPill, { backgroundColor: filter === f.key ? colors.accentSoft : 'transparent', borderColor: filter === f.key ? colors.accent : colors.borderStrong }]}>
              <Text style={[styles.filterText, { color: filter === f.key ? colors.accent : colors.textSecondary }]}>{f.label}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.results, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled">
        {query.trim() ? (
          filtered.length ? filtered.map((r) => (
            <AnimatedPressable
              key={`${r.type}-${r.id}`}
              haptic="light"
              onPress={() => r.type === 'note' ? router.push(`/editor/${r.id}`) : router.push({ pathname: '/(tabs)/bible', params: { reference: r.title } })}
              style={({ pressed }) => [styles.resultCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, pressed && styles.pressed]}>
              <View style={[styles.resultIcon, { backgroundColor: r.type === 'note' ? colors.accentSoft : colors.goldSoft }]}>
                <Ionicons color={r.type === 'note' ? colors.accent : colors.gold} name={r.type === 'note' ? 'document-text-outline' : 'book-outline'} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{r.title}</Text>
                <Text numberOfLines={3} style={[styles.resultText, { color: colors.textSecondary }]}>{r.body}</Text>
              </View>
            </AnimatedPressable>
          )) : (
            <EmptyState title="Nothing found" subtitle="Try a different search term." />
          )
        ) : (
          <View style={styles.emptySearch}>
            <Ionicons color={colors.borderStrong} name="search-outline" size={48} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Search across your journal</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>Find notes by keyword, verse reference, or tag.</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, gap: 12, paddingBottom: 12, paddingHorizontal: 24, paddingTop: 4 },
  searchBox: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
  filterText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  results: { gap: 10, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  resultCard: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  resultIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  resultTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14 },
  resultText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  emptySearch: { alignItems: 'center', gap: 12, marginTop: 80 },
  emptyTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
