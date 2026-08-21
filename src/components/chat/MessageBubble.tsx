'use client';

import Image from 'next/image';

import { Copy, RefreshCw, User, Bot, ChevronLeft, ChevronRight, Image as ImageIcon, Check, Edit2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MarkdownRenderer } from './bubble/MarkdownRenderer';
import { ThinkingBlock } from './bubble/ThinkingBlock';
import { ToolBlock } from './bubble/ToolBlock';
import { GeneratedImageBlock } from './bubble/GeneratedImageBlock';
import { useChatStore } from '@/stores/chat-store';
import { useState } from 'react';


interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  activeMessages?: Message[];
  isGenerating?: boolean;
  isLatestAssistantMessage?: boolean;
}

export function MessageBubble({ message, allMessages, activeMessages, isGenerating, isLatestAssistantMessage }: MessageBubbleProps) {
  const regenerateMessage = useChatStore((s) => s.regenerateMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const switchToBranch = useChatStore((s) => s.switchToBranch);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  const textContent = message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  const [editValue, setEditValue] = useState(textContent);

  const normalizedParentId = message.parentId || 'root';
  const siblings = allMessages?.filter(m => (m.parentId || 'root') === normalizedParentId) || [];
  siblings.sort((a, b) => a.createdAt - b.createdAt);
  const siblingIndex = siblings.findIndex(m => m.id === message.id);
  const totalSiblings = siblings.length;

  const toolCalls = message.content.filter((c) => c.type === 'tool_call');
  const images = message.content.filter((c) => c.type === 'image');
  const generatedImages = message.content.filter((c) => c.type === 'generated_image');
  const thoughts = message.content.filter((c) => c.type === 'thought');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if this message is part of a tool chain that continues
  const activeMsgIndex = activeMessages?.findIndex(m => m.id === message.id) ?? -1;
  let isContinued = false;
  let isContinuation = false;

  if (activeMessages && activeMsgIndex !== -1 && !isUser && !isTool) {
    let hasSubsequentUserMessage = false;

    // Check forward on the active branch for next assistant message
    for (let i = activeMsgIndex + 1; i < activeMessages.length; i++) {
      if (activeMessages[i].role === 'user') {
        hasSubsequentUserMessage = true;
        break;
      }
      if (activeMessages[i].role === 'assistant') {
        isContinued = true;
        break;
      }
    }
    
    // If generating at the end of the conversation
    if (!isContinued && !hasSubsequentUserMessage && isGenerating && isLatestAssistantMessage) {
      isContinued = true;
    }
    
    // Check backward on the active branch for previous assistant message
    for (let i = activeMsgIndex - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') break;
      if (activeMessages[i].role === 'assistant') {
        isContinuation = true;
        break;
      }
    }
  }

  // Find the root of this AI turn (the first assistant message after the user message)
  let turnRoot = message;
  if (!isUser && activeMessages && activeMsgIndex !== -1) {
    for (let i = activeMsgIndex; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        if (i + 1 <= activeMsgIndex) {
          turnRoot = activeMessages[i + 1];
        }
        break;
      }
      if (i === 0) {
        turnRoot = activeMessages[0];
      }
    }
  }

  // Calculate siblings for the turn root (so we navigate the whole turn together)
  const turnRootParentId = turnRoot.parentId || 'root';
  const turnSiblings = allMessages?.filter(m => (m.parentId || 'root') === turnRootParentId) || [];
  turnSiblings.sort((a, b) => a.createdAt - b.createdAt);
  const turnSiblingIndex = turnSiblings.findIndex(m => m.id === turnRoot.id);
  const totalTurnSiblings = turnSiblings.length;

  // Tool result message
  if (isTool) {
    if (generatedImages.length === 0) {
      return null;
    }
    return (
      <div className="mb-4 animate-fade-in">
        {generatedImages.map((img, i) => (
          <GeneratedImageBlock key={i} img={img} />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`
        ${isUser ? 'mb-5 sm:mb-6 animate-fade-in flex justify-end' : ''}
        ${!isUser ? (isContinued ? 'mb-0' : 'mb-5 sm:mb-6') : ''}
        ${isContinuation ? 'mt-2.5' : ''}
      `}
    >
      <div className={`flex gap-2.5 sm:gap-3.5 group ${isUser ? 'flex-row-reverse max-w-[92%] sm:max-w-[85%]' : 'max-w-full'}`}>
        {/* Content */}
        <div className={`min-w-0 flex-1 flex flex-col gap-2.5 ${isUser ? 'text-right items-end' : ''}`}>
          {/* Image attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex gap-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
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
            <div className={`flex gap-2 flex-wrap ${isUser ? 'justify-end' : ''}`}>
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

          {/* Thought content */}
          {!isUser && thoughts.length > 0 && (
            <div className="flex flex-col gap-1 max-w-full sm:max-w-[90%]">
              {thoughts.map((t, i) => (
                <ThinkingBlock key={i} thought={t.thought || ''} timeMs={t.thoughtTimeMs} />
              ))}
            </div>
          )}



          {/* Text content */}
          {textContent && (
            <div className={`w-full flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full min-w-[250px] sm:min-w-[400px]">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-xl border text-sm resize-y focus:outline-none focus:ring-2"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setIsEditing(false); setEditValue(textContent); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        editMessage(message.id, editValue);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Save & Submit
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`
                    inline-block text-sm leading-relaxed
                    ${
                      isUser
                        ? 'px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-tr-xs sm:rounded-tr-xs shadow-xs text-left whitespace-pre-wrap break-words'
                        : 'markdown-body w-full'
                    }
                  `}
                  style={
                    isUser
                      ? {
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }
                      : { color: 'var(--text-primary)' }
                  }
                >
                  {isUser ? (
                    textContent
                  ) : (
                    <MarkdownRenderer content={textContent} />
                  )}
                </div>
              )}
              
              {/* Actions for user messages */}
              {isUser && !isEditing && (
                <div className="flex items-center justify-end w-full gap-2 mt-1 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                    style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
                    aria-label="Copy message"
                    title="Copy message"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Edit message"
                  >
                    <Edit2 size={14} />
                  </button>
                  
                  {totalSiblings > 1 && (
                    <div className="flex items-center gap-1 text-xs font-medium transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                      <button
                        onClick={() => switchToBranch(siblings[siblingIndex - 1].id)}
                        disabled={siblingIndex === 0}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="mx-0.5">{siblingIndex + 1} / {totalSiblings}</span>
                      <button
                        onClick={() => switchToBranch(siblings[siblingIndex + 1].id)}
                        disabled={siblingIndex === totalSiblings - 1}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <ToolBlock toolCalls={toolCalls} allMessages={allMessages} />
            </div>
          )}

          {/* Actions for assistant messages */}
          {!isUser && !isContinued && (
            <div className="flex items-center gap-1 mt-2 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              {totalTurnSiblings > 1 && (
                <div className="flex items-center gap-1 text-xs font-medium transition-opacity mr-2" style={{ color: 'var(--text-secondary)' }}>
                  <button
                    onClick={() => switchToBranch(turnSiblings[turnSiblingIndex - 1].id)}
                    disabled={turnSiblingIndex === 0}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="mx-0.5">{turnSiblingIndex + 1} / {totalTurnSiblings}</span>
                  <button
                    onClick={() => switchToBranch(turnSiblings[turnSiblingIndex + 1].id)}
                    disabled={turnSiblingIndex === totalTurnSiblings - 1}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCopy}
                disabled={!textContent}
                className={`flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 ${!textContent ? 'opacity-30 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
                aria-label="Copy response"
                title="Copy response"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => regenerateMessage(message.id)}
                className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Regenerate response"
                title="Regenerate response"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {/* Skeleton loaders for pending images (moved outside tool block) */}
          {toolCalls.some(tc => tc.toolCall?.name === 'image_generation') && (
            <div className="flex flex-col gap-3 mt-1">
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
        </div>
      </div>
    </div>
  );
}
