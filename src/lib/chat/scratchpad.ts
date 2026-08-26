import type { Scratchpad, Message, AppSettings, ProviderToolDef, ChatChunk, Conversation } from '@/lib/types';
import { PuterProvider } from '@/lib/providers/puter';
import { useChatStore, getActiveMessages } from '@/stores/chat-store';
import { saveConversation } from '@/lib/storage/db';

const INTERNAL_MODEL = 'deepseek-ai/deepseek-v4-flash-0731';

// Internal tools available only to the background LLM
const scratchpadTools: ProviderToolDef[] = [
  {
    name: 'update_scratchpad',
    description: 'Update the scratchpad with a new summary and any new or modified facts.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'A concise, high-level chronological summary of the new messages.' },
        new_facts: {
          type: 'array',
          description: 'New short, strictly ONE-LINE facts to add to the importantFacts ledger.',
          items: { type: 'string' }
        },
        update_facts: {
          type: 'array',
          description: 'Existing facts to update.',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, content: { type: 'string' }, status: { type: 'string', enum: ['active', 'completed', 'irrelevant'] } },
            required: ['id']
          }
        },
        delete_fact_ids: {
          type: 'array',
          description: 'IDs of existing facts to delete.',
          items: { type: 'string' }
        }
      },
      required: ['summary']
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

    const systemPrompt = `You are Shadow's Background Memory Manager, an autonomous AI agent responsible for maintaining long-term conversational memory. Your purpose is to continuously extract, organize, and synthesize critical information from ongoing user interactions into the Scratchpad.

Current Scratchpad State:
${JSON.stringify({ ...scratchpad, summaries: undefined }, null, 2)}

Directives:
1. CRITICAL: Analyze the messages meticulously and call 'update_scratchpad'. You MUST provide a summary.
2. Ensure any new facts you extract are SHORT and strictly ONE-LINE long. Do not write paragraphs for facts.
3. Manage the 'importantFacts' ledger by providing 'new_facts', 'update_facts', or 'delete_fact_ids' inside the single tool call.
4. Execute silently. Respond ONLY with the 'update_scratchpad' tool call. Do not output conversational text or explanations.`;

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
    const pendingToolCalls = new Map<string, { name: string; args: any }>();

    // Process the stream and collect tool calls
    for await (const chunk of stream) {
      if (chunk.type === 'tool_call' && chunk.toolCall) {
        pendingToolCalls.set(chunk.toolCall.id, {
          name: chunk.toolCall.name,
          args: chunk.toolCall.arguments
        });
      }
    }

    console.log('[Scratchpad] Model finished streaming. Collected tool calls:', Array.from(pendingToolCalls.values()));

    // Execute fully accumulated tool calls
    if (pendingToolCalls.size > 0) {
      dirty = true;
      for (const [id, tc] of pendingToolCalls.entries()) {
        const args = tc.args as Record<string, any>;
        
        if (tc.name === 'update_scratchpad') {
          if (args.summary) {
            if (!scratchpad.summaries) scratchpad.summaries = [];
            scratchpad.summaries.push(args.summary);
          }
          
          if (!scratchpad.importantFacts) scratchpad.importantFacts = [];

          if (args.new_facts && Array.isArray(args.new_facts)) {
            for (const fact of args.new_facts) {
               scratchpad.importantFacts.push({
                 id: Math.random().toString(36).substring(2, 8),
                 content: fact,
                 status: 'active',
                 updatedAt: Date.now()
               });
            }
          }

          if (args.update_facts && Array.isArray(args.update_facts)) {
            for (const update of args.update_facts) {
              const item = scratchpad.importantFacts.find(i => i.id === update.id);
              if (item) {
                if (update.content) item.content = update.content;
                if (update.status) item.status = update.status;
                item.updatedAt = Date.now();
              }
            }
          }

          if (args.delete_fact_ids && Array.isArray(args.delete_fact_ids)) {
            scratchpad.importantFacts = scratchpad.importantFacts.filter(i => !args.delete_fact_ids.includes(i.id));
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
