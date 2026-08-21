'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ToastContainer } from '@/components/ui/Toast';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { ImageLibrary } from '@/components/images/ImageLibrary';

export default function Home() {
  const initSettings = useSettingsStore((s) => s.initialize);
  const settingsInitialized = useSettingsStore((s) => s.initialized);
  
  const initChat = useChatStore((s) => s.initialize);
  const chatInitialized = useChatStore((s) => s.initialized);
  
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const imageLibraryOpen = useUIStore((s) => s.imageLibraryOpen);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const initUI = useUIStore((s) => s.initializeUI);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initSettings();
    initChat();
    initUI();
    setMounted(true);
  }, [initSettings, initChat, initUI]);

  if (!mounted || !settingsInitialized || !chatInitialized) return null;

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full w-full overflow-hidden">
        <ChatArea />
      </main>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal />}

      {/* Image Library */}
      {imageLibraryOpen && <ImageLibrary />}

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
