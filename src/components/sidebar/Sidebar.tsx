'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Settings,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  SquarePen,
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

  const groups = {
    'Today': [] as Conversation[],
    'Yesterday': [] as Conversation[],
    'Previous 7 Days': [] as Conversation[],
    'Previous 30 Days': [] as Conversation[],
    'Older': [] as Conversation[]
  };

  conversations.forEach(conv => {
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
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const newChat = useChatStore((s) => s.newChat);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const deleteConv = useChatStore((s) => s.deleteConversation);
  const renameConv = useChatStore((s) => s.renameConversation);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openSettings = useUIStore((s) => s.openSettings);
  const openTools = useUIStore((s) => s.openToolsMarketplace);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => groupConversations(filtered), [filtered]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const finishRename = () => {
    if (editingId && editTitle.trim()) {
      renameConv(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleSidebarItemClick = () => {
    if (isMobile) {
      useUIStore.getState().setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed lg:relative z-40
        h-full flex flex-col shrink-0
        transition-[width,transform] duration-300 ease-in-out
        ${sidebarOpen 
          ? 'w-[260px] translate-x-0 shadow-2xl lg:shadow-none' 
          : 'w-0 -translate-x-full lg:w-[60px] lg:translate-x-0'
        }
        overflow-hidden
      `}
      style={{ 
        background: 'var(--bg-secondary)', 
        borderRight: sidebarOpen || !isMobile ? '1px solid var(--border)' : 'none'
      }}
    >
      <div className="flex flex-col h-full min-w-[260px]">
        {/* Top Toggle Button & Mobile Header */}
        <div className={`flex items-center h-14 shrink-0 px-2.5 transition-opacity duration-300 ${!sidebarOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          {/* Title */}
          <span className={`font-semibold text-sm ml-3 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity delay-150 flex-1`} style={{ color: 'var(--text-primary)' }}>
            Shadow
          </span>
        </div>

        {/* Action Items (New Chat, Search) */}
        <div className="flex flex-col gap-1 px-2.5 mb-2 shrink-0">
          <button
            onClick={() => { newChat(); handleSidebarItemClick(); }}
            className={`
              flex items-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden h-10
              ${sidebarOpen ? 'justify-start' : 'justify-start'}
            `}
            style={{ color: 'var(--text-primary)' }}
            title="New Chat"
          >
            <div className={`w-10 h-10 flex items-center justify-center shrink-0`}>
              <SquarePen size={20} />
            </div>
            <span className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              New Chat
            </span>
          </button>

          <div
            className={`
              flex items-center rounded-lg transition-colors overflow-hidden h-10
              ${sidebarOpen ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'}
            `}
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => { if (!sidebarOpen) toggleSidebar(); }}
            title="Search"
          >
            <div className={`w-10 h-10 flex items-center justify-center shrink-0`}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent outline-none text-sm w-full transition-opacity duration-200 ml-1 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
              style={{ color: 'var(--text-primary)' }}
              tabIndex={sidebarOpen ? 0 : -1}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className={`flex-1 overflow-y-auto px-2.5 scrollbar-hide pb-4 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'No matches' : ''}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label} className="mt-4 first:mt-1">
                  <div className="px-2 mb-1 text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                  </div>
                  {items.map((conv) => (
                    <div
                      key={conv.id}
                      className={`
                        group relative flex items-center px-2 py-2 mb-0.5 rounded-lg cursor-pointer
                        transition-colors duration-150 h-10
                        ${activeId === conv.id
                          ? 'bg-black/5 dark:bg-white/5 font-medium'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }
                      `}
                      style={{
                        color: activeId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                      onClick={() => { setActive(conv.id); handleSidebarItemClick(); }}
                    >
                      {editingId === conv.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={finishRename}
                          onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                          className="flex-1 text-sm bg-transparent outline-none border-b"
                          style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 text-sm truncate relative z-10">{conv.title}</span>
                      )}
                      {/* Hover actions */}
                      <div className={`
                          absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 shrink-0
                          opacity-0 group-hover:opacity-100 transition-opacity z-20
                          bg-gradient-to-l from-[var(--bg-secondary)] pl-4
                        `}
                        style={{
                          background: activeId === conv.id ? 'linear-gradient(to left, var(--bg-secondary) 80%, transparent)' : undefined
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title); }}
                          className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          title="Rename"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConv(conv.id); }}
                          className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                          style={{ color: 'var(--error)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-1 px-2.5 pb-3 pt-2 shrink-0 border-t" style={{ borderColor: sidebarOpen ? 'var(--border)' : 'transparent', transition: 'border-color 0.3s' }}>
          <button
            onClick={() => { openTools(); handleSidebarItemClick(); }}
            className={`
              flex items-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden h-10
              ${sidebarOpen ? 'justify-start' : 'justify-start'}
            `}
            style={{ color: 'var(--text-secondary)' }}
            title="Tools"
          >
            <div className={`w-10 h-10 flex items-center justify-center shrink-0`}>
              <Wrench size={20} />
            </div>
            <span className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Tools & Marketplace
            </span>
          </button>

          <button
            onClick={() => { openSettings(); handleSidebarItemClick(); }}
            className={`
              flex items-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 overflow-hidden h-10
              ${sidebarOpen ? 'justify-start' : 'justify-start'}
            `}
            style={{ color: 'var(--text-secondary)' }}
            title="Settings"
          >
            <div className={`w-10 h-10 flex items-center justify-center shrink-0`}>
              <Settings size={20} />
            </div>
            <span className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Settings
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function SidebarToggle() {
  return null;
}
