// @ts-nocheck
'use client';

import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  children: ReactNode;
}

import Prism from 'prismjs';
// Base & Web
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

// Systems & Compiled Languages
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-scala';

// Scripting & Data
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-lua';

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  python: 'python',
  python3: 'python',
  c: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  csharp: 'csharp',
  dotnet: 'csharp',
  java: 'java',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  ps: 'powershell',
  ps1: 'powershell',
  powershell: 'powershell',
  sql: 'sql',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  docker: 'docker',
  dockerfile: 'docker',
  rb: 'ruby',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  kotlin: 'kotlin',
  dart: 'dart',
  r: 'r',
  scala: 'scala',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  diff: 'diff',
  patch: 'diff',
  lua: 'lua',
};

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

  const rawLang = (language || '').toLowerCase().trim();
  const normalizedLang = LANGUAGE_ALIASES[rawLang] || rawLang;

  // Highlight using Prism
  let highlightedHtml = textContent;
  if (normalizedLang && Prism.languages[normalizedLang]) {
    try {
      highlightedHtml = Prism.highlight(textContent, Prism.languages[normalizedLang], normalizedLang);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="code-block-container relative group rounded-xl overflow-hidden my-3 border max-w-full shadow-xs" style={{ background: 'var(--bg-codeblock)', borderColor: 'var(--border)' }}>
      {/* Language label + Copy button */}
      <div
        className="code-block-header flex items-center justify-between px-3.5 py-1.5 text-xs select-none"
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
