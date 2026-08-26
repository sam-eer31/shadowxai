import './quiet';
import puter from '@heyputer/puter.js';
import type {
  AIProvider,
  AIModel,
  ChatParams,
  ChatChunk,
  ProviderMessage,
} from '@/lib/types';
import { useSettingsStore } from '@/stores/settings-store';
// Known Puter model capabilities
const PUTER_MODEL_CAPS: Record<
  string,
  { vision: boolean; tools: boolean; thinking: 'none' | 'levels' | 'on_off'; thinkingOptions?: { id: string; label: string }[] }
> = {
  'gpt-5.6-luna': { vision: true, tools: true, thinking: 'none' },
  'deepseek-ai/deepseek-v4-flash-0731': { 
    vision: false, 
    tools: true, 
    thinking: 'none'
  },
  'deepseek-v4-flash:free': { 
    vision: false, 
    tools: true, 
    thinking: 'none'
  },
  'z-ai/glm-4.7-flash': {
    vision: false,
    tools: true,
    thinking: 'none'
  },
  'z-ai/glm-5.2:free': {
    vision: false,
    tools: true,
    thinking: 'none'
  },
  'xiaomi/mimo-v2.5': {
    vision: false,
    tools: true,
    thinking: 'none'
  },
  'moonshotai/kimi-k2.6:free': {
    vision: false,
    tools: true,
    thinking: 'none'
  },
  'poolside/laguna-s-2.1': {
    vision: false,
    tools: true,
    thinking: 'none'
  },
};

/**
 * Puter.js AI Provider
 */
export class PuterProvider implements AIProvider {
  type = 'puter' as const;
  name = 'Puter Cloud';

  isConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return puter.auth.isSignedIn();
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!puter.auth.isSignedIn()) {
        return { success: false, error: 'Not signed in to Puter.' };
      }
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error testing Puter connection.',
      };
    }
  }

  async listModels(): Promise<AIModel[]> {
    // Hardcode the models available via Puter
    const models = [
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna' },
      { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash 0731' },
      { id: 'deepseek-v4-flash:free', name: 'DeepSeek V4 Flash:free' },
      { id: 'z-ai/glm-4.7-flash', name: 'GLM-4.7 Flash' },
      { id: 'z-ai/glm-5.2:free', name: 'GLM-5.2:free' },
      { id: 'xiaomi/mimo-v2.5', name: 'Xiaomi MIMO V2.5' },
      { id: 'moonshotai/kimi-k2.6:free', name: 'Moonshot Kimi K2.6:free' },
      { id: 'poolside/laguna-s-2.1', name: 'Laguna S 2.1' },
    ];

    return models.map((m) => ({
      ...m,
      provider: 'puter',
      capabilities: {
        streaming: true,
        imageGeneration: false,
        vision: PUTER_MODEL_CAPS[m.id]?.vision ?? false,
        toolCalling: PUTER_MODEL_CAPS[m.id]?.tools ?? false,
        thinking: PUTER_MODEL_CAPS[m.id]?.thinking ?? 'none',
        thinkingOptions: PUTER_MODEL_CAPS[m.id]?.thinkingOptions,
      },
    }));
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    if (!puter.auth.isSignedIn()) {
      yield { type: 'error', error: 'Please sign in to Puter first.' };
      return;
    }

    // Convert messages to Puter format.
    // CRITICAL WORKAROUND: Puter's proxy backends (openai-responses, infron) have a catastrophic bug where they 
    // reject 'tool_calls' in the message history with "Unknown parameter: tool_calls", and reject role: 'tool'
    // with "Invalid role". To bypass this broken proxy layer entirely, we must flatten all tool calls and tool 
    // results into plain text conversational messages.
    const puterMessages = params.messages.flatMap((msg) => {
      if (msg.role === 'tool' && msg.toolResults) {
        // Flatten tool results into a standard user message
        const textResults = msg.toolResults.map(tr => {
          const resStr = typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result);
          return `[System: Tool '${tr.name}' returned data]:\n${resStr}`;
        }).join('\n\n');
        
        return [{
          role: 'user',
          content: textResults,
        }];
      }

      const content = msg.parts.map(part => {
        if (part.type === 'text') return { type: 'text', text: part.text };
        if (part.type === 'image') return { type: 'image_url', image_url: { url: `data:${part.mimeType};base64,${part.data}` } };
        return { type: 'text', text: '' };
      });

      let finalContent: any = content.length === 1 && content[0].type === 'text' 
          ? content[0].text 
          : content;
          
      // Puter requires every message to have non-empty content.
      // If the assistant made a tool call but output no text, use natural language instead of raw action syntax.
      if (!finalContent || (typeof finalContent === 'string' && finalContent.trim() === '') || (Array.isArray(finalContent) && finalContent.length === 0)) {
        if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
          finalContent = msg.toolCalls.map(tc => `Let me check ${tc.name.replace(/_/g, ' ')}.`).join(' ');
        } else {
          finalContent = '...';
        }
      }

      const formattedMsg: any = {
        role: msg.role,
        content: finalContent,
      };

      // WE EXPLICITLY DO NOT ADD `formattedMsg.tool_calls` HERE! 
      // Puter's proxy will crash if it sees it in the history.
      
      return [formattedMsg];
    });

    try {
      // Puter handles streaming automatically if we request stream: true
      // Though Puter's stream iterator might yield strings or objects, we'll assume it yields chunk objects or strings.
      // Based on typical puter.js usage:
      const puterOptions: any = {
        model: params.model,
        stream: true,
      };

      const thinkingCap = PUTER_MODEL_CAPS[params.model]?.thinking || 'none';
      if (thinkingCap !== 'none' && params.thinkingMode) {
        if (thinkingCap === 'levels') {
          puterOptions.reasoning_effort = params.thinkingMode;
        } else {
          puterOptions.reasoning_effort = params.thinkingMode === 'on' ? 'high' : 'none';
        }
      }

      if (params.tools && params.tools.length > 0) {
        puterOptions.tools = params.tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
      }

      const puterUrl = (window as any).puter?.APIOrigin || 'https://api.puter.com';
      const authToken = (window as any).puter?.authToken;

      const response = await fetch(`${puterUrl}/drivers/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;actually=json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          interface: 'puter-chat-completion',
          driver: 'ai-chat',
          test_mode: false,
          method: 'complete',
          args: {
            messages: puterMessages,
            ...puterOptions
          },
          auth_token: authToken,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (e) {}
        throw new Error(`Puter API error: ${response.status} ${response.statusText} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response stream returned from Puter');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      async function* getResponseStream() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (!line.trim()) continue;
            try {
              yield JSON.parse(line);
            } catch (e) {
              // ignore
            }
          }
        }
      }

      const responseStream = getResponseStream();
      const toolCallsBuffer: Record<number, { id: string; name: string; arguments: string }> = {};

      for await (const chunk of responseStream as any) {
        if (params.signal?.aborted) break;
        if (typeof chunk === 'string') {
          yield { type: 'text', text: chunk };
        } else {
          // 1. Standard OpenAI streaming delta format
          if (chunk?.choices?.[0]?.delta?.tool_calls) {
            for (const tc of chunk.choices[0].delta.tool_calls) {
              if (tc.id) {
                toolCallsBuffer[tc.index] = {
                  id: tc.id,
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                };
                if (tc.function?.name) {
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: tc.id,
                      name: tc.function.name,
                      arguments: {},
                    },
                  };
                }
              } else if (toolCallsBuffer[tc.index]) {
                if (tc.function?.arguments) {
                  toolCallsBuffer[tc.index].arguments += tc.function.arguments;
                }
                if (tc.function?.name && !toolCallsBuffer[tc.index].name) {
                  toolCallsBuffer[tc.index].name = tc.function.name;
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: toolCallsBuffer[tc.index].id,
                      name: tc.function.name,
                      arguments: {},
                    },
                  };
                }
              }
            }
          } 
          // 2. Puter simplified format or non-streaming format
          else if (chunk?.tool_calls || chunk?.message?.tool_calls || chunk?.choices?.[0]?.message?.tool_calls || chunk?.choices?.[0]?.tool_calls) {
            const calls = chunk.tool_calls || chunk.message?.tool_calls || chunk.choices?.[0]?.message?.tool_calls || chunk.choices?.[0]?.tool_calls;
            for (let i = 0; i < calls.length; i++) {
              const tc = calls[i];
              const idx = tc.index ?? i;
              if (tc.id) {
                toolCallsBuffer[idx] = {
                  id: tc.id,
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                };
                if (tc.function?.name) {
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: tc.id,
                      name: tc.function.name,
                      arguments: typeof tc.function?.arguments === 'object' ? tc.function.arguments : {},
                    },
                  };
                }
              } else if (toolCallsBuffer[idx] && tc.function?.arguments) {
                toolCallsBuffer[idx].arguments += tc.function.arguments;
              }
            }
          } 
          // 3. Puter's native custom tool_use format
          else if (chunk?.type === 'tool_use' && chunk?.name) {
            let args = chunk.input || {};
            if (typeof args === 'string') {
              try { args = JSON.parse(args); } catch { /* ignore */ }
            }
            
            // Deduplicate streamed updates robustly
            let existingIdx = Object.keys(toolCallsBuffer).find(k => {
              const tc = toolCallsBuffer[Number(k)];
              if (chunk.id && tc.id === chunk.id) return true;
              if (chunk.canonical_id && (tc as any).canonical_id === chunk.canonical_id) return true;
              if (!chunk.id && tc.name === chunk.name) return true;
              return false;
            });
            
            const tcId = chunk.id || (existingIdx !== undefined ? toolCallsBuffer[Number(existingIdx)].id : `tc_${Date.now()}`);
            if (existingIdx !== undefined) {
              toolCallsBuffer[Number(existingIdx)].arguments = args;
            } else {
              const newIdx = Object.keys(toolCallsBuffer).length;
              toolCallsBuffer[newIdx] = {
                id: tcId,
                name: chunk.name,
                arguments: args,
                ...(chunk.canonical_id ? { canonical_id: chunk.canonical_id } : {})
              } as any;
            }
            yield {
              type: 'tool_call',
              toolCall: {
                id: tcId,
                name: chunk.name,
                arguments: args,
              },
            };
          }
          // 4. Fallback for text extraction
          else if (chunk?.text) {
            yield { type: 'text', text: chunk.text };
          } else if (chunk?.choices?.[0]?.delta?.content) {
            yield { type: 'text', text: chunk.choices[0].delta.content };
          } else if (chunk?.message?.content) {
            yield { type: 'text', text: chunk.message.content };
          } else if (chunk?.choices?.[0]?.message?.content) {
            yield { type: 'text', text: chunk.choices[0].message.content };
          } else if (chunk?.type === 'reasoning' && typeof chunk.reasoning === 'string') {
            yield { type: 'thought', thought: chunk.reasoning };
          } else if (chunk?.type !== 'usage') {
            console.log('PuterProvider unhandled chunk:', chunk);
          }
        }
      }

      // Yield buffered tool calls at the end
      for (const idx of Object.keys(toolCallsBuffer)) {
        const tc = toolCallsBuffer[Number(idx)];
        let args = {};
        if (typeof tc.arguments === 'object' && tc.arguments !== null) {
          args = tc.arguments;
        } else if (typeof tc.arguments === 'string') {
          try {
            args = JSON.parse(tc.arguments);
          } catch {
            // Fallback if args isn't valid JSON
          }
        }
        
        yield {
          type: 'tool_call',
          toolCall: {
            id: tc.id,
            name: tc.name,
            arguments: args,
          },
        };
      }

      yield { type: 'done' };
    } catch (error: any) {
      console.error('Puter chat error:', error);
      yield {
        type: 'error',
        error: error.message || 'An error occurred while chatting with Puter.',
      };
    }
  }
}
