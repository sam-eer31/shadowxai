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
    <div className="relative group rounded-xl overflow-hidden my-3 border max-w-full shadow-xs" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
      {/* Language label + Copy button */}
      <div
        className="flex items-center justify-between px-3.5 py-1.5 text-xs select-none"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 text-xs font-medium"
          style={{ color: copied ? 'var(--success)' : 'var(--text-secondary)' }}
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {/* Code content */}
      <pre className="!m-0 !rounded-none overflow-x-auto p-3.5 text-xs sm:text-sm leading-relaxed scrollbar-thin">
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
