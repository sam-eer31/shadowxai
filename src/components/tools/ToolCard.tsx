import { useState } from 'react';
import { Globe, Calculator, CloudSun, Clock, Image, ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolDefinition } from '@/lib/types';
import { isToolAvailable } from '@/lib/tools/registry';

const ICONS: Record<string, React.ElementType> = {
  globe: Globe,
  calculator: Calculator,
  'cloud-sun': CloudSun,
  clock: Clock,
  image: Image,
};

interface ToolCardProps {
  tool: ToolDefinition;
  enabled: boolean;
  onToggle: (name: string) => void;
}

export function ToolCard({ tool, enabled, onToggle }: ToolCardProps) {
  const Icon = ICONS[tool.icon] || Globe;
  const available = isToolAvailable(tool);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
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
            ? 'var(--accent)'
            : 'var(--bg-tertiary)',
          color: enabled ? 'var(--bg-primary)' : 'var(--text-secondary)',
        }}
      >
        <Icon size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-wrap text-left w-full focus:outline-none transition-opacity hover:opacity-80"
        >
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
          <div className="ml-0 sm:ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>
        {isExpanded && (
          <p className="text-xs mt-2 leading-relaxed animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
            {tool.description}
          </p>
        )}
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
        onClick={() => onToggle(tool.name)}
        className="relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 mt-1 cursor-pointer focus:outline-none"
        style={{
          background: enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
        }}
        aria-label={`Toggle ${tool.name}`}
      >
        <div
          className="absolute top-1 w-5 h-5 rounded-full shadow-md transition-transform duration-200"
          style={{
            background: 'var(--bg-primary)',
            transform: enabled ? 'translateX(24px)' : 'translateX(4px)',
          }}
        />
      </button>
    </div>
  );
}
