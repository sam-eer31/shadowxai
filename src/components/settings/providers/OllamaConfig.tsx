import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { getChatProvider } from '@/lib/providers';
import type { AIModel } from '@/lib/types';

export function OllamaConfig() {
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
