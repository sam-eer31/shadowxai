import React from 'react';
import { X, Book, Image as ImageIcon, Code, AlignLeft, Info } from 'lucide-react';
import type { Scratchpad } from '@/lib/types';

interface ScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  scratchpad: Scratchpad;
  conversationTitle: string;
  unassignedUserCount: number;
}

export function ScratchpadModal({ isOpen, onClose, scratchpad, conversationTitle, unassignedUserCount }: ScratchpadModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      <div className="relative w-full h-full md:h-auto md:max-h-[85vh] md:w-[600px] bg-white dark:bg-[#1C1C1C] md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            <Book size={18} className="text-blue-500" />
            Active Scratchpad
            <span className="text-xs font-normal text-gray-500 ml-2 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full" title="Messages since last summary">
              {unassignedUserCount}/11
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="text-sm text-gray-500 mb-2">
            Conversation: <span className="font-medium text-gray-900 dark:text-gray-200">{conversationTitle}</span>
          </div>

          {/* Summary Section */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlignLeft size={14} className="text-indigo-500" />
              Summary
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded-lg p-3 leading-relaxed whitespace-pre-wrap space-y-4">
              {scratchpad.summaries && scratchpad.summaries.length > 0 ? (
                scratchpad.summaries.map((summary, idx) => (
                  <div key={idx} className="border-b border-black/10 dark:border-white/10 pb-3 last:border-0 last:pb-0">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-indigo-500 block mb-1">
                      Part {idx + 1}
                    </span>
                    {summary}
                  </div>
                ))
              ) : (
                <span className="italic opacity-50">No summary generated yet.</span>
              )}
            </div>
          </section>

          {/* Important Facts Section */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info size={14} className="text-amber-500" />
              Important Facts
            </h3>
            {scratchpad.importantFacts?.length > 0 ? (
              <ul className="space-y-2">
                {scratchpad.importantFacts.map((fact) => (
                  <li key={fact.id} className="text-sm text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded-lg p-3 border border-black/5 dark:border-white/5 whitespace-pre-wrap">
                    {fact.content}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm italic opacity-50 text-gray-700 dark:text-gray-300">No important facts recorded.</div>
            )}
          </section>

          {/* Artifacts Section */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Code size={14} className="text-green-500" />
              Generated Artifacts
            </h3>
            {scratchpad.artifacts?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scratchpad.artifacts.map((artifact) => (
                  <div key={artifact.id} className="flex flex-col gap-1 text-sm bg-black/5 dark:bg-white/5 rounded-lg p-3 border border-black/5 dark:border-white/5">
                    <span className="font-medium text-gray-900 dark:text-white break-all">{artifact.filename}</span>
                    <span className="text-xs text-gray-500 truncate" title={artifact.description}>{artifact.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm italic opacity-50 text-gray-700 dark:text-gray-300">No artifacts generated.</div>
            )}
          </section>

          {/* Images Section */}
          <section>
            <h3 className="text-[13px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ImageIcon size={14} className="text-pink-500" />
              Generated Images
            </h3>
            {scratchpad.generatedImages?.length > 0 ? (
              <ul className="space-y-2">
                {scratchpad.generatedImages.map((img, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded-lg p-3 border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prompt:</span>
                    <span className="italic">"{img.promptUsed}"</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm italic opacity-50 text-gray-700 dark:text-gray-300">No images generated.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
