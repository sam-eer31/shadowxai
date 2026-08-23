import type { ToolDefinition, Scratchpad, BranchArtifactState } from '@/lib/types';

export const readArtifactTool: ToolDefinition = {
  name: 'read_artifact',
  description: 'Reads the code/content of an existing artifact. Use this when you need to inspect the contents of a file you saved earlier.',
  category: 'System',
  icon: 'file-text',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'The exact filename of the artifact to read (e.g. calculator.py).' },
    },
    required: ['filename'],
  },
  execute: async (args: any, context?: { conversationId?: string, scratchpad?: Scratchpad, branchArtifacts?: Record<string, BranchArtifactState> }) => {
    let filename = args.filename || args.id || args.artifact_id;
    
    if (!filename) {
      return { toolCallId: '', name: 'read_artifact', result: 'Error: filename is required', isError: true };
    }

    const originalId = filename.replace(/[^a-zA-Z0-9]/g, '_');
    let id = originalId;

    if (context?.conversationId) {
      id = `${context.conversationId}_${originalId}`;
    }

    try {
      const branchState = context?.branchArtifacts?.[id];
      
      if (!branchState || branchState.versions.length === 0) {
        return { 
          toolCallId: '',
          name: 'read_artifact',
          result: `Error: Artifact for filename "${filename}" not found in the current branch's history. Are you sure the filename is correct?`,  
          isError: true 
        };
      }

      // Check if the current branch's scratchpad has a specific version bound
      const intendedVersion = context?.scratchpad?.artifacts?.find(a => a.id === id)?.version;
      const targetVersionIndex = intendedVersion ? intendedVersion - 1 : branchState.versions.length - 1;
      const contentToReturn = branchState.versions[targetVersionIndex];

      return {
        toolCallId: '',
        name: 'read_artifact',
        result: `Content of ${branchState.filename || 'untitled'} (ID: ${branchState.id}, Language: ${branchState.language || 'txt'}${intendedVersion ? `, Version: ${intendedVersion}` : ''}):\n\n\`\`\`${branchState.language || 'txt'}\n${contentToReturn}\n\`\`\``,
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
