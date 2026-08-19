'use client';

import { Shield } from 'lucide-react';

export function AboutTab() {
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
