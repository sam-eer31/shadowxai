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
    <div className="mb-5 sm:mb-6 animate-fade-in">
      <div className="flex gap-2.5 sm:gap-3.5">
        {/* Avatar */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          <Bot size={15} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Active tool calls */}
          {toolCalls.length > 0 && (
            <div className="flex flex-col gap-2.5 mb-2">
              <div className="flex flex-wrap gap-1.5">
                {toolCalls.map((tc, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs"
                    style={{
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                    <span className="font-medium">
                      {tc.name === 'web_search'
                        ? 'Searching web...'
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
              {toolCalls
                .filter((tc) => tc.name === 'image_generation')
                .map((tc, i) => (
                  <div key={`skeleton-${i}`} className="animate-fade-in w-full max-w-[260px] sm:max-w-sm">
                    <div
                      className="rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 animate-pulse border aspect-square w-full shadow-xs"
                      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                    >
                      <ImageIcon size={28} style={{ color: 'var(--text-tertiary)' }} className="opacity-50" />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
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
              className="mb-2.5 rounded-xl overflow-hidden border shadow-2xs"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors"
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
                  className="px-3.5 py-2.5 text-xs sm:text-sm border-t"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {thought}
                    {!content && <span className="streaming-cursor ml-1" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Streaming text */}
          {content ? (
            <div className="text-sm leading-relaxed markdown-body w-full" style={{ color: 'var(--text-primary)' }}>
              <MarkdownRenderer content={content} />
              <span className="streaming-cursor" />
            </div>
          ) : !thought && toolCalls.length === 0 ? (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'var(--accent)',
                      animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Generating response...
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
