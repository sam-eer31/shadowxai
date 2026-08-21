import React, { useState, useEffect } from 'react';
import { 
  FileCode, Check, Copy, ChevronDown, ChevronRight, Terminal,
  FileJson, FileText, Globe, Database, Image as ImageIcon,
  Brackets, Hash, Settings, Coffee, Box, Download
} from 'lucide-react';
import {
  SiPython, SiJavascript, SiTypescript, SiHtml5, SiCss, SiReact,
  SiGnubash, SiJson, SiMarkdown, SiRust, SiGo, SiCplusplus,
  SiC, SiPhp, SiRuby, SiSwift, SiKotlin,
  SiDart, SiDocker, SiYaml, SiDotnet
} from 'react-icons/si';
import { FaJava } from 'react-icons/fa6';
import { useArtifactStore } from '@/stores/artifact-store';
import { getArtifact } from '@/lib/storage/db';

interface ArtifactBlockProps {
  id: string;
  children?: React.ReactNode;
}

export function ArtifactBlock({ id, children }: ArtifactBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dbArtifact, setDbArtifact] = useState<{ filename: string; extension: string } | null>(null);
  
  // Use Zustand store without subscribing directly in a way that throws if used outside provider,
  // since this is a global store.
  const artifact = useArtifactStore((s) => s.artifacts[id]);
  
  useEffect(() => {
    if (!artifact) {
      getArtifact(id).then((data) => {
        if (data) {
          setDbArtifact(data);
          useArtifactStore.getState().addArtifact(id, data.filename, data.extension, data.language);
        }
      }).catch(console.error);
    }
  }, [id, artifact]);

  const handleCopy = async () => {
    // Extract text content from children for copying if needed, or just standard window selection.
    // For now we'll do a simple copy of text inside the block by accessing DOM if we have a ref,
    // or just let the user copy standard code blocks inside.
    // Since code blocks have their own copy buttons, this global artifact copy is optional.
    
    // Fallback: copy entire artifact text
    const textToCopy = extractTextFromChildren(children);
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filename = artifact?.filename || dbArtifact?.filename || 'Untitled Artifact';
  const extension = artifact?.extension || dbArtifact?.extension || 'txt';
  const downloadFilename = filename.includes('.') ? filename : `${filename}.${extension}`;

  const handleDownload = () => {
    const textToDownload = extractTextFromChildren(children);
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 rounded-xl border shadow-sm overflow-hidden bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)]" style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {getArtifactIcon(extension)}
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Download artifact"
          >
            <Download size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Copy artifact contents"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          {isExpanded ? (
            <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div className="artifact-content overflow-x-auto text-sm" style={{ color: 'var(--text-primary)' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            .artifact-content > pre,
            .artifact-content > div > pre {
              margin: 0 !important;
            }
            .artifact-content .code-block-container {
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .artifact-content .code-block-header {
              display: none !important;
            }
          `}} />
          {children}
        </div>
      )}
    </div>
  );
}

// Helper to extract plain text from React nodes for copying
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return children.toString();
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement(children)) {
    return extractTextFromChildren((children.props as any).children);
  }
  return '';
}

function getArtifactIcon(extension: string) {
  const ext = extension.toLowerCase();
  
  if (['py', 'python'].includes(ext)) return <SiPython size={16} className="text-[#3776AB] shrink-0" />;
  if (['js', 'cjs', 'mjs'].includes(ext)) return <SiJavascript size={16} className="text-[#F7DF1E] shrink-0" />;
  if (['ts'].includes(ext)) return <SiTypescript size={16} className="text-[#3178C6] shrink-0" />;
  if (['jsx', 'tsx'].includes(ext)) return <SiReact size={16} className="text-[#61DAFB] shrink-0" />;
  if (['html', 'htm'].includes(ext)) return <SiHtml5 size={16} className="text-[#E34F26] shrink-0" />;
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return <SiCss size={16} className="text-[#1572B6] shrink-0" />;
  if (['sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1'].includes(ext)) return <SiGnubash size={16} className="text-[#4EAA25] shrink-0" />;
  if (['json'].includes(ext)) return <SiJson size={16} className="text-[#000000] dark:text-[#FFFFFF] shrink-0" />;
  if (['md', 'mdx'].includes(ext)) return <SiMarkdown size={16} className="text-[#000000] dark:text-[#FFFFFF] shrink-0" />;
  if (['rs', 'rust'].includes(ext)) return <SiRust size={16} className="text-[#000000] dark:text-[#FFFFFF] shrink-0" />;
  if (['go'].includes(ext)) return <SiGo size={16} className="text-[#00ADD8] shrink-0" />;
  if (['cpp', 'cxx', 'cc'].includes(ext)) return <SiCplusplus size={16} className="text-[#00599C] shrink-0" />;
  if (['cs', 'csharp'].includes(ext)) return <SiDotnet size={16} className="text-[#512BD4] shrink-0" />;
  if (['c'].includes(ext)) return <SiC size={16} className="text-[#A8B9CC] shrink-0" />;
  if (['php'].includes(ext)) return <SiPhp size={16} className="text-[#777BB4] shrink-0" />;
  if (['rb', 'ruby'].includes(ext)) return <SiRuby size={16} className="text-[#CC342D] shrink-0" />;
  if (['java', 'jar'].includes(ext)) return <FaJava size={16} className="text-[#5382A1] shrink-0" />;
  if (['swift'].includes(ext)) return <SiSwift size={16} className="text-[#F05138] shrink-0" />;
  if (['kt', 'kts'].includes(ext)) return <SiKotlin size={16} className="text-[#7F52FF] shrink-0" />;
  if (['dart'].includes(ext)) return <SiDart size={16} className="text-[#0175C2] shrink-0" />;
  if (['yaml', 'yml'].includes(ext)) return <SiYaml size={16} className="text-[#CB171E] shrink-0" />;
  if (['dockerfile', 'dockerignore'].includes(ext) || ext === 'docker') return <SiDocker size={16} className="text-[#2496ED] shrink-0" />;
  
  if (['csv', 'txt'].includes(ext)) {
    return <FileText size={16} className="text-gray-400 shrink-0" />;
  }
  if (['sql', 'sqlite', 'db'].includes(ext)) {
    return <Database size={16} className="text-blue-500 shrink-0" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon size={16} className="text-emerald-400 shrink-0" />;
  }
  if (['env', 'ini', 'cfg', 'config'].includes(ext)) {
    return <Settings size={16} className="text-slate-400 shrink-0" />;
  }
  
  return <FileCode size={16} className="text-blue-400 shrink-0" />;
}
