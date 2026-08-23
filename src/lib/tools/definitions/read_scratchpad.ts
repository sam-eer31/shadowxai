import type { ToolDefinition } from '@/lib/types';
import { getActiveScratchpad } from '@/lib/chat/scratchpad';
import { useChatStore } from '@/stores/chat-store';

export const readScratchpadTool: ToolDefinition = {
  name: 'read_scratchpad',
  description: 'Read the background memory scratchpad for the current conversation. Use this whenever you need to recall important facts, or see a list of created artifacts/images.',
  icon: 'database',
  category: 'system',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute: async () => {
    const conv = useChatStore.getState().getActiveConversation();
    if (!conv) {
      return {
        toolCallId: '',
        name: 'read_scratchpad',
        result: 'Error: No active conversation found.',
        isError: true,
      };
    }

    try {
      const scratchpad = getActiveScratchpad(conv);
      if (!scratchpad || !scratchpad.messageId) {
        return {
          toolCallId: '',
          name: 'read_scratchpad',
          result: 'The scratchpad is currently empty.',
        };
      }

      // Return a clean representation
      const data = {
        summaries: scratchpad.summaries?.length ? scratchpad.summaries : ['No summaries yet.'],
        importantFacts: scratchpad.importantFacts,
        artifacts: scratchpad.artifacts,
        generatedImages: scratchpad.generatedImages,
      };

      return {
        toolCallId: '',
        name: 'read_scratchpad',
        result: JSON.stringify(data, null, 2),
      };
    } catch (err) {
      return {
        toolCallId: '',
        name: 'read_scratchpad',
        result: 'Error: Failed to read scratchpad.',
        isError: true,
      };
    }
  }
};
