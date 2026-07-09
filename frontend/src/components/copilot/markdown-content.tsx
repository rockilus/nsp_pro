'use client';

import ReactMarkdown from 'react-markdown';

/**
 * Locked-down markdown renderer for assistant responses.
 *
 * - No `rehype-raw`, so raw HTML in model output is never parsed (XSS-safe).
 * - An explicit `allowedElements` allowlist keeps the surface minimal.
 * - All styling maps to design tokens for light/dark parity.
 *
 * Loaded via `next/dynamic` (see `markdown.tsx`) to keep it off the main
 * dashboard bundle.
 */
export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      <ReactMarkdown
        allowedElements={[
          'p',
          'br',
          'strong',
          'em',
          'del',
          'ul',
          'ol',
          'li',
          'code',
          'pre',
          'a',
          'blockquote',
          'h1',
          'h2',
          'h3',
          'h4',
        ]}
        unwrapDisallowed
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md bg-muted-foreground/10 p-2 font-mono text-xs">
              {children}
            </pre>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h4: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
