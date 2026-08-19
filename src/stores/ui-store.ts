import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  settingsTab: string;
  toolsMarketplaceOpen: boolean;
  toasts: Toast[];
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: string) => void;
  openToolsMarketplace: () => void;
  closeToolsMarketplace: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  initializeUI: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  settingsOpen: false,
  settingsTab: 'providers',
  toolsMarketplaceOpen: false,
  toasts: [],

  toggleSidebar: () => set((s) => {
    const newOpen = !s.sidebarOpen;
    if (typeof window !== 'undefined') localStorage.setItem('shadow_sidebar', String(newOpen));
    return { sidebarOpen: newOpen };
  }),
  setSidebarOpen: (open) => {
    if (typeof window !== 'undefined') localStorage.setItem('shadow_sidebar', String(open));
    set({ sidebarOpen: open });
  },

  openSettings: (tab) =>
    set({ settingsOpen: true, settingsTab: tab || 'providers' }),
  closeSettings: () => set({ settingsOpen: false }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  openToolsMarketplace: () => set({ toolsMarketplaceOpen: true }),
  closeToolsMarketplace: () => set({ toolsMarketplaceOpen: false }),

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    const duration = toast.duration || 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  initializeUI: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shadow_sidebar');
      if (saved === 'false') set({ sidebarOpen: false });
    }
  },
}));
