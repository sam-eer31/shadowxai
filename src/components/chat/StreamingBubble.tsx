'use client';

import { Bot, ChevronDown, ChevronRight, Brain, Image as ImageIcon } from 'lucide-react';
import type { ToolCall } from '@/lib/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useState } from 'react';

interface StreamingBubbleProps {
  content: string;
  thought?: string;
  thoughtTimeMs?: number;
  toolCalls: ToolCall[];
}

export function StreamingBubble({ content, thought, thoughtTimeMs, toolCalls }: StreamingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          <Bot size={14} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Active tool calls */}
          {toolCalls.length > 0 && (
            <div className="flex flex-col gap-3 mb-2">
              <div className="flex flex-wrap gap-2">
                {toolCalls.map((tc, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                    <span className="font-medium">
                      {tc.name === 'web_search'
                        ? 'Searching the web...'
                        : tc.name === 'calculator'
                          ? 'Calculating...'
                          : tc.name === 'weather'
                            ? 'Getting weather...'
                            : tc.name === 'image_generation'
                              ? 'Generating image...'
                              : `Using ${tc.name}...`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Skeleton loaders for pending images */}
              {toolCalls.filter(tc => tc.name === 'image_generation').map((tc, i) => (
                <div key={`skeleton-${i}`} className="animate-fade-in w-full max-w-sm">
                  <div 
                    className="rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 animate-pulse border aspect-square w-[300px] h-[300px] shadow-sm"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                  >
                    <ImageIcon size={32} style={{ color: 'var(--text-tertiary)' }} className="opacity-50" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Generating image...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Streaming thought */}
          {thought && (
            <div
              className="mb-3 rounded-xl overflow-hidden border"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <Brain size={14} className={!content ? 'animate-pulse' : ''} style={{ color: 'var(--accent)' }} />
                  <span>
                    Thinking... {thoughtTimeMs ? `(${(thoughtTimeMs / 1000).toFixed(1)}s)` : ''}
                  </span>
                </div>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {isExpanded && (
                <div 
                  className="px-4 py-3 text-sm border-t"
                  style={{ 
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-tertiary)'
                  }}
                >
                  <div className="whitespace-pre-wrap">{thought}
                    {!content && <span className="streaming-cursor ml-1" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Streaming text */}
          {content ? (
            <div className="text-sm leading-relaxed markdown-body" style={{ color: 'var(--text-primary)' }}>
              <MarkdownRenderer content={content} />
              <span className="streaming-cursor" />
            </div>
          ) : !thought && toolCalls.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Thinking...
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
