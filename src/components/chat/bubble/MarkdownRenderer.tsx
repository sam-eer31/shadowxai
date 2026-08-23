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
  artifactVersions?: Record<string, number>;
  branchArtifacts?: Record<string, import('@/lib/types').BranchArtifactState>;
}

const markdownComponents: any = {
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
  a(props: ComponentPropsWithoutRef<'a'>) {
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
      />
    );
  },
  table(props: ComponentPropsWithoutRef<'table'>) {
    return (
      <div className="table-wrapper">
        <table {...props} />
      </div>
    );
  },
  pre(props: ComponentPropsWithoutRef<'pre'>) {
    return <>{props.children}</>;
  },
  p(props: ComponentPropsWithoutRef<'p'>) {
    const { node, className, ...rest } = props as any;
    return <div className={`mb-4 last:mb-0 ${className || ''}`} {...rest} />;
  },
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

type ChatBlock =
  | { type: 'markdown'; content: string }
  | { type: 'artifact'; id: string; filename?: string; language?: string; extension?: string; content: string; isOpen: boolean }
  | { type: 'artifact-ref'; id: string };

function parseChatBlocks(text: string): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  
  // Regex to match Markdown-Native artifacts
  // Matches: ### File: `filename.ext`\n```language\ncontent\n```
  const regex = /(?:^|\n)### File:\s*`?([^`\n]+)`?\s*\n\s*```(\w*)\n([\s\S]*?)(?:```|$)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'markdown', content: text.slice(lastIndex, match.index) });
    }
    
    const filename = match[1].trim();
    const language = match[2].trim() || 'text';
    let cleanContent = match[3];
    
    // Determine extension from filename
    const extension = filename.includes('.') ? filename.split('.').pop()! : 'txt';
    // ID is implicitly generated from filename, but in UI we just pass the originalId 
    // and ArtifactBlock handles prefixing conversationId.
    const id = filename.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Check if the stream hasn't closed the backticks yet
    const isClosed = text.substring(match.index + match[0].length).startsWith('```') || match[0].endsWith('```');
    
    if (cleanContent.endsWith('\n')) {
      cleanContent = cleanContent.slice(0, -1);
    }
    
    blocks.push({
      type: 'artifact',
      id,
      filename,
      language,
      extension,
      content: cleanContent,
      isOpen: !isClosed
    });
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    blocks.push({ type: 'markdown', content: text.slice(lastIndex) });
  }
  
  return blocks;
}

function preprocessMarkdown(content: string) {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
}

export function MarkdownRenderer({ content, artifactVersions, branchArtifacts }: MarkdownRendererProps) {
  const blocks = parseChatBlocks(content);

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'markdown') {
          // If the markdown block is completely empty or just spaces, we can skip rendering it
          if (!block.content.trim()) return null;
          
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={markdownComponents}
            >
              {preprocessMarkdown(block.content)}
            </ReactMarkdown>
          );
        }
        
        if (block.type === 'artifact') {
          return (
            <ArtifactBlock 
              key={i} 
              id={block.id} 
              filename={block.filename} 
              language={block.language}
              extension={block.extension}
              streamingContent={block.content}
              artifactVersions={artifactVersions}
              branchArtifacts={branchArtifacts}
            />
          );
        }
        
        if (block.type === 'artifact-ref') {
          return <ArtifactBlock key={i} id={block.id} isRef={true} artifactVersions={artifactVersions} branchArtifacts={branchArtifacts} />;
        }
        
        return null;
      })}
    </>
  );
}
