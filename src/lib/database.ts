import type { SQLiteDatabase } from 'expo-sqlite';

import kjvVerses from '@/assets/data/kjv-verses.json';
import { TEMPLATE_PRESETS } from '@/src/data/template-presets';
import { detectVerseReferences } from '@/src/lib/verse-references';
import { buildEditorSpans, stripHtml, stripMarkdown } from '@/src/lib/editor';
import type {
  BibleVerse,
  MediaAttachment,
  Note,
  SearchResult,
  Space,
  Tag,
  Template,
  Thread,
  WorkspaceSnapshot,
} from '@/src/types/domain';

type NoteRow = {
  id: string;
  title: string;
  markdown_body: string;
  editor_spans: string;
  plain_text: string;
  template_id: string | null;
  space_id: string;
  primary_thread_id: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

type SpaceRow = {
  id: string;
  name: string;
  description: string;
  position: number;
};

type ThreadRow = {
  id: string;
  space_id: string;
  name: string;
  icon: string;
  accent: string;
  is_favorite: number;
  note_count: number;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  body: string;
  thread_hint: string | null;
};

type BibleVerseRow = {
  id?: number;
  translation_code: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

const SEEDED_BIBLE_ROWS: BibleVerseRow[] = Object.entries(kjvVerses).flatMap(([reference, text]) => {
  const match = reference.match(/^(.*)\s+(\d+):(\d+)$/);
  if (!match) {
    return [];
  }

  return [
    {
      translation_code: 'KJV',
      book: match[1],
      chapter: Number(match[2]),
      verse: Number(match[3]),
      reference,
      text,
    },
  ];
});

const DEFAULT_SPACES: Space[] = [
  {
    id: 'space-personal',
    name: 'Personal Devotional',
    description: 'Prayerful journaling, reflection, and daily prompting.',
    position: 0,
  },
  {
    id: 'space-prep',
    name: 'Small Group Prep',
    description: 'Sermons, teaching outlines, and discussion planning.',
    position: 1,
  },
];

const DEFAULT_THREADS: Thread[] = [
  {
    id: 'thread-sermons',
    spaceId: 'space-prep',
    name: 'Sermons',
    icon: 'mic-outline',
    accent: '#747A57',
    isFavorite: true,
    noteCount: 0,
  },
  {
    id: 'thread-personal-journal',
    spaceId: 'space-personal',
    name: 'Personal Journal',
    icon: 'book-outline',
    accent: '#D9C3A5',
    isFavorite: true,
    noteCount: 0,
  },
  {
    id: 'thread-small-group',
    spaceId: 'space-prep',
    name: 'Small Group',
    icon: 'people-outline',
    accent: '#C6DCF6',
    isFavorite: false,
    noteCount: 0,
  },
];

const DEFAULT_NOTES = [
  {
    id: 'note-table-of-evangelism',
    title: 'Table of Evangelism',
    templateId: 'template-sermon-notes',
    spaceId: 'space-prep',
    primaryThreadId: 'thread-sermons',
    isFavorite: 1,
    markdownBody: [
      "Today's study focuses on the calling of Matthew. It's a profound example of grace extending to those the religious elite had completely marginalized.",
      '',
      'As we see clearly outlined in **Matthew 9:9-13**, Jesus did not wait for Matthew to clean up his act before extending the invitation to follow Him.',
      '',
      'This table fellowship was absolutely scandalous to the Pharisees. Yet it reveals the heartbeat of the gospel: a shared table, not an elevated pulpit.',
      '',
      "Consider our modern context. Who are the 'tax collectors' in our community, and how can we create spaces that feel like invitation rather than condemnation?",
      '',
      '#theology #reflection #grace',
    ].join('\n'),
  },
  {
    id: 'note-matthew-6-reflection',
    title: 'Matthew 6 focus',
    templateId: 'template-soap',
    spaceId: 'space-personal',
    primaryThreadId: 'thread-personal-journal',
    isFavorite: 0,
    markdownBody: [
      '## Scripture',
      '- Passage: Matthew 6:25-34',
      '',
      '## Observation',
      '- The birds of the air do not sow or reap, yet they are fed.',
      '',
      '## Application',
      '- I am cared for in the middle of this transition.',
      '',
      '## Prayer',
      '> Lord, quiet my anxious striving today.',
      '',
      '#gratitude #prayer_request',
    ].join('\n'),
  },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    markdownBody: row.markdown_body,
    editorSpans: row.editor_spans,
    plainText: row.plain_text,
    templateId: row.template_id,
    spaceId: row.space_id,
    primaryThreadId: row.primary_thread_id,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    body: row.body,
    threadHint: row.thread_hint,
  };
}

function normalizeTags(markdown: string) {
  return Array.from(new Set(Array.from(markdown.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)).map((match) => match[1].toLowerCase())));
}

async function syncNoteSearchIndex(db: SQLiteDatabase, noteId: string) {
  const note = await db.getFirstAsync<{
    note_id: string;
    title: string;
    plain_text: string;
    tags: string | null;
  }>(
    `SELECT notes.id AS note_id, notes.title, notes.plain_text,
      GROUP_CONCAT(tags.name, ' ') AS tags
     FROM notes
     LEFT JOIN note_tags ON note_tags.note_id = notes.id
     LEFT JOIN tags ON tags.id = note_tags.tag_id
     WHERE notes.id = ?
     GROUP BY notes.id`,
    noteId
  );

  if (!note) {
    await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', noteId);
    return;
  }

  await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', noteId);
  await db.runAsync(
    'INSERT INTO notes_fts (note_id, title, plain_text, tags) VALUES (?, ?, ?, ?)',
    note.note_id,
    note.title,
    note.plain_text,
    note.tags ?? ''
  );
}

async function seedBibleIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM bible_verses');
  if ((row?.count ?? 0) > 0) {
    return;
  }

  await db.runAsync(
    'INSERT INTO bible_translations (id, code, name, is_bundled) VALUES (?, ?, ?, 1)',
    'translation-kjv',
    'KJV',
    'King James Version'
  );

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const verse of SEEDED_BIBLE_ROWS) {
      await txn.runAsync(
        'INSERT INTO bible_verses (translation_code, book, chapter, verse, reference, text) VALUES (?, ?, ?, ?, ?, ?)',
        verse.translation_code,
        verse.book,
        verse.chapter,
        verse.verse,
        verse.reference,
        verse.text
      );
      await txn.runAsync(
        'INSERT INTO bible_verses_fts (reference, text) VALUES (?, ?)',
        verse.reference,
        verse.text
      );
    }
  });
}

async function seedCoreDataIfNeeded(db: SQLiteDatabase) {
  const existingSpaces = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM spaces');
  if ((existingSpaces?.count ?? 0) === 0) {
    for (const space of DEFAULT_SPACES) {
      await db.runAsync(
        'INSERT INTO spaces (id, name, description, position) VALUES (?, ?, ?, ?)',
        space.id,
        space.name,
        space.description,
        space.position
      );
    }
  }

  const existingThreads = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM threads');
  if ((existingThreads?.count ?? 0) === 0) {
    for (const thread of DEFAULT_THREADS) {
      await db.runAsync(
        'INSERT INTO threads (id, space_id, name, icon, accent, is_favorite, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        thread.id,
        thread.spaceId,
        thread.name,
        thread.icon,
        thread.accent,
        Number(thread.isFavorite),
        new Date().toISOString()
      );
    }
  }

  const existingTemplates = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM templates');
  if ((existingTemplates?.count ?? 0) === 0) {
    for (const template of TEMPLATE_PRESETS) {
      await db.runAsync(
        'INSERT INTO templates (id, name, description, icon, body, thread_hint) VALUES (?, ?, ?, ?, ?, ?)',
        template.id,
        template.name,
        template.description,
        template.icon,
        template.body,
        template.threadHint
      );
    }
  }

  const existingNotes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM notes');
  if ((existingNotes?.count ?? 0) > 0) {
    return;
  }

  for (const note of DEFAULT_NOTES) {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO notes (
        id, title, markdown_body, editor_spans, plain_text, template_id,
        space_id, primary_thread_id, is_favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      note.id,
      note.title,
      note.markdownBody,
      buildEditorSpans(note.markdownBody),
      stripMarkdown(note.markdownBody),
      note.templateId,
      note.spaceId,
      note.primaryThreadId,
      note.isFavorite,
      now,
      now
    );

    if (note.primaryThreadId) {
      await db.runAsync(
        'INSERT INTO note_threads (note_id, thread_id) VALUES (?, ?)',
        note.id,
        note.primaryThreadId
      );
    }

    const tags = normalizeTags(note.markdownBody);
    for (const tagName of tags) {
      const tagId = `tag-${tagName}`;
      await db.runAsync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', tagId, tagName);
      await db.runAsync(
        'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
        note.id,
        tagId
      );
    }

    for (const reference of detectVerseReferences(note.markdownBody)) {
      await db.runAsync(
        `INSERT INTO verse_references (
          id, note_id, label, normalized, book, chapter_start, verse_start, chapter_end, verse_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        makeId('ref'),
        note.id,
        reference.label,
        reference.normalized,
        reference.book,
        reference.chapterStart,
        reference.verseStart,
        reference.chapterEnd,
        reference.verseEnd
      );
    }

    await syncNoteSearchIndex(db, note.id);
  }
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS spaces (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY NOT NULL,
      space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      accent TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      body TEXT NOT NULL,
      thread_hint TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      markdown_body TEXT NOT NULL,
      editor_spans TEXT NOT NULL,
      plain_text TEXT NOT NULL,
      template_id TEXT,
      space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      primary_thread_id TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_threads (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, thread_id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS media_attachments (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      uri TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verse_references (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      normalized TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter_start INTEGER NOT NULL,
      verse_start INTEGER NOT NULL,
      chapter_end INTEGER,
      verse_end INTEGER
    );

    CREATE TABLE IF NOT EXISTS bible_translations (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_bundled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bible_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_code TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      text TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      note_id UNINDEXED,
      title,
      plain_text,
      tags
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(
      reference,
      text
    );
  `);

  await seedBibleIfNeeded(db);
  await seedCoreDataIfNeeded(db);
}

export async function getSpaces(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<SpaceRow>(
    'SELECT id, name, description, position FROM spaces ORDER BY position ASC'
  );
  return rows.map((space) => ({
    id: space.id,
    name: space.name,
    description: space.description,
    position: space.position,
  }));
}

export async function getTemplates(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<TemplateRow>(
    'SELECT id, name, description, icon, body, thread_hint FROM templates ORDER BY name ASC'
  );
  return rows.map(mapTemplate);
}

export async function getWorkspaceSnapshot(db: SQLiteDatabase, activeSpaceId: string): Promise<WorkspaceSnapshot> {
  const [spaces, templates] = await Promise.all([getSpaces(db), getTemplates(db)]);

  const counts = (await db.getFirstAsync<{
    all_notes: number;
    favorites: number;
    recent: number;
  }>(
    `SELECT
      COUNT(*) AS all_notes,
      SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) AS favorites,
      SUM(CASE WHEN updated_at >= datetime('now', '-7 day') THEN 1 ELSE 0 END) AS recent
     FROM notes
     WHERE space_id = ?`,
    activeSpaceId
  )) ?? { all_notes: 0, favorites: 0, recent: 0 };

  const threads = await db.getAllAsync<ThreadRow>(
    `SELECT
      threads.id,
      threads.space_id,
      threads.name,
      threads.icon,
      threads.accent,
      threads.is_favorite,
      COUNT(note_threads.note_id) AS note_count
     FROM threads
     LEFT JOIN note_threads ON note_threads.thread_id = threads.id
     WHERE threads.space_id = ?
     GROUP BY threads.id
     ORDER BY threads.is_favorite DESC, threads.name ASC`,
    activeSpaceId
  );

  const tags = await db.getAllAsync<{ id: string; name: string; note_count: number }>(
    `SELECT tags.id, tags.name, COUNT(note_tags.note_id) AS note_count
     FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     INNER JOIN notes ON notes.id = note_tags.note_id
     WHERE notes.space_id = ?
     GROUP BY tags.id
     ORDER BY note_count DESC, tags.name ASC
     LIMIT 6`,
    activeSpaceId
  );

  const recentNotes = await db.getAllAsync<NoteRow>(
    `SELECT *
     FROM notes
     WHERE space_id = ?
     ORDER BY updated_at DESC
     LIMIT 3`,
    activeSpaceId
  );

  const verseIndex = Math.abs(new Date().toISOString().slice(0, 10).split('-').join('').split('').reduce((sum, digit) => sum + Number(digit), 0)) % SEEDED_BIBLE_ROWS.length;

  return {
    spaces,
    activeSpaceId,
    collectionCounts: {
      allNotes: counts.all_notes,
      favorites: counts.favorites ?? 0,
      recent: counts.recent ?? 0,
    },
    threads: threads.map((thread) => ({
      id: thread.id,
      spaceId: thread.space_id,
      name: thread.name,
      icon: thread.icon,
      accent: thread.accent,
      isFavorite: Boolean(thread.is_favorite),
      noteCount: thread.note_count,
    })),
    tags: tags.map<Tag>((tag) => ({
      id: tag.id,
      name: tag.name,
      noteCount: tag.note_count,
    })),
    templates,
    dailyVerse: SEEDED_BIBLE_ROWS[verseIndex]
      ? {
          translationCode: SEEDED_BIBLE_ROWS[verseIndex].translation_code,
          book: SEEDED_BIBLE_ROWS[verseIndex].book,
          chapter: SEEDED_BIBLE_ROWS[verseIndex].chapter,
          verse: SEEDED_BIBLE_ROWS[verseIndex].verse,
          reference: SEEDED_BIBLE_ROWS[verseIndex].reference,
          text: SEEDED_BIBLE_ROWS[verseIndex].text,
        }
      : null,
    recentNotes: recentNotes.map(mapNote),
  };
}

export async function searchEverything(
  db: SQLiteDatabase,
  activeSpaceId: string,
  query: string
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const ftsQuery = query
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token}*`)
    .join(' OR ');

  const notes = await db.getAllAsync<{
    id: string;
    title: string;
    body: string;
    updated_at: string;
  }>(
    `SELECT notes.id, notes.title, notes.plain_text AS body, notes.updated_at
     FROM notes_fts
     INNER JOIN notes ON notes.id = notes_fts.note_id
     WHERE notes.space_id = ? AND notes_fts MATCH ?
     ORDER BY notes.updated_at DESC
     LIMIT 6`,
    activeSpaceId,
    ftsQuery || query.trim()
  );

  const verses = await db.getAllAsync<{
    reference: string;
    text: string;
  }>(
    `SELECT reference, text
     FROM bible_verses_fts
     WHERE bible_verses_fts MATCH ?
     LIMIT 6`,
    ftsQuery || query.trim()
  );

  return [
    ...notes.map<SearchResult>((note) => ({
      id: note.id,
      type: 'note',
      title: note.title,
      subtitle: 'Note',
      body: note.body,
    })),
    ...verses.map<SearchResult>((verse) => ({
      id: verse.reference,
      type: 'verse',
      title: verse.reference,
      subtitle: 'KJV',
      body: verse.text,
    })),
  ];
}

export async function getNoteById(db: SQLiteDatabase, noteId: string) {
  const note = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', noteId);
  if (!note) {
    return null;
  }

  const [attachments, thread] = await Promise.all([
    db.getAllAsync<MediaAttachment>(
      `SELECT id, note_id as noteId, uri, width, height, type, created_at as createdAt
       FROM media_attachments
       WHERE note_id = ?
       ORDER BY created_at ASC`,
      noteId
    ),
    note.primary_thread_id
      ? db.getFirstAsync<{ id: string; name: string }>('SELECT id, name FROM threads WHERE id = ?', note.primary_thread_id)
      : Promise.resolve(null),
  ]);

  return {
    note: mapNote(note),
    attachments,
    thread,
  };
}

export async function createNoteFromTemplate(
  db: SQLiteDatabase,
  args: {
    templateId: string;
    spaceId: string;
    threadId: string;
    title?: string;
  }
) {
  const template = await db.getFirstAsync<TemplateRow>(
    'SELECT id, name, description, icon, body, thread_hint FROM templates WHERE id = ?',
    args.templateId
  );
  const now = new Date().toISOString();
  const id = makeId('note');
  const title = args.title ?? template?.name ?? 'New Note';
  const body = template?.body ?? '';

  await db.runAsync(
    `INSERT INTO notes (
      id, title, markdown_body, editor_spans, plain_text, template_id, space_id,
      primary_thread_id, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    title,
    body,
    buildEditorSpans(body),
    stripMarkdown(body),
    args.templateId,
    args.spaceId,
    args.threadId,
    now,
    now
  );

  await db.runAsync(
    'INSERT OR IGNORE INTO note_threads (note_id, thread_id) VALUES (?, ?)',
    id,
    args.threadId
  );
  await syncNoteSearchIndex(db, id);
  return id;
}

export async function createThread(
  db: SQLiteDatabase,
  args: {
    spaceId: string;
    name?: string;
  }
) {
  const existingCount =
    (await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM threads WHERE space_id = ?',
      args.spaceId
    ))?.count ?? 0;

  const id = makeId('thread');
  const createdAt = new Date().toISOString();
  const name = args.name ?? `New Thread ${existingCount + 1}`;
  const accent = args.spaceId === 'space-prep' ? '#D9C3A5' : '#C6DCF6';
  const icon = args.spaceId === 'space-prep' ? 'albums-outline' : 'book-outline';

  await db.runAsync(
    `INSERT INTO threads (id, space_id, name, icon, accent, is_favorite, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    id,
    args.spaceId,
    name,
    icon,
    accent,
    createdAt
  );

  return {
    id,
    spaceId: args.spaceId,
    name,
    icon,
    accent,
    isFavorite: false,
    noteCount: 0,
  };
}

export async function saveNoteDraft(
  db: SQLiteDatabase,
  args: {
    id: string;
    title: string;
    markdownBody: string;
    templateId: string | null;
    spaceId: string;
    threadId: string | null;
    isFavorite?: boolean;
    attachments?: Pick<MediaAttachment, 'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'>[];
  }
) {
  const updatedAt = new Date().toISOString();
  const isHtml = args.markdownBody.trim().startsWith('<');
  const plainText = isHtml ? stripHtml(args.markdownBody) : stripMarkdown(args.markdownBody);
  const editorSpans = buildEditorSpans(args.markdownBody);
  const tags = normalizeTags(plainText);
  const references = detectVerseReferences(plainText);

  await db.runAsync(
    `UPDATE notes
     SET title = ?, markdown_body = ?, editor_spans = ?, plain_text = ?, template_id = ?,
         space_id = ?, primary_thread_id = ?, is_favorite = ?, updated_at = ?
     WHERE id = ?`,
    args.title,
    args.markdownBody,
    editorSpans,
    plainText,
    args.templateId,
    args.spaceId,
    args.threadId,
    Number(Boolean(args.isFavorite)),
    updatedAt,
    args.id
  );

  await db.runAsync('DELETE FROM note_threads WHERE note_id = ?', args.id);
  if (args.threadId) {
    await db.runAsync(
      'INSERT OR IGNORE INTO note_threads (note_id, thread_id) VALUES (?, ?)',
      args.id,
      args.threadId
    );
  }

  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', args.id);
  for (const tagName of tags) {
    const tagId = `tag-${tagName}`;
    await db.runAsync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', tagId, tagName);
    await db.runAsync(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      args.id,
      tagId
    );
  }

  await db.runAsync('DELETE FROM verse_references WHERE note_id = ?', args.id);
  for (const reference of references) {
    await db.runAsync(
      `INSERT INTO verse_references (
        id, note_id, label, normalized, book, chapter_start, verse_start, chapter_end, verse_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId('ref'),
      args.id,
      reference.label,
      reference.normalized,
      reference.book,
      reference.chapterStart,
      reference.verseStart,
      reference.chapterEnd,
      reference.verseEnd
    );
  }

  if (args.attachments) {
    await db.runAsync('DELETE FROM media_attachments WHERE note_id = ?', args.id);
    for (const attachment of args.attachments) {
      await db.runAsync(
        `INSERT INTO media_attachments (
          id, note_id, uri, width, height, type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        attachment.id,
        args.id,
        attachment.uri,
        attachment.width,
        attachment.height,
        attachment.type,
        attachment.createdAt
      );
    }
  }

  await syncNoteSearchIndex(db, args.id);
}

export async function getBibleChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  translationCode = 'KJV'
) {
  const rows = await db.getAllAsync<BibleVerseRow>(
    `SELECT id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE translation_code = ? AND book = ? AND chapter = ?
     ORDER BY verse ASC`,
    translationCode,
    book,
    chapter
  );

  return rows.map<BibleVerse>((row) => ({
    id: row.id,
    translationCode: row.translation_code,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    reference: row.reference,
    text: row.text,
  }));
}

export async function getVerseByReference(db: SQLiteDatabase, reference: string) {
  const row = await db.getFirstAsync<BibleVerseRow>(
    `SELECT id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE lower(reference) = lower(?)`,
    reference
  );

  return row
    ? {
        id: row.id,
        translationCode: row.translation_code,
        book: row.book,
        chapter: row.chapter,
        verse: row.verse,
        reference: row.reference,
        text: row.text,
      }
    : null;
}

export async function getVersesForReferences(db: SQLiteDatabase, references: string[]) {
  if (!references.length) {
    return [];
  }

  const placeholders = references.map(() => '?').join(', ');
  const rows = await db.getAllAsync<BibleVerseRow>(
    `SELECT id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE reference IN (${placeholders})
     ORDER BY book ASC, chapter ASC, verse ASC`,
    ...references
  );

  return rows.map<BibleVerse>((row) => ({
    id: row.id,
    translationCode: row.translation_code,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    reference: row.reference,
    text: row.text,
  }));
}

export function buildInsertedVerseText(verses: BibleVerse[]) {
  return verses.map((verse) => `${verse.reference} — ${verse.text}`).join('\n');
}

export async function getNotesByCollection(
  db: SQLiteDatabase,
  spaceId: string,
  collection: 'all' | 'favorites' | 'recent'
): Promise<Note[]> {
  let where = 'WHERE space_id = ?';
  const params: string[] = [spaceId];

  if (collection === 'favorites') {
    where += ' AND is_favorite = 1';
  } else if (collection === 'recent') {
    where += " AND updated_at >= datetime('now', '-7 day')";
  }

  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes ${where} ORDER BY updated_at DESC LIMIT 50`,
    ...params
  );

  return rows.map(mapNote);
}

export async function createTag(db: SQLiteDatabase, name: string) {
  const id = `tag-${name}`;
  await db.runAsync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', id, name);
}
