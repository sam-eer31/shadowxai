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
      files: {
        type: 'array',
        description: 'A list of files you want to create artifacts for.',
        items: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'The name of the file, e.g. script.py or index.html' },
            extension: { type: 'string', description: 'The file extension, e.g. py, html, js' },
            language: { type: 'string', description: 'The full programming language name for syntax highlighting, e.g. python, javascript, java, html' },
          },
          required: ['filename', 'extension', 'language'],
        },
      },
    },
    required: ['files'],
  },
  execute: async (args: any) => {
    const { files } = args;
    const fileArray = Array.isArray(files) ? files : [];
    let resultString = 'Artifacts created successfully. You MUST output the code for each file sequentially in your text response using the exact tags provided below.\n\n';

    for (const file of fileArray) {
      const { filename, extension, language } = file;
      const id = generateShortId();
      const resolvedLang = language || extension || 'text';
      
      useArtifactStore.getState().addArtifact(id, filename, extension, resolvedLang, 1);
      
      resultString += `For "${filename}", stream your code wrapped in these exact tags:\n<artifact id="${id}" filename="${filename}" language="${resolvedLang}">\n\`\`\`${resolvedLang}\n[Code for ${filename}]\n\`\`\`\n</artifact>\n\n`;
    }

    resultString += 'Do NOT put conversational text inside the artifact tags.';

    return {
      toolCallId: '',
      name: 'create_artifact',
      result: resultString,
      isError: false,
    };
  },
};
