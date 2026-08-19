'use client';

import type { Conversation } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { PanelLeft, SquarePen, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  conversation?: Conversation;
}

export function ChatHeader({ conversation: _conversation }: ChatHeaderProps) {
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const newChat = useChatStore((s) => s.newChat);

  const modelId = selectedModels[activeProvider] || 'No model selected';
  const providerLabel = activeProvider === 'ollama' ? 'Ollama' : 'Gemini';

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

      {/* Right items: Model Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs max-w-[200px] sm:max-w-xs transition-all duration-150"
          style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            border: '1px solid rgba(249, 109, 0, 0.2)',
          }}
        >
          <Sparkles size={12} className="shrink-0" />
          <span className="font-medium truncate">{modelId}</span>
          <span className="opacity-60 hidden sm:inline shrink-0">· {providerLabel}</span>
        </div>
      </div>
    </div>
  );
}
