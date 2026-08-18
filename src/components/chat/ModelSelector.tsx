'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { getChatProvider } from '@/lib/providers';
import type { AIModel } from '@/lib/types';

interface ModelSelectorProps {
  onClose: () => void;
}

export function ModelSelector({ onClose }: ModelSelectorProps) {
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const setActiveProvider = useSettingsStore((s) => s.setActiveProvider);

  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    const targetProvider = activeProvider;

    const loadModels = async () => {
      setLoading(true);
      setModels([]);

      const provider = getChatProvider(targetProvider);
      if (provider && provider.isConfigured()) {
        try {
          const m = await provider.listModels();
          if (!isCancelled) {
            setModels(m);
            setLoading(false);
          }
        } catch {
          if (!isCancelled) {
            setModels([]);
            setLoading(false);
          }
        }
      } else {
        if (!isCancelled) {
          setModels([]);
          setLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isCancelled = true;
    };
  }, [activeProvider]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border shadow-xl animate-fade-in overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Provider tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {(['ollama', 'gemini'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActiveProvider(p)}
            className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              color: activeProvider === p ? 'var(--accent)' : 'var(--text-tertiary)',
              borderBottom: activeProvider === p ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {p === 'ollama' ? 'Ollama' : 'Gemini'}
          </button>
        ))}
      </div>

      {/* Model list */}
      <div className="max-h-64 overflow-y-auto p-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>Loading models...</span>
          </div>
        ) : models.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No models available.
              <br />
              Configure your API key in Settings.
            </p>
          </div>
        ) : (
          models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(activeProvider, model.id);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {model.name}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {model.capabilities.thinking && model.capabilities.thinking !== 'none' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                      thinking
                    </span>
                  )}
                  {model.capabilities.vision && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      vision
                    </span>
                  )}
                  {model.capabilities.toolCalling && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                      tools
                    </span>
                  )}
                  {model.capabilities.streaming && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
                      stream
                    </span>
                  )}
                </div>
              </div>
              {selectedModels[activeProvider] === model.id && (
                <Check size={14} style={{ color: 'var(--accent)' }} />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
