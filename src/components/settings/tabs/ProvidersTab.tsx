'use client';

import { Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { PuterConfig } from '../providers/PuterConfig';
import { OllamaConfig } from '../providers/OllamaConfig';
import { CloudflareConfig } from '../providers/CloudflareConfig';
import { TavilyConfig } from '../providers/TavilyConfig';

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
