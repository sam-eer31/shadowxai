'use client';

import { useRef } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import {
  exportConversations,
  validateImportData,
  importConversations,
} from '@/lib/storage/db';

export function DataTab() {
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
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Conversations Backup
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Export or restore all your conversations in JSON format.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Download size={14} />
            Export All Conversations
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Upload size={14} />
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Danger Zone
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              if (confirm('Delete all conversations? This cannot be undone.')) clearAll();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/20 active:scale-95"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
          >
            <Trash2 size={14} />
            Delete All Conversations
          </button>
          <button
            onClick={() => {
              if (confirm('Remove all stored API credentials?')) clearAllCredentials();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-red-500/20 active:scale-95"
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
