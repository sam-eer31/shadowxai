'use client';

import type { Conversation } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings-store';

interface ChatHeaderProps {
  conversation?: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);

  const modelId = selectedModels[activeProvider] || 'No model selected';
  const providerLabel = activeProvider === 'ollama' ? 'Ollama Cloud' : 'Google Gemini';

  return (
    <div className="flex-1 flex items-center justify-between min-w-0">
      <div className="min-w-0">
        {/* Chat title removed as per request */}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <span className="font-medium truncate max-w-[200px]">{modelId}</span>
          <span className="opacity-60">· {providerLabel}</span>
        </div>
      </div>
    </div>
  );
}
