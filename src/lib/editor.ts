export type Selection = {
  start: number;
  end: number;
};

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'bulleted-list'
  | 'numbered-list'
  | 'blockquote';

const SCRIPTURE_SENTINEL = '[Verse] ';

function isScriptureQuoteLine(value: string) {
  return value.startsWith(SCRIPTURE_SENTINEL);
}

function stripScriptureSentinel(value: string) {
  return value.replace(SCRIPTURE_SENTINEL, '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInlineMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(attachment:\/\/([^)]+)\)/g, '<img alt="$1" src="attachment://$2" data-attachment-id="$2" />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
}

function buildListBuffer(lines: string[], ordered: boolean) {
  const items = lines.map((line) => line.replace(ordered ? /^\d+\.\s*/ : /^-\s*/, '').trim());
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join('')}</${tag}>`;
}

export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) {
    return '<p></p>';
  }

  const lines = markdown.replace(/\r/g, '').split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      blocks.push(`<h2>${applyInlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h2>`);
      index += 1;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      blocks.push(`<h1>${applyInlineMarkdown(trimmed.replace(/^#\s+/, ''))}</h1>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      if (quoteLines.every(isScriptureQuoteLine)) {
        blocks.push(
          `<aside data-scripture-quote="true"><p>${quoteLines
            .map((line) => applyInlineMarkdown(stripScriptureSentinel(line)))
            .join('<br />')}</p></aside>`
        );
      } else {
        blocks.push(`<blockquote><p>${quoteLines.map(applyInlineMarkdown).join('<br />')}</p></blockquote>`);
      }
      continue;
    }

    if (/^- /.test(trimmed)) {
      const listLines: string[] = [];
      while (index < lines.length && /^- /.test(lines[index].trim())) {
        listLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push(buildListBuffer(listLines, false));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const listLines: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        listLines.push(lines[index].trim());
        index += 1;
      }
      blocks.push(buildListBuffer(listLines, true));
      continue;
    }

    blocks.push(`<p>${applyInlineMarkdown(trimmed)}</p>`);
    index += 1;
  }

  return blocks.join('');
}

function convertInlineHtmlToMarkdown(value: string) {
  return value
    .replace(/<img[^>]*data-attachment-id="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2](attachment://$1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*data-attachment-id="([^"]+)"[^>]*>/g, '![$1](attachment://$2)')
    .replace(/<img[^>]*src="attachment:\/\/([^"]+)"[^>]*>/g, '![](attachment://$1)')
    .replace(/<(strong|b)>(.*?)<\/\1>/g, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/g, '*$2*')
    .replace(/<u>(.*?)<\/u>/g, '++$1++')
    .replace(/<a[^>]*href="stillnote:\/\/verse\/([^"]+)"[^>]*>(.*?)<\/a>/g, '$2')
    .replace(/<span[^>]*data-tag="([^"]+)"[^>]*>(.*?)<\/span>/g, '$2')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToMarkdown(html: string) {
  const normalized = html
    .replace(/\r/g, '')
    .replace(/<aside[^>]*data-scripture-quote="true"[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/aside>/g, (_, inner) => {
      return inner
        .split(/<br\s*\/?>/g)
        .map((line: string) => `> ${SCRIPTURE_SENTINEL}${convertInlineHtmlToMarkdown(line).trim()}`)
        .join('\n');
    })
    .replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, (_, inner) => {
      return inner
        .split(/<br\s*\/?>/g)
        .map((line: string) => `> ${convertInlineHtmlToMarkdown(line).trim()}`)
        .join('\n');
    })
    .replace(/<h1>([\s\S]*?)<\/h1>/g, (_, inner) => `# ${convertInlineHtmlToMarkdown(inner).trim()}`)
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => `## ${convertInlineHtmlToMarkdown(inner).trim()}`)
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => {
      const items = Array.from(
        inner.matchAll(/<li>([\s\S]*?)<\/li>/g) as IterableIterator<RegExpMatchArray>
      ).map((match) =>
        convertInlineHtmlToMarkdown(match[1]).trim()
      );
      return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    })
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => {
      const items = Array.from(
        inner.matchAll(/<li>([\s\S]*?)<\/li>/g) as IterableIterator<RegExpMatchArray>
      ).map((match) =>
        convertInlineHtmlToMarkdown(match[1]).trim()
      );
      return items.map((item) => `- ${item}`).join('\n');
    })
    .replace(/<p>([\s\S]*?)<\/p>/g, (_, inner) => convertInlineHtmlToMarkdown(inner).trim())
    .replace(/<\/?(div|section|article)>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n');

  return normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(new RegExp(`^>\\s?${SCRIPTURE_SENTINEL.replace(/[[\]]/g, '\\$&')}`, 'gm'), '')
    .replace(/!\[[^\]]*\]\(attachment:\/\/[^)]+\)/g, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\+\+(.*?)\+\+/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\d+\.\s?/gm, '')
    .replace(/^-+\s?/gm, '')
    .replace(/^##\s?/gm, '')
    .replace(/^#\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(html: string) {
  return html
    .replace(/<img[^>]*>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildEditorSpans(body: string) {
  return JSON.stringify({
    boldCount: (body.match(/\*\*/g) ?? []).length / 2,
    italicCount: (body.match(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g) ?? []).length,
    underlineCount: (body.match(/\+\+/g) ?? []).length / 2,
    blockquoteCount: (body.match(/^>\s?/gm) ?? []).length,
    bulletCount: (body.match(/^-+\s?/gm) ?? []).length,
    numberedCount: (body.match(/^\d+\.\s?/gm) ?? []).length,
    imageCount: (body.match(/!\[[^\]]*\]\(attachment:\/\/[^)]+\)/g) ?? []).length,
    scriptureQuoteCount: (body.match(new RegExp(`^>\\s?${SCRIPTURE_SENTINEL.replace(/[[\]]/g, '\\$&')}`, 'gm')) ?? []).length,
  });
}

export function buildInsertedVerseQuoteMarkdown(referenceLines: string[]) {
  return referenceLines.map((line) => `> ${SCRIPTURE_SENTINEL}${line}`).join('\n');
}
