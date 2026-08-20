'use client';

import Image from 'next/image';

import { Bot, ChevronDown, ChevronRight, Brain, Lightbulb, Image as ImageIcon, Wrench, Loader2 } from 'lucide-react';
import type { ToolCall } from '@/lib/types';
import { MarkdownRenderer } from './bubble/MarkdownRenderer';
import { useState } from 'react';

interface StreamingBubbleProps {
  content: string;
  thought?: string;
  thoughtTimeMs?: number;
  toolCalls: ToolCall[];
  isContinuation?: boolean;
}

export function StreamingBubble({ content, thought, thoughtTimeMs, toolCalls, isContinuation }: StreamingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  return (
    <div className={`mb-5 sm:mb-6 animate-fade-in ${isContinuation ? 'mt-2.5' : ''}`}>
      <div className="flex gap-2.5 sm:gap-3.5">
        <div className="min-w-0 flex-1 flex flex-col gap-2.5">
          {/* Streaming thought */}
          {thought && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={14} className={!content ? 'animate-pulse' : ''} />
                  <span>
                    {content ? 'Reasoned' : 'Reasoning...'} {thoughtTimeMs ? `for ${(thoughtTimeMs / 1000).toFixed(1)}s` : ''}
                  </span>
                </div>
                {isExpanded ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />}
              </button>

              {isExpanded && (
                <div
                  className="mt-2.5 ml-[6px] pl-3.5 border-l-2 text-xs sm:text-sm"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div className="whitespace-pre-wrap leading-relaxed opacity-80">
                    {thought}{!content && ' ▏'}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Streaming text */}
          {content ? (
            <div className="text-sm leading-relaxed markdown-body w-full" style={{ color: 'var(--text-primary)' }}>
              <MarkdownRenderer content={content + ' ▏'} />
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

          {/* Active tool calls */}
          {toolCalls.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Wrench size={14} />
                  <span>Using {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''}</span>
                </div>
                {isToolsExpanded ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />}
              </button>

              {isToolsExpanded && (
                <div className="mt-3 ml-1 relative flex flex-col gap-0">
                  {/* Vertical connecting line */}
                  {toolCalls.length > 1 && (
                    <div 
                      className="absolute left-[11px] top-[18px] bottom-[18px] w-[2px] rounded-full z-0" 
                      style={{ background: 'var(--border)' }} 
                    />
                  )}
                  
                  {toolCalls.map((tc, i) => (
                    <div key={i} className="flex items-center gap-3 relative z-10 py-1.5">
                      <div 
                        className="w-6 h-6 flex items-center justify-center rounded-full"
                        style={{ background: 'var(--bg-primary)' }}
                      >
                        <div 
                          className="w-5 h-5 flex items-center justify-center rounded-full"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                        >
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                      </div>
                      
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
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
              )}
            </div>
          )}

          {/* Skeleton loaders for pending images */}
          {toolCalls
            .filter((tc) => tc.name === 'image_generation')
            .map((tc, i) => (
              <div key={`skeleton-${i}`} className="animate-fade-in w-full max-w-[260px] sm:max-w-sm mt-1">
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
      </div>
    </div>
  );
}
