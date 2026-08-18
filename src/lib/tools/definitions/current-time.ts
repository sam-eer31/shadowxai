import type { ToolDefinition, ToolResult } from '@/lib/types';

export const currentTimeTool: ToolDefinition = {
  name: 'current_time',
  description:
    'Get the current date, time, and timezone. Useful when the user asks "what time is it" or needs temporal context.',
  icon: 'clock',
  category: 'Utility',
  inputSchema: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description:
          'Optional IANA timezone string, e.g. "America/New_York". Defaults to user\'s local timezone.',
      },
    },
  },
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const tz = (args.timezone as string) || undefined;
      const now = new Date();

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'long',
      };

      if (tz) {
        options.timeZone = tz;
      }

      const formatted = now.toLocaleDateString('en-US', options);
      const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: tz,
      });

      return {
        toolCallId: '',
        name: 'current_time',
        result: `Current date and time: ${formatted}\nTime: ${time}\nUTC: ${now.toISOString()}`,
      };
    } catch (e) {
      return {
        toolCallId: '',
        name: 'current_time',
        result: `Error: ${e instanceof Error ? e.message : 'Unknown'}`,
        isError: true,
      };
    }
  },
};
