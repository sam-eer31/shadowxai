'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from './CodeBlock';
import { ArtifactBlock } from './ArtifactBlock';
import { useUIStore } from '@/stores/ui-store';
import { Settings } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

interface MarkdownRendererProps {
  content: string;
}

const markdownComponents: any = {
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
  // Artifact blocks
  artifact(props: any) {
    return <ArtifactBlock id={props.id} {...props}>{props.children}</ArtifactBlock>;
  },
  // Custom settings button
  'settings-btn'(props: any) {
    const { tab, section } = props;
    
    const handleClick = () => {
      const targetTab = tab === 'api-keys' ? 'providers' : (tab || 'providers');
      useUIStore.getState().openSettings(targetTab);
    };
    
    return (
      <button 
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        <Settings size={14} style={{ color: 'var(--accent)' }} />
        <span>Go to Settings</span>
      </button>
    );
  }
};

const preprocessLaTeX = (content: string) => {
  // Replace block math: \[ ... \] -> $$ ... $$
  // Replace inline math: \( ... \) -> $ ... $
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processedContent = preprocessLaTeX(content);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={markdownComponents}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
