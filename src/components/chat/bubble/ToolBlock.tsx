'use client';

import { useState, useEffect, useRef } from 'react';
import { Wrench, ChevronDown, ChevronRight, X, Check, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';

interface ToolBlockProps {
  toolCalls: any[];
  allMessages?: Message[];
  isTurnActive?: boolean;
  hasFinalText?: boolean;
}

export function ToolBlock({ toolCalls, allMessages, isTurnActive, hasFinalText }: ToolBlockProps) {
  const numTools = toolCalls.length;

  const getToolDisplayName = (name?: string) => {
    switch (name) {
      case 'web_search':
        return 'Searched web';
      case 'calculator':
        return 'Calculated';
      case 'weather':
        return 'Got weather';
      case 'image_generation':
        return 'Generated image';
      case 'get_tool_definitions':
        return 'Discovered tool schemas';
      case 'create_artifact':
        return 'Created artifact';
      case 'update_artifact':
        return 'Updated artifact';
      case 'read_artifact':
        return 'Read artifact';
      case 'read_scratchpad':
        return 'Read scratchpad';
      case 'current_time':
        return 'Checked current time';
      default:
        return name ? `Used ${name}` : 'Used tool';
    }
  };

  const getToolActiveName = (name?: string) => {
    switch (name) {
      case 'web_search':
        return 'Searching web...';
      case 'calculator':
        return 'Calculating...';
      case 'weather':
        return 'Getting weather...';
      case 'image_generation':
        return 'Generating image...';
      case 'get_tool_definitions':
        return 'Discovering tool schemas...';
      case 'create_artifact':
        return 'Creating artifact...';
      case 'update_artifact':
        return 'Updating artifact...';
      case 'read_artifact':
        return 'Reading artifact...';
      case 'read_scratchpad':
        return 'Reading scratchpad...';
      case 'current_time':
        return 'Checking current time...';
      default:
        return name ? `Using ${name}...` : 'Running tool...';
    }
  };

  // Inspect completion status for each tool call
  const toolStatuses = toolCalls.map((tc) => {
    const call = tc.toolCall || tc;
    const toolCallId = call.id;
    const toolName = call.name;
    let isCompleted = false;
    let isError = false;
    if (allMessages && toolCallId) {
      for (const m of allMessages) {
        const res = m.content?.find(
          (c) => c.type === 'tool_result' && c.toolResult?.toolCallId === toolCallId
        );
        if (res && res.toolResult) {
          isCompleted = true;
          isError = res.toolResult.isError || false;
          break;
        }
      }
    }
    return { call, toolCallId, toolName, isCompleted, isError };
  });

  const hasRunningTools = toolStatuses.some((s) => !s.isCompleted);
  // Stays in tool phase throughout the multi-tool chain until text response starts or generation ends
  const isInToolPhase = hasRunningTools || (Boolean(isTurnActive) && !hasFinalText);

  // userToggled tracks whether user manually clicked expand/collapse
  const [userToggled, setUserToggled] = useState<boolean | null>(null);

  // Auto-expand while in tool phase, auto-collapse when tool phase ends
  const isExpanded = userToggled !== null ? userToggled : isInToolPhase;

  const prevInToolPhaseRef = useRef(isInToolPhase);
  useEffect(() => {
    if (prevInToolPhaseRef.current && !isInToolPhase) {
      // Entire tool calling sequence is done (next action is text or turn completed) -> collapse
      setUserToggled(false);
    } else if (!prevInToolPhaseRef.current && isInToolPhase) {
      // Entered tool execution sequence -> expand
      setUserToggled(true);
    }
    prevInToolPhaseRef.current = isInToolPhase;
  }, [isInToolPhase]);

  return (
    <div>
      <button
        onClick={() => setUserToggled(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-80 cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-1.5">
          <Wrench size={14} className={hasRunningTools ? "text-blue-500 animate-pulse" : ""} />
          <span>
            {hasRunningTools
              ? 'Calling tool...'
              : `Used ${numTools} tool${numTools !== 1 ? 's' : ''}`}
          </span>
          {hasRunningTools && <Loader2 size={12} className="animate-spin text-blue-500 ml-0.5" />}
        </div>
        {isExpanded ? (
          <ChevronDown size={14} className="opacity-60" />
        ) : (
          <ChevronRight size={14} className="opacity-60" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 ml-1 relative flex flex-col gap-0 animate-fade-in">
          {/* Vertical connecting line */}
          {toolCalls.length > 1 && (
            <div
              className="absolute left-[11px] top-[18px] bottom-[18px] w-[2px] rounded-full z-0"
              style={{ background: 'var(--border)' }}
            />
          )}

          {toolStatuses.map((st, i) => (
            <div key={i} className="flex items-center gap-3 relative z-10 py-1.5">
              <div
                className="w-6 h-6 flex items-center justify-center rounded-full"
                style={{ background: 'var(--bg-primary)' }}
              >
                {st.isCompleted ? (
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full"
                    style={{
                      background: st.isError
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                      color: st.isError ? 'var(--error)' : 'var(--success)',
                    }}
                  >
                    {st.isError ? (
                      <X size={12} strokeWidth={3} />
                    ) : (
                      <Check size={12} strokeWidth={3} />
                    )}
                  </div>
                ) : (
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" />
                  </div>
                )}
              </div>

              <span
                className="text-xs font-medium"
                style={{
                  color: st.isCompleted
                    ? 'var(--text-secondary)'
                    : 'var(--text-primary)',
                }}
              >
                {st.isCompleted
                  ? getToolDisplayName(st.toolName)
                  : getToolActiveName(st.toolName)}
                {st.isError && (
                  <span className="ml-1" style={{ color: 'var(--error)' }}>
                    (Failed)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
