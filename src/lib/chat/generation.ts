import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { getChatProvider } from '@/lib/providers';
import { getAllTools, toProviderTools } from '@/lib/tools/registry';
import { executeToolCalls } from '@/lib/tools/executor';
import { generateId } from '@/lib/utils/id';
import { saveConversation } from '@/lib/storage/db';
import { extractBase64Data } from '@/lib/utils/image';
import type {
  Conversation,
  Message,
  MessageContent,
  ProviderMessage,
  ProviderMessagePart,
  ToolCall,
  ToolResult,
} from '@/lib/types';

const MAX_TOOL_TURNS = 5;

export async function generateResponse(
  conv: Conversation,
  settings: ReturnType<typeof useSettingsStore.getState>,
  provider: ReturnType<typeof getChatProvider>,
  modelId: string
) {
  if (!provider) return;
  const store = useChatStore;

  const abortController = new AbortController();
  
  const updateGenState = (updates: Partial<import('@/stores/chat-store').GenerationState>) => {
    store.setState((state) => ({
      generations: {
        ...state.generations,
        [conv.id]: {
          ...(state.generations[conv.id] || {
            isGenerating: false,
            streamingContent: '',
            streamingThought: '',
            thoughtTimeMs: 0,
            pendingToolCalls: [],
            abortController: null,
          }),
          ...updates
        }
      }
    }));
  };

  updateGenState({
    isGenerating: true,
    abortController,
    streamingContent: '',
    streamingThought: '',
    thoughtTimeMs: 0,
    pendingToolCalls: []
  });

  try {
    // Build provider messages with context trimming
    const providerMessages = buildProviderMessages(conv.messages, settings);

    // Get enabled tools
    const enabledTools = getAllTools().filter((t) =>
      settings.enabledTools.includes(t.name)
    );
    const providerTools = enabledTools.length > 0 ? toProviderTools(enabledTools) : undefined;

    let toolTurns = 0;
    let currentMessages = providerMessages;
    let fullText = '';
    let fullThought = '';
    let thoughtStart = 0;
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];

    // Loop to handle tool calls
    while (toolTurns <= MAX_TOOL_TURNS) {
      fullText = '';
      fullThought = '';
      thoughtStart = 0;
      const pendingToolCalls: ToolCall[] = [];

      updateGenState({ streamingContent: '', streamingThought: '', thoughtTimeMs: 0, pendingToolCalls: [] });

      let clampedThinkingMode: import('@/lib/types').ThinkingMode | undefined = settings.modelThinkingModes?.[modelId] || settings.thinkingMode;
      const model = (await provider.listModels()).find(m => m.id === modelId);
      const thinkingCapability = model?.capabilities.thinking || 'none';

      if (thinkingCapability === 'always_on') {
        clampedThinkingMode = 'on';
      } else if (thinkingCapability === 'none') {
        clampedThinkingMode = undefined;
      } else if (thinkingCapability === 'on_off' && clampedThinkingMode !== 'off') {
        clampedThinkingMode = 'on';
      } else if (thinkingCapability === 'levels') {
        if (!clampedThinkingMode || clampedThinkingMode === 'off' || clampedThinkingMode === 'on') {
          clampedThinkingMode = 'low';
        }
      }

      // Gemma 4 specific logic: inject <|think|> into the system prompt if thinking is enabled
      const requestMessages = [...currentMessages];
      if (model?.id.toLowerCase().includes('gemma4') && clampedThinkingMode && clampedThinkingMode !== 'off') {
        const sysMsgIndex = requestMessages.findIndex(m => m.role === 'system');
        if (sysMsgIndex >= 0) {
          const sysText = requestMessages[sysMsgIndex].parts.find(p => p.type === 'text')?.text || '';
          requestMessages[sysMsgIndex] = {
            ...requestMessages[sysMsgIndex],
            parts: [{ type: 'text', text: `<|think|>\n\n${sysText}` }]
          };
        } else {
          requestMessages.unshift({
            role: 'system',
            parts: [{ type: 'text', text: '<|think|>' }]
          });
        }
      }

      const stream = provider.chat({
        model: modelId,
        messages: requestMessages,
        tools: providerTools,
        signal: abortController.signal,
        thinkingMode: clampedThinkingMode,
      });

      let displayedContent = '';
      let displayedThought = '';
      let isUnrolling = true;

      const unrollerPromise = (async () => {
        while (isUnrolling || displayedContent.length < fullText.length || displayedThought.length < fullThought.length) {
          if (abortController.signal.aborted) break;

          let stateUpdated = false;
          const newState: any = {};

          if (displayedThought.length < fullThought.length) {
            const remaining = fullThought.length - displayedThought.length;
            let step = 1;
            if (remaining > 100) step = Math.max(8, Math.ceil(remaining / 8));
            else if (remaining > 50) step = Math.max(5, Math.ceil(remaining / 7));
            else if (remaining > 20) step = 3;
            else if (remaining > 6) step = 2;

            displayedThought = fullThought.slice(0, displayedThought.length + step);
            newState.streamingThought = displayedThought;
            if (thoughtStart === 0) thoughtStart = Date.now();
            newState.thoughtTimeMs = Date.now() - thoughtStart;
            stateUpdated = true;
          } else if (displayedContent.length < fullText.length) {
            const remaining = fullText.length - displayedContent.length;
            let step = 1;
            if (remaining > 100) step = Math.max(8, Math.ceil(remaining / 8));
            else if (remaining > 50) step = Math.max(5, Math.ceil(remaining / 7));
            else if (remaining > 20) step = 3;
            else if (remaining > 6) step = 2;

            displayedContent = fullText.slice(0, displayedContent.length + step);
            newState.streamingContent = displayedContent;
            stateUpdated = true;
          }

          if (stateUpdated) {
            updateGenState(newState);
          }

          // ~60fps
          await new Promise(r => setTimeout(r, 16));
        }
      })();

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;

        if (chunk.type === 'text' && chunk.text) {
          fullText += chunk.text;
        }

        if (chunk.type === 'thought' && chunk.thought) {
          fullThought += chunk.thought;
        }

        if (chunk.type === 'tool_call' && chunk.toolCall) {
          pendingToolCalls.push(chunk.toolCall);
          updateGenState({ pendingToolCalls: [...pendingToolCalls] });
        }

        if (chunk.type === 'error') {
          useUIStore.getState().addToast({
            type: 'error',
            message: chunk.error || 'An error occurred.',
          });
          break;
        }
      }

      isUnrolling = false;
      await unrollerPromise;

      // If we got tool calls, execute them and continue
      if (pendingToolCalls.length > 0 && toolTurns < MAX_TOOL_TURNS) {
        toolTurns++;

        // Add assistant message with tool calls
        const contentBlocks: MessageContent[] = [];
        if (fullThought) {
          contentBlocks.push({ type: 'thought', thought: fullThought, thoughtTimeMs: Date.now() - thoughtStart });
        }
        if (fullText) {
          contentBlocks.push({ type: 'text', text: fullText });
        }
        if (pendingToolCalls.length > 0) {
          pendingToolCalls.forEach((tc) => contentBlocks.push({ type: 'tool_call', toolCall: tc }));
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: contentBlocks,
          model: modelId,
          provider: settings.activeProvider,
          createdAt: Date.now(),
          parentId: conv.currentNodeId,
        };

        conv = {
          ...conv,
          messages: [...conv.messages, assistantMsg],
          currentNodeId: assistantMsg.id,
          updatedAt: Date.now(),
        };

        // Clear consumed text and thought to prevent duplication if we break out of the loop
        fullText = '';
        fullThought = '';
        thoughtStart = 0;

        // Check for infinite loops (identical tool calls to last turn)
        let isLoop = false;
        if (toolTurns > 1 && allToolCalls.length > 0) {
          const lastCalls = allToolCalls.slice(-pendingToolCalls.length);
          if (lastCalls.length === pendingToolCalls.length) {
            isLoop = pendingToolCalls.every((tc, i) =>
              tc.name === lastCalls[i].name &&
              JSON.stringify(tc.arguments) === JSON.stringify(lastCalls[i].arguments)
            );
          }
        }

        let results: ToolResult[];
        if (isLoop) {
          // Model is stuck in a loop calling the exact same tools
          results = pendingToolCalls.map(tc => ({
            toolCallId: tc.id,
            name: tc.name,
            result: 'SYSTEM WARNING: You already executed this exact tool call in the previous turn. Do not repeat it. Please provide a final answer to the user based on the information you have.',
            isError: true
          }));
        } else {
          // Execute tools normally
          results = await executeToolCalls(pendingToolCalls);
        }

        allToolCalls.push(...pendingToolCalls);
        allToolResults.push(...results);

        // Add tool result messages
        for (const result of results) {
          // Check if this is an image generation result
          let toolContent: MessageContent[];
          try {
            const parsed = JSON.parse(result.result as string);
            if (parsed.type === 'generated_image' && parsed.imageUrl) {
              toolContent = [
                {
                  type: 'generated_image',
                  imageUrl: parsed.imageUrl,
                  imagePrompt: parsed.prompt,
                },
                { type: 'tool_result', toolResult: result },
              ];
            } else {
              toolContent = [{ type: 'tool_result', toolResult: result }];
            }
          } catch {
            toolContent = [{ type: 'tool_result', toolResult: result }];
          }

          const toolMsg: Message = {
            id: generateId(),
            role: 'tool',
            content: toolContent,
            createdAt: Date.now(),
            parentId: conv.currentNodeId,
          };

          conv = {
            ...conv,
            messages: [...conv.messages, toolMsg],
            currentNodeId: toolMsg.id,
            updatedAt: Date.now(),
          };
        }

        // Rebuild messages for next turn
        currentMessages = buildProviderMessages(conv.messages, settings);

        // Update conversations state
        const conversations = useChatStore
          .getState()
          .conversations.map((c) => (c.id === conv.id ? conv : c));
        store.setState({ conversations });
        await saveConversation(conv);

        // Professional Solution: Terminate the turn immediately if the tool definition requires it
        const shouldTerminate = pendingToolCalls.some((tc) => {
          const toolDef = enabledTools.find((t) => t.name === tc.name);
          return toolDef?.terminatesTurn === true;
        });

        if (shouldTerminate) {
          break;
        }

        continue;
      }

      // No more tool calls, finalize
      break;
    }

    // Add final assistant message
    if (fullText || fullThought || allToolCalls.length === 0) {
      const contentBlocks: MessageContent[] = [];
      if (fullThought) {
        contentBlocks.push({ type: 'thought', thought: fullThought, thoughtTimeMs: Date.now() - thoughtStart });
      }
      if (fullText) {
        contentBlocks.push({ type: 'text', text: fullText });
      }
      if (contentBlocks.length === 0) {
        contentBlocks.push({ type: 'text', text: '' });
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: contentBlocks,
        model: modelId,
        provider: settings.activeProvider,
        createdAt: Date.now(),
        parentId: conv.currentNodeId,
      };

      conv = {
        ...conv,
        messages: [...conv.messages, assistantMessage],
        currentNodeId: assistantMessage.id,
        updatedAt: Date.now(),
      };
    }

    // Update state
    const conversations = useChatStore
      .getState()
      .conversations.map((c) => (c.id === conv.id ? conv : c));
    store.setState({ conversations });
    
    updateGenState({
      isGenerating: false,
      abortController: null,
      streamingContent: '',
      streamingThought: '',
      thoughtTimeMs: 0,
      pendingToolCalls: [],
    });

    await saveConversation(conv);
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      useUIStore.getState().addToast({
        type: 'error',
        message: `Error: ${e instanceof Error ? e.message : 'Unknown'}`,
      });
    }
    updateGenState({
      isGenerating: false,
      abortController: null,
      streamingContent: '',
      streamingThought: '',
      thoughtTimeMs: 0,
      pendingToolCalls: [],
    });
  }
}

/**
 * Build provider messages from conversation messages with context trimming.
 */
function buildProviderMessages(
  messages: Message[],
  settings: ReturnType<typeof useSettingsStore.getState>
): ProviderMessage[] {
  const result: ProviderMessage[] = [];

  // Always add system prompt
  result.push({
    role: 'system',
    parts: [{ type: 'text', text: settings.systemPrompt }],
  });

  // Context trimming: keep last N messages
  const windowSize = settings.contextWindowSize;
  const trimmedMessages =
    messages.length > windowSize
      ? messages.slice(messages.length - windowSize)
      : messages;

  for (const msg of trimmedMessages) {
    const parts: ProviderMessagePart[] = [];
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];

    for (const content of msg.content) {
      switch (content.type) {
        case 'text':
          if (content.text) {
            parts.push({ type: 'text', text: content.text });
          }
          break;
        case 'image':
          if (content.imageUrl) {
            const { mimeType, data } = extractBase64Data(content.imageUrl);
            parts.push({ type: 'image', mimeType, data });
          }
          break;
        case 'tool_call':
          if (content.toolCall) {
            toolCalls.push(content.toolCall);
          }
          break;
        case 'tool_result':
          if (content.toolResult) {
            let resultData = content.toolResult.result;
            // Strip out huge base64 image data from tool results
            if (typeof resultData === 'string' && resultData.includes('"type":"generated_image"')) {
              try {
                const parsed = JSON.parse(resultData);
                if (parsed.type === 'generated_image' && parsed.imageUrl) {
                  resultData = JSON.stringify({
                    type: 'generated_image',
                    prompt: parsed.prompt,
                    status: 'success - image displayed to user'
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }

            toolResults.push({
              ...content.toolResult,
              result: resultData
            });
          }
          break;
        case 'generated_image':
          // Don't send image data back, just mention it
          parts.push({
            type: 'text',
            text: `[Generated image: ${content.imagePrompt || 'image'}]`,
          });
          break;
      }
    }

    // Add attachment images
    if (msg.attachments) {
      for (const att of msg.attachments) {
        parts.push({ type: 'image', mimeType: att.mimeType, data: att.data });
      }
    }

    if (parts.length > 0 || toolCalls.length > 0 || toolResults.length > 0) {
      result.push({
        role: msg.role,
        parts: parts.length > 0 ? parts : [{ type: 'text', text: '' }],
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      });
    }
  }

  return result;
}
