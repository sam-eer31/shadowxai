import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';

export function TavilyConfig() {
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
