import { X } from 'lucide-react';
import type { Attachment } from '@/lib/types';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  removeAttachment: (id: string) => void;
}

export function AttachmentPreview({ attachments, removeAttachment }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 mb-2 px-1 overflow-x-auto pb-1 scrollbar-hide">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative group rounded-xl overflow-hidden shrink-0 border shadow-xs"
          style={{ width: 56, height: 56, borderColor: 'var(--border)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${att.mimeType};base64,${att.data}`}
            alt={att.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => removeAttachment(att.id)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity shadow-md"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            aria-label="Remove image"
          >
            <X size={10} className="text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}
