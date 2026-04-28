import type { ConcordanceEntry } from '@/src/types/domain';

export const CONCORDANCE_ENTRIES: ConcordanceEntry[] = [
  {
    id: 'entry-arche',
    strongsId: 'G746',
    transliteration: 'arche',
    original: 'ἀρχή',
    pronunciation: "ar-khay'",
    partOfSpeech: 'Noun, Feminine',
    rootWord: 'G756',
    gloss: 'beginning, origin, first cause',
    lexiconDefinition:
      'Beginning, origin; the person or thing that commences, the first person or thing in a series, the leader.',
    usageBreakdown: [
      { label: 'Gospels', value: 23 },
      { label: 'Pauline', value: 17 },
      { label: 'General', value: 18 },
    ],
  },
  {
    id: 'entry-logos',
    strongsId: 'G3056',
    transliteration: 'logos',
    original: 'λόγος',
    pronunciation: "log'-os",
    partOfSpeech: 'Noun, Masculine',
    rootWord: 'G3004',
    gloss: 'word, message, reason',
    lexiconDefinition:
      'A word uttered by a living voice; a saying, doctrine, divine expression, or the message communicated by God.',
    usageBreakdown: [
      { label: 'Gospels', value: 96 },
      { label: 'Pauline', value: 129 },
      { label: 'General', value: 95 },
    ],
  },
  {
    id: 'entry-phos',
    strongsId: 'G5457',
    transliteration: 'phos',
    original: 'φῶς',
    pronunciation: 'foce',
    partOfSpeech: 'Noun, Neuter',
    rootWord: 'G5456',
    gloss: 'light, radiance, truth',
    lexiconDefinition:
      'Light, brightness; used literally of illumination and figuratively of spiritual truth, purity, and divine life.',
    usageBreakdown: [
      { label: 'Gospels', value: 39 },
      { label: 'Pauline', value: 18 },
      { label: 'General', value: 13 },
    ],
  },
];

export function getConcordanceEntry(id: string) {
  return CONCORDANCE_ENTRIES.find((entry) => entry.id === id) ?? CONCORDANCE_ENTRIES[0];
}
