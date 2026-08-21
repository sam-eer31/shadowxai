import { RefObject, ReactNode } from 'react';
import { ImagePlus, Sparkles, ChevronDown, Brain, Globe, Square, ArrowUp, Check } from 'lucide-react';
import type { AIModel } from '@/lib/types';

interface ActionButtonsProps {
  supportsVision: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (files: FileList | null) => void;
  setShowModelSelector: (show: boolean) => void;
  currentModelName: string;
  isLoadingModel: boolean;
  currentModel: AIModel | null;
  thinkingMode: string;
  handleThinkingClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasWebSearchKey: boolean;
  isWebSearchEnabled: boolean;
  toggleWebSearch: () => void;
  isGenerating: boolean;
  stopGeneration: () => void;
  handleSend: () => void;
  text: string;
  attachmentsLength: number;
}

export function ActionButtons({
  supportsVision,
  fileInputRef,
  handleImageUpload,
  setShowModelSelector,
  currentModelName,
  isLoadingModel,
  currentModel,
  thinkingMode,
  handleThinkingClick,
  hasWebSearchKey,
  isWebSearchEnabled,
  toggleWebSearch,
  isGenerating,
  stopGeneration,
  handleSend,
  text,
  attachmentsLength,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 gap-1.5">
      {/* Left Tools & Options */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 pr-1">
        {/* Image upload button */}
        {supportsVision && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              title="Upload image"
              aria-label="Upload image"
            >
              <ImagePlus size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </>
        )}

        {/* Model Selector button */}
        <button
          onClick={() => setShowModelSelector(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0 max-w-[150px] sm:max-w-[200px]"
          style={{
            color: 'var(--text-secondary)',
            background: 'rgba(0,0,0,0.03)',
          }}
          title="Change Model"
        >
          <Sparkles size={12} style={{ color: 'var(--accent)' }} className="shrink-0" />
          <span className="truncate">{currentModelName}</span>
          <ChevronDown size={11} className="shrink-0 opacity-60" />
        </button>

        {/* Thinking Mode Selector */}
        {!isLoadingModel && currentModel?.capabilities?.thinking && currentModel.capabilities.thinking !== 'none' && (
          <div className="relative shrink-0">
            {currentModel.capabilities.thinking === 'always_on' ? (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs cursor-default select-none font-medium"
                style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                title="Thinking is always active for this model"
              >
                <Brain size={12} />
                <span className="hidden sm:inline">Always On</span>
              </div>
            ) : (
              <button
                onClick={handleThinkingClick}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 cursor-pointer"
                style={{
                  color: thinkingMode !== 'off' ? 'var(--accent)' : 'var(--text-tertiary)',
                  background: thinkingMode !== 'off' ? 'var(--accent-light)' : 'transparent',
                  border: thinkingMode !== 'off' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                }}
                title={`Thinking Mode: ${thinkingMode}`}
              >
                <Brain size={12} />
                <span className="capitalize">
                  {currentModel.capabilities.thinking === 'on_off'
                    ? 'Think'
                    : thinkingMode !== 'off'
                    ? currentModel.capabilities.thinkingOptions?.find((o) => o.id === thinkingMode)?.label || thinkingMode
                    : 'Think'}
                </span>
                {currentModel.capabilities.thinking === 'levels' && (
                  <ChevronDown size={10} className="opacity-60" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Web Search Toggle */}
        {hasWebSearchKey && (
          <button
            onClick={toggleWebSearch}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 shrink-0"
            style={{
              color: isWebSearchEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
              background: isWebSearchEnabled ? 'var(--accent-light)' : 'transparent',
              border: isWebSearchEnabled ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
            }}
            title={isWebSearchEnabled ? "Web Search Enabled" : "Web Search Disabled"}
          >
            <Globe size={12} />
            <span className="hidden sm:inline">Search</span>
          </button>
        )}
      </div>

      {/* Right: Send / Stop button */}
      <div className="shrink-0">
        {isGenerating ? (
          <button
            onClick={() => stopGeneration()}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl transition-all duration-150 active:scale-90 flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: 'var(--error)',
              color: 'white',
            }}
            title="Stop generation"
            aria-label="Stop generation"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() && attachmentsLength === 0}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-30 flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
            }}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
