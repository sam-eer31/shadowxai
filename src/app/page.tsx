'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ToolsMarketplace } from '@/components/tools/ToolsMarketplace';
import { ToastContainer } from '@/components/ui/Toast';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

export default function Home() {
  const initSettings = useSettingsStore((s) => s.initialize);
  const initChat = useChatStore((s) => s.initialize);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const toolsOpen = useUIStore((s) => s.toolsMarketplaceOpen);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  useEffect(() => {
    initSettings();
    initChat();
  }, [initSettings, initChat]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatArea />
      </main>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal />}

      {/* Tools Marketplace */}
      {toolsOpen && <ToolsMarketplace />}

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
