import type { SQLiteDatabase } from 'expo-sqlite';

import kjvVerses from '@/assets/data/kjv-verses.json';
import strongsTokenMap from '@/assets/data/strongs/kjv-token-map.json';
import strongsLexicon from '@/assets/data/strongs/lexicon.json';
import asvVerses from '@/assets/data/translations/asv-verses.json';
import bsbVerses from '@/assets/data/translations/bsb-verses.json';
import webVerses from '@/assets/data/translations/web-verses.json';
import yltVerses from '@/assets/data/translations/ylt-verses.json';
import { BIBLE_BOOKS } from '@/src/data/bible-books';
import { TEMPLATE_PRESETS } from '@/src/data/template-presets';
import {
  buildEditorSpans,
  buildInsertedVerseQuoteMarkdown,
  htmlToMarkdown,
  markdownToHtml,
  stripHtml,
  stripMarkdown,
} from '@/src/lib/editor';
import { buildDefaultNoteTitle } from '@/src/lib/note-title';
import { detectVerseReferences } from '@/src/lib/verse-references';
import type {
  AnnotationStroke,
  AnnotationTargetType,
  BibleTranslationCode,
  BibleVerse,
  Folder,
  FolderTreeRow,
  InstalledTranslation,
  MediaAttachment,
  Note,
  NoteDetail,
  SearchResult,
  Space,
  Tag,
  TagSuggestion,
  Template,
  WorkspaceSnapshot,
} from '@/src/types/domain';

type NoteRow = {
  id: string;
  title: string;
  markdown_body: string;
  rich_body_html: string;
  editor_spans: string;
  plain_text: string;
  template_id: string | null;
  space_id: string;
  folder_id: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

type FolderRow = {
  id: string;
  space_id: string;
  parent_folder_id: string | null;
  name: string;
  position: number;
  note_count: number;
  child_count: number;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  kind: string;
  name: string;
  description: string;
  body: string;
};

type TranslationRow = {
  id: string;
  code: BibleTranslationCode;
  name: string;
  is_bundled: number;
  is_downloaded: number;
  asset_key: string | null;
  installed_at: string | null;
};

type BibleVerseRow = {
  id?: number;
  translation_code: BibleTranslationCode;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

type NoteIndexRow = {
  note_id: string;
  title: string;
  plain_text: string;
  tags: string | null;
  verse_refs: string | null;
};

type StrongsEntryRow = {
  id: string;
  strongs_id: string;
  testament: 'OT' | 'NT';
  original_word: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  created_at: string;
};

type AnnotationStrokeRow = {
  id: string;
  target_type: AnnotationTargetType;
  target_key: string;
  tool: 'highlight' | 'draw';
  color_key: 'ochre' | 'sage' | 'graphite';
  stroke_width: number;
  opacity: number;
  points_json: string;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
};

const TRANSLATION_NAME: Record<BibleTranslationCode, string> = {
  KJV: 'King James Version',
  BSB: 'Berean Standard Bible',
  WEB: 'World English Bible',
  ASV: 'American Standard Version',
  YLT: "Young's Literal Translation",
};

const TRANSLATION_ASSET_KEY: Record<BibleTranslationCode, string> = {
  KJV: 'kjv',
  BSB: 'bsb',
  WEB: 'web',
  ASV: 'asv',
  YLT: 'ylt',
};

const TRANSLATION_VERSES: Record<BibleTranslationCode, Record<string, string>> = {
  KJV: kjvVerses,
  BSB: bsbVerses,
  WEB: webVerses,
  ASV: asvVerses,
  YLT: yltVerses,
};

const BUNDLED_TRANSLATIONS: BibleTranslationCode[] = ['KJV', 'BSB'];
const OPTIONAL_TRANSLATIONS: BibleTranslationCode[] = ['WEB', 'ASV', 'YLT'];

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

const DEFAULT_FOLDERS = [
  {
    id: 'folder-personal-journal',
    spaceId: 'space-personal',
    parentFolderId: null,
    name: 'Personal Journal',
    position: 0,
  },
  {
    id: 'folder-sermons',
    spaceId: 'space-prep',
    parentFolderId: null,
    name: 'Sermons',
    position: 0,
  },
  {
    id: 'folder-small-group',
    spaceId: 'space-prep',
    parentFolderId: null,
    name: 'Small Group',
    position: 1,
  },
];

const DEFAULT_NOTES = [
  {
    id: 'note-table-of-evangelism',
    title: 'Table of Evangelism',
    templateId: 'template-sermon-notes',
    spaceId: 'space-prep',
    folderId: 'folder-sermons',
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
    templateId: 'template-soap-study',
    spaceId: 'space-personal',
    folderId: 'folder-personal-journal',
    isFavorite: 0,
    markdownBody: [
      '## Scripture',
      '',
      '- Passage: Matthew 6:25-34',
      '',
      '## Observation',
      '',
      '- The birds of the air do not sow or reap, yet they are fed.',
      '',
      '## Application',
      '',
      '- I am cared for in the middle of this transition.',
      '',
      '## Prayer',
      '',
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
    richBodyHtml: row.rich_body_html,
    editorSpans: row.editor_spans,
    plainText: row.plain_text,
    templateId: row.template_id,
    spaceId: row.space_id,
    folderId: row.folder_id,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    kind: row.kind as Template['kind'],
    name: row.name,
    description: row.description,
    body: row.body,
  };
}

function mapFolder(row: FolderRow, level: 0 | 1): FolderTreeRow {
  return {
    id: row.id,
    spaceId: row.space_id,
    parentFolderId: row.parent_folder_id,
    name: row.name,
    position: row.position,
    noteCount: row.note_count,
    childCount: row.child_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    level,
  };
}

function mapTranslation(row: TranslationRow): InstalledTranslation {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isBundled: Boolean(row.is_bundled),
    isDownloaded: Boolean(row.is_downloaded),
    assetKey: row.asset_key,
    installedAt: row.installed_at,
  };
}

function mapAnnotationStroke(row: AnnotationStrokeRow): AnnotationStroke {
  return {
    id: row.id,
    targetType: row.target_type,
    targetKey: row.target_key,
    tool: row.tool,
    colorKey: row.color_key,
    strokeWidth: row.stroke_width,
    opacity: row.opacity,
    points: JSON.parse(row.points_json),
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTags(markdown: string) {
  return Array.from(
    new Set(
      Array.from(markdown.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)).map((match) =>
        match[1].toLowerCase()
      )
    )
  );
}

function buildVerseRows(
  translationCode: BibleTranslationCode,
  source: Record<string, string>
): BibleVerseRow[] {
  return Object.entries(source).flatMap(([reference, text]) => {
    const match = reference.match(/^(.*)\s+(\d+):(\d+)$/);
    if (!match) {
      return [];
    }

    return [
      {
        translation_code: translationCode,
        book: match[1],
        chapter: Number(match[2]),
        verse: Number(match[3]),
        reference,
        text,
      },
    ];
  });
}

async function getTableColumns(db: SQLiteDatabase, tableName: string) {
  return db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
}

async function ensureColumn(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = await getTableColumns(db, tableName);
  if (!columns.some((column) => column.name === columnName)) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${definition};`);
  }
}

async function rebuildNoteSearchIndex(db: SQLiteDatabase) {
  await db.execAsync(`
    DROP TABLE IF EXISTS notes_fts;
    CREATE VIRTUAL TABLE notes_fts USING fts5(
      note_id UNINDEXED,
      title,
      plain_text,
      tags,
      verse_refs
    );
  `);

  const rows = await db.getAllAsync<NoteIndexRow>(
    `SELECT notes.id AS note_id,
        notes.title,
        notes.plain_text,
        GROUP_CONCAT(DISTINCT tags.name) AS tags,
        GROUP_CONCAT(DISTINCT verse_references.normalized) AS verse_refs
     FROM notes
     LEFT JOIN note_tags ON note_tags.note_id = notes.id
     LEFT JOIN tags ON tags.id = note_tags.tag_id
     LEFT JOIN verse_references ON verse_references.note_id = notes.id
     GROUP BY notes.id`
  );

  for (const row of rows) {
    await db.runAsync(
      'INSERT INTO notes_fts (note_id, title, plain_text, tags, verse_refs) VALUES (?, ?, ?, ?, ?)',
      row.note_id,
      row.title,
      row.plain_text,
      row.tags ?? '',
      row.verse_refs ?? ''
    );
  }
}

async function syncNoteSearchIndex(db: SQLiteDatabase, noteId: string) {
  const note = await db.getFirstAsync<NoteIndexRow>(
    `SELECT notes.id AS note_id,
        notes.title,
        notes.plain_text,
        GROUP_CONCAT(DISTINCT tags.name) AS tags,
        GROUP_CONCAT(DISTINCT verse_references.normalized) AS verse_refs
     FROM notes
     LEFT JOIN note_tags ON note_tags.note_id = notes.id
     LEFT JOIN tags ON tags.id = note_tags.tag_id
     LEFT JOIN verse_references ON verse_references.note_id = notes.id
     WHERE notes.id = ?
     GROUP BY notes.id`,
    noteId
  );

  await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', noteId);
  if (!note) {
    return;
  }

  await db.runAsync(
    'INSERT INTO notes_fts (note_id, title, plain_text, tags, verse_refs) VALUES (?, ?, ?, ?, ?)',
    note.note_id,
    note.title,
    note.plain_text,
    note.tags ?? '',
    note.verse_refs ?? ''
  );
}

async function upsertTagsAndReferences(
  db: SQLiteDatabase,
  noteId: string,
  markdownBody: string,
  plainText: string
) {
  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
  for (const tagName of normalizeTags(markdownBody)) {
    const tagId = `tag-${tagName}`;
    await db.runAsync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', tagId, tagName);
    await db.runAsync(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      noteId,
      tagId
    );
  }

  await db.runAsync('DELETE FROM verse_references WHERE note_id = ?', noteId);
  for (const reference of detectVerseReferences(plainText)) {
    await db.runAsync(
      `INSERT INTO verse_references (
        id, note_id, label, normalized, book, chapter_start, verse_start, chapter_end, verse_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeId('ref'),
      noteId,
      reference.label,
      reference.normalized,
      reference.book,
      reference.chapterStart,
      reference.verseStart,
      reference.chapterEnd,
      reference.verseEnd
    );
  }
}

async function seedSpacesIfNeeded(db: SQLiteDatabase) {
  const count =
    (await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM spaces'))?.count ?? 0;
  if (count > 0) {
    return;
  }

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

async function migrateThreadsToFoldersIfNeeded(db: SQLiteDatabase) {
  const folderCount =
    (await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM folders'))?.count ?? 0;
  if (folderCount > 0) {
    return;
  }

  const legacyThreads = await db.getAllAsync<{
    id: string;
    space_id: string;
    name: string;
    created_at: string | null;
  }>('SELECT id, space_id, name, created_at FROM threads ORDER BY created_at ASC, name ASC');

  if (!legacyThreads.length) {
    const now = new Date().toISOString();
    for (const folder of DEFAULT_FOLDERS) {
      await db.runAsync(
        `INSERT INTO folders (
          id, space_id, parent_folder_id, name, position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        folder.id,
        folder.spaceId,
        folder.parentFolderId,
        folder.name,
        folder.position,
        now,
        now
      );
    }
    return;
  }

  let position = 0;
  for (const thread of legacyThreads) {
    const folderId = `folder-${thread.id}`;
    const now = thread.created_at ?? new Date().toISOString();
    await db.runAsync(
      `INSERT INTO folders (
        id, space_id, parent_folder_id, name, position, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      folderId,
      thread.space_id,
      thread.name,
      position,
      now,
      now
    );

    await db.runAsync(
      'UPDATE notes SET folder_id = ? WHERE primary_thread_id = ? AND folder_id IS NULL',
      folderId,
      thread.id
    );

    position += 1;
  }
}

async function seedTemplates(db: SQLiteDatabase) {
  const columns = await getTableColumns(db, 'templates');
  const hasIcon = columns.some((column) => column.name === 'icon');
  const hasThreadHint = columns.some((column) => column.name === 'thread_hint');

  await db.runAsync('DELETE FROM templates');
  for (const template of TEMPLATE_PRESETS) {
    if (hasIcon || hasThreadHint) {
      await db.runAsync(
        `INSERT INTO templates (
          id, kind, name, description, icon, body, thread_hint
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        template.id,
        template.kind,
        template.name,
        template.description,
        '',
        template.body,
        null
      );
      continue;
    }

    await db.runAsync(
      'INSERT INTO templates (id, kind, name, description, body) VALUES (?, ?, ?, ?, ?)',
      template.id,
      template.kind,
      template.name,
      template.description,
      template.body
    );
  }
}

async function seedNotesIfNeeded(db: SQLiteDatabase) {
  const count =
    (await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM notes'))?.count ?? 0;
  if (count > 0) {
    return;
  }

  for (const note of DEFAULT_NOTES) {
    const now = new Date().toISOString();
    const richBodyHtml = markdownToHtml(note.markdownBody);
    const plainText = stripMarkdown(note.markdownBody);
    await db.runAsync(
      `INSERT INTO notes (
        id, title, markdown_body, rich_body_html, editor_spans, plain_text, template_id,
        space_id, folder_id, is_favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      note.id,
      note.title,
      note.markdownBody,
      richBodyHtml,
      buildEditorSpans(note.markdownBody),
      plainText,
      note.templateId,
      note.spaceId,
      note.folderId,
      note.isFavorite,
      now,
      now
    );

    await upsertTagsAndReferences(db, note.id, note.markdownBody, plainText);
  }

  await rebuildNoteSearchIndex(db);
}

async function seedTranslations(db: SQLiteDatabase) {
  for (const code of [...BUNDLED_TRANSLATIONS, ...OPTIONAL_TRANSLATIONS]) {
    await db.runAsync(
      `INSERT OR IGNORE INTO bible_translations (
        id, code, name, is_bundled, is_downloaded, asset_key, installed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `translation-${code.toLowerCase()}`,
      code,
      TRANSLATION_NAME[code],
      Number(BUNDLED_TRANSLATIONS.includes(code)),
      0,
      TRANSLATION_ASSET_KEY[code],
      null
    );
  }
}

async function importTranslation(
  db: SQLiteDatabase,
  translationCode: BibleTranslationCode,
  { markInstalled = true }: { markInstalled?: boolean } = {}
) {
  const existing =
    (
      await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM bible_verses WHERE translation_code = ?',
        translationCode
      )
    )?.count ?? 0;

  if (existing === 0) {
    const rows = buildVerseRows(translationCode, TRANSLATION_VERSES[translationCode]);
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const verse of rows) {
        await txn.runAsync(
          `INSERT INTO bible_verses (
            translation_code, book, chapter, verse, reference, text
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          verse.translation_code,
          verse.book,
          verse.chapter,
          verse.verse,
          verse.reference,
          verse.text
        );
      }
    });
  }

  if (markInstalled) {
    await db.runAsync(
      `UPDATE bible_translations
       SET is_downloaded = 1, installed_at = COALESCE(installed_at, ?)
       WHERE code = ?`,
      new Date().toISOString(),
      translationCode
    );
  }
}

async function seedBundledTranslations(db: SQLiteDatabase) {
  for (const code of BUNDLED_TRANSLATIONS) {
    await importTranslation(db, code, { markInstalled: true });
  }
}

async function seedStrongsDataIfNeeded(db: SQLiteDatabase) {
  const existing =
    (
      await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM strongs_entries'
      )
    )?.count ?? 0;

  if (existing > 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const entry of strongsLexicon as {
      createdAt: string;
      definition: string;
      id: string;
      original: string;
      pronunciation: string;
      strongsId: string;
      testament: 'OT' | 'NT';
      transliteration: string;
    }[]) {
      await txn.runAsync(
        `INSERT INTO strongs_entries (
          id, strongs_id, testament, original_word, transliteration, pronunciation, definition, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.id,
        entry.strongsId,
        entry.testament,
        entry.original,
        entry.transliteration,
        entry.pronunciation,
        entry.definition,
        entry.createdAt
      );
    }

    for (const [reference, tokens] of Object.entries(strongsTokenMap as Record<string, {
      strongsId: string;
      text: string;
      tokenIndex: number;
    }[]>)) {
      for (const token of tokens) {
        await txn.runAsync(
          `INSERT INTO strongs_tokens (
            id, translation_code, reference, token, token_index, strongs_entry_id
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          makeId('strongs-token'),
          'KJV',
          reference,
          token.text,
          token.tokenIndex,
          token.strongsId
        );
      }
    }
  });
}

async function maybeResetLegacyBibleTables(db: SQLiteDatabase) {
  const sql = await db.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bible_verses'"
  );

  if (sql?.sql?.includes('reference TEXT NOT NULL UNIQUE')) {
    await db.execAsync(`
      DROP TABLE IF EXISTS bible_verses;
      DROP TABLE IF EXISTS bible_translations;
    `);
  }
}

async function maybeResetLegacyStrongsTables(db: SQLiteDatabase) {
  const sql = await db.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'strongs_tokens'"
  );

  if (sql?.sql && !sql.sql.includes('token_index')) {
    await db.execAsync(`
      DROP TABLE IF EXISTS strongs_tokens;
      DROP TABLE IF EXISTS strongs_entries;

      CREATE TABLE IF NOT EXISTS strongs_entries (
        id TEXT PRIMARY KEY NOT NULL,
        strongs_id TEXT NOT NULL UNIQUE,
        testament TEXT NOT NULL,
        original_word TEXT NOT NULL,
        transliteration TEXT NOT NULL,
        pronunciation TEXT NOT NULL,
        definition TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS strongs_tokens (
        id TEXT PRIMARY KEY NOT NULL,
        translation_code TEXT NOT NULL,
        reference TEXT NOT NULL,
        token TEXT NOT NULL,
        token_index INTEGER NOT NULL DEFAULT 0,
        strongs_entry_id TEXT NOT NULL REFERENCES strongs_entries(id) ON DELETE CASCADE,
        UNIQUE (translation_code, reference, token_index, strongs_entry_id)
      );
    `);
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
      icon TEXT,
      accent TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      markdown_body TEXT NOT NULL,
      editor_spans TEXT NOT NULL DEFAULT '{}',
      plain_text TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS note_links (
      id TEXT PRIMARY KEY NOT NULL,
      parent_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      child_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      excerpt TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      parent_folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      body TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS strongs_entries (
      id TEXT PRIMARY KEY NOT NULL,
      strongs_id TEXT NOT NULL UNIQUE,
      testament TEXT NOT NULL,
      original_word TEXT NOT NULL,
      transliteration TEXT NOT NULL,
      pronunciation TEXT NOT NULL,
      definition TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strongs_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      translation_code TEXT NOT NULL,
      reference TEXT NOT NULL,
      token TEXT NOT NULL,
      token_index INTEGER NOT NULL DEFAULT 0,
      strongs_entry_id TEXT NOT NULL REFERENCES strongs_entries(id) ON DELETE CASCADE,
      UNIQUE (translation_code, reference, token_index, strongs_entry_id)
    );

    CREATE TABLE IF NOT EXISTS annotation_strokes (
      id TEXT PRIMARY KEY NOT NULL,
      target_type TEXT NOT NULL,
      target_key TEXT NOT NULL,
      tool TEXT NOT NULL,
      color_key TEXT NOT NULL,
      stroke_width REAL NOT NULL,
      opacity REAL NOT NULL,
      points_json TEXT NOT NULL,
      canvas_width REAL NOT NULL,
      canvas_height REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await maybeResetLegacyBibleTables(db);
  await maybeResetLegacyStrongsTables(db);

  await ensureColumn(db, 'notes', 'folder_id', 'folder_id TEXT REFERENCES folders(id)');
  await ensureColumn(db, 'notes', 'rich_body_html', "rich_body_html TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'templates', "kind", "kind TEXT NOT NULL DEFAULT 'blank'");
  await ensureColumn(db, 'strongs_tokens', 'token_index', 'token_index INTEGER NOT NULL DEFAULT 0');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bible_translations (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_bundled INTEGER NOT NULL DEFAULT 0,
      is_downloaded INTEGER NOT NULL DEFAULT 0,
      asset_key TEXT,
      installed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bible_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_code TEXT NOT NULL REFERENCES bible_translations(code) ON DELETE CASCADE,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      reference TEXT NOT NULL,
      text TEXT NOT NULL,
      UNIQUE (translation_code, reference)
    );

    CREATE INDEX IF NOT EXISTS annotation_strokes_target_idx
      ON annotation_strokes (target_type, target_key, updated_at);
  `);

  await seedSpacesIfNeeded(db);
  await migrateThreadsToFoldersIfNeeded(db);
  await seedTemplates(db);
  await seedTranslations(db);
  await seedBundledTranslations(db);
  await seedStrongsDataIfNeeded(db);

  const notes = await db.getAllAsync<NoteRow>('SELECT * FROM notes');
  for (const note of notes) {
    const markdownBody =
      note.markdown_body && note.markdown_body.trim()
        ? note.markdown_body
        : note.rich_body_html
          ? htmlToMarkdown(note.rich_body_html)
          : '';
    const richBodyHtml =
      note.rich_body_html && note.rich_body_html.trim()
        ? note.rich_body_html
        : markdownToHtml(markdownBody);
    const plainText = stripMarkdown(markdownBody);

    let nextFolderId = note.folder_id;
    if (!nextFolderId) {
      const fallbackFolder = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM folders WHERE space_id = ? ORDER BY parent_folder_id IS NOT NULL, position ASC, name ASC LIMIT 1',
        note.space_id
      );
      nextFolderId = fallbackFolder?.id ?? null;
    }

    await db.runAsync(
      `UPDATE notes
       SET markdown_body = ?, rich_body_html = ?, editor_spans = ?, plain_text = ?, folder_id = ?
       WHERE id = ?`,
      markdownBody,
      richBodyHtml,
      buildEditorSpans(markdownBody),
      plainText,
      nextFolderId,
      note.id
    );

    await upsertTagsAndReferences(db, note.id, markdownBody, plainText);
  }

  await seedNotesIfNeeded(db);
  await rebuildNoteSearchIndex(db);
}

export async function getSpaces(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<Space>(
    'SELECT id, name, description, position FROM spaces ORDER BY position ASC'
  );
  return rows;
}

export async function getTemplates(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<TemplateRow>(
    'SELECT id, kind, name, description, body FROM templates ORDER BY rowid ASC'
  );
  return rows.map(mapTemplate);
}

export async function listFolders(db: SQLiteDatabase, spaceId: string): Promise<FolderTreeRow[]> {
  const rows = await db.getAllAsync<FolderRow>(
    `SELECT
        folders.id,
        folders.space_id,
        folders.parent_folder_id,
        folders.name,
        folders.position,
        folders.created_at,
        folders.updated_at,
        COUNT(DISTINCT notes.id) AS note_count,
        COUNT(DISTINCT children.id) AS child_count
     FROM folders
     LEFT JOIN notes ON notes.folder_id = folders.id
     LEFT JOIN folders children ON children.parent_folder_id = folders.id
     WHERE folders.space_id = ?
     GROUP BY folders.id
     ORDER BY folders.parent_folder_id IS NOT NULL ASC, folders.position ASC, folders.name ASC`,
    spaceId
  );

  const topLevel = rows.filter((row) => row.parent_folder_id === null);
  const childrenByParent = new Map<string, FolderRow[]>();
  for (const row of rows.filter((item) => item.parent_folder_id !== null)) {
    const bucket = childrenByParent.get(row.parent_folder_id!) ?? [];
    bucket.push(row);
    childrenByParent.set(row.parent_folder_id!, bucket);
  }

  const tree: FolderTreeRow[] = [];
  for (const folder of topLevel) {
    tree.push(mapFolder(folder, 0));
    const children = childrenByParent.get(folder.id) ?? [];
    for (const child of children.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))) {
      tree.push(mapFolder(child, 1));
    }
  }

  return tree;
}

export async function getFolderById(db: SQLiteDatabase, folderId: string): Promise<Folder | null> {
  const row = await db.getFirstAsync<FolderRow>(
    `SELECT
        folders.id,
        folders.space_id,
        folders.parent_folder_id,
        folders.name,
        folders.position,
        folders.created_at,
        folders.updated_at,
        COUNT(DISTINCT notes.id) AS note_count,
        COUNT(DISTINCT children.id) AS child_count
     FROM folders
     LEFT JOIN notes ON notes.folder_id = folders.id
     LEFT JOIN folders children ON children.parent_folder_id = folders.id
     WHERE folders.id = ?
     GROUP BY folders.id`,
    folderId
  );

  if (!row) {
    return null;
  }

  const mapped = mapFolder(row, row.parent_folder_id ? 1 : 0);
  return {
    id: mapped.id,
    spaceId: mapped.spaceId,
    parentFolderId: mapped.parentFolderId,
    name: mapped.name,
    position: mapped.position,
    noteCount: mapped.noteCount,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  };
}

export async function getWorkspaceSnapshot(
  db: SQLiteDatabase,
  activeSpaceId: string
): Promise<WorkspaceSnapshot> {
  const [spaces, templates, folders] = await Promise.all([
    getSpaces(db),
    getTemplates(db),
    listFolders(db, activeSpaceId),
  ]);

  const counts =
    (await db.getFirstAsync<{
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

  const tags = await db.getAllAsync<{ id: string; name: string; note_count: number }>(
    `SELECT tags.id, tags.name, COUNT(note_tags.note_id) AS note_count
     FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     INNER JOIN notes ON notes.id = note_tags.note_id
     WHERE notes.space_id = ?
     GROUP BY tags.id
     ORDER BY note_count DESC, tags.name ASC
     LIMIT 8`,
    activeSpaceId
  );

  const recentNotes = await db.getAllAsync<NoteRow>(
    `SELECT
        id, title, markdown_body, rich_body_html, editor_spans, plain_text,
        template_id, space_id, folder_id, is_favorite, created_at, updated_at
     FROM notes
     WHERE space_id = ?
     ORDER BY updated_at DESC
     LIMIT 6`,
    activeSpaceId
  );

  const versePool = TRANSLATION_VERSES.KJV;
  const keys = Object.keys(versePool);
  const dateScore = new Date().toISOString().slice(0, 10).split('-').join('').split('').reduce((sum, digit) => sum + Number(digit), 0);
  const reference = keys[dateScore % keys.length];
  const verse = reference
    ? {
        translationCode: 'KJV' as const,
        book: reference.replace(/\s+\d+:\d+$/, ''),
        chapter: Number(reference.match(/(\d+):(\d+)$/)?.[1] ?? 1),
        verse: Number(reference.match(/(\d+):(\d+)$/)?.[2] ?? 1),
        reference,
        text: versePool[reference],
      }
    : null;

  return {
    spaces,
    activeSpaceId,
    collectionCounts: {
      allNotes: counts.all_notes,
      favorites: counts.favorites ?? 0,
      recent: counts.recent ?? 0,
    },
    folders,
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      noteCount: tag.note_count,
    })),
    templates,
    dailyVerse: verse,
    recentNotes: recentNotes.map(mapNote),
  };
}

export async function getNotesByCollection(
  db: SQLiteDatabase,
  spaceId: string,
  collection: 'all' | 'favorites' | 'recent'
): Promise<Note[]> {
  let where = 'WHERE space_id = ?';
  if (collection === 'favorites') {
    where += ' AND is_favorite = 1';
  } else if (collection === 'recent') {
    where += " AND updated_at >= datetime('now', '-7 day')";
  }

  const rows = await db.getAllAsync<NoteRow>(
    `SELECT
        id, title, markdown_body, rich_body_html, editor_spans, plain_text,
        template_id, space_id, folder_id, is_favorite, created_at, updated_at
     FROM notes
     ${where}
     ORDER BY updated_at DESC
     LIMIT 50`,
    spaceId
  );

  return rows.map(mapNote);
}

export async function getNotesByFolder(db: SQLiteDatabase, folderId: string): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT
        id, title, markdown_body, rich_body_html, editor_spans, plain_text,
        template_id, space_id, folder_id, is_favorite, created_at, updated_at
     FROM notes
     WHERE folder_id = ?
     ORDER BY updated_at DESC`,
    folderId
  );

  return rows.map(mapNote);
}

export async function getNoteById(db: SQLiteDatabase, noteId: string): Promise<NoteDetail | null> {
  const note = await db.getFirstAsync<NoteRow>(
    `SELECT
        id, title, markdown_body, rich_body_html, editor_spans, plain_text,
        template_id, space_id, folder_id, is_favorite, created_at, updated_at
     FROM notes
     WHERE id = ?`,
    noteId
  );

  if (!note) {
    return null;
  }

  const [attachments, folder] = await Promise.all([
    db.getAllAsync<MediaAttachment>(
      `SELECT
          id,
          note_id AS noteId,
          uri,
          width,
          height,
          type,
          created_at AS createdAt
       FROM media_attachments
       WHERE note_id = ?
       ORDER BY created_at ASC`,
      noteId
    ),
    note.folder_id ? getFolderById(db, note.folder_id) : Promise.resolve(null),
  ]);

  return {
    note: mapNote(note),
    attachments,
    folder,
  };
}

export function buildNoteAnnotationTargetKey(noteId: string) {
  return `note:${noteId}`;
}

export function buildBibleAnnotationTargetKey(args: {
  translationCode: BibleTranslationCode;
  book: string;
  chapter: number;
}) {
  return `bible:${args.translationCode}:${args.book}:${args.chapter}`;
}

export async function getAnnotationStrokes(
  db: SQLiteDatabase,
  args: {
    targetType: AnnotationTargetType;
    targetKey: string;
  }
) {
  const rows = await db.getAllAsync<AnnotationStrokeRow>(
    `SELECT
        id,
        target_type,
        target_key,
        tool,
        color_key,
        stroke_width,
        opacity,
        points_json,
        canvas_width,
        canvas_height,
        created_at,
        updated_at
     FROM annotation_strokes
     WHERE target_type = ? AND target_key = ?
     ORDER BY created_at ASC`,
    args.targetType,
    args.targetKey
  );

  return rows.map(mapAnnotationStroke);
}

export async function replaceAnnotationStrokes(
  db: SQLiteDatabase,
  args: {
    targetType: AnnotationTargetType;
    targetKey: string;
    strokes: AnnotationStroke[];
  }
) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'DELETE FROM annotation_strokes WHERE target_type = ? AND target_key = ?',
      args.targetType,
      args.targetKey
    );

    for (const stroke of args.strokes) {
      await txn.runAsync(
        `INSERT INTO annotation_strokes (
          id,
          target_type,
          target_key,
          tool,
          color_key,
          stroke_width,
          opacity,
          points_json,
          canvas_width,
          canvas_height,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        stroke.id,
        args.targetType,
        args.targetKey,
        stroke.tool,
        stroke.colorKey,
        stroke.strokeWidth,
        stroke.opacity,
        JSON.stringify(stroke.points),
        stroke.canvasWidth,
        stroke.canvasHeight,
        stroke.createdAt,
        stroke.updatedAt
      );
    }
  });
}

export async function clearAnnotationStrokes(
  db: SQLiteDatabase,
  args: {
    targetType: AnnotationTargetType;
    targetKey: string;
  }
) {
  await db.runAsync(
    'DELETE FROM annotation_strokes WHERE target_type = ? AND target_key = ?',
    args.targetType,
    args.targetKey
  );
}

export async function createFolder(
  db: SQLiteDatabase,
  args: {
    spaceId: string;
    name: string;
    parentFolderId?: string | null;
  }
) {
  if (args.parentFolderId) {
    const parent = await getFolderById(db, args.parentFolderId);
    if (!parent) {
      throw new Error('Parent folder not found.');
    }
    if (parent.parentFolderId) {
      throw new Error('Subfolders cannot contain more subfolders in Phase 1.');
    }
  }

  const siblingCount =
    args.parentFolderId == null
      ? ((await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM folders WHERE space_id = ? AND parent_folder_id IS NULL',
          args.spaceId
        ))?.count ?? 0)
      : ((await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM folders WHERE space_id = ? AND parent_folder_id = ?',
          args.spaceId,
          args.parentFolderId
        ))?.count ?? 0);
  const now = new Date().toISOString();
  const id = makeId('folder');

  await db.runAsync(
    `INSERT INTO folders (
      id, space_id, parent_folder_id, name, position, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    args.spaceId,
    args.parentFolderId ?? null,
    args.name.trim(),
    siblingCount,
    now,
    now
  );

  return id;
}

export async function renameFolder(db: SQLiteDatabase, folderId: string, name: string) {
  await db.runAsync(
    'UPDATE folders SET name = ?, updated_at = ? WHERE id = ?',
    name.trim(),
    new Date().toISOString(),
    folderId
  );
}

export async function deleteFolder(db: SQLiteDatabase, folderId: string) {
  const folder = await getFolderById(db, folderId);
  if (!folder) {
    return;
  }

  const childrenCount =
    (
      await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM folders WHERE parent_folder_id = ?',
        folderId
      )
    )?.count ?? 0;
  const noteCount =
    (
      await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM notes WHERE folder_id = ?',
        folderId
      )
    )?.count ?? 0;

  if (childrenCount > 0 || noteCount > 0) {
    throw new Error('Only empty folders can be deleted in Phase 1.');
  }

  await db.runAsync('DELETE FROM folders WHERE id = ?', folderId);
}

export async function createNoteFromTemplate(
  db: SQLiteDatabase,
  args: {
    templateId: string;
    spaceId: string;
    folderId: string;
    title?: string;
  }
) {
  const template = await db.getFirstAsync<TemplateRow>(
    'SELECT id, kind, name, description, body FROM templates WHERE id = ?',
    args.templateId
  );

  const id = makeId('note');
  const now = new Date().toISOString();
  const title = args.title?.trim() || buildDefaultNoteTitle();
  const markdownBody = template?.body ?? '';
  const richBodyHtml = markdownToHtml(markdownBody);
  const plainText = stripMarkdown(markdownBody);

  await db.runAsync(
    `INSERT INTO notes (
      id, title, markdown_body, rich_body_html, editor_spans, plain_text,
      template_id, space_id, folder_id, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    title,
    markdownBody,
    richBodyHtml,
    buildEditorSpans(markdownBody),
    plainText,
    args.templateId,
    args.spaceId,
    args.folderId,
    now,
    now
  );

  await upsertTagsAndReferences(db, id, markdownBody, plainText);
  await syncNoteSearchIndex(db, id);
  return id;
}

export async function saveNoteDraft(
  db: SQLiteDatabase,
  args: {
    id: string;
    title: string;
    markdownBody: string;
    richBodyHtml: string;
    templateId: string | null;
    spaceId: string;
    folderId: string | null;
    isFavorite?: boolean;
    attachments?: Pick<
      MediaAttachment,
      'id' | 'uri' | 'width' | 'height' | 'type' | 'createdAt'
    >[];
  }
) {
  const updatedAt = new Date().toISOString();
  const markdownBody = args.markdownBody.trim() ? args.markdownBody : htmlToMarkdown(args.richBodyHtml);
  const richBodyHtml = args.richBodyHtml.trim() ? args.richBodyHtml : markdownToHtml(markdownBody);
  const plainText = markdownBody ? stripMarkdown(markdownBody) : stripHtml(richBodyHtml);

  await db.runAsync(
    `UPDATE notes
     SET title = ?, markdown_body = ?, rich_body_html = ?, editor_spans = ?, plain_text = ?,
         template_id = ?, space_id = ?, folder_id = ?, is_favorite = ?, updated_at = ?
     WHERE id = ?`,
    args.title.trim() || 'Untitled',
    markdownBody,
    richBodyHtml,
    buildEditorSpans(markdownBody),
    plainText,
    args.templateId,
    args.spaceId,
    args.folderId,
    Number(Boolean(args.isFavorite)),
    updatedAt,
    args.id
  );

  await upsertTagsAndReferences(db, args.id, markdownBody, plainText);

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

export async function moveNoteToFolder(
  db: SQLiteDatabase,
  args: {
    folderId: string;
    noteId: string;
  }
) {
  await db.runAsync(
    'UPDATE notes SET folder_id = ?, updated_at = ? WHERE id = ?',
    args.folderId,
    new Date().toISOString(),
    args.noteId
  );
  await syncNoteSearchIndex(db, args.noteId);
}

export async function getAllTags(db: SQLiteDatabase, spaceId: string): Promise<Tag[]> {
  const rows = await db.getAllAsync<{ id: string; name: string; note_count: number }>(
    `SELECT tags.id, tags.name, COUNT(note_tags.note_id) AS note_count
     FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     INNER JOIN notes ON notes.id = note_tags.note_id
     WHERE notes.space_id = ?
     GROUP BY tags.id
     ORDER BY tags.name ASC`,
    spaceId
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    noteCount: row.note_count,
  }));
}

export async function getTagSuggestions(
  db: SQLiteDatabase,
  args: {
    spaceId: string;
    prefix: string;
  }
): Promise<TagSuggestion[]> {
  const prefix = args.prefix.trim().replace(/^#/, '').toLowerCase();
  if (!prefix) {
    return [];
  }

  const rows = await db.getAllAsync<{ id: string; name: string; note_count: number }>(
    `SELECT tags.id, tags.name, COUNT(note_tags.note_id) AS note_count
     FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     INNER JOIN notes ON notes.id = note_tags.note_id
     WHERE notes.space_id = ? AND tags.name LIKE ?
     GROUP BY tags.id
     ORDER BY note_count DESC, tags.name ASC
     LIMIT 6`,
    args.spaceId,
    `${prefix}%`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    noteCount: row.note_count,
    label: `#${row.name}`,
  }));
}

export async function searchNotes(
  db: SQLiteDatabase,
  args: {
    spaceId: string;
    query: string;
  }
): Promise<SearchResult[]> {
  if (!args.query.trim()) {
    return [];
  }

  const ftsQuery = args.query
    .trim()
    .replace(/[^\p{L}\p{N}\s#:_-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.replace(/^#/, '')}*`)
    .join(' OR ');

  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    plain_text: string;
    updated_at: string;
    folder_name: string | null;
  }>(
    `SELECT notes.id, notes.title, notes.plain_text, notes.updated_at, folders.name AS folder_name
     FROM notes_fts
     INNER JOIN notes ON notes.id = notes_fts.note_id
     LEFT JOIN folders ON folders.id = notes.folder_id
     WHERE notes.space_id = ? AND notes_fts MATCH ?
     ORDER BY bm25(notes_fts), notes.updated_at DESC
     LIMIT 30`,
    args.spaceId,
    ftsQuery || args.query.trim()
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.plain_text,
    updatedAt: row.updated_at,
    folderName: row.folder_name,
  }));
}

export async function listTranslations(db: SQLiteDatabase): Promise<InstalledTranslation[]> {
  const rows = await db.getAllAsync<TranslationRow>(
    `SELECT
        id, code, name, is_bundled, is_downloaded, asset_key, installed_at
     FROM bible_translations
     ORDER BY is_bundled DESC, name ASC`
  );
  return rows.map(mapTranslation);
}

export async function getInstalledTranslations(db: SQLiteDatabase): Promise<InstalledTranslation[]> {
  const rows = await db.getAllAsync<TranslationRow>(
    `SELECT
        id, code, name, is_bundled, is_downloaded, asset_key, installed_at
     FROM bible_translations
     WHERE is_downloaded = 1
     ORDER BY is_bundled DESC, name ASC`
  );
  return rows.map(mapTranslation);
}

export async function installTranslation(db: SQLiteDatabase, code: BibleTranslationCode) {
  await importTranslation(db, code, { markInstalled: true });
}

export async function getBibleBooks(
  _db: SQLiteDatabase,
  _translationCode: BibleTranslationCode
) {
  return [...BIBLE_BOOKS];
}

export async function getBibleChapterCount(
  db: SQLiteDatabase,
  args: {
    translationCode: BibleTranslationCode;
    book: string;
  }
) {
  const row = await db.getFirstAsync<{ chapter_count: number }>(
    `SELECT MAX(chapter) AS chapter_count
     FROM bible_verses
     WHERE translation_code = ? AND book = ?`,
    args.translationCode,
    args.book
  );

  return row?.chapter_count ?? 1;
}

export async function getBibleChapter(
  db: SQLiteDatabase,
  args: {
    translationCode: BibleTranslationCode;
    book: string;
    chapter: number;
  }
) {
  const rows = await db.getAllAsync<BibleVerseRow>(
    `SELECT
        id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE translation_code = ? AND book = ? AND chapter = ?
     ORDER BY verse ASC`,
    args.translationCode,
    args.book,
    args.chapter
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

export async function getVerseByReference(
  db: SQLiteDatabase,
  args: {
    reference: string;
    translationCode: BibleTranslationCode;
  }
) {
  const row = await db.getFirstAsync<BibleVerseRow>(
    `SELECT
        id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE translation_code = ? AND lower(reference) = lower(?)`,
    args.translationCode,
    args.reference
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    translationCode: row.translation_code,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    reference: row.reference,
    text: row.text,
  } satisfies BibleVerse;
}

export async function getVersesForReferenceRange(
  db: SQLiteDatabase,
  args: {
    translationCode: BibleTranslationCode;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number | null;
  }
) {
  const rows = await db.getAllAsync<BibleVerseRow>(
    `SELECT
        id, translation_code, book, chapter, verse, reference, text
     FROM bible_verses
     WHERE translation_code = ? AND book = ? AND chapter = ? AND verse BETWEEN ? AND ?
     ORDER BY verse ASC`,
    args.translationCode,
    args.book,
    args.chapter,
    args.verseStart,
    args.verseEnd ?? args.verseStart
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

export function buildInsertedVerseBlockquoteMarkdown(verses: BibleVerse[]) {
  return buildInsertedVerseQuoteMarkdown(
    verses.map((verse) => `${verse.reference} — ${verse.text}`)
  );
}

export async function getStrongsEntryForToken(
  db: SQLiteDatabase,
  args: {
    reference: string;
    tokenIndex: number;
    translationCode: BibleTranslationCode;
  }
) {
  const row = await db.getFirstAsync<
    StrongsEntryRow & {
      token: string;
      token_index: number;
    }
  >(
    `SELECT
        strongs_entries.id,
        strongs_entries.strongs_id,
        strongs_entries.testament,
        strongs_entries.original_word,
        strongs_entries.transliteration,
        strongs_entries.pronunciation,
        strongs_entries.definition,
        strongs_entries.created_at,
        strongs_tokens.token,
        strongs_tokens.token_index
     FROM strongs_tokens
     INNER JOIN strongs_entries ON strongs_entries.id = strongs_tokens.strongs_entry_id
     WHERE strongs_tokens.translation_code = ?
       AND strongs_tokens.reference = ?
       AND strongs_tokens.token_index = ?
     LIMIT 1`,
    args.translationCode,
    args.reference,
    args.tokenIndex
  );

  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    definition: row.definition,
    id: row.id,
    original: row.original_word,
    pronunciation: row.pronunciation,
    strongsId: row.strongs_id,
    testament: row.testament,
    token: row.token,
    tokenIndex: row.token_index,
    transliteration: row.transliteration,
  };
}

export async function deleteNote(db: SQLiteDatabase, noteId: string) {
  await db.runAsync('DELETE FROM notes_fts WHERE note_id = ?', noteId);
  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
  await db.runAsync('DELETE FROM verse_references WHERE note_id = ?', noteId);
  await db.runAsync('DELETE FROM media_attachments WHERE note_id = ?', noteId);
  await db.runAsync(
    'DELETE FROM annotation_strokes WHERE target_type = ? AND target_key = ?',
    'note',
    buildNoteAnnotationTargetKey(noteId)
  );
  await db.runAsync('DELETE FROM notes WHERE id = ?', noteId);
}

export async function toggleNoteFavorite(db: SQLiteDatabase, noteId: string) {
  const note = await db.getFirstAsync<{ is_favorite: number }>(
    'SELECT is_favorite FROM notes WHERE id = ?',
    noteId
  );
  if (!note) {
    return;
  }

  await db.runAsync(
    'UPDATE notes SET is_favorite = ?, updated_at = ? WHERE id = ?',
    note.is_favorite ? 0 : 1,
    new Date().toISOString(),
    noteId
  );
  await syncNoteSearchIndex(db, noteId);
}
