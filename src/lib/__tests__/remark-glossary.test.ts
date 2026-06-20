/**
 * remark-glossary Tests
 *
 * The plugin auto-detects glossary terms (from src/data/glossary.json) in blog
 * text and wraps the FIRST occurrence of each term per page in a
 * <span class="glossary-term" data-glossary-term="..."> emitted as an html node.
 */
import { describe, it, expect } from 'vitest';
import { remarkGlossary } from '../remark-glossary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AnyNode {
  type: string;
  value?: string;
  children?: AnyNode[];
}

/** Build a root tree containing a single paragraph of the given children. */
function paragraph(...children: AnyNode[]): AnyNode {
  return { type: 'root', children: [{ type: 'paragraph', children }] };
}

const text = (value: string): AnyNode => ({ type: 'text', value });

/** Run the plugin over a tree (mutates in place) and return it. */
function run(tree: AnyNode): AnyNode {
  remarkGlossary()(tree as any);
  return tree;
}

/** Collect all html nodes anywhere in the tree. */
function htmlNodes(tree: AnyNode): AnyNode[] {
  const out: AnyNode[] = [];
  const walk = (n: AnyNode) => {
    if (n.type === 'html') out.push(n);
    n.children?.forEach(walk);
  };
  walk(tree);
  return out;
}

/** Extract the data-glossary-term values from emitted html nodes, in order. */
function wrappedTerms(tree: AnyNode): string[] {
  return htmlNodes(tree)
    .map((n) => n.value?.match(/data-glossary-term="([^"]+)"/)?.[1])
    .filter((v): v is string => Boolean(v));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('remarkGlossary', () => {
  it('wraps a known term with its canonical data-glossary-term', () => {
    const tree = run(paragraph(text('He is likely an LJS card.')));
    const nodes = htmlNodes(tree);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toContain('class="glossary-term"');
    expect(nodes[0].value).toContain('data-glossary-term="LJS"');
    expect(nodes[0].value).toContain('>LJS</span>');
  });

  it('wraps only the first occurrence of a term per page', () => {
    const tree = run(paragraph(text('LJS now and an LJS later, plus more LJS.')));
    expect(wrappedTerms(tree)).toEqual(['LJS']);
  });

  it('treats separate text nodes as the same page for first-occurrence', () => {
    const tree = run(
      paragraph(text('First mochi here. '), text('Second mochi there.'))
    );
    expect(wrappedTerms(tree)).toEqual(['mochi']);
  });

  it('resolves an alias to its canonical key', () => {
    const tree = run(paragraph(text('The Limited Jewel Summon is strong.')));
    const nodes = htmlNodes(tree);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toContain('data-glossary-term="LJS"');
    expect(nodes[0].value).toContain('>Limited Jewel Summon</span>');
  });

  it('prefers the longest alias when terms overlap', () => {
    // "max limit break" (alias of MLB) contains "limit break" (its own entry).
    const tree = run(paragraph(text('Bring it to max limit break for the stats.')));
    const terms = wrappedTerms(tree);
    expect(terms).toContain('MLB');
    expect(terms).not.toContain('limit break');
    expect(htmlNodes(tree)[0].value).toContain('>max limit break</span>');
  });

  it('is case-insensitive but preserves the original casing', () => {
    const tree = run(paragraph(text('the ljs banner')));
    const nodes = htmlNodes(tree);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toContain('data-glossary-term="LJS"');
    expect(nodes[0].value).toContain('>ljs</span>');
  });

  it('does not match inside a link (card reference) node', () => {
    const link: AnyNode = { type: 'link', children: [text('LJS')] } as any;
    const tree = run(paragraph(link));
    expect(htmlNodes(tree)).toHaveLength(0);
  });

  it('does not match inside a heading', () => {
    const tree = run({
      type: 'root',
      children: [{ type: 'heading', children: [text('All about mochi')] }],
    });
    expect(htmlNodes(tree)).toHaveLength(0);
  });

  it('wraps multi-word terms added later (damage amp, stepping stone)', () => {
    const tree = run(paragraph(text('a 15% damage amp on a stepping stone card')));
    const terms = wrappedTerms(tree);
    expect(terms).toContain('damage amp');
    expect(terms).toContain('stepping stone');
  });

  it('resolves the DMG amp alias to damage amp', () => {
    const tree = run(paragraph(text('a chance-based DMG amp on attack')));
    const nodes = htmlNodes(tree);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toContain('data-glossary-term="damage amp"');
  });

  it('leaves unknown words untouched', () => {
    const tree = run(paragraph(text('just some ordinary prose here')));
    expect(htmlNodes(tree)).toHaveLength(0);
  });

  it('only matches whole words', () => {
    // "orb" is a term, but "absorbed" should not match.
    const tree = run(paragraph(text('the attack was absorbed completely')));
    expect(htmlNodes(tree)).toHaveLength(0);
  });
});
