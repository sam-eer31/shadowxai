'use client';

import React, { useState, useMemo } from 'react';

import Image from 'next/image';

import { Copy, RefreshCw, User, Bot, ChevronLeft, ChevronRight, Image as ImageIcon, Check, Edit2 } from 'lucide-react';
import type { Message } from '@/lib/types';
import { MarkdownRenderer } from './bubble/MarkdownRenderer';
import { ThinkingBlock } from './bubble/ThinkingBlock';
import { ToolBlock } from './bubble/ToolBlock';
import { GeneratedImageBlock } from './bubble/GeneratedImageBlock';
import { useChatStore } from '@/stores/chat-store';
interface MessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  activeMessages?: Message[];
  isGenerating?: boolean;
  isLatestAssistantMessage?: boolean;
  branchArtifacts?: Record<string, import('@/lib/types').BranchArtifactState>;
  messageVersions?: Record<string, number>;
}

export function MessageBubble({ message, allMessages, activeMessages, isGenerating, isLatestAssistantMessage, branchArtifacts, messageVersions }: MessageBubbleProps) {
  const regenerateMessage = useChatStore((s) => s.regenerateMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const switchToBranch = useChatStore((s) => s.switchToBranch);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';


  // Tool result message
  if (isTool) {
    const generatedImages = message.content.filter((c) => c.type === 'generated_image');
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

  const activeMsgIndex = activeMessages?.findIndex(m => m.id === message.id) ?? -1;

  // --- Turn Calculation for Assistant Messages ---
  let isTurnRoot = true;
  let turnAssistantMessages: Message[] = [message];
  let turnRoot = message;

  if (!isUser && activeMessages && activeMsgIndex !== -1) {
    let startIdx = 0;
    for (let i = activeMsgIndex; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        startIdx = i + 1;
        break;
      }
    }
    let endIdx = activeMessages.length - 1;
    for (let i = activeMsgIndex; i < activeMessages.length; i++) {
      if (activeMessages[i].role === 'user') {
        endIdx = i - 1;
        break;
      }
    }

    const turnAllMessages = activeMessages.slice(startIdx, endIdx + 1);
    const assistantMsgs = turnAllMessages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length > 0) {
      turnRoot = assistantMsgs[0];
      isTurnRoot = message.id === turnRoot.id;
      turnAssistantMessages = assistantMsgs;
    }
  }

  // Only the turn root renders the entire assistant turn
  if (!isUser && !isTurnRoot) {
    return null;
  }

  // Check if generating at the end of the conversation
  const isLatestTurn = activeMessages && activeMsgIndex !== -1 && !activeMessages.slice(activeMsgIndex + 1).some(m => m.role === 'user');
  const isContinued = isGenerating && isLatestTurn;

  // User content extraction
  const userImages = isUser ? message.content.filter(c => c.type === 'image') : [];
  const userTextContent = isUser
    ? message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
    : '';

  // Ordered blocks for Assistant turn
  type TurnBlock =
    | { type: 'thought'; key: string; thought: string; timeMs?: number }
    | { type: 'tool_group'; key: string; toolCalls: any[]; isLastToolGroup: boolean }
    | { type: 'image'; key: string; image: any }
    | { type: 'generated_image'; key: string; genImage: any }
    | { type: 'text'; key: string; text: string };

  const blocks: TurnBlock[] = [];
  let currentToolGroup: { type: 'tool_group'; key: string; toolCalls: any[]; isLastToolGroup: boolean } | null = null;

  if (!isUser) {
    for (let mIdx = 0; mIdx < turnAssistantMessages.length; mIdx++) {
      const m = turnAssistantMessages[mIdx];
      for (let cIdx = 0; cIdx < m.content.length; cIdx++) {
        const c = m.content[cIdx];
        const blockKey = `${m.id}-${cIdx}`;

        if (c.type === 'thought' && c.thought && c.thought.trim().length > 0) {
          currentToolGroup = null;
          blocks.push({
            type: 'thought',
            key: `thought-${blockKey}`,
            thought: c.thought,
            timeMs: c.thoughtTimeMs,
          });
        } else if (c.type === 'tool_call') {
          // Consecutive tool call: add to existing tool group or start new one
          if (currentToolGroup) {
            currentToolGroup.toolCalls.push(c);
          } else {
            currentToolGroup = {
              type: 'tool_group',
              key: `tools-${blockKey}`,
              toolCalls: [c],
              isLastToolGroup: false,
            };
            blocks.push(currentToolGroup);
          }
        } else if (c.type === 'image') {
          currentToolGroup = null;
          blocks.push({
            type: 'image',
            key: `img-${blockKey}`,
            image: c,
          });
        } else if (c.type === 'generated_image') {
          currentToolGroup = null;
          blocks.push({
            type: 'generated_image',
            key: `genimg-${blockKey}`,
            genImage: c,
          });
        } else if (c.type === 'text' && c.text) {
          const trimmed = c.text.trim();
          if (
            trimmed.length > 0 &&
            trimmed !== '[Executed tools]'
          ) {
            currentToolGroup = null;
            blocks.push({
              type: 'text',
              key: `text-${blockKey}`,
              text: c.text,
            });
          }
        }
      }
    }

    // Mark the last tool group
    const toolGroups = blocks.filter((b): b is Extract<TurnBlock, { type: 'tool_group' }> => b.type === 'tool_group');
    if (toolGroups.length > 0) {
      toolGroups[toolGroups.length - 1].isLastToolGroup = true;
    }
  }

  const fullTurnText = isUser
    ? userTextContent
    : blocks
        .filter((b): b is Extract<TurnBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n\n');

  const [editValue, setEditValue] = useState(fullTurnText);

  // User siblings
  const userParentId = message.parentId || 'root';
  const userSiblings = allMessages?.filter(m => (m.parentId || 'root') === userParentId) || [];
  userSiblings.sort((a, b) => a.createdAt - b.createdAt);
  const userSiblingIndex = userSiblings.findIndex(m => m.id === message.id);
  const totalUserSiblings = userSiblings.length;

  // Turn siblings for assistant
  const turnRootParentId = turnRoot.parentId || 'root';
  const turnSiblings = allMessages?.filter(m => (m.parentId || 'root') === turnRootParentId) || [];
  turnSiblings.sort((a, b) => a.createdAt - b.createdAt);
  const turnSiblingIndex = turnSiblings.findIndex(m => m.id === turnRoot.id);
  const totalTurnSiblings = turnSiblings.length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullTurnText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`
        ${isUser ? 'mb-5 sm:mb-6 animate-fade-in flex justify-end' : ''}
        ${!isUser ? (isContinued ? 'mb-0' : 'mb-5 sm:mb-6') : ''}
      `}
    >
      <div className={`flex gap-2.5 sm:gap-3.5 group ${isUser ? 'flex-row-reverse max-w-[92%] sm:max-w-[85%]' : 'max-w-full'}`}>
        {/* Content */}
        <div className={`min-w-0 flex-1 flex flex-col gap-2.5 ${isUser ? 'text-right items-end' : ''}`}>
          {isUser ? (
            /* User Message */
            <>
              {/* Image attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-end">
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
              {userImages.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-end">
                  {userImages.map((img, i) => (
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

              {/* Text content */}
              {userTextContent && (
                <div className="w-full flex flex-col gap-1 items-end">
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
                          onClick={() => { setIsEditing(false); setEditValue(userTextContent); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            editMessage(message.id, editValue);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          Save & Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="inline-block text-sm leading-relaxed px-3.5 sm:px-4 py-2.5 rounded-2xl rounded-tr-xs sm:rounded-tr-xs shadow-xs text-left whitespace-pre-wrap break-words"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {userTextContent}
                    </div>
                  )}
                  
                  {/* Actions for user messages */}
                  {!isEditing && (
                    <div className="flex items-center justify-end w-full gap-2 mt-1 transition-opacity">
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
                        aria-label="Copy message"
                        title="Copy message"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Edit message"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      {totalUserSiblings > 1 && (
                        <div className="flex items-center gap-1 text-xs font-medium transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                          <button
                            onClick={() => switchToBranch(userSiblings[userSiblingIndex - 1].id)}
                            disabled={userSiblingIndex === 0}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="mx-0.5">{userSiblingIndex + 1} / {totalUserSiblings}</span>
                          <button
                            onClick={() => switchToBranch(userSiblings[userSiblingIndex + 1].id)}
                            disabled={userSiblingIndex === totalUserSiblings - 1}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Assistant Turn: Ordered sequence of blocks with exact uniform gap-2.5 */
            <>
              {blocks.map((block, idx) => {
                const isLastBlock = idx === blocks.length - 1;

                switch (block.type) {
                  case 'thought':
                    return (
                      <div key={block.key} className="flex flex-col max-w-full sm:max-w-[90%]">
                        <ThinkingBlock thought={block.thought} timeMs={block.timeMs} />
                      </div>
                    );

                  case 'tool_group':
                    return (
                      <div key={block.key} className="flex flex-col">
                        <ToolBlock
                          toolCalls={block.toolCalls}
                          allMessages={allMessages}
                          isTurnActive={isContinued && block.isLastToolGroup}
                          hasFinalText={!block.isLastToolGroup || (isLastBlock ? false : true)}
                        />
                      </div>
                    );

                  case 'image':
                    return (
                      <div key={block.key} className="flex gap-2 flex-wrap">
                        <div className="rounded-xl overflow-hidden shadow-sm max-w-[180px] sm:max-w-[220px] border" style={{ borderColor: 'var(--border)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={block.image.imageUrl}
                            alt="Attached image"
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    );

                  case 'generated_image':
                    return (
                      <div key={block.key} className="flex flex-col animate-fade-in">
                        <GeneratedImageBlock img={block.genImage} />
                      </div>
                    );

                  case 'text':
                    return (
                      <div key={block.key} className="w-full flex flex-col items-start">
                        {isEditing && isLastBlock ? (
                          <div className="flex flex-col gap-2 w-full min-w-[250px] sm:min-w-[400px]">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full min-h-[100px] p-3 rounded-xl border text-sm resize-y focus:outline-none focus:ring-2"
                              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setIsEditing(false); setEditValue(fullTurnText); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditing(false);
                                  editMessage(message.id, editValue);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="markdown-body w-full" style={{ color: 'var(--text-primary)' }}>
                            <MarkdownRenderer 
                              content={block.text} 
                              artifactVersions={
                                messageVersions || message.scratchpad?.artifacts?.reduce((acc, a) => {
                                  acc[a.id] = a.version;
                                  return acc;
                                }, {} as Record<string, number>)
                              }
                              branchArtifacts={branchArtifacts}
                            />
                          </div>
                        )}
                      </div>
                    );

                  default:
                    return null;
                }
              })}

              {/* Actions for assistant messages */}
              {!isContinued && fullTurnText && (
                <div className="flex items-center gap-1 mt-1 animate-fade-in" style={{ animationDuration: '0.3s' }}>
                  {totalTurnSiblings > 1 && (
                    <div className="flex items-center gap-1 text-xs font-medium transition-opacity mr-2" style={{ color: 'var(--text-secondary)' }}>
                      <button
                        onClick={() => switchToBranch(turnSiblings[turnSiblingIndex - 1].id)}
                        disabled={turnSiblingIndex === 0}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="mx-0.5">{turnSiblingIndex + 1} / {totalTurnSiblings}</span>
                      <button
                        onClick={() => switchToBranch(turnSiblings[turnSiblingIndex + 1].id)}
                        disabled={turnSiblingIndex === totalTurnSiblings - 1}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer"
                    style={{ color: copied ? 'var(--success)' : 'var(--text-tertiary)' }}
                    aria-label="Copy response"
                    title="Copy response"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => regenerateMessage(turnRoot.id)}
                    className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Regenerate response"
                    title="Regenerate response"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
