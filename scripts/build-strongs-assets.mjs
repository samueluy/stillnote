import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const TMP_ROOT = '/tmp';
const STRONGS_REPO = path.join(TMP_ROOT, 'stillnote-strongs');
const KJV_REPO = path.join(TMP_ROOT, 'stillnote-kjv');
const OUTPUT_DIR = path.join(ROOT, 'assets', 'data', 'strongs');
const LEXICON_OUTPUT = path.join(OUTPUT_DIR, 'lexicon.json');
const TOKEN_OUTPUT = path.join(OUTPUT_DIR, 'kjv-token-map.json');

const CHAPTERS = [
  ['Gen', 'Genesis', 1],
  ['Mat', 'Matthew', 6],
  ['Jhn', 'John', 1],
  ['Rom', 'Romans', 8],
];

function ensureRepo(repoPath, url) {
  if (fs.existsSync(repoPath)) {
    return;
  }
  execFileSync('git', ['clone', '--depth', '1', url, repoPath], { stdio: 'inherit' });
}

function loadDictionary(filePath, variableName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const context = {
    module: { exports: {} },
    exports: {},
  };
  vm.createContext(context);
  vm.runInContext(`${source}; this.__result = ${variableName};`, context);
  return context.__result;
}

function stripInlineMarkup(value) {
  return value.replace(/<\/?em>/g, '');
}

function parseVerseTokens(taggedText) {
  const tokens = [];
  const regex = /(<em>)?([^<\[]+?)(<\/em>)?(\[(?:[GH]\d+)\])+/g;
  let match;
  let tokenIndex = 0;

  while ((match = regex.exec(taggedText))) {
    const rawWord = stripInlineMarkup(match[2] ?? '')
      .replace(/[“”"]/g, '')
      .trim();
    if (!rawWord) {
      continue;
    }

    const normalized = rawWord.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
    if (!normalized) {
      continue;
    }

    const ids = Array.from((match[4] ?? '').matchAll(/\[([GH]\d+)\]/g)).map((item) => item[1]);
    const strongsId = ids[0];
    if (!strongsId) {
      continue;
    }

    tokens.push({
      strongsId,
      text: normalized,
      tokenIndex,
    });
    tokenIndex += 1;
  }

  return tokens;
}

function buildTokenMap() {
  const tokenMap = {};
  const strongsIds = new Set();

  for (const [abbr, bookName, chapter] of CHAPTERS) {
    const bookPayload = JSON.parse(
      fs.readFileSync(path.join(KJV_REPO, `${abbr}.json`), 'utf8')
    );
    const chapterPayload = bookPayload?.[abbr]?.[`${abbr}|${chapter}`] ?? {};

    for (const [key, versePayload] of Object.entries(chapterPayload)) {
      const verse = Number(key.split('|')[2]);
      const text = versePayload.en;
      if (!text) {
        continue;
      }

      const reference = `${bookName} ${chapter}:${verse}`;
      const tokens = parseVerseTokens(text);
      tokenMap[reference] = tokens;
      for (const token of tokens) {
        strongsIds.add(token.strongsId);
      }
    }
  }

  return {
    strongsIds: [...strongsIds],
    tokenMap,
  };
}

function buildLexicon(strongsIds, greekDictionary, hebrewDictionary) {
  return strongsIds
    .map((id) => {
      const source = id.startsWith('G') ? greekDictionary[id] : hebrewDictionary[id];
      if (!source) {
        return null;
      }

      return {
        createdAt: '1890-01-01T00:00:00.000Z',
        definition: source.strongs_def ?? '',
        gloss: source.kjv_def ?? '',
        id,
        original: source.lemma ?? '',
        partOfSpeech: source.derivation ?? '',
        pronunciation: source.pron ?? source.pronunciation ?? '',
        rootWord: source.derivation ?? '',
        strongsId: id,
        testament: id.startsWith('G') ? 'NT' : 'OT',
        transliteration: source.translit ?? source.xlit ?? '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.strongsId.localeCompare(b.strongsId));
}

ensureRepo(STRONGS_REPO, 'https://github.com/openscriptures/strongs');
ensureRepo(KJV_REPO, 'https://github.com/kaiserlik/kjv');

const greekDictionary = loadDictionary(
  path.join(STRONGS_REPO, 'greek', 'strongs-greek-dictionary.js'),
  'strongsGreekDictionary'
);
const hebrewDictionary = loadDictionary(
  path.join(STRONGS_REPO, 'hebrew', 'strongs-hebrew-dictionary.js'),
  'strongsHebrewDictionary'
);
const { strongsIds, tokenMap } = buildTokenMap();
const lexicon = buildLexicon(strongsIds, greekDictionary, hebrewDictionary);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(LEXICON_OUTPUT, `${JSON.stringify(lexicon, null, 2)}\n`);
fs.writeFileSync(TOKEN_OUTPUT, `${JSON.stringify(tokenMap, null, 2)}\n`);

console.log(`Wrote ${lexicon.length} lexicon entries to ${LEXICON_OUTPUT}`);
console.log(`Wrote ${Object.keys(tokenMap).length} tokenized verses to ${TOKEN_OUTPUT}`);
