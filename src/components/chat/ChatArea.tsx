'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore, getActiveMessages } from '@/stores/chat-store';
import { getActiveScratchpad } from '@/lib/chat/scratchpad';
import { parseBranchArtifacts } from '@/lib/chat/artifact-parser';

import { ChatHeader } from './ChatHeader';
import { ScratchpadModal } from '../sidebar/ScratchpadModal';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { StreamingBubble } from './StreamingBubble';

export function ChatArea() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const genState = useChatStore((s) => activeId ? s.generations[activeId] : null);
  
  const isGenerating = genState?.isGenerating ?? false;
  const streamingContent = genState?.streamingContent ?? '';
  const streamingThought = genState?.streamingThought ?? '';
  const thoughtTimeMs = genState?.thoughtTimeMs ?? 0;
  const pendingToolCalls = genState?.pendingToolCalls ?? [];

  const scratchpadUpdating = useChatStore((s) => s.scratchpadUpdating);
  const isScratchpadUpdating = activeId ? (scratchpadUpdating[activeId] ?? false) : false;

  const conv = conversations.find((c) => c.id === activeId);
  const activeMessages = conv ? getActiveMessages(conv) : [];

  // Calculate unassigned user messages towards scratchpad trigger
  const activeScratchpad = conv ? getActiveScratchpad(conv) : null;
  let startIndex = 0;
  if (activeScratchpad?.lastSummarizedUserMessageId) {
    const idx = activeMessages.findIndex((m) => m.id === activeScratchpad.lastSummarizedUserMessageId);
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }
  const unassignedUserCount = activeMessages.slice(startIndex).filter((m) => m.role === 'user').length;

  const { branchArtifacts, messageVersions } = useMemo(() => {
    if (!activeMessages || !conv) return { branchArtifacts: {}, messageVersions: {} };
    const { artifacts, messageVersions } = parseBranchArtifacts(conv.id, activeMessages);
    return { branchArtifacts: artifacts, messageVersions };
  }, [activeMessages, conv]);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);

  // Track whether user is at bottom (default true)
  const isAtBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Instant or smooth scroll helper
  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // When conversation changes or new message is added, always scroll to bottom
  useEffect(() => {
    isAtBottomRef.current = true;
    setShowScrollBottom(false);

    // Snap immediately and after DOM paint
    scrollToBottom(false);
    const timer = setTimeout(() => {
      scrollToBottom(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeId, activeMessages.length, scrollToBottom]);



  // Backup ResizeObserver whenever content grows
  useEffect(() => {
    const innerEl = innerContentRef.current;
    const container = containerRef.current;
    if (!innerEl || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    resizeObserver.observe(innerEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [conv?.id]);

  // Handle user scroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 100; // 100px from the bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= threshold;

    isAtBottomRef.current = atBottom;
    setShowScrollBottom(!atBottom);
  };

  return (
    <div className="flex flex-col h-full w-full relative min-w-0" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 z-20 pt-[max(0.6rem,env(safe-area-inset-top))] 
                   lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:pointer-events-none 
                   max-lg:border-b max-lg:bg-[var(--bg-primary)] max-lg:border-[var(--border)]"
      >
        <ChatHeader conversation={conv} onOpenScratchpad={() => setIsScratchpadOpen(true)} />
      </header>

      {/* Messages */}
      {!conv ? (
        <div className="flex-1 overflow-y-auto flex flex-col justify-center">
          <EmptyState />
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            onScroll={handleScroll}
          >
            <div ref={innerContentRef} className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full">
              {(() => {
                const latestAssistantMessageId = activeMessages.slice().reverse().find(m => m.role === 'assistant')?.id;
                const lastVisibleRole = activeMessages.slice().reverse().find(m => m.role !== 'tool')?.role;
                
                return (
                  <>
                    {activeMessages.map((msg) => (
                      <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        allMessages={conv.messages}
                        activeMessages={activeMessages}
                        isGenerating={isGenerating}
                        isLatestAssistantMessage={msg.id === latestAssistantMessageId}
                        branchArtifacts={branchArtifacts}
                        messageVersions={messageVersions[msg.id]}
                      />
                    ))}

                    {/* Streaming response */}
                    {isGenerating && (
                      <StreamingBubble
                        content={streamingContent}
                        thought={streamingThought}
                        thoughtTimeMs={thoughtTimeMs}
                        toolCalls={pendingToolCalls}
                        isContinuation={lastVisibleRole === 'assistant'}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottom && (
            <button
              onClick={() => {
                isAtBottomRef.current = true;
                setShowScrollBottom(false);
                scrollToBottom(false);
              }}
              className="absolute bottom-4 right-4 sm:right-6 p-2.5 rounded-full shadow-lg border transition-all duration-200 hover:scale-105 active:scale-95 z-20 flex items-center justify-center animate-fade-in cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              aria-label="Scroll to bottom"
            >
              <ChevronDown size={18} />
            </button>
          )}
        </div>
      )}

      {/* Input bar */}
      <ChatInput />

      {isScratchpadOpen && conv && (
        <ScratchpadModal
          isOpen={isScratchpadOpen}
          onClose={() => setIsScratchpadOpen(false)}
          scratchpad={getActiveScratchpad(conv)}
          conversationTitle={conv.title}
          unassignedUserCount={unassignedUserCount}
        />
      )}
    </div>
  );
}
