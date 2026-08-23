'use client';

import type { Conversation } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { PanelLeft, SquarePen, Book, Loader2 } from 'lucide-react';

interface ChatHeaderProps {
  conversation?: Conversation;
  onOpenScratchpad?: () => void;
}

export function ChatHeader({ conversation: _conversation, onOpenScratchpad }: ChatHeaderProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const newChat = useChatStore((s) => s.newChat);
  const scratchpadUpdating = useChatStore((s) => _conversation ? s.scratchpadUpdating[_conversation.id] : false);

  return (
    <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
      {/* Left items: Mobile sidebar toggle + New Chat button */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 pointer-events-auto">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 flex lg:hidden bg-white dark:bg-[#1C1C1C] shadow-sm"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft size={19} />
        </button>

        <button
          onClick={newChat}
          className="flex lg:hidden p-2 rounded-xl border border-black/10 dark:border-white/10 transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 bg-white dark:bg-[#1C1C1C] shadow-sm"
          style={{ color: 'var(--text-secondary)' }}
          title="New Chat"
          aria-label="New Chat"
        >
          <SquarePen size={18} />
        </button>
      </div>
      
      {/* Right side: Scratchpad button */}
      {_conversation && (
        <div className="flex items-center pointer-events-auto">
          <button
            onClick={onOpenScratchpad}
            className="p-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1C] shadow-sm transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 text-blue-500"
            title="View Scratchpad"
            aria-label="View Scratchpad"
          >
            {scratchpadUpdating ? <Loader2 size={18} className="animate-spin" /> : <Book size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}
