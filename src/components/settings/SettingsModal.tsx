'use client';

import {
  X,
  Settings,
  Palette,
  MessageSquare,
  Shield,
  Key,
  Wrench,
  Database,
  Blocks,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

// Import newly extracted tab components
import { ProvidersTab } from './tabs/ProvidersTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { ChatTab } from './tabs/ChatTab';
import { DataTab } from './tabs/DataTab';
import { AboutTab } from './tabs/AboutTab';
import { ToolsTab } from './tabs/ToolsTab';
import { ServicesTab } from './tabs/ServicesTab';

const TABS = [
  { id: 'providers', label: 'Providers', icon: Key },
  { id: 'services', label: 'Services', icon: Blocks },
  { id: 'tools', label: 'Capabilities', icon: Wrench },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Shield },
];

export function SettingsModal() {
  const closeSettings = useUIStore((s) => s.closeSettings);
  const activeTab = useUIStore((s) => s.settingsTab);
  const setTab = useUIStore((s) => s.setSettingsTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettings();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Modal */}
      <div
        className={`
          relative w-full h-full md:h-[620px] md:max-h-[88vh] md:max-w-2xl
          md:rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col
          pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]
        `}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              <Settings size={17} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h2>
          </div>
          <button
            onClick={closeSettings}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Horizontal Tabs (< md screens) */}
        <div
          className="flex md:hidden overflow-x-auto scrollbar-hide px-3 py-2 border-b gap-1.5 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0
                  ${isSelected ? 'shadow-xs font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'}
                `}
                style={{
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop Tab Navigation (>= md screens) */}
          <div
            className="hidden md:flex flex-col w-48 shrink-0 border-r py-3 px-2 gap-1 overflow-y-auto"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            {TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors
                    ${isSelected ? 'font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'}
                  `}
                  style={{
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
            {activeTab === 'providers' && <ProvidersTab />}
            {activeTab === 'services' && <ServicesTab />}
            {activeTab === 'tools' && <ToolsTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'chat' && <ChatTab />}
            {activeTab === 'data' && <DataTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
