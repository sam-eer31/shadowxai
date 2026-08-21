'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react';
import { ImagePlus, Check } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { validateImage, fileToBase64, extractBase64Data } from '@/lib/utils/image';
import { generateId } from '@/lib/utils/id';
import { getChatProvider } from '@/lib/providers';
import { ModelSelector } from './ModelSelector';
import { AttachmentPreview } from './input/AttachmentPreview';
import { ActionButtons } from './input/ActionButtons';
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
  const activeId = useChatStore((s) => s.activeConversationId);
  const isGenerating = useChatStore((s) => activeId ? s.generations[activeId]?.isGenerating : false);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const isWebSearchEnabled = useSettingsStore((s) => s.isWebSearchEnabled);
  const toggleWebSearch = useSettingsStore((s) => s.toggleWebSearch);
  const hasWebSearchKey = useSettingsStore((s) => !!s.credentials.tavily?.apiKey);
  const fallbackThinkingMode = useSettingsStore((s) => s.thinkingMode);
  const modelThinkingModes = useSettingsStore((s) => s.modelThinkingModes);
  const setThinkingMode = useSettingsStore((s) => s.setThinkingMode);

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
  
  if (currentModel?.capabilities?.thinking === 'levels') {
    const opts = currentModel.capabilities.thinkingOptions || [
      { id: 'low', label: 'Low Effort' },
      { id: 'medium', label: 'Medium Effort' },
      { id: 'high', label: 'High Effort' }
    ];
    if (!opts.find(o => o.id === thinkingMode)) {
      thinkingMode = opts[1]?.id || opts[0]?.id || 'medium';
    }
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
      // Refocus the input immediately after sending
      textareaRef.current.focus();
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
      className="border-t px-3 sm:px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0 relative"
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
        <AttachmentPreview attachments={attachments} removeAttachment={removeAttachment} />

        {/* Input Card */}
        <div
          className="rounded-2xl border transition-all duration-200 shadow-xs flex flex-col"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-secondary)',
          }}
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
          />

          {/* Action Toolbar Row */}
          <ActionButtons
            supportsVision={supportsVision}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            setShowModelSelector={setShowModelSelector}
            currentModelName={currentModelName}
            isLoadingModel={isLoadingModel}
            currentModel={currentModel}
            thinkingMode={thinkingMode}
            handleThinkingClick={handleThinkingClick}
            hasWebSearchKey={hasWebSearchKey}
            isWebSearchEnabled={isWebSearchEnabled}
            toggleWebSearch={toggleWebSearch}
            isGenerating={isGenerating}
            stopGeneration={stopGeneration}
            handleSend={handleSend}
            text={text}
            attachmentsLength={attachments.length}
          />
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
                {(currentModel?.capabilities?.thinkingOptions || [
                  { id: 'low', label: 'Low Effort' },
                  { id: 'medium', label: 'Medium Effort' },
                  { id: 'high', label: 'High Effort' }
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setThinkingMode(opt.id, currentModel?.id);
                      setShowThinkingMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      thinkingMode === opt.id
                        ? 'bg-black/10 dark:bg-white/10 font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{ color: thinkingMode === opt.id ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    <span>{opt.label}</span>
                    {thinkingMode === opt.id && <Check size={14} />}
                  </button>
                ))}
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
