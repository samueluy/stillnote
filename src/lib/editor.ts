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

function getSelectedText(text: string, selection: Selection) {
  return text.slice(selection.start, selection.end);
}

function replaceSelection(text: string, selection: Selection, replacement: string) {
  return `${text.slice(0, selection.start)}${replacement}${text.slice(selection.end)}`;
}

function getLineRange(text: string, selection: Selection) {
  const lineStart = text.lastIndexOf('\n', Math.max(selection.start - 1, 0)) + 1;
  const lineEndIndex = text.indexOf('\n', selection.end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  return { start: lineStart, end: lineEnd };
}

export function applyFormat(text: string, selection: Selection, action: FormatAction) {
  const selectedText = getSelectedText(text, selection);
  const hasSelection = selection.start !== selection.end;

  if (action === 'bold') {
    const replacement = `**${hasSelection ? selectedText : 'bold text'}**`;
    return {
      nextText: replaceSelection(text, selection, replacement),
      nextSelection: {
        start: selection.start + 2,
        end: selection.start + replacement.length - 2,
      },
    };
  }

  if (action === 'italic') {
    const replacement = `*${hasSelection ? selectedText : 'italic text'}*`;
    return {
      nextText: replaceSelection(text, selection, replacement),
      nextSelection: {
        start: selection.start + 1,
        end: selection.start + replacement.length - 1,
      },
    };
  }

  if (action === 'underline') {
    const replacement = `<u>${hasSelection ? selectedText : 'underlined text'}</u>`;
    return {
      nextText: replaceSelection(text, selection, replacement),
      nextSelection: {
        start: selection.start + 3,
        end: selection.start + replacement.length - 4,
      },
    };
  }

  const lineRange = getLineRange(text, selection);
  const selectedLines = text.slice(lineRange.start, lineRange.end).split('\n');

  if (action === 'blockquote') {
    const replacement = selectedLines.map((line) => (line.startsWith('> ') ? line : `> ${line}`)).join('\n');
    return {
      nextText: `${text.slice(0, lineRange.start)}${replacement}${text.slice(lineRange.end)}`,
      nextSelection: {
        start: lineRange.start,
        end: lineRange.start + replacement.length,
      },
    };
  }

  if (action === 'bulleted-list') {
    const replacement = selectedLines.map((line) => (line.startsWith('- ') ? line : `- ${line || 'List item'}`)).join('\n');
    return {
      nextText: `${text.slice(0, lineRange.start)}${replacement}${text.slice(lineRange.end)}`,
      nextSelection: {
        start: lineRange.start,
        end: lineRange.start + replacement.length,
      },
    };
  }

  const replacement = selectedLines
    .map((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, '') || 'List item'}`)
    .join('\n');

  return {
    nextText: `${text.slice(0, lineRange.start)}${replacement}${text.slice(lineRange.end)}`,
    nextSelection: {
      start: lineRange.start,
      end: lineRange.start + replacement.length,
    },
  };
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/<u>(.*?)<\/u>/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\d+\.\s?/gm, '')
    .replace(/^-+\s?/gm, '')
    .trim();
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildEditorSpans(body: string) {
  return JSON.stringify({
    boldCount: (body.match(/\*\*/g) ?? []).length / 2,
    italicCount: (body.match(/(^|[^*])\*([^*]|$)/g) ?? []).length,
    underlineCount: (body.match(/<u>/g) ?? []).length,
    blockquoteCount: (body.match(/^>\s?/gm) ?? []).length,
    bulletCount: (body.match(/^-+\s?/gm) ?? []).length,
    numberedCount: (body.match(/^\d+\.\s?/gm) ?? []).length,
  });
}

export function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match.replace(/\n$/, '')}</ul>`);
  html = html.replace(/^(?!<[houbl]).*$/gm, (match) => {
    const trimmed = match.trim();
    return trimmed ? `<p>${trimmed}</p>` : '<p></p>';
  });
  return html.replace(/\n{2,}/g, '').trim();
}
