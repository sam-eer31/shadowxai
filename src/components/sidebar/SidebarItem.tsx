import { useState, useRef, useEffect } from 'react';
import { Check, Loader2, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { Conversation } from '@/lib/types';

interface SidebarItemProps {
  conv: Conversation;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  handleSidebarItemClick: () => void;
}

export function SidebarItem({
  conv,
  activeMenuId,
  setActiveMenuId,
  handleSidebarItemClick,
}: SidebarItemProps) {
  const activeId = useChatStore((s) => s.activeConversationId);
  const generations = useChatStore((s) => s.generations);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const deleteConv = useChatStore((s) => s.deleteConversation);
  const renameConv = useChatStore((s) => s.renameConversation);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isSelected = activeId === conv.id;
  const isMenuOpen = activeMenuId === conv.id;
  const isGenerating = generations[conv.id]?.isGenerating;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const startRename = () => {
    setEditTitle(conv.title);
    setIsEditing(true);
    setActiveMenuId(null);
  };

  const finishRename = () => {
    if (editTitle.trim() && editTitle !== conv.title) {
      renameConv(conv.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`
        group relative flex items-center px-3 py-2.5 my-0.5 rounded-xl cursor-pointer
        transition-all duration-150 min-h-[40px] touch-manipulation
        ${isMenuOpen ? 'z-50' : 'z-10'}
        ${
          isSelected
            ? 'bg-black/5 dark:bg-white/5 font-medium'
            : 'hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10'
        }
      `}
      style={{
        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onClick={() => {
        setActive(conv.id);
        handleSidebarItemClick();
      }}
    >
      {isEditing ? (
        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={finishRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="flex-1 text-sm bg-transparent outline-none border-b py-0.5"
            style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={finishRename}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-emerald-500"
          >
            <Check size={14} />
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-w-0 pr-6 gap-2">
          <span className="text-sm truncate">{conv.title}</span>
          {isGenerating && (
            <Loader2 size={12} className="animate-spin shrink-0 text-emerald-500" />
          )}
        </div>
      )}

      {/* Mobile and Desktop Action buttons */}
      {!isEditing && (
        <>
          {/* Desktop hover actions */}
          <div
            className={`
              hidden lg:flex absolute right-1.5 top-1/2 -translate-y-1/2 items-center gap-0.5
              opacity-0 group-hover:opacity-100 transition-opacity z-10
              px-1 rounded-lg backdrop-blur-md
            `}
            style={{
              background: isSelected
                ? 'var(--bg-secondary)'
                : 'var(--bg-secondary)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Rename"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConv(conv.id);
              }}
              className="p-1.5 rounded-md hover:bg-red-500/20 transition-colors text-red-500"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Mobile 3-dot trigger & dropdown */}
          <div className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : conv.id);
              }}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400"
              aria-label="Conversation options"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                  }}
                />
                <div
                  className="absolute right-0 top-full mt-1 w-32 rounded-xl border shadow-xl py-1 z-40 animate-fade-in"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Edit3 size={14} />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConv(conv.id);
                      setActiveMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-500/10 text-red-500"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
