import type {
  AIProvider,
  AIModel,
  ChatParams,
  ChatChunk,
  ToolCall,
} from '@/lib/types';

/**
 * Ollama Cloud Provider
 *
 * Uses the Ollama Cloud REST API at https://ollama.com/api
 * All requests go through /api/proxy/ollama to bypass CORS.
 */
export class OllamaProvider implements AIProvider {
  type = 'ollama' as const;
  name = 'Ollama Cloud';

  private getApiKey(): string {
    if (typeof window === 'undefined') return '';
    const settings = localStorage.getItem('shadow-credentials');
    if (!settings) return '';
    try {
      const parsed = JSON.parse(settings);
      return parsed.ollama?.apiKey || '';
    } catch {
      return '';
    }
  }

  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) return { success: false, error: 'No API key configured.' };

    try {
      const res = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/tags',
          method: 'GET',
          apiKey,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Connection failed: ${text}` };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: `Network error: ${e instanceof Error ? e.message : 'Unknown'}`,
      };
    }
  }

  async listModels(): Promise<AIModel[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    return [
      {
        id: 'gemma4:cloud',
        name: 'Gemma 4 (Cloud)',
        provider: 'ollama',
        capabilities: {
          streaming: true,
          vision: true,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'on_off',
        },
      },
      {
        id: 'gpt-oss:20b-cloud',
        name: 'GPT OSS 20B (Cloud)',
        provider: 'ollama',
        capabilities: {
          streaming: true,
          vision: false,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'levels',
        },
      },
      {
        id: 'gpt-oss:120b-cloud',
        name: 'GPT OSS 120B (Cloud)',
        provider: 'ollama',
        capabilities: {
          streaming: true,
          vision: false,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'levels',
        },
      },
      {
        id: 'minimax-m3:cloud',
        name: 'MiniMax M3 (Cloud)',
        provider: 'ollama',
        capabilities: {
          streaming: true,
          vision: true,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'on_off',
        },
      },
    ];
  }

  private async getModelCapabilities(
    apiKey: string,
    modelName: string
  ): Promise<AIModel['capabilities']> {
    const caps: AIModel['capabilities'] = {
      streaming: true,
      vision: false,
      toolCalling: false,
      imageGeneration: false,
      thinking: 'none',
    };

    try {
      const res = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/show',
          method: 'POST',
          apiKey,
          body: { model: modelName },
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // 1. Direct capabilities array from Ollama API
        if (data.capabilities && Array.isArray(data.capabilities)) {
          if (data.capabilities.includes('vision')) caps.vision = true;
          if (data.capabilities.includes('tools')) caps.toolCalling = true;
          if (data.capabilities.includes('completion')) caps.streaming = true;
          if (data.capabilities.includes('thinking') || data.capabilities.includes('reasoning')) caps.thinking = 'always_on';
        }

        // 2. Template inspection for function/tool calling & thinking support (.Tools, <think>)
        if (data.template && typeof data.template === 'string') {
          if (data.template.includes('.Tools') || data.template.includes('[AVAILABLE_TOOLS]') || data.template.includes('tools')) {
            caps.toolCalling = true;
          }
          if (data.template.includes('think') || data.template.includes('<think>') || data.template.includes('thought')) {
            caps.thinking = 'always_on';
          }
        }

        // 3. Vision family architecture check
        const families = data.details?.families || [];
        if (Array.isArray(families)) {
          if (families.some((f: string) => ['clip', 'mllama', 'vision', 'llava', 'pixtral'].includes(f.toLowerCase()))) {
            caps.vision = true;
          }
          if (families.some((f: string) => ['reasoning', 'thinker', 'r1'].includes(f.toLowerCase()))) {
            caps.thinking = 'always_on';
          }
        }

        // 4. Model info architecture checks
        if (data.model_info) {
          const infoKeys = Object.keys(data.model_info);
          if (infoKeys.some((k) => k.includes('vision') || k.includes('clip') || k.includes('projector'))) {
            caps.vision = true;
          }
          if (infoKeys.some((k) => k.includes('reasoning') || k.includes('thinking'))) {
            caps.thinking = 'always_on';
          }
        }
      }
    } catch {
      // ignore
    }

    return caps;
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      yield { type: 'error', error: 'No Ollama API key configured.' };
      return;
    }

    // Convert messages to Ollama format
    const messages = params.messages.map((m) => {
      const msg: Record<string, unknown> = { role: m.role };

      // Combine text parts
      const textParts = m.parts.filter((p) => p.type === 'text');
      msg.content = textParts.map((p) => p.text).join('\n') || '';

      // Image parts
      const imageParts = m.parts.filter((p) => p.type === 'image');
      if (imageParts.length > 0) {
        msg.images = imageParts.map((p) => p.data);
      }

      // Tool calls from assistant
      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        }));
      }

      // Tool results
      if (m.role === 'tool' && m.toolResults && m.toolResults.length > 0) {
        msg.content = typeof m.toolResults[0].result === 'string'
          ? m.toolResults[0].result
          : JSON.stringify(m.toolResults[0].result);
      }

      return msg;
    });

    // Build request body
    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      stream: true,
    };

    // Add thinking configuration
    if (params.thinkingMode && params.thinkingMode !== 'off') {
      body.think = params.thinkingMode === 'on' ? true : params.thinkingMode;
      body.options = {
        think: params.thinkingMode === 'on' ? true : params.thinkingMode
      };
    } else if (params.thinkingMode === 'off') {
      body.think = false;
      body.options = { think: false };
    }

    // Add tools if present
    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    try {
      const res = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/api/chat',
          method: 'POST',
          apiKey,
          body,
          stream: true,
        }),
        signal: params.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          yield { type: 'error', error: 'Invalid Ollama API key.' };
        } else if (res.status === 429) {
          yield { type: 'error', error: 'Rate limit reached. Please try again later.' };
        } else {
          yield { type: 'error', error: `Ollama error: ${text}` };
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body from Ollama.' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      let textBuffer = '';
      let isThinking = false;
      let closingTag = '';
      const openRegex = /(<think>|<thought>|<reasoning>|<\|channel>thought|<analysis>|<\|analysis\|>)/;

      // Professional Output Parser: Intercept leaked ReAct tool calls
      let isBufferingTool = true;
      let potentialToolBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const chunk = JSON.parse(trimmed);

            // Check for tool calls
            if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
              for (const tc of chunk.message.tool_calls) {
                const toolCall: ToolCall = {
                  id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || {},
                };
                yield { type: 'tool_call', toolCall };
              }
            }

            // Native Ollama Thinking field
            if (chunk.message?.thinking || chunk.message?.thought) {
              const thoughtText = chunk.message.thinking || chunk.message.thought;
              yield { type: 'thought', thought: thoughtText };
            }

            // Text content (with fallback regex parsing for older Ollama versions)
            if (chunk.message?.content) {
              const content = chunk.message.content;
              
              // Intercept potential leaked JSON tool calls at the very beginning of the response
              if (isBufferingTool) {
                potentialToolBuffer += content;
                const trimmedBuffer = potentialToolBuffer.trimStart();
                
                // If it clearly doesn't start with a JSON object or markdown JSON block, stop buffering
                if (trimmedBuffer.length > 0 && !trimmedBuffer.startsWith('{') && !trimmedBuffer.startsWith('```')) {
                  isBufferingTool = false;
                  textBuffer += potentialToolBuffer; // flush what we buffered
                  potentialToolBuffer = '';
                } else {
                  continue; // keep buffering until the end
                }
              } else {
                textBuffer += content;
              }

              while (textBuffer.length > 0) {
                if (!isThinking) {
                  const openMatch = textBuffer.match(openRegex);
                  if (openMatch) {
                    const tagIndex = openMatch.index!;
                    const matchedTag = openMatch[0];

                    if (tagIndex > 0) {
                      yield { type: 'text', text: textBuffer.slice(0, tagIndex) };
                    }

                    isThinking = true;
                    if (matchedTag === '<|channel>thought') closingTag = '<channel|>';
                    else if (matchedTag === '<|analysis|>') closingTag = '</analysis|>';
                    else closingTag = matchedTag.replace('<', '</');

                    textBuffer = textBuffer.slice(tagIndex + matchedTag.length);
                  } else {
                    const lastOpenBracket = textBuffer.lastIndexOf('<');
                    if (lastOpenBracket !== -1 && textBuffer.length - lastOpenBracket < 25) {
                      if (lastOpenBracket > 0) {
                        yield { type: 'text', text: textBuffer.slice(0, lastOpenBracket) };
                        textBuffer = textBuffer.slice(lastOpenBracket);
                      }
                      break;
                    } else {
                      yield { type: 'text', text: textBuffer };
                      textBuffer = '';
                    }
                  }
                } else {
                  const closeIndex = textBuffer.indexOf(closingTag);
                  if (closeIndex !== -1) {
                    if (closeIndex > 0) {
                      yield { type: 'thought', thought: textBuffer.slice(0, closeIndex) };
                    }
                    isThinking = false;
                    closingTag = '';
                    textBuffer = textBuffer.slice(closeIndex + closingTag.length);
                  } else {
                    const lastOpenBracket = textBuffer.lastIndexOf('<');
                    if (lastOpenBracket !== -1 && textBuffer.length - lastOpenBracket < 25) {
                      if (lastOpenBracket > 0) {
                        yield { type: 'thought', thought: textBuffer.slice(0, lastOpenBracket) };
                        textBuffer = textBuffer.slice(lastOpenBracket);
                      }
                      break;
                    } else {
                      yield { type: 'thought', thought: textBuffer };
                      textBuffer = '';
                    }
                  }
                }
              }
            }

            // Done
            if (chunk.done) {
              yield { type: 'done', finishReason: 'stop' };
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Process any buffered tool JSON at the end of the stream
      if (isBufferingTool && potentialToolBuffer.trim().length > 0) {
        try {
          // Clean up markdown code blocks if present
          let cleanStr = potentialToolBuffer.trim();
          if (cleanStr.startsWith('```json')) cleanStr = cleanStr.slice(7);
          else if (cleanStr.startsWith('```')) cleanStr = cleanStr.slice(3);
          if (cleanStr.endsWith('```')) cleanStr = cleanStr.slice(0, -3);
          cleanStr = cleanStr.trim();
          
          // Relaxed JSON parsing for LLM hallucinated syntax (e.g. single quotes)
          const parsed = (new Function(`return ${cleanStr}`))();
          
          if (parsed && typeof parsed === 'object' && parsed.action) {
            let args = {};
            if (typeof parsed.action_input === 'string') {
              try {
                args = (new Function(`return ${parsed.action_input}`))();
              } catch {
                args = { input: parsed.action_input };
              }
            } else if (typeof parsed.action_input === 'object') {
              args = parsed.action_input;
            }
            
            yield { 
              type: 'tool_call', 
              toolCall: {
                id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: parsed.action,
                arguments: args
              } 
            };
          } else {
            // Not a valid ReAct tool call, fallback to text
            textBuffer += potentialToolBuffer;
          }
        } catch {
          // Failed to parse, fallback to streaming it as text
          textBuffer += potentialToolBuffer;
        }
      }

      // Flush any remaining text/thought buffer
      if (textBuffer) {
        if (isThinking) {
          yield { type: 'thought', thought: textBuffer };
        } else {
          yield { type: 'text', text: textBuffer };
        }
      }

      yield { type: 'done', finishReason: 'stop' };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        yield { type: 'done', finishReason: 'abort' };
      } else {
        yield {
          type: 'error',
          error: `Network error: ${e instanceof Error ? e.message : 'Unknown'}`,
        };
      }
    }
  }
}
