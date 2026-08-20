// @ts-nocheck
'use client';

import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

// Patch Python grammar for exact VS Code matching
if (Prism.languages.python) {
  // 1. Support function calls
  if (!Prism.languages.python['function-call']) {
    Prism.languages.insertBefore('python', 'punctuation', {
      'function-call': {
        pattern: /[a-zA-Z_]\w*(?=\s*\()/g,
        alias: 'function'
      }
    });
  }

  // 2. Remove 'print' from keywords
  if (Prism.languages.python.keyword) {
    const keywordRegex = Prism.languages.python.keyword.pattern || Prism.languages.python.keyword;
    if (keywordRegex && keywordRegex.source.includes('print|')) {
      const newRegex = new RegExp(keywordRegex.source.replace('print|', ''));
      if (Prism.languages.python.keyword.pattern) {
        Prism.languages.python.keyword.pattern = newRegex;
      } else {
        Prism.languages.python.keyword = newRegex;
      }
    }
  }

  // 3. Add 'print' to builtins BEFORE function-calls so it stays Cyan
  if (Prism.languages.python.builtin) {
    const builtinRegex = Prism.languages.python.builtin.pattern || Prism.languages.python.builtin;
    if (builtinRegex && !builtinRegex.source.includes('print|')) {
      const newRegex = new RegExp(builtinRegex.source.replace('abs|', 'print|abs|'));
      if (Prism.languages.python.builtin.pattern) {
        Prism.languages.python.builtin.pattern = newRegex;
      } else {
        Prism.languages.python.builtin = newRegex;
      }
    }
  }

  // 4. Allow full Python parsing inside f-string interpolations
  if (Prism.languages.python['string-interpolation']) {
    const interpolation = Prism.languages.python['string-interpolation'].inside?.interpolation;
    if (interpolation && interpolation.inside) {
      interpolation.inside.rest = Prism.languages.python;
    }
  }
  
  // 5. Catch-all variables at the end
  if (!Prism.languages.python.variable) {
    Prism.languages.python.variable = /\b[a-zA-Z_]\w*\b/;
  }
}

export function CodeBlock({ language, children, ...rest }: CodeBlockProps & Record<string, unknown>) {
  const [copied, setCopied] = useState(false);
  const textContent = extractText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight using Prism
  let highlightedHtml = textContent;
  if (language && Prism.languages[language]) {
    try {
      highlightedHtml = Prism.highlight(textContent, Prism.languages[language], language);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="relative group rounded-xl overflow-hidden my-3 border max-w-full shadow-xs" style={{ background: 'var(--bg-codeblock)', borderColor: 'var(--border)' }}>
      {/* Language label + Copy button */}
      <div
        className="flex items-center justify-between px-3.5 py-1.5 text-xs select-none"
        style={{
          background: 'transparent',
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
        <code 
          className={`language-${language}`} 
          {...rest}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || textContent }}
        />
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
