import type { Scratchpad, Message, AppSettings, ProviderToolDef, ChatChunk, Conversation } from '@/lib/types';
import { PuterProvider } from '@/lib/providers/puter';
import { useChatStore, getActiveMessages } from '@/stores/chat-store';
import { saveConversation } from '@/lib/storage/db';

const INTERNAL_MODEL = 'xiaomi/mimo-v2.5';

// Internal tools available only to the background LLM
const scratchpadTools: ProviderToolDef[] = [
  {
    name: 'add_summary',
    description: 'Add a new high-level summary paragraph for the latest processed messages.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'A concise summary of the latest batch of messages.' }
      },
      required: ['summary']
    }
  },
  {
    name: 'add_item',
    description: 'Add a new item to one of the scratchpad categories.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['importantFacts'] },
        content: { type: 'string' },
        status: { type: 'string', enum: ['active', 'completed', 'irrelevant'] }
      },
      required: ['category', 'content']
    }
  },
  {
    name: 'update_item',
    description: 'Update an existing item in the scratchpad by ID.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['importantFacts'] },
        id: { type: 'string' },
        status: { type: 'string', enum: ['active', 'completed', 'irrelevant'] },
        content: { type: 'string' }
      },
      required: ['category', 'id']
    }
  },
  {
    name: 'delete_item',
    description: 'Delete an item from the scratchpad by ID.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['importantFacts'] },
        id: { type: 'string' }
      },
      required: ['category', 'id']
    }
  }
];

export function getActiveScratchpad(conversation: Conversation): Scratchpad {
  const messages = getActiveMessages(conversation);
  
  // Walk backwards up the active branch
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].scratchpad) {
      // Deep clone to avoid mutating the old snapshot directly if we are going to branch
      return JSON.parse(JSON.stringify(messages[i].scratchpad));
    }
  }

  // Return a fresh scratchpad if none exist in this branch
  return {
    messageId: '',
    conversationId: conversation.id,
    summaries: [],
    importantFacts: [],
    artifacts: [],
    generatedImages: [],
  };
}

export async function processScratchpadAsync(
  conversation: Conversation,
  settings: AppSettings,
  credentials: any
) {
  // Check if Puter is signed in. If not, abort gracefully.
  if (!credentials?.puter?.signedIn) {
    return;
  }

  try {
    const activeMessages = getActiveMessages(conversation);
    if (activeMessages.length === 0) return;

    let scratchpad = getActiveScratchpad(conversation);

    let startIndex = 0;
    if (scratchpad.lastSummarizedUserMessageId) {
      const idx = activeMessages.findIndex(m => m.id === scratchpad.lastSummarizedUserMessageId);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const unassignedMessages = activeMessages.slice(startIndex);
    const unassignedUserMessages = unassignedMessages.filter(m => m.role === 'user');
    
    // Trigger when user sends their 11th unassigned message
    if (unassignedUserMessages.length < 11) return;

    // Isolate exactly the slice up to the 11th user message to process
    const eleventhUserMessage = unassignedUserMessages[10];
    const sliceEndIndex = activeMessages.findIndex(m => m.id === eleventhUserMessage.id) + 1;
    
    const newMessages = activeMessages.slice(startIndex, sliceEndIndex);
    const targetMessageId = eleventhUserMessage.id;

    useChatStore.getState().setScratchpadUpdating(conversation.id, true);

    // Convert new messages to a readable format for the internal LLM
    const chatLog = newMessages.map(m => {
      let text = '';
      m.content.forEach(c => {
        if (c.type === 'text') text += c.text;
        else if (c.type === 'tool_call') text += `\n[Tool Call: ${c.toolCall?.name}(${JSON.stringify(c.toolCall?.arguments)})]`;
        else if (c.type === 'generated_image') text += `\n[Generated Image with prompt: ${c.imagePrompt}]`;
      });
      // Detect artifacts and replace them with a small summary tag to save tokens
      const artifactRegex = /<artifact\b([^>]*)>([\s\S]*?)<\/artifact>/g;
      text = text.replace(artifactRegex, (match, attrs) => {
        const idMatch = attrs.match(/\bid="([^"]+)"/);
        const id = idMatch ? idMatch[1] : 'unknown';
        return `\n[Created Artifact ID: ${id}]\n`;
      });
      return `${m.role.toUpperCase()}: ${text}`;
    }).join('\n\n');

    const systemPrompt = `You are a background Memory Manager AI. Your job is to extract important information from the conversation and update the Scratchpad using the provided tools.
    
Current Scratchpad JSON (excluding past summaries):
${JSON.stringify({ ...scratchpad, summaries: undefined }, null, 2)}

You MUST use your tools to update the scratchpad based on the new messages below. If an important fact is stated, add it. You MUST also call 'add_summary' to provide a concise summary for this specific batch of new messages. Don't write conversational text, just use tools.`;

    const puterProvider = new PuterProvider();
    
    const stream = puterProvider.chat({
      model: INTERNAL_MODEL,
      messages: [
        { role: 'system', parts: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', parts: [{ type: 'text', text: `Here are the new messages to process:\n\n${chatLog}` }] }
      ],
      tools: scratchpadTools
    });

    let dirty = false;

    // Process the stream and execute tools locally
    for await (const chunk of stream) {
      if (chunk.type === 'tool_call' && chunk.toolCall) {
        dirty = true;
        const tc = chunk.toolCall;
        const args = tc.arguments as Record<string, any>;
        
        switch (tc.name) {
          case 'add_summary':
            if (!scratchpad.summaries) scratchpad.summaries = [];
            scratchpad.summaries.push(args.summary);
            break;
          case 'add_item': {
            const cat = args.category as keyof Pick<Scratchpad, 'importantFacts'>;
            if (scratchpad[cat]) {
              scratchpad[cat].push({
                id: Math.random().toString(36).substring(2, 8),
                content: args.content,
                status: args.status,
                updatedAt: Date.now()
              });
            }
            break;
          }
          case 'update_item': {
            const cat = args.category as keyof Pick<Scratchpad, 'importantFacts'>;
            if (scratchpad[cat]) {
              const item = scratchpad[cat].find(i => i.id === args.id);
              if (item) {
                if (args.content) item.content = args.content;
                if (args.status) item.status = args.status;
                item.updatedAt = Date.now();
              }
            }
            break;
          }
          case 'delete_item': {
            const cat = args.category as keyof Pick<Scratchpad, 'importantFacts'>;
            if (scratchpad[cat]) {
              scratchpad[cat] = scratchpad[cat].filter(i => i.id !== args.id);
            }
            break;
          }
        }
      }
    }

    scratchpad.lastSummarizedUserMessageId = targetMessageId;
    scratchpad.messageId = targetMessageId;

    // Save the scratchpad to the active conversation's leaf message
    useChatStore.setState(state => {
      const conv = state.conversations.find(c => c.id === conversation.id);
      if (!conv) return state;

      const updatedMessages = conv.messages.map(m =>
        m.id === scratchpad.messageId ? { ...m, scratchpad } : m
      );

      const updatedConv = { ...conv, messages: updatedMessages };
      // Fire and forget save to IndexedDB
      saveConversation(updatedConv).catch(console.error);

      return {
        conversations: state.conversations.map(c => c.id === updatedConv.id ? updatedConv : c)
      };
    });

    // Log the current scratchpad content to the terminal so the user can see it
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SCRATCHPAD_STATE: scratchpad
      })
    }).catch(() => {});

  } catch (err) {
    console.error('Background Scratchpad Processor failed:', err);
  } finally {
    useChatStore.getState().setScratchpadUpdating(conversation.id, false);
  }
}
