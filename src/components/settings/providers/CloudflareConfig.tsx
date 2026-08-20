import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { getImageProvider } from '@/lib/providers';

export function CloudflareConfig() {
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
