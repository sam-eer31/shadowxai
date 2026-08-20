import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GeneratedImageBlockProps {
  img: { imageUrl?: string; imagePrompt?: string };
}

export function GeneratedImageBlock({ img }: GeneratedImageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!img.imageUrl) return null;

  return (
    <div className="mb-3">
      <div className="inline-block rounded-2xl overflow-hidden shadow-lg max-w-full sm:max-w-sm border" style={{ borderColor: 'var(--border)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.imageUrl}
          alt={img.imagePrompt || 'Generated image'}
          className="w-full h-auto"
        />
        {img.imagePrompt && (
          <div
            className="flex flex-col border-t"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)'
            }}
          >
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-medium focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>{isExpanded ? 'Hide prompt' : 'Show prompt'}</span>
              {isExpanded ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />}
            </button>
            {isExpanded && (
              <div
                className="px-3.5 pb-3 pt-0 text-xs leading-relaxed animate-fade-in opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                {img.imagePrompt}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
