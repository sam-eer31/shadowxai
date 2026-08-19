'use client';

import Image from 'next/image';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Settings,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  SquarePen,
  X,
  MoreVertical,
  Edit3,
  Check,
} from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { Conversation } from '@/lib/types';

// Helper to group by date
function groupConversations(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const d = new Date(conv.createdAt || Date.now());
    if (d >= today) groups['Today'].push(conv);
    else if (d >= yesterday) groups['Yesterday'].push(conv);
    else if (d >= last7Days) groups['Previous 7 Days'].push(conv);
    else if (d >= last30Days) groups['Previous 30 Days'].push(conv);
    else groups['Older'].push(conv);
  });

  return groups;
}

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const newChat = useChatStore((s) => s.newChat);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const deleteConv = useChatStore((s) => s.deleteConversation);
  const renameConv = useChatStore((s) => s.renameConversation);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const openSettings = useUIStore((s) => s.openSettings);
  const openTools = useUIStore((s) => s.openToolsMarketplace);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => groupConversations(filtered), [filtered]);

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
    setActiveMenuId(null);
  };

  const finishRename = () => {
    if (editingId && editTitle.trim()) {
      renameConv(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleSidebarItemClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed lg:relative z-50 lg:z-30
        h-full flex flex-col shrink-0
        transition-all duration-300 ease-out
        ${
          sidebarOpen
            ? 'w-[85vw] max-w-[300px] lg:w-[260px] translate-x-0 shadow-2xl lg:shadow-none'
            : '-translate-x-full w-0 lg:w-[60px] lg:translate-x-0'
        }
        overflow-hidden select-none
      `}
      style={{
        background: 'var(--bg-secondary)',
        borderRight: sidebarOpen || !isMobile ? '1px solid var(--border)' : 'none',
      }}
    >
      <div className="flex flex-col h-full w-[85vw] max-w-[300px] lg:w-[260px] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Top Header */}
        <div
          className="flex items-center justify-between h-14 shrink-0 px-2.5 border-b lg:border-none"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center min-w-0">
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
            </button>
            <div className={`flex items-center ml-2.5 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <Image src="/logo.svg" alt="Logo" width={22} height={22} className="shrink-0 drop-shadow-sm" />
              <span
                className="font-semibold text-base tracking-tight truncate ml-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Shadow
              </span>
            </div>
          </div>
        </div>

        {/* Action Items (New Chat, Search) */}
        <div className="flex flex-col gap-1 px-2.5 py-1.5 shrink-0">
          {/* New Chat Button */}
          <button
            onClick={() => {
              newChat();
              handleSidebarItemClick();
            }}
            className="w-full flex items-center rounded-xl transition-all duration-150 overflow-hidden h-10 hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.98] group"
            style={{
              color: 'var(--text-primary)',
            }}
            title="New Chat"
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <SquarePen size={19} style={{ color: 'var(--accent)' }} />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              New Chat
            </span>
          </button>

          {/* Search Button / Input */}
          <div
            className={`
              w-full flex items-center rounded-xl transition-colors overflow-hidden h-10
              ${sidebarOpen ? 'bg-black/5 dark:bg-white/5 border' : 'hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'}
            `}
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
            onClick={() => {
              if (!sidebarOpen) toggleSidebar();
            }}
            title="Search conversations"
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Search size={19} />
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent outline-none text-sm w-full transition-opacity duration-200 ml-1 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{ color: 'var(--text-primary)' }}
              tabIndex={sidebarOpen ? 0 : -1}
            />
            {searchQuery && sidebarOpen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 mr-2"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div
          className={`flex-1 overflow-y-auto px-2.5 scrollbar-hide py-2 transition-opacity duration-200 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No matching conversations' : 'No chats yet'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label} className="mt-3 first:mt-0">
                  <div
                    className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase opacity-70"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {label}
                  </div>
                  {items.map((conv) => {
                    const isSelected = activeId === conv.id;
                    const isMenuOpen = activeMenuId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        className={`
                          group relative flex items-center px-3 py-2.5 my-0.5 rounded-xl cursor-pointer
                          transition-all duration-150 min-h-[40px] touch-manipulation
                          ${
                            isSelected
                              ? 'bg-black/10 dark:bg-white/10 font-medium'
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
                        {editingId === conv.id ? (
                          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={finishRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') finishRename();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 text-sm bg-transparent outline-none border-b py-0.5"
                              style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
                            />
                            <button
                              onClick={finishRename}
                              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-emerald-500"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="flex-1 text-sm truncate pr-6">{conv.title}</span>
                        )}

                        {/* Mobile and Desktop Action buttons */}
                        {editingId !== conv.id && (
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
                                  startRename(conv.id, conv.title);
                                }}
                                className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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
                                className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400"
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
                                      onClick={() => startRename(conv.id, conv.title)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      <Edit3 size={14} />
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => {
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
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="flex flex-col gap-1 px-2.5 pt-2 pb-1 shrink-0 border-t"
          style={{
            borderColor: sidebarOpen ? 'var(--border)' : 'transparent',
          }}
        >
          <button
            onClick={() => {
              openTools();
              handleSidebarItemClick();
            }}
            className="w-full flex items-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden h-10"
            style={{ color: 'var(--text-secondary)' }}
            title="Tools & Marketplace"
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Wrench size={19} />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              Tools & Marketplace
            </span>
          </button>

          <button
            onClick={() => {
              openSettings();
              handleSidebarItemClick();
            }}
            className="w-full flex items-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden h-10"
            style={{ color: 'var(--text-secondary)' }}
            title="Settings"
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Settings size={19} />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              Settings
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
