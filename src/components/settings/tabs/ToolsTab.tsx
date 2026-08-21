'use client';


import { getAllTools } from '@/lib/tools/registry';
import { ToolCard } from '../../tools/ToolCard';

export function ToolsTab() {
  const tools = getAllTools();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Agent Capabilities
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          These are the tools available to the assistant. All tools are always active, provided their requirements are met.
        </p>
      </div>

      <div className="space-y-3">
        {tools.map((tool) => (
          <ToolCard
            key={tool.name}
            tool={tool}
          />
        ))}
      </div>
    </div>
  );
}
