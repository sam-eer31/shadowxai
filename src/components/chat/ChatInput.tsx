'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react';
import { Send, Square, ImagePlus, X, Wrench, ChevronDown, Brain, Sparkles, Check } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { validateImage, fileToBase64, extractBase64Data } from '@/lib/utils/image';
import { generateId } from '@/lib/utils/id';
import { getChatProvider } from '@/lib/providers';
import { ModelSelector } from './ModelSelector';
import type { Attachment, AIModel } from '@/lib/types';

export function ChatInput() {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showThinkingMenu, setShowThinkingMenu] = useState(false);
  const [thinkingMenuPos, setThinkingMenuPos] = useState<{ bottom: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const enabledTools = useSettingsStore((s) => s.enabledTools);
  const fallbackThinkingMode = useSettingsStore((s) => s.thinkingMode);
  const modelThinkingModes = useSettingsStore((s) => s.modelThinkingModes);
  const setThinkingMode = useSettingsStore((s) => s.setThinkingMode);
  const openTools = useUIStore((s) => s.openToolsMarketplace);

  // Check if current model supports vision & thinking
  const [currentModel, setCurrentModel] = useState<AIModel | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);

  useEffect(() => {
    let active = true;
    const loadModel = async () => {
      setIsLoadingModel(true);
      const provider = getChatProvider(activeProvider);
      if (!provider || !provider.isConfigured()) {
        if (active) {
          setCurrentModel(null);
          setIsLoadingModel(false);
        }
        return;
      }
      try {
        const models = await provider.listModels();
        if (active) {
          const modelId = selectedModels[activeProvider];
          const model = models.find((m) => m.id === modelId) || models[0];
          setCurrentModel(model || null);
          setIsLoadingModel(false);
        }
      } catch {
        if (active) {
          setCurrentModel(null);
          setIsLoadingModel(false);
        }
      }
    };
    loadModel();
    return () => {
      active = false;
    };
  }, [activeProvider, selectedModels]);

  const supportsVision = currentModel?.capabilities?.vision ?? false;
  let thinkingMode = currentModel?.id
    ? modelThinkingModes[currentModel.id] ?? fallbackThinkingMode
    : fallbackThinkingMode;
  
  if (currentModel?.capabilities?.thinking === 'levels' && !['low', 'medium', 'high'].includes(thinkingMode)) {
    thinkingMode = 'medium';
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
    }
  }, [text]);

  const handleSend = useCallback(() => {
    if (!text.trim() && attachments.length === 0) return;
    if (isGenerating) return;
    sendMessage(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, attachments, isGenerating, sendMessage]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const validation = validateImage(file);
      if (!validation.valid) {
        useUIStore.getState().addToast({
          type: 'error',
          message: validation.error || 'Invalid file',
        });
        continue;
      }
      try {
        const dataUrl = await fileToBase64(file);
        const { mimeType, data } = extractBase64Data(dataUrl);
        const attachment: Attachment = {
          id: generateId(),
          type: 'image',
          name: file.name,
          mimeType,
          data,
          size: file.size,
        };
        setAttachments((prev) => [...prev, attachment]);
      } catch {
        useUIStore.getState().addToast({
          type: 'error',
          message: 'Failed to process image.',
        });
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Drag and drop
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (supportsVision) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (supportsVision && e.dataTransfer.files) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleThinkingClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!currentModel?.capabilities?.thinking) return;

    if (currentModel.capabilities.thinking === 'on_off') {
      const nextMode = thinkingMode === 'on' ? 'off' : 'on';
      setThinkingMode(nextMode, currentModel?.id);
      useUIStore.getState().addToast({
        type: 'info',
        message: `Thinking mode turned ${nextMode.toUpperCase()}`,
        duration: 2000,
      });
      return;
    }

    if (currentModel.capabilities.thinking === 'levels') {
      const rect = e.currentTarget.getBoundingClientRect();
      setThinkingMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 180)),
      });
      setShowThinkingMenu(!showThinkingMenu);
    }
  };

  const currentModelName = currentModel?.name || selectedModels[activeProvider] || 'Model';

  return (
    <div
      className="border-t px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 relative"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto w-full">
        {/* Drag overlay */}
        {isDragging && (
          <div
            className="mb-2 p-4 rounded-2xl border-2 border-dashed text-center animate-fade-in"
            style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}
          >
            <ImagePlus size={24} style={{ color: 'var(--accent)' }} className="mx-auto mb-1" />
            <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Drop image here
            </p>
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1 scrollbar-hide">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group rounded-xl overflow-hidden shrink-0 border shadow-xs"
                style={{ width: 56, height: 56, borderColor: 'var(--border)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity shadow-md"
                  style={{ background: 'rgba(0,0,0,0.75)' }}
                  aria-label="Remove image"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Card */}
        <div
          className="rounded-2xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-0 shadow-xs flex flex-col"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-secondary)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Shadow..."
            rows={1}
            className="w-full resize-none bg-transparent text-base sm:text-sm outline-none px-3.5 pt-3 pb-1 min-h-[44px] leading-relaxed"
            style={{
              color: 'var(--text-primary)',
            }}
            disabled={isGenerating}
          />

          {/* Action Toolbar Row */}
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
                          ? thinkingMode
                          : 'Think'}
                      </span>
                      {currentModel.capabilities.thinking === 'levels' && (
                        <ChevronDown size={10} className="opacity-60" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Tool Indicator / Quick button */}
              {enabledTools.length > 0 && (
                <button
                  onClick={openTools}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs shrink-0 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--success)',
                  }}
                  title={`${enabledTools.length} tools active`}
                >
                  <Wrench size={11} />
                  <span>{enabledTools.length}</span>
                </button>
              )}
            </div>

            {/* Right: Send / Stop button */}
            <div className="shrink-0">
              {isGenerating ? (
                <button
                  onClick={stopGeneration}
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
                  disabled={!text.trim() && attachments.length === 0}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-30 flex items-center justify-center shrink-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                    color: 'white',
                  }}
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Model Selector Modal / Sheet */}
        {showModelSelector && (
          <ModelSelector onClose={() => setShowModelSelector(false)} />
        )}

        {/* Thinking Menu Popover (Fixed in Viewport so never clipped) */}
        {showThinkingMenu && thinkingMenuPos && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-2xs"
              onClick={() => setShowThinkingMenu(false)}
            />
            <div
              className="fixed z-50 w-44 rounded-2xl border shadow-2xl overflow-hidden text-xs animate-fade-in p-1"
              style={{
                bottom: `${thinkingMenuPos.bottom}px`,
                left: `${thinkingMenuPos.left}px`,
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
              }}
            >
              <div
                className="px-3 py-2 border-b font-semibold flex items-center justify-between text-[11px] uppercase tracking-wider opacity-75"
                style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
              >
                <span>Thinking Effort</span>
              </div>
              <div className="flex flex-col py-1 gap-0.5">
                <button
                  onClick={() => {
                    setThinkingMode('low', currentModel?.id);
                    setShowThinkingMenu(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    thinkingMode === 'low'
                      ? 'bg-black/10 dark:bg-white/10 font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{ color: thinkingMode === 'low' ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  <span>Low Effort</span>
                  {thinkingMode === 'low' && <Check size={14} />}
                </button>
                <button
                  onClick={() => {
                    setThinkingMode('medium', currentModel?.id);
                    setShowThinkingMenu(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    thinkingMode === 'medium'
                      ? 'bg-black/10 dark:bg-white/10 font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{ color: thinkingMode === 'medium' ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  <span>Medium Effort</span>
                  {thinkingMode === 'medium' && <Check size={14} />}
                </button>
                <button
                  onClick={() => {
                    setThinkingMode('high', currentModel?.id);
                    setShowThinkingMenu(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    thinkingMode === 'high'
                      ? 'bg-black/10 dark:bg-white/10 font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{ color: thinkingMode === 'high' ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  <span>High Effort</span>
                  {thinkingMode === 'high' && <Check size={14} />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Desktop Footer hint */}
        <p className="hidden sm:block text-center text-xs mt-1.5 opacity-60" style={{ color: 'var(--text-tertiary)' }}>
          Press Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
