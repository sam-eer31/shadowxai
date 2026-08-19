import { create } from 'zustand';
import type {
  Conversation,
  Message,
  MessageContent,
  Attachment,
  ProviderMessage,
  ProviderMessagePart,
  ToolCall,
  ToolResult,
} from '@/lib/types';
import { generateId } from '@/lib/utils/id';
import {
  getAllConversations,
  saveConversation,
  deleteConversation as dbDelete,
  clearAllConversations,
} from '@/lib/storage/db';
import { getChatProvider } from '@/lib/providers';
import { useSettingsStore } from './settings-store';
import { useUIStore } from './ui-store';
import { generateResponse } from '@/lib/chat/generation';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  streamingContent: string;
  streamingThought: string;
  thoughtTimeMs: number;
  pendingToolCalls: ToolCall[];
  abortController: AbortController | null;
  initialized: boolean;
  // Actions
  initialize: () => Promise<void>;
  newChat: () => void;
  setActiveConversation: (id: string) => void;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  stopGeneration: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  switchToBranch: (messageId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  clearAll: () => Promise<void>;
  getActiveConversation: () => Conversation | undefined;
}

export function getActiveMessages(conv: Conversation): Message[] {
  if (conv.messages.length === 0) return [];
  const msgMap = new Map(conv.messages.map((m) => [m.id, m]));

  // Backward compatibility: link messages linearly if parentId is missing
  for (let i = 1; i < conv.messages.length; i++) {
    if (!conv.messages[i].parentId) {
      conv.messages[i].parentId = conv.messages[i - 1].id;
    }
  }

  const tailId = conv.currentNodeId || conv.messages[conv.messages.length - 1].id;
  const path: Message[] = [];
  let current = msgMap.get(tailId);
  while (current) {
    path.unshift(current);
    if (!current.parentId || current.parentId === 'root') break;
    current = msgMap.get(current.parentId);
  }
  return path;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isGenerating: false,
  streamingContent: '',
  streamingThought: '',
  thoughtTimeMs: 0,
  pendingToolCalls: [],
  abortController: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    try {
      const conversations = await getAllConversations();
      set({ conversations, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  newChat: () => {
    set({ activeConversationId: null, streamingContent: '', streamingThought: '', thoughtTimeMs: 0 });
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id, streamingContent: '', streamingThought: '', thoughtTimeMs: 0 });
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },

  sendMessage: async (text, attachments) => {
    const settings = useSettingsStore.getState();
    const provider = getChatProvider(settings.activeProvider);

    if (!provider) {
      useUIStore.getState().addToast({
        type: 'error',
        message: 'No chat provider selected.',
      });
      return;
    }

    if (!provider.isConfigured()) {
      useUIStore.getState().addToast({
        type: 'error',
        message: `${provider.name} API key is not configured. Open Settings to add it.`,
      });
      return;
    }

    let modelId = settings.selectedModels[settings.activeProvider];
    if (!modelId) {
      const models = await provider.listModels();
      if (models.length > 0) {
        modelId = models[0].id;
        settings.setSelectedModel(settings.activeProvider, modelId);
      } else {
        useUIStore.getState().addToast({
          type: 'error',
          message: 'No model selected. Open Settings to choose a model.',
        });
        return;
      }
    }

    // Build user message
    const userContent: MessageContent[] = [{ type: 'text', text }];
    if (attachments) {
      for (const att of attachments) {
        userContent.push({
          type: 'image',
          imageUrl: `data:${att.mimeType};base64,${att.data}`,
        });
      }
    }

    let conv = get().getActiveConversation();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userContent,
      attachments,
      model: modelId,
      provider: settings.activeProvider,
      createdAt: Date.now(),
      parentId: conv?.currentNodeId || 'root',
    };

    // Get or create conversation
    if (!conv) {
      conv = {
        id: generateId(),
        title: text.slice(0, 60) || 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        provider: settings.activeProvider,
        model: modelId,
        messages: [],
      };
    }

    conv = {
      ...conv,
      messages: [...conv.messages, userMessage],
      currentNodeId: userMessage.id,
      updatedAt: Date.now(),
    };

    // Update state
    const conversations = get().conversations.filter((c) => c.id !== conv!.id);
    set({
      conversations: [conv, ...conversations],
      activeConversationId: conv.id,
    });

    // Save to DB
    await saveConversation(conv);

    // Generate response
    await generateResponse(conv, settings, provider, modelId);
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isGenerating: false, abortController: null, streamingContent: '', streamingThought: '', thoughtTimeMs: 0 });
    }
  },

  regenerateMessage: async (messageId: string) => {
    const conv = get().getActiveConversation();
    if (!conv) return;

    const targetMsg = conv.messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    const updated = { ...conv, currentNodeId: targetMsg.parentId, updatedAt: Date.now() };
    const conversations = get().conversations.map((c) =>
      c.id === updated.id ? updated : c
    );
    set({ conversations });
    await saveConversation(updated);

    const settings = useSettingsStore.getState();
    const provider = getChatProvider(settings.activeProvider);
    if (!provider) return;

    const modelId = settings.selectedModels[settings.activeProvider] || conv.model;
    await generateResponse(updated, settings, provider, modelId);
  },

  editMessage: async (messageId: string, text: string) => {
    const conv = get().getActiveConversation();
    if (!conv) return;

    const targetMsg = conv.messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const settings = useSettingsStore.getState();
    const provider = getChatProvider(settings.activeProvider);
    if (!provider) return;
    const modelId = settings.selectedModels[settings.activeProvider] || conv.model;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: [{ type: 'text', text }],
      attachments: targetMsg.attachments,
      model: modelId,
      provider: settings.activeProvider,
      createdAt: Date.now(),
      parentId: targetMsg.parentId || 'root',
    };

    const updated = {
      ...conv,
      messages: [...conv.messages, userMessage],
      currentNodeId: userMessage.id,
      updatedAt: Date.now(),
    };

    const conversations = get().conversations.map((c) =>
      c.id === updated.id ? updated : c
    );
    set({ conversations });
    await saveConversation(updated);

    await generateResponse(updated, settings, provider, modelId);
  },

  switchToBranch: async (messageId: string) => {
    const conv = get().getActiveConversation();
    if (!conv) return;

    const descendants = new Set<string>();
    const addDescendants = (id: string) => {
      descendants.add(id);
      conv.messages.filter((m) => m.parentId === id).forEach((child) => addDescendants(child.id));
    };
    addDescendants(messageId);

    const descMessages = conv.messages.filter((m) => descendants.has(m.id));
    const allParentIds = new Set(conv.messages.map((m) => m.parentId).filter(Boolean));
    const leaves = descMessages.filter((m) => !allParentIds.has(m.id));

    leaves.sort((a, b) => b.createdAt - a.createdAt);
    const targetLeafId = leaves.length > 0 ? leaves[0].id : messageId;

    const updated = { ...conv, currentNodeId: targetLeafId, updatedAt: Date.now() };
    const conversations = get().conversations.map((c) =>
      c.id === updated.id ? updated : c
    );
    set({ conversations });
    await saveConversation(updated);
  },

  deleteConversation: async (id) => {
    await dbDelete(id);
    const conversations = get().conversations.filter((c) => c.id !== id);
    const activeId =
      get().activeConversationId === id ? null : get().activeConversationId;
    set({ conversations, activeConversationId: activeId });
  },

  renameConversation: async (id, title) => {
    const conv = get().conversations.find((c) => c.id === id);
    if (!conv) return;
    const updated = { ...conv, title, updatedAt: Date.now() };
    const conversations = get().conversations.map((c) =>
      c.id === id ? updated : c
    );
    set({ conversations });
    await saveConversation(updated);
  },

  clearAll: async () => {
    await clearAllConversations();
    set({ conversations: [], activeConversationId: null });
  },
}));
