import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingBlockProps {
  thought: string;
  timeMs?: number;
}

export function ThinkingBlock({ thought, timeMs }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-1.5">
          <Lightbulb size={14} />
          <span>{timeMs ? `Reasoned for ${(timeMs / 1000).toFixed(1)}s` : 'Reasoned'}</span>
        </div>
        {isExpanded ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />}
      </button>

      {isExpanded && (
        <div
          className="mt-2.5 ml-[6px] pl-3.5 border-l-2 text-xs sm:text-sm"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="whitespace-pre-wrap leading-relaxed opacity-80">{thought}</div>
        </div>
      )}
    </div>
  );
}
