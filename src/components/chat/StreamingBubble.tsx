'use client';

import { Lightbulb, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import type { ToolCall } from '@/lib/types';
import { MarkdownRenderer } from './bubble/MarkdownRenderer';
import { ToolBlock } from './bubble/ToolBlock';
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

  return (
    <div className={`mb-5 sm:mb-6 animate-fade-in ${isContinuation ? 'mt-2.5' : ''}`}>
      <div className="flex gap-2.5 sm:gap-3.5">
        <div className="min-w-0 flex-1 flex flex-col gap-2.5">
          {/* 1. In-flight Streaming thought */}
          {thought && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={14} className={!content && toolCalls.length === 0 ? 'animate-pulse' : ''} />
                  <span>
                    {content || toolCalls.length > 0 ? 'Reasoned' : 'Reasoning...'} {thoughtTimeMs ? `for ${(thoughtTimeMs / 1000).toFixed(1)}s` : ''}
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
                    {thought}{!content && toolCalls.length === 0 && ' ▏'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. In-flight Streaming text */}
          {content ? (
            <div className="text-sm leading-relaxed markdown-body w-full" style={{ color: 'var(--text-primary)' }}>
              <MarkdownRenderer content={content + ' ▏'} />
            </div>
          ) : null}

          {/* 3. In-flight Active tool calls for this step (shown in chronological order below thought/text) */}
          {toolCalls.length > 0 && (
            <div>
              <ToolBlock toolCalls={toolCalls} isTurnActive={true} hasFinalText={false} />
            </div>
          )}
          {/* Initial generating indicator if nothing has arrived yet */}
          {!thought && toolCalls.length === 0 && !content ? (
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

          {/* 4. Skeleton loaders for pending images in this in-flight step */}
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
      </div>
    </div>
  );
}
