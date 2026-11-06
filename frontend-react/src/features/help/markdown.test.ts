import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('parses headings with unique ids, paragraphs and both list types', () => {
    const blocks = parseMarkdown('# T\n\nIntro line\ncontinues.\n\n## A b\n\n- one\n- **two**\n\n1. first\n2. second\n\n## A b\n');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'heading', 'list', 'list', 'heading']);
    expect(blocks.filter((b) => b.type === 'heading').map((b) => b.type === 'heading' && b.id)).toEqual(['t', 'a-b', 'a-b-2']);
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [{ type: 'text', text: 'Intro line continues.' }] });
    expect(blocks[3]).toMatchObject({ type: 'list', ordered: false });
    expect(blocks[4]).toMatchObject({ type: 'list', ordered: true });
  });

  it('parses emphasis, code and links, and never interprets HTML', () => {
    expect(parseInline('a **b** *c* `d` [e](/help)')).toEqual([
      { type: 'text', text: 'a ' }, { type: 'strong', children: [{ type: 'text', text: 'b' }] }, { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] }, { type: 'text', text: ' ' }, { type: 'code', text: 'd' }, { type: 'text', text: ' ' },
      { type: 'link', href: '/help', children: [{ type: 'text', text: 'e' }] },
    ]);
    expect(parseInline('<script>x</script>')).toEqual([{ type: 'text', text: '<script>x</script>' }]);
  });
});
