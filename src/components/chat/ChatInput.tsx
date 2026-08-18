'use client';

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react';
import { Send, Square, ImagePlus, X, Wrench, ChevronDown, Brain } from 'lucide-react';
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
  const [showThinkingMenu, setShowThinkingMenu] = useState(false);

  // Check if current model supports vision
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
    return () => { active = false; };
  }, [activeProvider, selectedModels]);

  const supportsVision = currentModel?.capabilities?.vision ?? false;
  let thinkingMode = currentModel?.id ? (modelThinkingModes[currentModel.id] || fallbackThinkingMode) : fallbackThinkingMode;
  if (currentModel?.capabilities?.thinking === 'levels' && (!thinkingMode || thinkingMode === 'off')) {
    thinkingMode = 'low';
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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

  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        {/* Drag overlay */}
        {isDragging && (
          <div
            className="mb-3 p-6 rounded-xl border-2 border-dashed text-center animate-fade-in"
            style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}
          >
            <ImagePlus size={24} style={{ color: 'var(--accent)' }} className="mx-auto mb-1" />
            <p className="text-sm" style={{ color: 'var(--accent)' }}>Drop image here</p>
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group rounded-lg overflow-hidden"
                style={{ width: 64, height: 64 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div
          className="flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-offset-0"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-secondary)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        >
          {/* Image upload button */}
          {supportsVision && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0 mb-0.5"
                style={{ color: 'var(--text-tertiary)' }}
                title="Upload image"
              >
                <ImagePlus size={18} />
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

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Shadow..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5"
            style={{
              color: 'var(--text-primary)',
              maxHeight: 200,
            }}
            disabled={isGenerating}
          />

          {/* Model selector */}
          <div className="relative shrink-0 mb-0.5">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ChevronDown size={12} />
            </button>
            {showModelSelector && (
              <ModelSelector onClose={() => setShowModelSelector(false)} />
            )}
          </div>

          {/* Tool indicator */}
          {enabledTools.length > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs shrink-0 mb-0.5"
              style={{ color: 'var(--text-tertiary)' }}
              title={`${enabledTools.length} tools enabled`}
            >
              <Wrench size={12} />
              <span>{enabledTools.length}</span>
            </div>
          )}

          {/* Thinking selector */}
          {isLoadingModel ? (
            <div className="relative shrink-0 mb-0.5 animate-fade-in">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-default select-none animate-pulse"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Brain size={12} />
                <span className="font-medium">Loading...</span>
              </div>
            </div>
          ) : currentModel?.capabilities?.thinking && currentModel.capabilities.thinking !== 'none' ? (
            <div className="relative shrink-0 mb-0.5 animate-fade-in">
              {currentModel.capabilities.thinking === 'always_on' ? (
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-default select-none"
                  style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
                  title="Thinking is always enabled and cannot be turned off for this model"
                >
                  <Brain size={12} />
                  <span className="font-medium">Always On</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowThinkingMenu(!showThinkingMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                    style={{ 
                      color: thinkingMode !== 'off' ? 'var(--accent)' : 'var(--text-tertiary)',
                      background: thinkingMode !== 'off' ? 'var(--accent-light)' : 'transparent'
                    }}
                    title="Thinking Mode"
                  >
                    <Brain size={12} />
                    <span className="font-medium capitalize">{thinkingMode}</span>
                  </button>
                  {showThinkingMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowThinkingMenu(false)}
                      />
                      <div 
                        className="absolute bottom-full right-0 mb-2 w-32 rounded-xl border shadow-lg overflow-hidden z-50 text-xs"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <div className="px-3 py-2 border-b font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                          Thinking Mode
                        </div>
                        <div className="flex flex-col py-1">
                          {currentModel.capabilities.thinking !== 'levels' && (
                            <button
                              onClick={() => { setThinkingMode('off', currentModel?.id); setShowThinkingMenu(false); }}
                              className="text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ color: thinkingMode === 'off' ? 'var(--accent)' : 'var(--text-secondary)' }}
                            >
                              Off
                            </button>
                          )}
                          {currentModel.capabilities.thinking === 'on_off' && (
                            <button
                              onClick={() => { setThinkingMode('on', currentModel?.id); setShowThinkingMenu(false); }}
                              className="text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ color: thinkingMode === 'on' ? 'var(--accent)' : 'var(--text-secondary)' }}
                            >
                              On
                            </button>
                          )}
                          {currentModel.capabilities.thinking === 'levels' && (
                            <>
                              <button
                                onClick={() => { setThinkingMode('low', currentModel?.id); setShowThinkingMenu(false); }}
                                className="text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ color: thinkingMode === 'low' ? 'var(--accent)' : 'var(--text-secondary)' }}
                              >
                                Low Effort
                              </button>
                              <button
                                onClick={() => { setThinkingMode('medium', currentModel?.id); setShowThinkingMenu(false); }}
                                className="text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ color: thinkingMode === 'medium' ? 'var(--accent)' : 'var(--text-secondary)' }}
                              >
                                Medium Effort
                              </button>
                              <button
                                onClick={() => { setThinkingMode('high', currentModel?.id); setShowThinkingMenu(false); }}
                                className="text-left px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ color: thinkingMode === 'high' ? 'var(--accent)' : 'var(--text-secondary)' }}
                              >
                                High Effort
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* Send / Stop button */}
          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-105 shrink-0"
              style={{
                background: 'var(--error)',
                color: 'white',
              }}
              title="Stop generation"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim() && attachments.length === 0}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                color: 'white',
              }}
              title="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          Press Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
