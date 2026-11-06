import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Block, Inline } from './markdown';
import { safeHttpUrl } from '../../lib/safe-url';

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text': return <Fragment key={i}>{node.text}</Fragment>;
      case 'strong': return <strong key={i} className="font-semibold text-[var(--ut-landing-heading)]">{renderInline(node.children)}</strong>;
      case 'em': return <em key={i}>{renderInline(node.children)}</em>;
      case 'code': return <code key={i} className="rounded bg-[var(--ut-landing-surface-soft)] px-1.5 py-0.5 text-[0.9em]">{node.text}</code>;
      case 'link': {
        const cls = 'font-medium text-[var(--ut-landing-primary)] underline underline-offset-2';
        if (node.href.startsWith('/')) return <Link key={i} to={node.href} className={cls}>{renderInline(node.children)}</Link>;
        const external = safeHttpUrl(node.href);
        return external
          ? <a key={i} href={external} target="_blank" rel="noopener noreferrer" className={cls}>{renderInline(node.children)}</a>
          : <Fragment key={i}>{renderInline(node.children)}</Fragment>;
      }
    }
  });
}

const headingClass: Record<number, string> = {
  2: 'mb-3 mt-10 scroll-mt-24 text-[1.5rem] font-semibold leading-snug tracking-[-0.02em] text-[var(--ut-landing-heading)]',
  3: 'mb-2 mt-7 scroll-mt-24 text-[1.2rem] font-semibold leading-snug text-[var(--ut-landing-heading)]',
};

/** Renders parsed Markdown blocks. The article title (h1) is rendered by the page, so body headings start at h2. */
export function HelpMarkdown({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((block, i) => {
    if (block.type === 'heading') {
      const Tag = (`h${Math.min(Math.max(block.level, 2), 6)}`) as 'h2';
      return <Tag key={i} id={block.id} className={headingClass[block.level] ?? headingClass[3]}>{renderInline(block.children)}</Tag>;
    }
    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul';
      return <Tag key={i} className={`my-4 space-y-2 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-[var(--ut-landing-muted)]`}>
        {block.items.map((item, j) => <li key={j} className="pl-1">{renderInline(item)}</li>)}
      </Tag>;
    }
    return <p key={i} className="my-4">{renderInline(block.children)}</p>;
  })}</>;
}
