import type { ToolDefinition } from '@/lib/types';
import { generateShortId } from '@/lib/utils/id';
import { useArtifactStore } from '@/stores/artifact-store';

export const createArtifactTool: ToolDefinition = {
  name: 'create_artifact',
  description: 'Creates a new artifact container for code or text content. Use this to render code in a dedicated file-like UI block. Returns an artifact tag that you MUST use to wrap your content.',
  category: 'System',
  icon: 'code',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'The name of the file, e.g. script.py or index.html' },
      extension: { type: 'string', description: 'The file extension, e.g. py, html, js' },
      language: { type: 'string', description: 'The full programming language name for syntax highlighting, e.g. python, javascript, java, html' },
    },
    required: ['filename', 'extension', 'language'],
  },
  execute: async (args: any) => {
    const { filename, extension, language } = args;
    const id = generateShortId();

    useArtifactStore.getState().addArtifact(id, filename, extension, language);

    return {
      toolCallId: '',
      name: 'create_artifact',
      result: `Artifact created successfully. For the file "${filename}", you MUST wrap ONLY the code for this file between these exact tags:\n<artifact id="${id}">\n\n\`\`\`${language || extension}\n[Your code goes here]\n\`\`\`\n\n</artifact>\nDo not put any conversational text inside the artifact tags.`,
      isError: false,
    };
  },
};
