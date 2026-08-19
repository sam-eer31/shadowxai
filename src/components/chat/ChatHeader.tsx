'use client';

import type { Conversation } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { PanelLeft, SquarePen } from 'lucide-react';

interface ChatHeaderProps {
  conversation?: Conversation;
}

export function ChatHeader({ conversation: _conversation }: ChatHeaderProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const newChat = useChatStore((s) => s.newChat);

  return (
    <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
      {/* Left items: Mobile sidebar toggle + New Chat button */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl transition-all duration-150 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 flex lg:hidden"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft size={19} />
        </button>

        <button
          onClick={newChat}
          className="flex lg:hidden p-2 rounded-xl transition-all duration-150 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
          style={{ color: 'var(--text-secondary)' }}
          title="New Chat"
          aria-label="New Chat"
        >
          <SquarePen size={18} />
        </button>
      </div>
    </div>
  );
}
