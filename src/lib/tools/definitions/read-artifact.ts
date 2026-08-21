import type { ToolDefinition } from '@/lib/types';
import { getArtifact } from '@/lib/storage/db';

export const readArtifactTool: ToolDefinition = {
  name: 'read_artifact',
  description: 'Reads the code/content of an existing artifact from the database. Use this when you need to inspect the contents of a file you saved earlier.',
  category: 'System',
  icon: 'file-text',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The exact ID of the artifact to read (e.g. art-7xg2).' },
    },
    required: ['id'],
  },
  execute: async (args: any) => {
    const { id } = args;
    
    if (!id) {
      return { toolCallId: '', name: 'read_artifact', result: 'Error: id is required', isError: true };
    }

    try {
      const artifact = await getArtifact(id);
      
      if (!artifact) {
        return { 
          toolCallId: '',
          name: 'read_artifact',
          result: `Error: Artifact with ID ${id} not found in the database. Are you sure the ID is correct?`, 
          isError: true 
        };
      }

      return {
        toolCallId: '',
        name: 'read_artifact',
        result: `Content of ${artifact.filename} (ID: ${artifact.id}, Language: ${artifact.language}):\n\n\`\`\`${artifact.language}\n${artifact.content}\n\`\`\``,
        isError: false,
      };
    } catch (error) {
      return {
        toolCallId: '',
        name: 'read_artifact',
        result: `Failed to read artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isError: true,
      };
    }
  },
};
