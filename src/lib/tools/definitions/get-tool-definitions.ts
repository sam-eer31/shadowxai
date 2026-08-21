import { ToolDefinition } from '@/lib/types';
import { useSettingsStore, getAvailableTools } from '@/stores/settings-store';

export const getToolDefinitions: ToolDefinition = {
  name: 'get_tool_definitions',
  description: 'Fetches the complete JSON schema and parameters required to execute specific tools. Call this after seeing an available tool in your system prompt to learn how to use it.',
  icon: 'code',
  category: 'System',
  requiresConfig: [],
  terminatesTurn: false,
  inputSchema: {
    type: 'object',
    properties: {
      tool_names: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'An array of tool names to fetch the definitions for (e.g., ["weather", "calculator"]).',
      },
    },
    required: ['tool_names'],
  },
  execute: async (args: any) => {
    if (!args.tool_names || !Array.isArray(args.tool_names)) {
      return {
        toolCallId: '',
        name: 'get_tool_definitions',
        result: 'Error: tool_names must be an array of strings.',
        isError: true,
      };
    }

    const { getToolByName } = await import('../registry');
    const creds = useSettingsStore.getState().credentials;
    const availableToolNames = getAvailableTools(creds);

    const schemas = args.tool_names.map((name: string) => {
      // Ensure the tool is actually enabled by the user
      if (!availableToolNames.has(name)) {
        return { name, error: `Tool "${name}" is not enabled or does not exist.` };
      }

      const tool = getToolByName(name);
      if (!tool) {
        return { name, error: `Tool "${name}" not found in registry.` };
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      };
    });

    return {
      toolCallId: '',
      name: 'get_tool_definitions',
      result: JSON.stringify(schemas, null, 2),
    };
  },
};
