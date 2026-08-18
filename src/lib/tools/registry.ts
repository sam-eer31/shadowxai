import type { ToolDefinition, ProviderToolDef } from '@/lib/types';
import { webSearchTool } from './definitions/web-search';
import { calculatorTool } from './definitions/calculator';
import { weatherTool } from './definitions/weather';
import { currentTimeTool } from './definitions/current-time';
import { imageGenerationTool } from './definitions/image-generation';

// All available tools
const ALL_TOOLS: ToolDefinition[] = [
  webSearchTool,
  calculatorTool,
  weatherTool,
  currentTimeTool,
  imageGenerationTool,
];

/**
 * Get all available tool definitions.
 */
export function getAllTools(): ToolDefinition[] {
  return ALL_TOOLS;
}

/**
 * Get a tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

/**
 * Convert internal tool definitions to provider-specific format.
 * Both Ollama and Gemini use a very similar JSON schema format.
 */
export function toProviderTools(tools: ToolDefinition[]): ProviderToolDef[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
  }));
}

/**
 * Check if a tool's required configuration is available.
 */
export function isToolAvailable(tool: ToolDefinition): boolean {
  if (!tool.requiresConfig || tool.requiresConfig.length === 0) {
    return true;
  }

  if (typeof window === 'undefined') return false;

  try {
    const creds = localStorage.getItem('shadow-credentials');
    if (!creds) return false;
    const parsed = JSON.parse(creds);

    for (const config of tool.requiresConfig) {
      const parts = config.split('.');
      let current: Record<string, unknown> = parsed;
      for (const part of parts) {
        if (!current || typeof current !== 'object') return false;
        current = current[part] as Record<string, unknown>;
      }
      if (!current) return false;
    }
    return true;
  } catch {
    return false;
  }
}
