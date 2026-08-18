'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';
import type { ComponentPropsWithoutRef } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Code blocks with copy button
        code(props: ComponentPropsWithoutRef<'code'>) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = className?.includes('hljs') || match;

          if (isBlock) {
            return (
              <CodeBlock
                language={match?.[1] || ''}
                {...rest}
              >
                {children}
              </CodeBlock>
            );
          }

          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
        // Open links in new tab
        a(props: ComponentPropsWithoutRef<'a'>) {
          return (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            />
          );
        },
        // Wrap table in scrollable container for mobile
        table(props: ComponentPropsWithoutRef<'table'>) {
          return (
            <div className="table-wrapper">
              <table {...props} />
            </div>
          );
        },
        // Wrap pre for code blocks
        pre(props: ComponentPropsWithoutRef<'pre'>) {
          return <>{props.children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
