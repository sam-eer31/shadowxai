import type {
  AIProvider,
  AIModel,
  ChatParams,
  ChatChunk,
  ToolCall,
} from '@/lib/types';

// Known Gemini model capabilities
const GEMINI_MODEL_CAPS: Record<
  string,
  { vision: boolean; tools: boolean }
> = {
  'gemini-2.5-flash': { vision: true, tools: true },
  'gemini-2.5-pro': { vision: true, tools: true },
  'gemini-2.0-flash': { vision: true, tools: true },
  'gemini-2.0-flash-lite': { vision: true, tools: false },
  'gemini-1.5-flash': { vision: true, tools: true },
  'gemini-1.5-pro': { vision: true, tools: true },
};

/**
 * Google Gemini Provider
 *
 * Uses the Gemini REST API. Gemini supports CORS for browser calls,
 * so we call it directly (no proxy needed).
 */
export class GeminiProvider implements AIProvider {
  type = 'gemini' as const;
  name = 'Google Gemini';

  private readonly baseUrl =
    'https://generativelanguage.googleapis.com/v1beta';

  private getApiKey(): string {
    if (typeof window === 'undefined') return '';
    const settings = localStorage.getItem('shadow-credentials');
    if (!settings) return '';
    try {
      const parsed = JSON.parse(settings);
      return parsed.gemini?.apiKey || '';
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
      const res = await fetch(
        `${this.baseUrl}/models?key=${apiKey}`
      );
      if (!res.ok) {
        if (res.status === 400 || res.status === 403) {
          return { success: false, error: 'Invalid Gemini API key.' };
        }
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

    // Allow only Gemini 3.5 Flash and 3.5 Flash Lite as requested
    return [
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'gemini',
        capabilities: {
          streaming: true,
          vision: true,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'none',
        },
      },
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        provider: 'gemini',
        capabilities: {
          streaming: true,
          vision: true,
          toolCalling: true,
          imageGeneration: false,
          thinking: 'none',
        },
      },
    ];
  }

  private getKnownCapabilities(modelId: string): {
    vision: boolean;
    tools: boolean;
  } {
    // Check known models
    for (const [key, caps] of Object.entries(GEMINI_MODEL_CAPS)) {
      if (modelId.startsWith(key)) {
        return caps;
      }
    }
    // Default: assume modern models support vision and tools
    if (modelId.includes('gemini')) {
      return { vision: true, tools: true };
    }
    return { vision: false, tools: false };
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      yield { type: 'error', error: 'No Gemini API key configured.' };
      return;
    }

    // Convert messages to Gemini format
    const contents: Array<Record<string, unknown>> = [];
    let systemInstruction: Record<string, unknown> | undefined;

    for (const msg of params.messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: msg.parts
            .filter((p) => p.type === 'text')
            .map((p) => ({ text: p.text })),
        };
        continue;
      }

      const parts: Array<Record<string, unknown>> = [];

      for (const part of msg.parts) {
        if (part.type === 'text' && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === 'image' && part.data) {
          parts.push({
            inlineData: {
              mimeType: part.mimeType || 'image/jpeg',
              data: part.data,
            },
          });
        }
      }

      // Handle tool calls from assistant
      if (msg.role === 'assistant' && msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
      }

      // Handle tool results
      if (msg.role === 'tool' && msg.toolResults) {
        for (const tr of msg.toolResults) {
          parts.push({
            functionResponse: {
              name: tr.name,
              response: { result: tr.result },
            },
          });
        }
        // In Gemini, function responses go under role: "function"
        contents.push({ role: 'function', parts });
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    // Build request body
    const body: Record<string, unknown> = { contents };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    // Add tools
    if (params.tools && params.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: params.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    // Add thinking configuration
    if (params.thinkingMode && params.thinkingMode !== 'off') {
      const levelMap: Record<string, string> = {
        low: 'LOW',
        medium: 'MEDIUM',
        high: 'HIGH',
        on: 'MEDIUM',
      };
      
      const level = levelMap[params.thinkingMode] || 'MEDIUM';
      
      body.generationConfig = {
        thinking_config: {
          thinking_level: level
        },
        // We'll also try the top-level parameter just in case
        thinking_level: level
      };
    }

    try {
      const res = await fetch(
        `${this.baseUrl}/models/${params.model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: params.signal,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 400 || res.status === 403) {
          yield { type: 'error', error: 'Gemini API key is invalid.' };
        } else if (res.status === 429) {
          yield {
            type: 'error',
            error: 'Rate limit reached. Please try again later.',
          };
        } else {
          yield { type: 'error', error: `Gemini error: ${text}` };
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body from Gemini.' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') {
            yield { type: 'done', finishReason: 'stop' };
            return;
          }

          try {
            const chunk = JSON.parse(jsonStr);
            const candidates = chunk.candidates || [];

            for (const candidate of candidates) {
              const parts = candidate.content?.parts || [];
              for (const part of parts) {
                if (part.thought) {
                  yield { type: 'thought', thought: part.text || '' }; // Natively Gemini returns thought texts in parts that have thought: true
                } else if (part.text) {
                  yield { type: 'text', text: part.text };
                }
                if (part.functionCall) {
                  const toolCall: ToolCall = {
                    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    name: part.functionCall.name,
                    arguments: part.functionCall.args || {},
                  };
                  yield { type: 'tool_call', toolCall };
                }
              }

              if (candidate.finishReason === 'STOP') {
                yield { type: 'done', finishReason: 'stop' };
                return;
              }
            }
          } catch {
            // Skip malformed SSE data
          }
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
