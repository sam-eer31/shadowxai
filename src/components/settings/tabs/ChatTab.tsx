'use client';

import { useSettingsStore } from '@/stores/settings-store';

export function ChatTab() {
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
