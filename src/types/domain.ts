export type ID = string;

export type Space = {
  id: ID;
  name: string;
  description: string;
  position: number;
};

export type Folder = {
  id: ID;
  spaceId: ID;
  parentFolderId: ID | null;
  name: string;
  position: number;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FolderTreeRow = Folder & {
  level: 0 | 1;
  childCount: number;
};

export type TemplateKind =
  | 'blank'
  | 'soap-study'
  | 'sermon-notes'
  | 'inductive-study'
  | 'topical-study';

export type Template = {
  id: ID;
  kind: TemplateKind;
  name: string;
  description: string;
  body: string;
};

export type Note = {
  id: ID;
  title: string;
  markdownBody: string;
  richBodyHtml: string;
  editorSpans: string;
  plainText: string;
  templateId: ID | null;
  spaceId: ID;
  folderId: ID | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Thread = {
  id: ID;
  spaceId: ID;
  name: string;
  isFavorite: boolean;
  createdAt: string | null;
};

export type NoteThread = {
  noteId: ID;
  threadId: ID;
};

export type NoteLink = {
  id: ID;
  parentNoteId: ID;
  childNoteId: ID;
  excerpt: string;
  createdAt: string;
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

export type BibleTranslationCode = 'KJV' | 'BSB' | 'WEB' | 'ASV' | 'YLT';

export type InstalledTranslation = {
  id: ID;
  code: BibleTranslationCode;
  name: string;
  isBundled: boolean;
  isDownloaded: boolean;
  assetKey: string | null;
  installedAt: string | null;
};

export type BibleVerse = {
  id?: number;
  translationCode: BibleTranslationCode;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

export type AnnotationTargetType = 'note' | 'bible';

export type AnnotationTool = 'pan' | 'highlight' | 'draw';

export type AnnotationColorKey = 'ochre' | 'sage' | 'graphite';

export type AnnotationPoint = {
  x: number;
  y: number;
};

export type AnnotationStroke = {
  id: ID;
  targetType: AnnotationTargetType;
  targetKey: string;
  tool: Exclude<AnnotationTool, 'pan'>;
  colorKey: AnnotationColorKey;
  strokeWidth: number;
  opacity: number;
  points: AnnotationPoint[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  updatedAt: string;
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

export type StrongsEntry = {
  id: ID;
  strongsId: string;
  testament: 'OT' | 'NT';
  original: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  createdAt: string;
};

export type StrongsToken = {
  id: ID;
  translationCode: BibleTranslationCode;
  reference: string;
  token: string;
  tokenIndex: number;
  strongsEntryId: ID;
};

export type Tag = {
  id: ID;
  name: string;
  noteCount?: number;
};

export type TagSuggestion = Tag & {
  label: string;
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

export type NoteDetail = {
  note: Note;
  attachments: MediaAttachment[];
  folder: Folder | null;
};

export type SearchResult = {
  id: ID;
  title: string;
  preview: string;
  updatedAt: string;
  folderName: string | null;
};

export type WorkspaceSnapshot = {
  spaces: Space[];
  activeSpaceId: ID;
  collectionCounts: {
    allNotes: number;
    favorites: number;
    recent: number;
  };
  folders: FolderTreeRow[];
  tags: Tag[];
  templates: Template[];
  dailyVerse: BibleVerse | null;
  recentNotes: Note[];
};
