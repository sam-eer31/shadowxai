'use client';

import { useSettingsStore } from '@/stores/settings-store';
import type { ThemeMode } from '@/lib/types';

export function AppearanceTab() {
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
