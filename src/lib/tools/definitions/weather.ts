import type { ToolDefinition, ToolResult } from '@/lib/types';

export const weatherTool: ToolDefinition = {
  name: 'weather',
  description:
    'Get the current weather for a location. Returns temperature, conditions, humidity, and wind.',
  icon: 'cloud-sun',
  category: 'Information',
  inputSchema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or location, e.g. "London" or "New York"',
      },
    },
    required: ['location'],
  },
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const location = args.location as string;
    if (!location) {
      return {
        toolCallId: '',
        name: 'weather',
        result: 'No location provided.',
        isError: true,
      };
    }

    try {
      const res = await fetch(
        `https://wttr.in/${encodeURIComponent(location)}?format=j1`
      );

      if (!res.ok) {
        return {
          toolCallId: '',
          name: 'weather',
          result: `Could not fetch weather for "${location}".`,
          isError: true,
        };
      }

      const data = await res.json();
      const current = data.current_condition?.[0];
      if (!current) {
        return {
          toolCallId: '',
          name: 'weather',
          result: `No weather data available for "${location}".`,
          isError: true,
        };
      }

      const result = [
        `Weather in ${location}:`,
        `Temperature: ${current.temp_C}°C (${current.temp_F}°F)`,
        `Feels like: ${current.FeelsLikeC}°C (${current.FeelsLikeF}°F)`,
        `Condition: ${current.weatherDesc?.[0]?.value || 'Unknown'}`,
        `Humidity: ${current.humidity}%`,
        `Wind: ${current.windspeedKmph} km/h ${current.winddir16Point}`,
        `Visibility: ${current.visibility} km`,
      ].join('\n');

      return { toolCallId: '', name: 'weather', result };
    } catch (e) {
      return {
        toolCallId: '',
        name: 'weather',
        result: `Weather error: ${e instanceof Error ? e.message : 'Unknown'}`,
        isError: true,
      };
    }
  },
};
