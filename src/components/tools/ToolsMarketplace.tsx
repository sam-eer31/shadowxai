'use client';

import { X, Globe, Calculator, CloudSun, Clock, Image } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeTools(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Tools & Marketplace
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Enable tools to extend your AI&apos;s capabilities
            </p>
          </div>
          <button
            onClick={closeTools}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tools grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon] || Globe;
              const enabled = enabledTools.includes(tool.name);
              const available = isToolAvailable(tool);

              return (
                <div
                  key={tool.name}
                  className="flex items-start gap-3 p-4 rounded-xl border transition-all duration-200"
                  style={{
                    borderColor: enabled ? 'var(--accent)' : 'var(--border)',
                    background: enabled ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {tool.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </h3>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
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
                      <p className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
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
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 mt-0.5
                    `}
                    style={{
                      background: enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                      style={{
                        transform: enabled ? 'translateX(22px)' : 'translateX(2px)',
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
