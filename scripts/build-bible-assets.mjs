import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUTPUT_DIR = path.join(ROOT, 'assets', 'data', 'translations');

const BOOK_CODE_TO_NAME = {
  GEN: 'Genesis',
  EXO: 'Exodus',
  LEV: 'Leviticus',
  NUM: 'Numbers',
  DEU: 'Deuteronomy',
  JOS: 'Joshua',
  JDG: 'Judges',
  RUT: 'Ruth',
  '1SA': '1 Samuel',
  '2SA': '2 Samuel',
  '1KI': '1 Kings',
  '2KI': '2 Kings',
  '1CH': '1 Chronicles',
  '2CH': '2 Chronicles',
  EZR: 'Ezra',
  NEH: 'Nehemiah',
  EST: 'Esther',
  JOB: 'Job',
  PSA: 'Psalms',
  PRO: 'Proverbs',
  ECC: 'Ecclesiastes',
  SNG: 'Song of Solomon',
  ISA: 'Isaiah',
  JER: 'Jeremiah',
  LAM: 'Lamentations',
  EZK: 'Ezekiel',
  DAN: 'Daniel',
  HOS: 'Hosea',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obadiah',
  JON: 'Jonah',
  MIC: 'Micah',
  NAM: 'Nahum',
  HAB: 'Habakkuk',
  ZEP: 'Zephaniah',
  HAG: 'Haggai',
  ZEC: 'Zechariah',
  MAL: 'Malachi',
  MAT: 'Matthew',
  MRK: 'Mark',
  LUK: 'Luke',
  JHN: 'John',
  ACT: 'Acts',
  ROM: 'Romans',
  '1CO': '1 Corinthians',
  '2CO': '2 Corinthians',
  GAL: 'Galatians',
  EPH: 'Ephesians',
  PHP: 'Philippians',
  COL: 'Colossians',
  '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians',
  '1TI': '1 Timothy',
  '2TI': '2 Timothy',
  TIT: 'Titus',
  PHM: 'Philemon',
  HEB: 'Hebrews',
  JAS: 'James',
  '1PE': '1 Peter',
  '2PE': '2 Peter',
  '1JN': '1 John',
  '2JN': '2 John',
  '3JN': '3 John',
  JUD: 'Jude',
  REV: 'Revelation',
};

const SOURCES = {
  bsb: {
    kind: 'tsv',
    url: 'https://bereanbible.com/bsb.txt',
  },
  web: {
    kind: 'vpl-sql-zip',
    url: 'https://eBible.org/Scriptures/eng-web_vpl.zip',
    sqlFile: 'eng-web_vpl.sql',
  },
  asv: {
    kind: 'vpl-sql-zip',
    url: 'https://eBible.org/Scriptures/eng-asv_vpl.zip',
    sqlFile: 'eng-asv_vpl.sql',
  },
  ylt: {
    kind: 'vpl-sql-zip',
    url: 'https://eBible.org/Scriptures/engylt_vpl.zip',
    sqlFile: 'engylt_vpl.sql',
  },
};

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destination, Buffer.from(arrayBuffer));
}

function parseBsbTsv(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).slice(3);
  const verses = {};

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const [reference, text] = line.split('\t');
    if (!reference || !text) {
      continue;
    }

    verses[reference.trim()] = text.trim();
  }

  return verses;
}

function decodeSqlString(raw) {
  return raw
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function parseVplSql(content) {
  const verses = {};
  const regex =
    /INSERT INTO .* VALUES \("([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([\s\S]*?)"\);/g;

  for (const match of content.matchAll(regex)) {
    const bookCode = match[3];
    const book = BOOK_CODE_TO_NAME[bookCode];
    if (!book) {
      continue;
    }

    const chapter = Number(match[4]);
    const verse = Number(match[5]);
    const text = decodeSqlString(match[7]).trim();
    verses[`${book} ${chapter}:${verse}`] = text;
  }

  return verses;
}

async function unzipFile(zipPath, outputDir) {
  execFileSync('unzip', ['-o', zipPath, '-d', outputDir], {
    stdio: 'ignore',
  });
}

async function buildAsset(code, source) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `stillnote-${code}-`));
  const downloadPath = path.join(tempDir, path.basename(new URL(source.url).pathname));

  await downloadFile(source.url, downloadPath);

  let verses = {};
  if (source.kind === 'tsv') {
    verses = parseBsbTsv(await fs.readFile(downloadPath, 'utf8'));
  } else {
    await unzipFile(downloadPath, tempDir);
    const sqlPath = path.join(tempDir, source.sqlFile);
    verses = parseVplSql(await fs.readFile(sqlPath, 'utf8'));
  }

  const outputPath = path.join(OUTPUT_DIR, `${code}-verses.json`);
  await fs.writeFile(outputPath, JSON.stringify(verses, null, 2));
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log(`Wrote ${outputPath} (${Object.keys(verses).length} verses)`);
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  for (const [code, source] of Object.entries(SOURCES)) {
    await buildAsset(code, source);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
