'use client';

import { useState, useMemo } from 'react';
import { X, Download, Copy, ExternalLink, ImageIcon } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

interface ExtractedImage {
  id: string;
  imageUrl: string;
  imagePrompt?: string;
  createdAt: number;
  conversationId: string;
  messageId: string;
}

export function ImageLibrary() {
  const conversations = useChatStore((s) => s.conversations);
  const closeImageLibrary = useUIStore((s) => s.closeImageLibrary);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  
  const [selectedImage, setSelectedImage] = useState<ExtractedImage | null>(null);

  // Extract all images from all conversations
  const images = useMemo(() => {
    const extracted: ExtractedImage[] = [];
    
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        for (const content of msg.content) {
          if (content.type === 'generated_image' && content.imageUrl) {
            extracted.push({
              id: `${conv.id}-${msg.id}-${extracted.length}`,
              imageUrl: content.imageUrl,
              imagePrompt: content.imagePrompt,
              createdAt: msg.createdAt,
              conversationId: conv.id,
              messageId: msg.id,
            });
          }
        }
      }
    }
    
    // Sort newest first
    return extracted.sort((a, b) => b.createdAt - a.createdAt);
  }, [conversations]);

  const handleDownload = (img: ExtractedImage) => {
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `generated_image_${img.createdAt}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = async (img: ExtractedImage) => {
    if (img.imagePrompt) {
      await navigator.clipboard.writeText(img.imagePrompt);
      useUIStore.getState().addToast({
        type: 'success',
        message: 'Prompt copied to clipboard',
      });
    }
  };

  const handleGoToChat = (img: ExtractedImage) => {
    setActiveConversation(img.conversationId);
    closeImageLibrary();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Image Library</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Your previously generated images across all chats
              </p>
            </div>
          </div>
          
          <button
            onClick={closeImageLibrary}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {images.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              >
                <ImageIcon size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No images yet</h3>
              <p className="max-w-md" style={{ color: 'var(--text-secondary)' }}>
                Images generated in your chats will appear here. Try asking the assistant to generate an image!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => (
                <div 
                  key={img.id}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => setSelectedImage(img)}
                >
                  <img 
                    src={img.imageUrl} 
                    alt={img.imagePrompt || 'Generated image'} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    {img.imagePrompt && (
                      <p className="text-white text-xs line-clamp-3 mb-2 font-medium">
                        {img.imagePrompt}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Image View */}
      {selectedImage && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all backdrop-blur-sm"
          >
            <X size={24} />
          </button>

          <div className="max-w-5xl w-full max-h-[80vh] flex flex-col md:flex-row gap-6 p-6">
            <div className="flex-1 flex items-center justify-center min-h-0">
              <img 
                src={selectedImage.imageUrl} 
                alt={selectedImage.imagePrompt || 'Generated image'} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
            
            <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 bg-[#111] p-5 rounded-xl border border-white/10 text-white">
              <div>
                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Prompt</h4>
                <p className="text-sm leading-relaxed text-white/90">
                  {selectedImage.imagePrompt || 'No prompt provided.'}
                </p>
              </div>
              
              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Download Image
                </button>
                
                {selectedImage.imagePrompt && (
                  <button
                    onClick={() => handleCopyPrompt(selectedImage)}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                  >
                    <Copy size={16} />
                    Copy Prompt
                  </button>
                )}
                
                <button
                  onClick={() => handleGoToChat(selectedImage)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors text-sm font-medium mt-2"
                >
                  <ExternalLink size={16} />
                  Go to Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
