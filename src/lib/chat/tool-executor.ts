import type { ToolCall, ToolResult } from '@/lib/types';
import { getToolByName } from '../tools/registry';

const MAX_TOOL_CALLS_PER_TURN = 5;
const TOOL_TIMEOUT_MS = 30000;

/**
 * Execute a single tool call with timeout and error handling.
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = getToolByName(toolCall.name);

  if (!tool) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      result: `Tool "${toolCall.name}" not found.`,
      isError: true,
    };
  }

  try {
    // Execute with timeout
    const result = await Promise.race([
      tool.execute(toolCall.arguments),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(
          () => reject(new Error('Tool execution timed out (30s).')),
          TOOL_TIMEOUT_MS
        )
      ),
    ]);

    return { ...result, toolCallId: toolCall.id };
  } catch (e) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      result: `Tool execution failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      isError: true,
    };
  }
}

/**
 * Execute multiple tool calls with a limit to prevent infinite loops.
 */
export async function executeToolCalls(
  toolCalls: ToolCall[]
): Promise<ToolResult[]> {
  // Enforce maximum tool calls per turn
  const limited = toolCalls.slice(0, MAX_TOOL_CALLS_PER_TURN);
  const results = await Promise.all(limited.map(executeTool));
  return results;
}
