import { create } from 'zustand';
import type {
  ProviderCredentials,
  ProviderType,
  ThemeMode,
  ThinkingMode,
  AppSettings,
} from '@/lib/types';
import { setSetting, getSetting } from '@/lib/storage/db';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Answer accurately, clearly, and concisely. Use available tools when useful. Follow the user\'s instructions and never claim to have performed an action you did not perform.';

interface SettingsState {
  // Credentials
  credentials: ProviderCredentials;
  // Settings
  theme: ThemeMode;
  activeProvider: ProviderType;
  webSearchProvider: ProviderType;
  selectedModels: Partial<Record<ProviderType, string>>;
  enabledTools: string[];
  systemPrompt: string;
  contextWindowSize: number;
  thinkingMode: ThinkingMode;
  modelThinkingModes: Record<string, ThinkingMode>;
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
  toggleTool: (toolName: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setContextWindowSize: (size: number) => void;
  setThinkingMode: (mode: ThinkingMode, modelId?: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  credentials: {},
  theme: 'dark',
  activeProvider: 'puter',
  webSearchProvider: 'ollama',
  selectedModels: {},
  enabledTools: ['web_search', 'calculator', 'weather', 'current_time'],
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  contextWindowSize: 20,
  thinkingMode: 'on',
  modelThinkingModes: {},
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    try {
      // Load credentials from localStorage
      const credsStr = localStorage.getItem('shadow-credentials');
      const credentials = credsStr ? JSON.parse(credsStr) : {};

      // Load settings from IndexedDB
      const settings = await getSetting<AppSettings>('app-settings');

      set({
        credentials,
        theme: settings?.theme || 'dark',
        activeProvider: settings?.activeProvider || 'puter',
        webSearchProvider: settings?.webSearchProvider || 'ollama',
        selectedModels: settings?.selectedModels || {},
        enabledTools:
          settings?.enabledTools || [
            'web_search',
            'calculator',
            'weather',
            'current_time',
          ],
        systemPrompt: settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        contextWindowSize: settings?.contextWindowSize || 20,
        thinkingMode: settings?.thinkingMode || 'on',
        modelThinkingModes: settings?.modelThinkingModes || {},
        initialized: true,
      });

      // Apply theme
      const theme = settings?.theme || 'dark';
      applyTheme(theme);
    } catch {
      set({ initialized: true });
    }
  },

  setCredential: (provider, value) => {
    const creds = { ...get().credentials, [provider]: value };
    const stateUpdate: Partial<SettingsState> = { credentials: creds };

    // Auto-select provider based on keys
    const hasOllama = !!creds.ollama?.apiKey;
    const ollamaEnabled = !!creds.ollama?.enabled;
    const hasPuter = !!creds.puter?.signedIn;
    
    let nextProvider = get().activeProvider;
    if (hasOllama && ollamaEnabled) {
      nextProvider = 'ollama';
    } else {
      nextProvider = 'puter';
    }
    stateUpdate.activeProvider = nextProvider;
    
    // Auto-select default models if not selected
    const selectedModels = { ...get().selectedModels };
    let modelsChanged = false;
    
    if (nextProvider === 'ollama' && !selectedModels['ollama']) {
      selectedModels['ollama'] = 'gemma4:cloud';
      modelsChanged = true;
    }
    if (nextProvider === 'puter' && !selectedModels['puter']) {
      selectedModels['puter'] = 'gpt-5.6-luna';
      modelsChanged = true;
    }
    
    if (modelsChanged) {
      stateUpdate.selectedModels = selectedModels;
    }

    set(stateUpdate);
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
    
    if (stateUpdate.activeProvider !== get().activeProvider || modelsChanged) {
      persistSettings(get());
    }
  },

  removeCredential: (provider) => {
    const creds = { ...get().credentials };
    delete creds[provider];
    set({ credentials: creds });
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
  },

  clearAllCredentials: () => {
    set({ credentials: {} });
    localStorage.removeItem('shadow-credentials');
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

  toggleTool: (toolName) => {
    const enabled = get().enabledTools;
    const newEnabled = enabled.includes(toolName)
      ? enabled.filter((t) => t !== toolName)
      : [...enabled, toolName];
    set({ enabledTools: newEnabled });
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
    enabledTools: state.enabledTools,
    systemPrompt: state.systemPrompt,
    contextWindowSize: state.contextWindowSize,
    thinkingMode: state.thinkingMode,
    modelThinkingModes: state.modelThinkingModes,
  };
  setSetting('app-settings', settings).catch(console.error);
}
