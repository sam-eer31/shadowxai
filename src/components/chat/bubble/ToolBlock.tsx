import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, X, Check, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';

interface ToolBlockProps {
  toolCalls: any[];
  allMessages?: Message[];
}

export function ToolBlock({ toolCalls, allMessages }: ToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const numTools = toolCalls.length;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-1.5">
          <Wrench size={14} />
          <span>Used {numTools} tool{numTools !== 1 ? 's' : ''}</span>
        </div>
        {isExpanded ? <ChevronDown size={14} className="opacity-60" /> : <ChevronRight size={14} className="opacity-60" />}
      </button>

      {isExpanded && (
        <div className="mt-3 ml-1 relative flex flex-col gap-0">
          {/* Vertical connecting line */}
          {toolCalls.length > 1 && (
            <div 
              className="absolute left-[11px] top-[18px] bottom-[18px] w-[2px] rounded-full z-0" 
              style={{ background: 'var(--border)' }} 
            />
          )}
          
          {toolCalls.map((tc, i) => {
            const toolCallId = tc.toolCall?.id;
            let isCompleted = false;
            let isError = false;
            if (allMessages && toolCallId) {
              for (const m of allMessages) {
                const res = m.content.find(c => c.type === 'tool_result' && c.toolResult?.toolCallId === toolCallId);
                if (res && res.toolResult) {
                  isCompleted = true;
                  isError = res.toolResult.isError || false;
                  break;
                }
              }
            }

            return (
              <div key={i} className="flex items-center gap-3 relative z-10 py-1.5">
                <div 
                  className="w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {isCompleted ? (
                    <div 
                      className="w-5 h-5 flex items-center justify-center rounded-full"
                      style={{ 
                        background: isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isError ? 'var(--error)' : 'var(--success)'
                      }}
                    >
                      {isError ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
                    </div>
                  ) : (
                    <div 
                      className="w-5 h-5 flex items-center justify-center rounded-full"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                    >
                      <Loader2 size={12} className="animate-spin" />
                    </div>
                  )}
                </div>
                
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {tc.toolCall?.name === 'web_search'
                    ? 'Searched web'
                    : tc.toolCall?.name === 'calculator'
                      ? 'Calculated'
                      : tc.toolCall?.name === 'weather'
                        ? 'Got weather'
                        : tc.toolCall?.name === 'image_generation'
                          ? 'Generated image'
                          : `Used ${tc.toolCall?.name}`}
                  {isError && <span className="ml-1" style={{ color: 'var(--error)' }}>(Failed)</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
