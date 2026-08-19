'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getChatProvider, getImageProvider } from '@/lib/providers';
import type { AIModel } from '@/lib/types';

export function ProvidersTab() {
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
