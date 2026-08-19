'use client';

import Image from 'next/image';

import { Sparkles, Zap, Globe, Image as ImageIcon, Calculator, Settings } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';

const SUGGESTIONS = [
  { icon: Sparkles, text: 'Explain quantum computing in simple terms', color: '#8b5cf6' },
  { icon: Globe, text: 'Search the web for the latest AI news', color: '#06b6d4' },
  { icon: Calculator, text: 'Calculate the compound interest on $10,000 at 7% for 10 years', color: '#f59e0b' },
  { icon: ImageIcon, text: 'Generate an image of a futuristic city at sunset', color: '#ec4899' },
];

export function EmptyState() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const credentials = useSettingsStore((s) => s.credentials);
  const openSettings = useUIStore((s) => s.openSettings);

  const isConfigured =
    (activeProvider === 'ollama' && credentials.ollama?.apiKey) ||
    (activeProvider === 'gemini' && credentials.gemini?.apiKey);

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
      <div className="max-w-lg w-full animate-fade-in py-4">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto mb-4 sm:mb-5 flex items-center justify-center">
            <Image src="/logo.svg" alt="Logo" width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome to Shadow
          </h2>
          <p className="text-xs sm:text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isConfigured
              ? 'Start a conversation or choose a quick prompt to begin.'
              : 'Configure your AI provider API key in Settings to get started.'}
          </p>
        </div>

        {/* Provider status banner */}
        {!isConfigured && (
          <div
            className="mb-6 p-4 rounded-2xl border text-center shadow-xs"
            style={{
              background: 'var(--accent-light)',
              borderColor: 'var(--accent)',
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>
              No API key configured
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Add your {activeProvider === 'ollama' ? 'Ollama' : 'Gemini'} API key to start chatting.
            </p>
            <button
              onClick={() => openSettings('providers')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 text-white shadow-sm"
              style={{
                background: 'var(--accent)',
              }}
            >
              <Settings size={14} />
              Open Settings
            </button>
          </div>
        )}

        {/* Suggestions */}
        {isConfigured && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s.text)}
                className="flex items-center sm:items-start gap-3 p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-150 hover:scale-[1.01] hover:shadow-md active:scale-[0.98]"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}15`, color: s.color }}
                >
                  <s.icon size={16} />
                </div>
                <span className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {s.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Privacy note */}
        <p className="text-center text-[11px] sm:text-xs mt-6 sm:mt-8 opacity-60" style={{ color: 'var(--text-tertiary)' }}>
          Private & local · Direct connection to your AI provider
        </p>
      </div>
    </div>
  );
}
