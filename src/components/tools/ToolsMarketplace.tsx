'use client';

import { X, Wrench } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getAllTools } from '@/lib/tools/registry';
import { ToolCard } from './ToolCard';

export function ToolsMarketplace() {
  const closeTools = useUIStore((s) => s.closeToolsMarketplace);
  const enabledTools = useSettingsStore((s) => s.enabledTools);
  const toggleTool = useSettingsStore((s) => s.toggleTool);

  const tools = getAllTools();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeTools();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div
        className={`
          relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg
          sm:rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col
          pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]
        `}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              <Wrench size={17} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Tools & Capabilities
              </h2>
              <p className="text-[11px] sm:text-xs opacity-75" style={{ color: 'var(--text-secondary)' }}>
                Enable smart agents & functions
              </p>
            </div>
          </div>
          <button
            onClick={closeTools}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close tools"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tools grid */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 overscroll-contain">
          <div className="space-y-2.5 sm:space-y-3">
            {tools.map((tool) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                enabled={enabledTools.includes(tool.name)}
                onToggle={toggleTool}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
