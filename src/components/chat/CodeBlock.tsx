'use client';

import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

export function CodeBlock({ language, children, ...rest }: CodeBlockProps & Record<string, unknown>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Extract text from children
    const el = document.createElement('div');
    if (typeof children === 'string') {
      el.textContent = children;
    } else {
      // For react elements, we need to get text content
      el.textContent = extractText(children);
    }
    await navigator.clipboard.writeText(el.textContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-2" style={{ background: 'var(--bg-tertiary)' }}>
      {/* Language label + Copy button */}
      <div
        className="flex items-center justify-between px-4 py-1.5 text-xs"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span className="font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code content */}
      <pre className="!m-0 !rounded-none">
        <code className={`language-${language}`} {...rest}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}
