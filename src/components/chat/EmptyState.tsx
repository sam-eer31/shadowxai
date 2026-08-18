'use client';

import { Sparkles, Zap, Globe, Image as ImageIcon, Calculator } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

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

  const isConfigured =
    (activeProvider === 'ollama' && credentials.ollama?.apiKey) ||
    (activeProvider === 'gemini' && credentials.gemini?.apiKey);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg w-full animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
            }}
          >
            <Zap size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome to Shadow
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isConfigured
              ? 'Start a conversation or try one of the suggestions below.'
              : 'Configure your AI provider in Settings to get started.'}
          </p>
        </div>

        {/* Provider status */}
        {!isConfigured && (
          <div
            className="mb-6 p-4 rounded-xl border text-center"
            style={{
              background: 'var(--accent-light)',
              borderColor: 'var(--accent)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              No API key configured
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Open <strong>Settings → Providers</strong> to add your{' '}
              {activeProvider === 'ollama' ? 'Ollama' : 'Gemini'} API key.
            </p>
          </div>
        )}

        {/* Suggestions */}
        {isConfigured && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s.text)}
                className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}20`, color: s.color }}
                >
                  <s.icon size={16} />
                </div>
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {s.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Privacy note */}
        <p className="text-center text-xs mt-8" style={{ color: 'var(--text-tertiary)' }}>
          Your messages are sent directly to your configured AI provider.
          <br />
          Nothing is stored on our servers.
        </p>
      </div>
    </div>
  );
}
