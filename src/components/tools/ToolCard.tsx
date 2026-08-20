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
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200"
      style={{
        borderColor: 'var(--border)',
        background: enabled ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-secondary)',
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        <Icon size={15} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-wrap text-left w-full focus:outline-none transition-opacity hover:opacity-80"
        >
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
          <div className="ml-0 sm:ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>
        </button>
        {isExpanded && (
          <p className="text-xs mt-1.5 leading-relaxed animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
            {tool.description}
          </p>
        )}
        {!available && (
          <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--warning)' }}>
            ⚠ Requires{' '}
            {tool.name === 'web_search'
              ? 'Tavily API Key'
              : tool.name === 'image_generation'
                ? 'Puter Sign In or Cloudflare'
                : tool.requiresProvider === 'ollama'
                  ? 'Ollama'
                  : tool.requiresConfig?.join(', ').includes('cloudflare')
                    ? 'Cloudflare'
                    : 'provider'}{' '}
            configuration
          </p>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(tool.name)}
        className="relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer focus:outline-none"
        style={{
          background: enabled ? '#10b981' : 'var(--bg-tertiary)',
        }}
        aria-label={`Toggle ${tool.name}`}
      >
        <div
          className="absolute top-[3px] w-[18px] h-[18px] rounded-full shadow-sm transition-transform duration-200"
          style={{
            background: '#ffffff',
            transform: enabled ? 'translateX(19px)' : 'translateX(3px)',
          }}
        />
      </button>
    </div>
  );
}
