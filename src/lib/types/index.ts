// ============================================================
// Shadow — Core Type Definitions
// ============================================================

// --- Provider Types ---

export type ProviderType = 'ollama' | 'gemini' | 'cloudflare';

export type ThinkingCapability = 'none' | 'on_off' | 'levels' | 'always_on';

export interface ModelCapabilities {
  streaming: boolean;
  vision: boolean;
  toolCalling: boolean;
  imageGeneration: boolean;
  thinking: ThinkingCapability;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderType;
  capabilities: ModelCapabilities;
}

// --- Message Types ---

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ContentType =
  | 'text'
  | 'image'
  | 'tool_call'
  | 'tool_result'
  | 'generated_image'
  | 'thought';

export interface MessageContent {
  type: ContentType;
  text?: string;
  thought?: string;
  thoughtTimeMs?: number;
  imageUrl?: string;
  imagePrompt?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

export interface Attachment {
  id: string;
  type: 'image';
  name: string;
  mimeType: string;
  data: string; // base64
  size: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent[];
  attachments?: Attachment[];
  model?: string;
  provider?: ProviderType;
  createdAt: number;
  isStreaming?: boolean;
  parentId?: string;
}

// --- Conversation ---

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  provider: ProviderType;
  model: string;
  messages: Message[];
  currentNodeId?: string;
}

// --- Tool System ---

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  icon: string;
  category: string;
  inputSchema: JSONSchema;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
  requiresProvider?: ProviderType;
  requiresConfig?: string[];
  terminatesTurn?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

// --- Provider Messages (what we send to providers) ---

export interface ProviderMessagePart {
  type: 'text' | 'image';
  text?: string;
  mimeType?: string;
  data?: string; // base64 image data
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts: ProviderMessagePart[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// --- Provider Tool Format ---

export interface ProviderToolDef {
  name: string;
  description: string;
  parameters: JSONSchema;
}

// --- Chat Streaming ---

export interface ChatParams {
  model: string;
  messages: ProviderMessage[];
  tools?: ProviderToolDef[];
  signal?: AbortSignal;
  thinkingMode?: ThinkingMode;
}

export interface ChatChunk {
  type: 'text' | 'tool_call' | 'done' | 'error' | 'thought';
  text?: string;
  thought?: string;
  toolCall?: ToolCall;
  error?: string;
  finishReason?: string;
}

// --- Provider Interface ---

export interface AIProvider {
  type: ProviderType;
  name: string;
  isConfigured: () => boolean;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  listModels: () => Promise<AIModel[]>;
  chat: (params: ChatParams) => AsyncGenerator<ChatChunk>;
}

// --- Settings ---

export interface ProviderCredentials {
  ollama?: { apiKey: string };
  gemini?: { apiKey: string };
  cloudflare?: { accountId: string; apiToken: string };
  tavily?: { apiKey: string };
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThinkingMode = 'off' | 'on' | 'low' | 'medium' | 'high';

export interface AppSettings {
  theme: ThemeMode;
  activeProvider: ProviderType;
  webSearchProvider: ProviderType;
  selectedModels: Partial<Record<ProviderType, string>>;
  enabledTools: string[];
  systemPrompt: string;
  contextWindowSize: number;
  thinkingMode?: ThinkingMode;
  modelThinkingModes?: Record<string, ThinkingMode>;
}

// --- Export / Import ---

export interface ExportData {
  version: number;
  exportedAt: number;
  conversations: Conversation[];
}
