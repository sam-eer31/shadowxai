'use client';

import { useState, useRef } from 'react';
import {
  X,
  Settings,
  Palette,
  MessageSquare,
  Database,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Download,
  Upload,
  Key,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { getChatProvider, getImageProvider } from '@/lib/providers';
import {
  exportConversations,
  validateImportData,
  importConversations,
} from '@/lib/storage/db';
import type { AIModel, ThemeMode } from '@/lib/types';

const TABS = [
  { id: 'providers', label: 'Providers', icon: Key },
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

// ---- Providers Tab ----

function ProvidersTab() {
  return (
    <div className="space-y-6">
      <OllamaConfig />
      <hr style={{ borderColor: 'var(--border)' }} />
      <GeminiConfig />
      <hr style={{ borderColor: 'var(--border)' }} />
      <CloudflareConfig />
      <hr style={{ borderColor: 'var(--border)' }} />
      <TavilyConfig />
      <hr style={{ borderColor: 'var(--border)' }} />
      <div>
        <button
          onClick={() => {
            useSettingsStore.getState().clearAllCredentials();
            useUIStore.getState().addToast({ type: 'success', message: 'All credentials cleared.' });
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/10 active:scale-98"
          style={{ color: 'var(--error)' }}
        >
          <Trash2 size={14} />
          Clear All Credentials
        </button>
      </div>
    </div>
  );
}

function OllamaConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const [apiKey, setApiKey] = useState(credentials.ollama?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);

  const handleSave = () => {
    if (apiKey.trim()) {
      setCredential('ollama', { apiKey: apiKey.trim() });
      useUIStore.getState().addToast({ type: 'success', message: 'Ollama API key saved.' });
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setCredential('ollama', { apiKey: apiKey.trim() });
    setTesting(true);
    setTestResult(null);
    const provider = getChatProvider('ollama');
    if (provider) {
      const result = await provider.testConnection();
      setTestResult(result);
      if (result.success) {
        const m = await provider.listModels();
        setModels(m);
      }
    }
    setTesting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Ollama Cloud
        </h3>
        <a
          href="https://ollama.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Get API Key &rarr;
        </a>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Ollama API key"
                className="w-full px-3.5 py-2.5 pr-10 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Toggle password visibility"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Save
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 active:scale-95"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
              </button>
            </div>
          </div>
          {credentials.ollama && (
            <button
              onClick={() => {
                removeCredential('ollama');
                setApiKey('');
                setModels([]);
              }}
              className="text-xs mt-2 transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Remove credential
            </button>
          )}
        </div>

        {testResult && (
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={15} /> : <XCircle size={15} />}
            <span>{testResult.success ? 'Connected successfully!' : testResult.error}</span>
          </div>
        )}

        {models.length > 0 && (
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Default Model
            </label>
            <select
              value={selectedModels.ollama || ''}
              onChange={(e) => setSelectedModel('ollama', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select a model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function GeminiConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const [apiKey, setApiKey] = useState(credentials.gemini?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);

  const handleSave = () => {
    if (apiKey.trim()) {
      setCredential('gemini', { apiKey: apiKey.trim() });
      useUIStore.getState().addToast({ type: 'success', message: 'Gemini API key saved.' });
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setCredential('gemini', { apiKey: apiKey.trim() });
    setTesting(true);
    setTestResult(null);
    const provider = getChatProvider('gemini');
    if (provider) {
      const result = await provider.testConnection();
      setTestResult(result);
      if (result.success) {
        const m = await provider.listModels();
        setModels(m);
      }
    }
    setTesting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Google Gemini
        </h3>
        <a
          href="https://aistudio.google.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Get API Key &rarr;
        </a>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3.5 py-2.5 pr-10 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Toggle password visibility"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Save
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !apiKey.trim()}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 active:scale-95"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
              </button>
            </div>
          </div>
          {credentials.gemini && (
            <button
              onClick={() => {
                removeCredential('gemini');
                setApiKey('');
                setModels([]);
              }}
              className="text-xs mt-2 transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Remove credential
            </button>
          )}
        </div>

        {testResult && (
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={15} /> : <XCircle size={15} />}
            <span>{testResult.success ? 'Connected successfully!' : testResult.error}</span>
          </div>
        )}

        {models.length > 0 && (
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Default Model
            </label>
            <select
              value={selectedModels.gemini || ''}
              onChange={(e) => setSelectedModel('gemini', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select a model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function CloudflareConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const [accountId, setAccountId] = useState(credentials.cloudflare?.accountId || '');
  const [apiToken, setApiToken] = useState(credentials.cloudflare?.apiToken || '');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSave = () => {
    if (accountId.trim() && apiToken.trim()) {
      setCredential('cloudflare', { accountId: accountId.trim(), apiToken: apiToken.trim() });
      useUIStore.getState().addToast({ type: 'success', message: 'Cloudflare credentials saved.' });
    }
  };

  const handleTest = async () => {
    if (!accountId.trim() || !apiToken.trim()) return;
    setCredential('cloudflare', { accountId: accountId.trim(), apiToken: apiToken.trim() });
    setTesting(true);
    setTestResult(null);
    const provider = getImageProvider();
    const result = await provider.testConnection();
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cloudflare Workers AI
        </h3>
        <a
          href="https://dash.cloudflare.com/50ba58cd15672379bd34ff0978a899fa/ai/workers-ai/api-quick-start"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Get API Key &rarr;
        </a>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Optional — used for local image generation tool.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            Account ID
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Your Cloudflare Account ID"
            className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
            } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            API Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your Cloudflare API Token"
              className="w-full px-3.5 py-2.5 pr-10 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent)',
              } as React.CSSProperties}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Toggle token visibility"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Save
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !accountId.trim() || !apiToken.trim()}
            className="px-4 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 active:scale-95"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
          </button>
        </div>
        {credentials.cloudflare && (
          <button
            onClick={() => {
              removeCredential('cloudflare');
              setAccountId('');
              setApiToken('');
            }}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--error)' }}
          >
            Remove credentials
          </button>
        )}
        {testResult && (
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={15} /> : <XCircle size={15} />}
            <span>{testResult.success ? 'Connected successfully!' : testResult.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TavilyConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const [apiKey, setApiKey] = useState(credentials.tavily?.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      setCredential('tavily', { apiKey: apiKey.trim() });
      useUIStore.getState().addToast({ type: 'success', message: 'Tavily API key saved.' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tavily Search API
        </h3>
        <a
          href="https://app.tavily.com/playground"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Get API Key &rarr;
        </a>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Required for the Web Search tool. Get a free API key at tavily.com.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="tvly-..."
                className="w-full px-3.5 py-2.5 pr-10 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Toggle password visibility"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Save
              </button>
            </div>
          </div>
          {credentials.tavily && (
            <button
              onClick={() => {
                removeCredential('tavily');
                setApiKey('');
              }}
              className="text-xs mt-2 transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Remove credential
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ---- Appearance Tab ----

function AppearanceTab() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const themes: { value: ThemeMode; label: string; desc: string }[] = [
    { value: 'light', label: 'Light', desc: 'Crisp light interface' },
    { value: 'dark', label: 'Dark', desc: 'Sleek dark interface' },
    { value: 'system', label: 'System', desc: 'Sync with device' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Theme
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {themes.map((t) => {
          const isSelected = theme === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className="p-4 rounded-2xl border text-left sm:text-center transition-all duration-150 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                background: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
              }}
            >
              <div className="text-sm font-semibold mb-0.5" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                {t.label}
              </div>
              <div className="text-xs opacity-75" style={{ color: 'var(--text-secondary)' }}>
                {t.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Chat Tab ----

function ChatTab() {
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);
  const setSystemPrompt = useSettingsStore((s) => s.setSystemPrompt);
  const contextWindowSize = useSettingsStore((s) => s.contextWindowSize);
  const setContextWindowSize = useSettingsStore((s) => s.setContextWindowSize);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          System Prompt
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Instructions sent to the AI at the start of every conversation.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border outline-none resize-y focus:ring-2"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Context Window
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Number of recent messages to include in each request (more = deeper context).
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={4}
            max={50}
            value={contextWindowSize}
            onChange={(e) => setContextWindowSize(parseInt(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            {contextWindowSize} msgs
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Data Tab ----

function DataTab() {
  const clearAll = useChatStore((s) => s.clearAll);
  const clearAllCredentials = useSettingsStore((s) => s.clearAllCredentials);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await exportConversations();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shadow-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      useUIStore.getState().addToast({ type: 'success', message: 'Conversations exported.' });
    } catch {
      useUIStore.getState().addToast({ type: 'error', message: 'Export failed.' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validateImportData(data)) {
        useUIStore.getState().addToast({ type: 'error', message: 'Invalid import file format.' });
        return;
      }
      const count = await importConversations(data);
      await useChatStore.getState().initialize();
      useUIStore.getState().addToast({ type: 'success', message: `Imported ${count} conversations.` });
    } catch {
      useUIStore.getState().addToast({ type: 'error', message: 'Import failed. Invalid JSON file.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Conversations Backup
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Export or restore all your conversations locally in JSON format.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Download size={14} />
            Export All Conversations
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Upload size={14} />
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Danger Zone
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              if (confirm('Delete all conversations? This cannot be undone.')) clearAll();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/20 active:scale-95"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
          >
            <Trash2 size={14} />
            Delete All Conversations
          </button>
          <button
            onClick={() => {
              if (confirm('Remove all stored API credentials?')) clearAllCredentials();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/20 active:scale-95"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
          >
            <Trash2 size={14} />
            Clear All Credentials
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- About Tab ----

function AboutTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Shadow AI Assistant
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A privacy-first, client-side AI chat client. Bring your own keys, with zero telemetry or middleman servers.
        </p>
      </div>
      <div
        className="p-4 rounded-2xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
          <Shield size={14} />
          Privacy & Security Guarantee
        </h4>
        <ul className="text-xs space-y-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>• Credentials remain exclusively in local client storage.</li>
          <li>• All chats are persisted directly in your browser using IndexedDB.</li>
          <li>• Requests dispatch straight to your configured provider endpoints.</li>
          <li>• Zero third-party analytics, logs, or external data tracking.</li>
        </ul>
      </div>
      <div
        className="p-4 rounded-2xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Supported Providers
        </h4>
        <ul className="text-xs space-y-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>
            <strong>Ollama Cloud</strong> — Chat, thinking, web search, vision & tool calling.
          </li>
          <li>
            <strong>Google Gemini</strong> — Chat, thinking levels, vision & tool calling.
          </li>
          <li>
            <strong>Cloudflare Workers AI</strong> — Image generation.
          </li>
        </ul>
      </div>
    </div>
  );
}
