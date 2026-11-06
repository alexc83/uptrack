/**
 * Minimal Markdown parser for the approved Help Center articles.
 * Supports the constructs the articles use: headings, paragraphs, bullet/numbered lists, bold, italic,
 * inline code and links. Unsupported syntax degrades to plain paragraph text; HTML is never interpreted.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'heading'; level: number; id: string; text: string; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] };

export function slugifyHeading(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

const inlinePattern = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let rest = source;
  while (rest) {
    const match = inlinePattern.exec(rest);
    if (!match) { out.push({ type: 'text', text: rest }); break; }
    if (match.index > 0) out.push({ type: 'text', text: rest.slice(0, match.index) });
    if (match[1] !== undefined) out.push({ type: 'strong', children: parseInline(match[1]) });
    else if (match[2] !== undefined) out.push({ type: 'em', children: parseInline(match[2]) });
    else if (match[3] !== undefined) out.push({ type: 'code', text: match[3] });
    else out.push({ type: 'link', href: match[5] ?? '', children: parseInline(match[4] ?? '') });
    rest = rest.slice(match.index + match[0].length);
  }
  return out;
}

export function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.type === 'text' || n.type === 'code' ? n.text : inlineText(n.children))).join('');
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) }); paragraph = []; };
  const flushList = () => { if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) }); list = null; };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    if (heading) {
      flushParagraph(); flushList();
      const children = parseInline(heading[2] ?? '');
      const text = inlineText(children);
      const base = slugifyHeading(text);
      const count = used.get(base) ?? 0;
      used.set(base, count + 1);
      blocks.push({ type: 'heading', level: (heading[1] ?? '#').length, id: count ? `${base}-${count + 1}` : base, text, children });
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(((bullet ?? numbered)?.[1] ?? '').trim());
    } else if (list && /^\s+\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph(); flushList();
  return blocks;
}
