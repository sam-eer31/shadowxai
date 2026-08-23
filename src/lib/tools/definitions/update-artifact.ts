import type { ToolDefinition } from '@/lib/types';
import { getArtifact } from '@/lib/storage/db';
import { useArtifactStore } from '@/stores/artifact-store';

export const updateArtifactTool: ToolDefinition = {
  name: 'update_artifact',
  description: 'Updates an existing artifact with new code or content. Call this whenever modifying, fixing, or refactoring a previously created file or document.',
  category: 'System',
  icon: 'edit',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The exact ID of the artifact to update (e.g. art-7xg2).' },
      filename: { type: 'string', description: 'Optional new filename if changing it.' },
      extension: { type: 'string', description: 'Optional new file extension (e.g. py, ts, html).' },
      language: { type: 'string', description: 'Optional new programming language for syntax highlighting (e.g. python, typescript, html).' },
    },
    required: ['id'],
  },
  execute: async (args: any) => {
    const { id, filename, extension, language } = args;

    if (!id) {
      return {
        toolCallId: '',
        name: 'update_artifact',
        result: 'Error: id is required to update an artifact.',
        isError: true,
      };
    }

    try {
      const dbArtifact = await getArtifact(id);
      const storeArtifact = useArtifactStore.getState().getArtifact(id);

      const resolvedFilename = filename || storeArtifact?.filename || dbArtifact?.filename || 'updated_file';
      const resolvedExtension = extension || storeArtifact?.extension || dbArtifact?.extension || 'txt';
      const resolvedLanguage = language || storeArtifact?.language || dbArtifact?.language || resolvedExtension;

      useArtifactStore.getState().addArtifact(id, resolvedFilename, resolvedExtension, resolvedLanguage);

      const resultString = `Artifact "${resolvedFilename}" (ID: ${id}) is ready to be updated.\n\nYou MUST stream the complete updated code in your text response wrapped in these exact tags:\n<artifact id="${id}" filename="${resolvedFilename}" language="${resolvedLanguage}">\n\`\`\`${resolvedLanguage}\n[Your complete updated code goes here]\n\`\`\`\n</artifact>\n\nDo not put conversational text inside the artifact tags.`;

      return {
        toolCallId: '',
        name: 'update_artifact',
        result: resultString,
        isError: false,
      };
    } catch (error) {
      return {
        toolCallId: '',
        name: 'update_artifact',
        result: `Failed to prepare artifact update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true,
      };
    }
  },
};
