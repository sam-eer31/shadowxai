'use client';

import { useUIStore, type Toast } from '@/stores/ui-store';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: 'var(--success)',
    error: 'var(--error)',
    info: 'var(--accent)',
    warning: 'var(--warning)',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg toast-enter"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      <Icon size={16} className="shrink-0 mt-0.5" style={{ color: colors[toast.type] }} />
      <p className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
        {toast.message}
      </p>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
