'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { PanelLeftOpen, ChevronDown } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { StreamingBubble } from './StreamingBubble';

export function ChatArea() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const streamingThought = useChatStore((s) => s.streamingThought);
  const thoughtTimeMs = useChatStore((s) => s.thoughtTimeMs);
  const pendingToolCalls = useChatStore((s) => s.pendingToolCalls);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const conv = conversations.find((c) => c.id === activeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  
  // Track whether user is at bottom (default true)
  const isAtBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

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
  }, [activeId, conv?.messages.length, scrollToBottom]);

  // While generating, continuously keep viewport at bottom at 60fps if user hasn't scrolled up
  useEffect(() => {
    if (!isGenerating) return;

    isAtBottomRef.current = true;
    setShowScrollBottom(false);

    let frameId: number;
    const followStream = () => {
      if (isAtBottomRef.current && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      frameId = requestAnimationFrame(followStream);
    };

    frameId = requestAnimationFrame(followStream);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isGenerating]);

  // Backup ResizeObserver whenever content grows (e.g. tool cards, images, markdown expansion)
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
    <div className="flex flex-col h-full relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 lg:hidden"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <ChatHeader conversation={conv} />
      </div>

      {/* Messages */}
      {!conv ? (
        <EmptyState />
      ) : (
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto"
            onScroll={handleScroll}
          >
            <div ref={innerContentRef} className="max-w-3xl mx-auto px-4 py-6">
              {conv.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} allMessages={conv.messages} />
              ))}

              {/* Streaming response */}
              {isGenerating && (
                <StreamingBubble
                  content={streamingContent}
                  thought={streamingThought}
                  thoughtTimeMs={thoughtTimeMs}
                  toolCalls={pendingToolCalls}
                />
              )}
            </div>
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottom && (
            <button
              onClick={() => {
                isAtBottomRef.current = true;
                setShowScrollBottom(false);
                scrollToBottom(true);
              }}
              className="absolute bottom-4 right-8 p-2.5 rounded-full shadow-lg border transition-all duration-200 hover:scale-105 active:scale-95 z-20 flex items-center justify-center animate-fade-in cursor-pointer"
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

      {/* Input */}
      <ChatInput />
    </div>
  );
}
