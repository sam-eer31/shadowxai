'use client';

import { X, Globe, Calculator, CloudSun, Clock, Image, Wrench } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getAllTools, isToolAvailable } from '@/lib/tools/registry';

const ICONS: Record<string, React.ElementType> = {
  globe: Globe,
  calculator: Calculator,
  'cloud-sun': CloudSun,
  clock: Clock,
  image: Image,
};

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
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon] || Globe;
              const enabled = enabledTools.includes(tool.name);
              const available = isToolAvailable(tool);

              return (
                <div
                  key={tool.name}
                  className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200"
                  style={{
                    borderColor: enabled ? 'var(--accent)' : 'var(--border)',
                    background: enabled ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: enabled
                        ? 'linear-gradient(135deg, var(--accent), #8b5cf6)'
                        : 'var(--bg-tertiary)',
                      color: enabled ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tool.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </h3>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {tool.description}
                    </p>
                    {!available && tool.requiresConfig && (
                      <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--warning)' }}>
                        ⚠ Requires{' '}
                        {tool.requiresProvider === 'ollama'
                          ? 'Ollama'
                          : tool.requiresConfig.join(', ').includes('cloudflare')
                            ? 'Cloudflare'
                            : 'provider'}{' '}
                        configuration
                      </p>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleTool(tool.name)}
                    className="relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 mt-1 cursor-pointer focus:outline-none"
                    style={{
                      background: enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
                    }}
                    aria-label={`Toggle ${tool.name}`}
                  >
                    <div
                      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
                      style={{
                        transform: enabled ? 'translateX(24px)' : 'translateX(4px)',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
