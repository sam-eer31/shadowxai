import type { ToolDefinition, ToolResult } from '@/lib/types';

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description:
    'Search the web for current information using DuckDuckGo. Returns relevant web results with titles, URLs, and content snippets.',
  icon: 'globe',
  category: 'Search',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web',
      },
    },
    required: ['query'],
  },
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const query = args.query as string;
    if (!query) {
      return {
        toolCallId: '',
        name: 'web_search',
        result: 'No search query provided.',
        isError: true,
      };
    }

    try {
      const res = await fetch('/api/tools/websearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          toolCallId: '',
          name: 'web_search',
          result: `Search failed: ${text}`,
          isError: true,
        };
      }

      const data = await res.json();
      const results = data.results || [];

      // Format results as readable text
      const formatted = results
        .slice(0, 5)
        .map(
          (r: { title: string; url: string; snippet: string }, i: number) =>
            `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet || 'No content'}`
        )
        .join('\n\n');

      return {
        toolCallId: '',
        name: 'web_search',
        result: formatted || 'No results found.',
      };
    } catch (e) {
      return {
        toolCallId: '',
        name: 'web_search',
        result: `Search error: ${e instanceof Error ? e.message : 'Unknown'}`,
        isError: true,
      };
    }
  },
};

