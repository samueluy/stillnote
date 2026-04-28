import { normalizeBookName } from '@/src/data/bible-books';
import type { VerseReference } from '@/src/types/domain';

const REFERENCE_REGEX =
  /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d{1,3}):(\d{1,3})(?:-(?:(\d{1,3}):)?(\d{1,3}))?\b/g;

export function detectVerseReferences(markdownBody: string) {
  const matches: Omit<VerseReference, 'id' | 'noteId'>[] = [];
  for (const match of markdownBody.matchAll(REFERENCE_REGEX)) {
    const book = normalizeBookName(match[1] ?? '');
    if (!book) {
      continue;
    }

    const chapterStart = Number(match[2]);
    const verseStart = Number(match[3]);
    const chapterEnd = match[4] ? Number(match[4]) : null;
    const verseEnd = match[5] ? Number(match[5]) : null;
    const normalized = `${book} ${chapterStart}:${verseStart}${
      verseEnd ? `-${chapterEnd ? `${chapterEnd}:` : ''}${verseEnd}` : ''
    }`;

    matches.push({
      label: match[0],
      normalized,
      book,
      chapterStart,
      verseStart,
      chapterEnd,
      verseEnd,
    });
  }

  return matches;
}
