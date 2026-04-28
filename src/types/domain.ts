export type ID = string;

export type Space = {
  id: ID;
  name: string;
  description: string;
  position: number;
};

export type Thread = {
  id: ID;
  spaceId: ID;
  name: string;
  icon: string;
  accent: string;
  isFavorite: boolean;
  noteCount: number;
};

export type Template = {
  id: ID;
  name: string;
  description: string;
  icon: string;
  body: string;
  threadHint: string | null;
};

export type Note = {
  id: ID;
  title: string;
  markdownBody: string;
  editorSpans: string;
  plainText: string;
  templateId: ID | null;
  spaceId: ID;
  primaryThreadId: ID | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VerseReference = {
  id: ID;
  noteId: ID;
  label: string;
  normalized: string;
  book: string;
  chapterStart: number;
  verseStart: number;
  chapterEnd: number | null;
  verseEnd: number | null;
};

export type BibleTranslation = {
  id: ID;
  code: string;
  name: string;
  isBundled: boolean;
};

export type BibleVerse = {
  id?: number;
  translationCode: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

export type ConcordanceEntry = {
  id: string;
  strongsId: string;
  transliteration: string;
  original: string;
  pronunciation: string;
  partOfSpeech: string;
  rootWord: string;
  gloss: string;
  lexiconDefinition: string;
  usageBreakdown: { label: string; value: number }[];
};

export type Tag = {
  id: ID;
  name: string;
  noteCount?: number;
};

export type MediaAttachment = {
  id: ID;
  noteId: ID;
  uri: string;
  width: number;
  height: number;
  type: 'image';
  createdAt: string;
};

export type SearchResult = {
  id: string;
  type: 'note' | 'verse';
  title: string;
  subtitle: string;
  body: string;
};

export type WorkspaceSnapshot = {
  spaces: Space[];
  activeSpaceId: ID;
  collectionCounts: {
    allNotes: number;
    favorites: number;
    recent: number;
  };
  threads: Thread[];
  tags: Tag[];
  templates: Template[];
  dailyVerse: BibleVerse | null;
  recentNotes: Note[];
};
