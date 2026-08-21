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

function getAvailableTools(creds: ProviderCredentials): Set<string> {
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

  return available;
}

function syncEnabledTools(enabled: string[], oldCreds: ProviderCredentials, newCreds: ProviderCredentials): string[] {
  const oldAvailable = getAvailableTools(oldCreds);
  const newAvailable = getAvailableTools(newCreds);
  const enabledTools = new Set(enabled);

  for (const tool of ['web_search', 'image_generation', 'calculator', 'weather', 'current_time']) {
    if (newAvailable.has(tool) && !oldAvailable.has(tool)) {
      enabledTools.add(tool);
    } else if (!newAvailable.has(tool)) {
      enabledTools.delete(tool);
    }
  }

  return Array.from(enabledTools);
}

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
  toggleTool: (toolName: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setContextWindowSize: (size: number) => void;
  setSelectedImageModel: (model: string) => void;
  setThinkingMode: (mode: ThinkingMode, modelId?: string) => void;
  setUserLocation: (location: string) => void;
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
  selectedImageModel: 'black-forest-labs/flux-2-klein-4b',
  thinkingMode: 'on',
  modelThinkingModes: {},
  userLocation: '',
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    try {
      // Load credentials from localStorage
      const credsStr = localStorage.getItem('shadow-credentials');
      const credentials = credsStr ? JSON.parse(credsStr) : {};

      // Load settings from IndexedDB
      const settings = await getSetting<AppSettings>('app-settings');

      let initialEnabledTools = settings?.enabledTools || [
        'web_search',
        'calculator',
        'weather',
        'current_time',
      ];
      
      // Cleanup invalid tools from initial state based on credentials
      const validAvailable = getAvailableTools(credentials);
      initialEnabledTools = initialEnabledTools.filter(t => validAvailable.has(t));

      set({
        credentials,
        theme: settings?.theme || 'dark',
        activeProvider: settings?.activeProvider || 'puter',
        webSearchProvider: settings?.webSearchProvider || 'ollama',
        selectedModels: settings?.selectedModels || {},
        enabledTools: initialEnabledTools,
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
    const stateUpdate: Partial<SettingsState> = { credentials: creds };

    // We no longer aggressively auto-switch activeProvider here.
    // The user explicitly selects their provider/model from the ModelSelector UI.
    
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

    // Auto-enable or disable tools based on credentials
    stateUpdate.enabledTools = syncEnabledTools(get().enabledTools, oldCreds, creds);

    set(stateUpdate);
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
    
    persistSettings(get());
  },

  removeCredential: (provider) => {
    const oldCreds = get().credentials;
    const creds = { ...oldCreds };
    delete creds[provider];
    const newEnabledTools = syncEnabledTools(get().enabledTools, oldCreds, creds);
    set({ credentials: creds, enabledTools: newEnabledTools });
    localStorage.setItem('shadow-credentials', JSON.stringify(creds));
    persistSettings(get());
  },

  clearAllCredentials: () => {
    const oldCreds = get().credentials;
    const creds = {};
    const newEnabledTools = syncEnabledTools(get().enabledTools, oldCreds, creds);
    set({ credentials: creds, enabledTools: newEnabledTools });
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

  toggleTool: (toolName) => {
    const creds = get().credentials;
    
    const available = getAvailableTools(creds);
    if (!available.has(toolName)) return; // Prevent toggle if not available

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
    enabledTools: state.enabledTools,
    systemPrompt: state.systemPrompt,
    contextWindowSize: state.contextWindowSize,
    selectedImageModel: state.selectedImageModel,
    thinkingMode: state.thinkingMode,
    modelThinkingModes: state.modelThinkingModes,
    userLocation: state.userLocation,
  };
  setSetting('app-settings', settings).catch(console.error);
}
