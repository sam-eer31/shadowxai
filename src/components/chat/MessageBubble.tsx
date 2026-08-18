'use client';

import { Copy, RefreshCw, User, Bot, ChevronDown, ChevronRight, Brain, Image as ImageIcon, Check } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useChatStore } from '@/stores/chat-store';
import { useState } from 'react';

interface ThinkingBlockProps {
  thought: string;
  timeMs?: number;
}

function ThinkingBlock({ thought, timeMs }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="mb-2.5 rounded-xl overflow-hidden border transition-colors shadow-2xs"
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
          <Brain size={14} style={{ color: 'var(--accent)' }} />
          <span>Thought Process {timeMs ? `(${(timeMs / 1000).toFixed(1)}s)` : ''}</span>
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
          <div className="whitespace-pre-wrap leading-relaxed">{thought}</div>
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
}

export function MessageBubble({ message, allMessages }: MessageBubbleProps) {
  const regenerate = useChatStore((s) => s.regenerateLastMessage);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  const textContent = message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const toolCalls = message.content.filter((c) => c.type === 'tool_call');
  const images = message.content.filter((c) => c.type === 'image');
  const generatedImages = message.content.filter((c) => c.type === 'generated_image');
  const thoughts = message.content.filter((c) => c.type === 'thought');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tool result message
  if (isTool) {
    if (generatedImages.length === 0) {
      return null;
    }
    return (
      <div className="mb-4 animate-fade-in">
        {generatedImages.map((img, i) => (
          <div key={i} className="mb-3">
            <div className="inline-block rounded-2xl overflow-hidden shadow-lg max-w-full sm:max-w-sm border" style={{ borderColor: 'var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.imagePrompt || 'Generated image'}
                className="w-full h-auto"
              />
              {img.imagePrompt && (
                <div
                  className="px-3.5 py-2 text-xs"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {img.imagePrompt}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`mb-5 sm:mb-6 ${isUser ? 'animate-fade-in flex justify-end' : ''}`}>
      <div className={`flex gap-2.5 sm:gap-3.5 ${isUser ? 'flex-row-reverse max-w-[92%] sm:max-w-[85%]' : 'max-w-full'}`}>
        {/* Avatar */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          {isUser ? <User size={14} className="text-white" /> : <Bot size={15} className="text-white" />}
        </div>

        {/* Content */}
        <div className={`min-w-0 flex-1 ${isUser ? 'text-right' : ''}`}>
          {/* Image attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex gap-2 mb-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
              {message.attachments.map((att) => (
                <div key={att.id} className="rounded-xl overflow-hidden shadow-sm max-w-[180px] sm:max-w-[220px] border" style={{ borderColor: 'var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt={att.name}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Inline images */}
          {images.length > 0 && (
            <div className={`flex gap-2 mb-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
              {images.map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden shadow-sm max-w-[180px] sm:max-w-[220px] border" style={{ borderColor: 'var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt="Attached image"
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="flex flex-col gap-2.5 mb-2">
              <div className="flex flex-wrap gap-1.5">
                {toolCalls.map((tc, i) => {
                  const toolCallId = tc.toolCall?.id;
                  let toolResultInfo = null;
                  if (allMessages && toolCallId) {
                    for (const m of allMessages) {
                      const resultContent = m.content.find((c) => c.type === 'tool_result' && c.toolResult?.toolCallId === toolCallId);
                      if (resultContent && resultContent.toolResult) {
                        toolResultInfo = resultContent.toolResult;
                        break;
                      }
                    }
                  }
                  const isCompleted = !!toolResultInfo;
                  const isError = toolResultInfo?.isError;

                  return (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-colors duration-300"
                      style={{
                        background: isCompleted ? 'var(--bg-tertiary)' : 'var(--accent-light)',
                        color: isCompleted ? (isError ? 'var(--error)' : 'var(--success)') : 'var(--accent)',
                      }}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${isCompleted ? '' : 'animate-pulse'}`}
                        style={{
                          background: isCompleted ? (isError ? 'var(--error)' : 'var(--success)') : 'var(--accent)',
                        }}
                      />
                      <span className="font-medium">
                        {!isCompleted
                          ? tc.toolCall?.name === 'web_search'
                            ? 'Searching web...'
                            : tc.toolCall?.name === 'calculator'
                              ? 'Calculating...'
                              : tc.toolCall?.name === 'weather'
                                ? 'Getting weather...'
                                : tc.toolCall?.name === 'image_generation'
                                  ? 'Generating image...'
                                  : `Using ${tc.toolCall?.name}...`
                          : tc.toolCall?.name}
                      </span>
                      {isCompleted && (
                        <span className="opacity-60">
                          {isError ? '· failed' : '· done'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Skeleton loaders for pending images */}
              {toolCalls.map((tc, i) => {
                const toolCallId = tc.toolCall?.id;
                let isCompleted = false;
                if (allMessages && toolCallId) {
                  for (const m of allMessages) {
                    if (m.content.some((c) => c.type === 'tool_result' && c.toolResult?.toolCallId === toolCallId)) {
                      isCompleted = true;
                      break;
                    }
                  }
                }

                if (tc.toolCall?.name === 'image_generation' && !isCompleted) {
                  return (
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
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Thought content */}
          {!isUser && thoughts.length > 0 && (
            <div className="flex flex-col gap-2 mb-2 max-w-full sm:max-w-[90%]">
              {thoughts.map((t, i) => (
                <ThinkingBlock key={i} thought={t.thought || ''} timeMs={t.thoughtTimeMs} />
              ))}
            </div>
          )}

          {/* Text content */}
          {textContent && (
            <div
              className={`
                inline-block text-sm leading-relaxed
                ${
                  isUser
                    ? 'px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-tr-xs sm:rounded-tr-xs shadow-xs'
                    : 'markdown-body w-full'
                }
              `}
              style={
                isUser
                  ? {
                      background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                      color: 'white',
                    }
                  : { color: 'var(--text-primary)' }
              }
            >
              {isUser ? (
                <span className="whitespace-pre-wrap">{textContent}</span>
              ) : (
                <MarkdownRenderer content={textContent} />
              )}
            </div>
          )}

          {/* Actions for assistant messages */}
          {!isUser && textContent && (
            <div className="flex items-center gap-1 mt-2 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
                aria-label="Copy response"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={regenerate}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Regenerate response"
              >
                <RefreshCw size={13} />
                <span>Regenerate</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
