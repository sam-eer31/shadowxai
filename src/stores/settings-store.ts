import { create } from 'zustand';
import type {
  ProviderCredentials,
  ProviderType,
  ThemeMode,
  ThinkingMode,
  AppSettings,
} from '@/lib/types';
import { setSetting, getSetting } from '@/lib/storage/db';
import { useUIStore } from './ui-store';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Answer accurately, clearly, and concisely. Use available tools when useful. Follow the user\'s instructions and never claim to have performed an action you did not perform.';

export function getAvailableTools(creds: ProviderCredentials): Set<string> {
  const available = new Set<string>();
  
  if ((creds as any).tavily?.apiKey) {
    available.add('web_search');
  }

  const hasPuter = (creds as any).puter?.signedIn;
  const hasCloudflare = (creds as any).cloudflare?.accountId && (creds as any).cloudflare?.apiToken && (creds as any).cloudflare?.enabled !== false;
  if (hasPuter || hasCloudflare) {
    available.add('image_generation');
  }

  available.add('calculator');
  available.add('weather');
  available.add('current_time');
  available.add('create_artifact');
  available.add('read_artifact');
  available.add('get_tool_definitions');

  return available;
}

function syncWebSearchEnabled(wasEnabled: boolean, oldCreds: ProviderCredentials, newCreds: ProviderCredentials): boolean {
  const oldAvailable = getAvailableTools(oldCreds);
  const newAvailable = getAvailableTools(newCreds);
  
  if (newAvailable.has('web_search') && !oldAvailable.has('web_search')) {
    return true; // Auto-enable when key added
  } else if (!newAvailable.has('web_search')) {
    return false; // Auto-disable when key removed
  }
  return wasEnabled;
}

function getConfiguredProviders(creds: ProviderCredentials): ProviderType[] {
  const providers: ProviderType[] = [];
  if (creds.puter?.signedIn) providers.push('puter');
  if (creds.ollama?.apiKey) providers.push('ollama');
  if (creds.cloudflare?.accountId && creds.cloudflare?.apiToken) providers.push('cloudflare');
  return providers;
}

function getEnabledProviders(creds: ProviderCredentials): ProviderType[] {
  const configured = getConfiguredProviders(creds);
  const enabled: ProviderType[] = [];
  if (configured.includes('puter')) enabled.push('puter');
  if (configured.includes('ollama') && creds.ollama?.enabled !== false) enabled.push('ollama');
  if (configured.includes('cloudflare') && creds.cloudflare?.enabled !== false) enabled.push('cloudflare');
  
  if (enabled.length === 0 && configured.length > 0) {
    return [configured[0]];
  }
  return enabled;
}

interface SettingsState {
  // Credentials
  credentials: ProviderCredentials;
  // Settings
  theme: ThemeMode;
  activeProvider: ProviderType;
  webSearchProvider: ProviderType;
  selectedModels: Partial<Record<ProviderType, string>>;
  isWebSearchEnabled: boolean;
  systemPrompt: string;
  contextWindowSize: number;
  selectedImageModel?: string;
  thinkingMode: ThinkingMode;
  modelThinkingModes: Record<string, ThinkingMode>;
  userLocation: string;
  // Initialization
  initialized: boolean;
  // Actions
  initialize: () => Promise<void>;
  setCredential: (
    provider: keyof ProviderCredentials,
    value: ProviderCredentials[keyof ProviderCredentials]
  ) => void;
  removeCredential: (provider: keyof ProviderCredentials) => void;
  clearAllCredentials: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveProvider: (provider: ProviderType) => void;
  setWebSearchProvider: (provider: ProviderType) => void;
  setSelectedModel: (provider: ProviderType, model: string) => void;
  toggleWebSearch: () => void;
  setSystemPrompt: (prompt: string) => void;
  setContextWindowSize: (size: number) => void;
  setSelectedImageModel: (model: string) => void;
  setThinkingMode: (mode: ThinkingMode, modelId?: string) => void;
  setUserLocation: (location: string) => void;
  getEnabledProvidersList: () => ProviderType[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  credentials: {},
  theme: 'dark',
  activeProvider: 'puter',
  webSearchProvider: 'ollama',
  selectedModels: {},
  isWebSearchEnabled: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  contextWindowSize: 20,
  selectedImageModel: 'black-forest-labs/flux-2-klein-4b',
  thinkingMode: 'on',
  modelThinkingModes: {},
  userLocation: '',
  initialized: false,
  getEnabledProvidersList: () => getEnabledProviders(get().credentials),

  initialize: async () => {
    if (get().initialized) return;

    try {
      // Load credentials from localStorage
      const credsStr = localStorage.getItem('shadow-credentials');
      const credentials = credsStr ? JSON.parse(credsStr) : {};

      // Load settings from IndexedDB
      const settings = await getSetting<AppSettings>('app-settings');

      // Initialize web search toggle based on credentials
      const validAvailable = getAvailableTools(credentials);
      let initialWebSearch = settings?.isWebSearchEnabled ?? false;
      if (!validAvailable.has('web_search')) {
        initialWebSearch = false;
      }

      set({
        credentials,
        theme: settings?.theme || 'dark',
        activeProvider: settings?.activeProvider || 'puter',
        webSearchProvider: settings?.webSearchProvider || 'ollama',
        selectedModels: settings?.selectedModels || {},
        isWebSearchEnabled: initialWebSearch,
        systemPrompt: settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        contextWindowSize: settings?.contextWindowSize || 20,
        selectedImageModel: settings?.selectedImageModel || 'black-forest-labs/flux-2-klein-4b',
        thinkingMode: settings?.thinkingMode || 'on',
        modelThinkingModes: settings?.modelThinkingModes || {},
        userLocation: settings?.userLocation || '',
        initialized: true,
      });

      // Apply theme
      const theme = settings?.theme || 'dark';
      applyTheme(theme);

      // Auto-detect location silently via IP if not set
      if (!settings?.userLocation) {
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const data = await res.json();
            if (data.city && data.country_name) {
              const loc = `${data.city}, ${data.country_name}`;
              get().setUserLocation(loc);
            }
          }
        } catch (e) {
          console.error('Failed to auto-detect location silently:', e);
        }
      }
    } catch {
      set({ initialized: true });
    }
  },

  setCredential: (provider, value) => {
    const oldCreds = get().credentials;
    const creds = { ...oldCreds, [provider]: value };
    
    // Prevent disabling the only configured provider
    const configured = getConfiguredProviders(creds);
    if (configured.length === 1 && configured[0] === provider && (value as any).enabled === false) {
      (value as any).enabled = true;
      (creds as any)[provider] = value;
      // Also notify user
      if (typeof window !== 'undefined') {
        useUIStore.getState().addToast({ type: 'warning', message: 'Cannot disable the only configured provider.' });
      }
    }

    const stateUpdate: Partial<SettingsState> = { credentials: creds };

    // Auto-select default models if not selected
    const selectedModels = { ...get().selectedModels };
    let modelsChanged = false;
    
    if (provider === 'ollama' && !selectedModels['ollama']) {
      selectedModels['ollama'] = 'gemma4:cloud';
      modelsChanged = true;
    }
    if (provider === 'puter' && !selectedModels['puter']) {
      selectedModels['puter'] = 'deepseek-v4-flash';
      modelsChanged = true;
    }
    
    if (modelsChanged) {
      stateUpdate.selectedModels = selectedModels;
    }

    // Auto-switch activeProvider if current one is not enabled
    const enabled = getEnabledProviders(creds);
    if (enabled.length > 0 && !enabled.includes(get().activeProvider)) {
      stateUpdate.activeProvider = enabled[0];
    } else if (enabled.length === 0) {
      stateUpdate.activeProvider = 'puter'; // Fallback
    }

    // Auto-enable or disable tools based on credentials
    stateUpdate.isWebSearchEnabled = syncWebSearchEnabled(get().isWebSearchEnabled, oldCreds, creds);

    set(stateUpdate);
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
    
    persistSettings(get());
  },

  removeCredential: (provider) => {
    const oldCreds = get().credentials;
    const creds = { ...oldCreds };
    delete creds[provider];
    
    const stateUpdate: Partial<SettingsState> = { credentials: creds };
    
    const enabled = getEnabledProviders(creds);
    if (enabled.length > 0) {
      if (!enabled.includes(get().activeProvider)) {
        stateUpdate.activeProvider = enabled[0];
      }
      
      // If a provider was forcefully enabled as a fallback, update its credentials
      enabled.forEach(p => {
        if (creds[p] && (creds[p] as any).enabled === false) {
          (creds[p] as any).enabled = true;
        }
      });
    } else {
      stateUpdate.activeProvider = 'puter'; // fallback
    }

    stateUpdate.isWebSearchEnabled = syncWebSearchEnabled(get().isWebSearchEnabled, oldCreds, creds);
    
    set(stateUpdate);
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
    persistSettings(get());
  },

  clearAllCredentials: () => {
    const oldCreds = get().credentials;
    const creds = {};
    const newWebSearchEnabled = syncWebSearchEnabled(get().isWebSearchEnabled, oldCreds, creds);
    set({ credentials: creds, isWebSearchEnabled: newWebSearchEnabled });
    localStorage.removeItem('shadow-credentials');
    persistSettings(get());
  },

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
    persistSettings(get());
  },

  setActiveProvider: (provider) => {
    set({ activeProvider: provider });
    persistSettings(get());
  },

  setWebSearchProvider: (provider) => {
    set({ webSearchProvider: provider });
    persistSettings(get());
  },

  setSelectedModel: (provider, model) => {
    const models = { ...get().selectedModels, [provider]: model };
    set({ selectedModels: models });
    persistSettings(get());
  },

  toggleWebSearch: () => {
    const creds = get().credentials;
    const available = getAvailableTools(creds);
    if (!available.has('web_search')) return; // Prevent toggle if not available

    set({ isWebSearchEnabled: !get().isWebSearchEnabled });
    persistSettings(get());
  },

  setSystemPrompt: (prompt) => {
    set({ systemPrompt: prompt });
    persistSettings(get());
  },

  setContextWindowSize: (size) => {
    set({ contextWindowSize: size });
    persistSettings(get());
  },

  setSelectedImageModel: (model) => {
    set({ selectedImageModel: model });
    persistSettings(get());
  },

  setThinkingMode: (mode, modelId) => {
    if (modelId) {
      set((state) => ({
        modelThinkingModes: { ...state.modelThinkingModes, [modelId]: mode },
      }));
    } else {
      set({ thinkingMode: mode });
    }
    persistSettings(get());
  },

  setUserLocation: (location) => {
    set({ userLocation: location });
    persistSettings(get());
  },
}));

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  localStorage.setItem('shadow_theme', theme);
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', isDark);
  } else {
    html.classList.toggle('dark', theme === 'dark');
  }
}

function persistSettings(state: SettingsState) {
  const settings: AppSettings = {
    theme: state.theme,
    activeProvider: state.activeProvider,
    webSearchProvider: state.webSearchProvider,
    selectedModels: state.selectedModels,
    isWebSearchEnabled: state.isWebSearchEnabled,
    systemPrompt: state.systemPrompt,
    contextWindowSize: state.contextWindowSize,
    selectedImageModel: state.selectedImageModel,
    thinkingMode: state.thinkingMode,
    modelThinkingModes: state.modelThinkingModes,
    userLocation: state.userLocation,
  };
  setSetting('app-settings', settings).catch(console.error);
}
