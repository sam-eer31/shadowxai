'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, X, Sparkles, Brain, Eye, Wrench, Zap } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { getAllChatProviders } from '@/lib/providers';
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

    const loadModels = async () => {
      setLoading(true);
      setModels([]);

      try {
        const providers = getAllChatProviders().filter((p) => p.isConfigured());
        
        let allModels: AIModel[] = [];
        
        for (const provider of providers) {
          try {
            const m = await provider.listModels();
            allModels = [...allModels, ...m.map((model) => ({ ...model, provider: provider.type }))];
          } catch (e) {
            console.error(`Failed to load models for ${provider.name}:`, e);
          }
        }
        
        if (!isCancelled) {
          setModels(allModels);
          setLoading(false);
        }
      } catch (err) {
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
  }, []);

  return (
    <>
      {/* Backdrop for mobile & desktop light dismiss */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div
        ref={ref}
        className={`
          fixed z-50 overflow-hidden shadow-2xl animate-fade-in
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:w-[420px] sm:max-h-[560px] sm:rounded-2xl sm:border
          flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0
        `}
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Select AI Model
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[420px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                Loading available models...
              </span>
            </div>
          ) : models.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                No models available.
                <br />
                Please configure at least one API provider in Settings.
              </p>
            </div>
          ) : (
            Object.entries(
              models.reduce((acc, model) => {
                if (!acc[model.provider]) acc[model.provider] = [];
                acc[model.provider].push(model);
                return acc;
              }, {} as Record<string, AIModel[]>)
            ).map(([providerType, providerModels]) => (
              <div key={providerType}>
                <div 
                  className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1" 
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {providerType === 'puter' ? 'Puter Cloud' : providerType === 'ollama' ? 'Ollama Local / Cloud' : providerType}
                </div>
                <div className="space-y-1">
                  {providerModels.map((model) => {
                    const isCurrent = activeProvider === model.provider && selectedModels[model.provider] === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setActiveProvider(model.provider);
                          setSelectedModel(model.provider, model.id);
                          onClose();
                        }}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 border
                          ${
                            isCurrent
                              ? 'bg-black/10 dark:bg-white/10'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99]'
                          }
                        `}
                        style={{
                          borderColor: isCurrent ? 'var(--accent)' : 'transparent',
                        }}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div
                            className={`text-sm font-medium flex items-center gap-2 ${isCurrent ? 'font-semibold' : ''}`}
                            style={{
                              color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                            }}
                          >
                            <span className="truncate">{model.name}</span>
                            {model.id.includes(':free') && (
                              <span
                                className="shrink-0 inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}
                              >
                                Slower
                              </span>
                            )}
                          </div>

                          {/* Capabilities Tags */}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {model.capabilities.thinking && model.capabilities.thinking !== 'none' && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}
                              >
                                <Brain size={10} />
                                Thinking
                              </span>
                            )}
                            {model.capabilities.vision && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                              >
                                <Eye size={10} />
                                Vision
                              </span>
                            )}
                            {model.capabilities.toolCalling && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}
                              >
                                <Wrench size={10} />
                                Tools
                              </span>
                            )}
                            {model.capabilities.streaming && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}
                              >
                                <Zap size={10} />
                                Stream
                              </span>
                            )}
                          </div>
                        </div>

                        {isCurrent && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                          >
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
