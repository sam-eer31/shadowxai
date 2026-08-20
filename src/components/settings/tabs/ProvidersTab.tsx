'use client';

import { useState, useEffect } from 'react';
import '@/lib/providers/puter/quiet';
import puter from '@heyputer/puter.js';


import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Trash2, Activity, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { getChatProvider, getImageProvider } from '@/lib/providers';
import type { AIModel } from '@/lib/types';

export function ProvidersTab() {
  return (
    <div className="space-y-6">
      <PuterConfig />
      <hr style={{ borderColor: 'var(--border)' }} />
      <OllamaConfig />
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
      setCredential('ollama', { apiKey: apiKey.trim(), enabled: credentials.ollama?.enabled ?? true });
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
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!credentials.ollama.enabled}
                  onChange={(e) => setCredential('ollama', { ...credentials.ollama!, enabled: e.target.checked })}
                  className="rounded border-gray-300 focus:ring-accent"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Enable Ollama (Secondary)</span>
              </label>
              <button
                onClick={() => {
                  removeCredential('ollama');
                  setApiKey('');
                  setModels([]);
                }}
                className="text-xs transition-colors hover:underline"
                style={{ color: 'var(--error)' }}
              >
                Remove credential
              </button>
            </div>
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
        Optional — used for local image generation tool if Puter is unavailable or if you prefer Cloudflare.
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
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!credentials.cloudflare.enabled}
                onChange={(e) => setCredential('cloudflare', { ...credentials.cloudflare!, enabled: e.target.checked })}
                className="rounded border-gray-300 focus:ring-accent"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Enable Cloudflare (Secondary)</span>
            </label>
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
          </div>
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

function PuterConfig() {
  const credentials = useSettingsStore((s) => s.credentials);
  const setCredential = useSettingsStore((s) => s.setCredential);
  const removeCredential = useSettingsStore((s) => s.removeCredential);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const selectedImageModel = useSettingsStore((s) => s.selectedImageModel);
  const setSelectedImageModel = useSettingsStore((s) => s.setSelectedImageModel);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const refreshUsage = () => {
    setLoadingUsage(true);
    puter.auth.getMonthlyUsage?.()
      .then((data: any) => setUsage(data))
      .catch((err: any) => console.error('Failed to fetch usage:', err))
      .finally(() => setLoadingUsage(false));
  };

  useEffect(() => {
    const signedIn = puter.auth.isSignedIn();
    setIsSignedIn(signedIn);
    
    if (signedIn && !credentials.puter?.signedIn) {
      setCredential('puter', { signedIn: true });
    } else if (!signedIn && credentials.puter?.signedIn) {
      removeCredential('puter');
    }

    if (signedIn) {
      refreshUsage();

      const provider = getChatProvider('puter');
      if (provider) {
        provider.listModels().then(setModels);
      }
    } else {
      setModels([]);
      setUsage(null);
    }
  }, [credentials.puter?.signedIn, setCredential, removeCredential]);

  const handleSignIn = async () => {
    try {
      await puter.auth.signIn();
      const signedIn = puter.auth.isSignedIn();
      setIsSignedIn(signedIn);
      if (signedIn) {
        setCredential('puter', { signedIn: true });
        useUIStore.getState().addToast({ type: 'success', message: 'Signed in to Puter.' });
      }
    } catch (error) {
      console.error('Puter sign in error', error);
      useUIStore.getState().addToast({ type: 'error', message: 'Failed to sign in to Puter.' });
    }
  };

  const handleSignOut = () => {
    try {
      puter.auth.signOut();
      setIsSignedIn(false);
      removeCredential('puter');
      setModels([]);
      useUIStore.getState().addToast({ type: 'success', message: 'Signed out of Puter.' });
    } catch (error) {
      console.error('Puter sign out error', error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Puter Cloud (GPT-5.6)
        </h3>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        Access GPT-5.6 Luna natively. Puter uses a user-pays model where your usage is tied to your free Puter account—no API keys required.
      </p>
      <div className="space-y-3">
        {!isSignedIn ? (
          <button
            onClick={handleSignIn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:scale-105 active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            Sign in with Puter
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              <CheckCircle size={15} />
              <span>Signed in to Puter successfully!</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs self-start transition-colors hover:underline"
              style={{ color: 'var(--error)' }}
            >
              Sign out
            </button>

            {models.length > 0 && (
              <div className="mt-2 mb-2">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  Default Model
                </label>
                <select
                  value={selectedModels.puter || ''}
                  onChange={(e) => setSelectedModel('puter', e.target.value)}
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

            <div className="mb-2">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Default Image Model
              </label>
              <select
                value={selectedImageModel || 'openai/gpt-image-1-mini'}
                onChange={(e) => setSelectedImageModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="openai/gpt-image-1-mini">GPT Image 1 Mini</option>
                <option value="openai/gpt-image-2">GPT Image 2</option>
              </select>
            </div>

            {loadingUsage && !usage ? (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Fetching usage...</span>
              </div>
            ) : usage && usage.allowanceInfo ? (
              (function () {
                const allowance = usage?.allowanceInfo?.monthUsageAllowance || 0;
                const remaining = usage?.allowanceInfo?.remaining || 0;
                const used = Math.max(0, allowance - remaining);
                let percentage = 0;
                if (allowance > 0) {
                    percentage = (used / allowance) * 100;
                }

                const formatNum = (val: any) => typeof val === 'number' && Number.isFinite(val) ? val.toLocaleString() : '—';
                const formatMoney = (val: any) => typeof val === 'number' && Number.isFinite(val) ? `$${(val / 100000000).toFixed(6)}` : '—';

                return (
                  <div className="mt-6" style={{ background: '#0d0f12', color: '#f5f5f5', borderRadius: '14px', padding: '25px', fontFamily: 'Arial, sans-serif' }}>
                    
                    <div style={{ paddingBottom: '22px', borderBottom: '1px solid #292d33', marginBottom: '25px' }}>
                        <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>Usage</h1>
                        <p style={{ color: '#8e97a5', fontSize: '13px', margin: '6px 0 0' }}>Current monthly usage for this Puter account</p>
                    </div>

                    {/* RESOURCES PROGRESS BAR */}
                    <div style={{ marginBottom: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ color: '#f5f5f5', fontSize: '15px' }}>Resources</div>
                        <div style={{ color: '#d4d4d8', fontSize: '14px' }}>
                          {Math.round(percentage)}% &middot; {formatNum(used)} used of {formatNum(allowance)} Credits
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '14px', background: '#3f3f46', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, percentage)}%`, background: '#d97706', borderRadius: '10px', transition: 'width .5s' }} />
                      </div>
                    </div>

                    {/* STATUS AND REFRESH */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                      <button
                        onClick={refreshUsage}
                        disabled={loadingUsage}
                        style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '6px', background: '#292e36', color: '#f5f5f5', cursor: loadingUsage ? 'not-allowed' : 'pointer', opacity: loadingUsage ? 0.5 : 1 }}
                        title="Refresh Usage"
                      >
                        <RefreshCw size={16} className={loadingUsage ? "animate-spin" : ""} />
                      </button>
                      <div style={{ color: '#8e97a5', fontSize: '12px' }}>
                        {loadingUsage ? 'Loading usage...' : 'Updated successfully.'}
                      </div>
                    </div>

                    {/* API USAGE TABLE */}
                    <div>
                      <h2 style={{ fontSize: '15px', marginBottom: '15px', color: '#f5f5f5' }}>Usage Details</h2>
                      <div style={{ overflowX: 'auto', background: '#171a20', border: '1px solid #292e36', borderRadius: '14px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                          <thead>
                            <tr>
                              <th style={{ color: '#8e97a5', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid #292e36' }}>Model</th>
                              <th style={{ color: '#8e97a5', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid #292e36' }}>Credits Used</th>
                              <th style={{ color: '#8e97a5', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid #292e36' }}>Calls</th>
                              <th style={{ color: '#8e97a5', fontSize: '12px', textTransform: 'uppercase', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid #292e36' }}>Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              if (!usage?.usage || Object.keys(usage.usage).length === 0) {
                                return <tr><td colSpan={4} style={{ color: '#8e97a5', padding: '20px', textAlign: 'left', fontSize: '14px' }}>No API usage recorded yet.</td></tr>;
                              }
                              
                              const combined: Record<string, any> = {
                                'DeepSeek V4 Flash': { cost: 0, count: 0, units: 0 },
                                'GPT-5.6 Luna': { cost: 0, count: 0, units: 0 },
                                'GPT Image 1 Mini': { cost: 0, count: 0, units: 0 },
                                'GPT Image 2': { cost: 0, count: 0, units: 0 }
                              };

                              Object.entries(usage.usage).forEach(([apiName, stats]: [string, any]) => {
                                const lower = String(apiName).toLowerCase();
                                if (lower.includes('v4-flash')) {
                                  combined['DeepSeek V4 Flash'].cost += stats.cost || 0;
                                  combined['DeepSeek V4 Flash'].count += stats.count || 0;
                                  combined['DeepSeek V4 Flash'].units += stats.units || 0;
                                } else if (lower.includes('luna')) {
                                  combined['GPT-5.6 Luna'].cost += stats.cost || 0;
                                  combined['GPT-5.6 Luna'].count += stats.count || 0;
                                  combined['GPT-5.6 Luna'].units += stats.units || 0;
                                } else if (lower.includes('image-2') || lower.includes('gpt image 2')) {
                                  combined['GPT Image 2'].cost += stats.cost || 0;
                                  combined['GPT Image 2'].count += stats.count || 0;
                                  combined['GPT Image 2'].units += stats.units || 0;
                                } else if (lower.includes('image') || lower.includes('txt2img')) {
                                  combined['GPT Image 1 Mini'].cost += stats.cost || 0;
                                  combined['GPT Image 1 Mini'].count += stats.count || 0;
                                  combined['GPT Image 1 Mini'].units += stats.units || 0;
                                }
                              });
                              
                              const finalUsage = Object.entries(combined).filter(([_, stats]) => stats.count > 0 || stats.cost > 0);
                              
                              if (finalUsage.length === 0) {
                                return <tr><td colSpan={4} style={{ color: '#8e97a5', padding: '20px', textAlign: 'left', fontSize: '14px' }}>No model usage recorded yet.</td></tr>;
                              }
                              
                              return finalUsage
                                .sort((a: any, b: any) => (b[1]?.cost || 0) - (a[1]?.cost || 0))
                                .map(([apiName, stats]: [string, any], index, array) => (
                                  <tr key={apiName}>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #292e36' }}>{apiName}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #292e36', color: '#72e6a3', fontWeight: 'bold' }}>{formatNum(stats.cost)}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #292e36' }}>{formatNum(stats.count)}</td>
                                    <td style={{ fontSize: '14px', padding: '13px 15px', borderBottom: index === array.length - 1 ? 'none' : '1px solid #292e36' }}>{formatNum(stats.units)}</td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
