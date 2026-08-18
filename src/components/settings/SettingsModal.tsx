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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeSettings(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl h-[600px] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
          </div>
          <button
            onClick={closeSettings}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tab navigation */}
          <div
            className="w-44 shrink-0 border-r py-2 overflow-y-auto"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors"
                style={{
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                  background: activeTab === tab.id ? 'var(--accent-light)' : 'transparent',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
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
      <div>
        <button
          onClick={() => {
            useSettingsStore.getState().clearAllCredentials();
            useUIStore.getState().addToast({ type: 'success', message: 'All credentials cleared.' });
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
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
    // Save first
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
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Ollama Cloud
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Ollama API key"
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Save
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
          {credentials.ollama && (
            <button
              onClick={() => { removeCredential('ollama'); setApiKey(''); setModels([]); }}
              className="text-xs mt-1 transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Remove credential
            </button>
          )}
        </div>

        {testResult && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {testResult.success ? 'Connected successfully!' : testResult.error}
          </div>
        )}

        {models.length > 0 && (
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Model</label>
            <select
              value={selectedModels.ollama || ''}
              onChange={(e) => setSelectedModel('ollama', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select a model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
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
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Google Gemini
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Save
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
          {credentials.gemini && (
            <button
              onClick={() => { removeCredential('gemini'); setApiKey(''); setModels([]); }}
              className="text-xs mt-1 transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Remove credential
            </button>
          )}
        </div>

        {testResult && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {testResult.success ? 'Connected successfully!' : testResult.error}
          </div>
        )}

        {models.length > 0 && (
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Model</label>
            <select
              value={selectedModels.gemini || ''}
              onChange={(e) => setSelectedModel('gemini', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select a model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
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
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Cloudflare Workers AI
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Optional — used for image generation only.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Account ID</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Your Cloudflare Account ID"
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-1"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent)',
            } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>API Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your Cloudflare API Token"
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border outline-none focus:ring-1"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent)',
              } as React.CSSProperties}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Save
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !accountId.trim() || !apiToken.trim()}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
          </button>
        </div>
        {credentials.cloudflare && (
          <button
            onClick={() => { removeCredential('cloudflare'); setAccountId(''); setApiToken(''); }}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--error)' }}
          >
            Remove credentials
          </button>
        )}
        {testResult && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: testResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: testResult.success ? 'var(--success)' : 'var(--error)',
            }}
          >
            {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {testResult.success ? 'Connected successfully!' : testResult.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Appearance Tab ----

function AppearanceTab() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const themes: { value: ThemeMode; label: string; desc: string }[] = [
    { value: 'light', label: 'Light', desc: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', desc: 'Dark background with light text' },
    { value: 'system', label: 'System', desc: 'Follow your system preference' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Theme</h3>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="p-4 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: theme === t.value ? 'var(--accent)' : 'var(--border)',
              background: theme === t.value ? 'var(--accent-light)' : 'var(--bg-secondary)',
            }}
          >
            <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {t.label}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t.desc}
            </div>
          </button>
        ))}
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
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>System Prompt</h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Instructions sent to the AI at the start of every conversation.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y focus:ring-1"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Context Window</h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Number of recent messages to include in each request (more = more context but higher cost).
        </p>
        <input
          type="range"
          min={4}
          max={50}
          value={contextWindowSize}
          onChange={(e) => setContextWindowSize(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
          {contextWindowSize} messages
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
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Conversations</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Download size={14} />
            Export All
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Upload size={14} />
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Danger Zone</h3>
        <div className="space-y-2">
          <button
            onClick={() => { if (confirm('Delete all conversations? This cannot be undone.')) clearAll(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
          >
            <Trash2 size={14} />
            Clear All Conversations
          </button>
          <button
            onClick={() => { if (confirm('Remove all API credentials?')) clearAllCredentials(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
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
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Shadow</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A privacy-focused AI chat application. Bring your own API keys.
        </p>
      </div>
      <div
        className="p-4 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
          <Shield size={14} />
          Privacy & Security
        </h4>
        <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
          <li>• Your AI provider credentials are stored locally in your browser.</li>
          <li>• Your conversations are stored locally using IndexedDB.</li>
          <li>• Your messages are sent directly to the AI provider you configure.</li>
          <li>• No data is sent to our servers.</li>
          <li>• No analytics or tracking.</li>
          <li>• You are responsible for your own provider usage and limits.</li>
        </ul>
      </div>
      <div
        className="p-4 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Supported Providers
        </h4>
        <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Ollama Cloud</strong> — Chat, web search, vision, tool calling</li>
          <li><strong>Google Gemini</strong> — Chat, vision, tool calling</li>
          <li><strong>Cloudflare Workers AI</strong> — Image generation only</li>
        </ul>
      </div>
    </div>
  );
}
