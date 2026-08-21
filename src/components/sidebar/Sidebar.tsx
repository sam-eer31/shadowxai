'use client';

import Image from 'next/image';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  X,
  ImageIcon,
} from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { groupConversations } from '@/lib/utils/date-grouping';
import { SidebarItem } from './SidebarItem';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const conversations = useChatStore((s) => s.conversations);
  const newChat = useChatStore((s) => s.newChat);
  
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const openSettings = useUIStore((s) => s.openSettings);

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

  // Auto-close mobile menu after 3 seconds
  useEffect(() => {
    if (activeMenuId !== null) {
      const timer = setTimeout(() => {
        setActiveMenuId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeMenuId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => groupConversations(filtered), [filtered]);

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
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
            </button>
            <div className={`flex items-center ml-2.5 transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <Image src="/logo.svg" alt="Logo" width={22} height={22} priority className="shrink-0 drop-shadow-sm" />
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
            className="w-full flex items-center rounded-xl transition-all duration-150 overflow-hidden h-10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] group"
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

          {/* Image Library Button */}
          <button
            onClick={() => {
              useUIStore.getState().openImageLibrary();
              handleSidebarItemClick();
            }}
            className="w-full flex items-center rounded-xl transition-all duration-150 overflow-hidden h-10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] group"
            style={{
              color: 'var(--text-secondary)',
            }}
            title="Image Library"
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <ImageIcon size={19} />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ml-1 ${
                sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              Image Library
            </span>
          </button>

          {/* Search Button / Input */}
          <div
            className={`
              w-full flex items-center rounded-xl transition-colors overflow-hidden h-10
              ${sidebarOpen ? 'bg-black/5 dark:bg-white/5 border' : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'}
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
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 mr-2"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div
          className={`flex-1 overflow-y-auto px-2.5 py-2 transition-opacity duration-200 ${
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
                  {items.map((conv) => (
                    <SidebarItem
                      key={conv.id}
                      conv={conv}
                      activeMenuId={activeMenuId}
                      setActiveMenuId={setActiveMenuId}
                      handleSidebarItemClick={handleSidebarItemClick}
                    />
                  ))}
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
              openSettings();
              handleSidebarItemClick();
            }}
            className="w-full flex items-center rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 overflow-hidden h-10"
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
