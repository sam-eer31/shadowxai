import type { Message, BranchArtifactState } from '@/lib/types';

export interface BranchArtifactData {
  artifacts: Record<string, BranchArtifactState>;
  messageVersions: Record<string, Record<string, number>>;
}

export function parseBranchArtifacts(conversationId: string, messages: Message[]): BranchArtifactData {
  const artifacts: Record<string, BranchArtifactState> = {};
  const messageVersions: Record<string, Record<string, number>> = {};
  
  // Regex to match Markdown-Native artifact blocks
  // Matches: ### File: `filename.ext`\n```language\ncontent\n```
  const artifactRegex = /(?:^|\n)### File:\s*`?([^`\n]+)`?\s*\n\s*```(\w*)\n([\s\S]*?)(?:```|$)/g;

  for (const msg of messages) {
    if (!msg.content) continue;
    
    // Message.content could be an array of blocks, we want the text blocks
    const textBlocks = Array.isArray(msg.content) 
      ? msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
      : (typeof msg.content === 'string' ? msg.content : '');

    let match;
    // reset lastIndex because regex is global
    artifactRegex.lastIndex = 0;
    while ((match = artifactRegex.exec(textBlocks)) !== null) {
      const filename = match[1].trim();
      const language = match[2].trim() || 'text';
      let cleanContent = match[3];

      if (!filename) continue;
      
      const extension = filename.includes('.') ? filename.split('.').pop()! : 'txt';
      const originalId = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const id = `${conversationId}_${originalId}`;

      // Handle the case where the content was trimmed by the context-trimmer
      const isTrimmed = cleanContent.includes('// Content omitted for brevity. Use read_artifact to view contents.');
      if (isTrimmed) {
        // We still register the version's existence but we don't have the full content here.
        // It's okay, the DB or previous branch history should have it. Actually, wait.
        // If it's trimmed, it means this was a past turn. The original full version was captured
        // when that turn was generated. But since `parseBranchArtifacts` scans the *trimmed* messages,
        // it will replace the history with trimmed versions!
        // Wait, `parseBranchArtifacts` runs on `activeMessages`. Are `activeMessages` trimmed?
        // No, `activeMessages` from the database contain the FULL original text! The trimming ONLY happens 
        // dynamically inside `buildProviderMessages` before sending to the LLM. The database stores full text!
        // So `cleanContent` here will always be the full text.
      }

      // Remove trailing newline that the regex might capture
      if (cleanContent.endsWith('\n')) {
        cleanContent = cleanContent.slice(0, -1);
      }

      if (!artifacts[id]) {
        artifacts[id] = {
          id,
          filename: filename,
          language: language,
          extension: extension,
          versions: []
        };
      }

      // Add as a new version
      artifacts[id].versions.push(cleanContent);
      
      if (!messageVersions[msg.id]) {
        messageVersions[msg.id] = {};
      }
      messageVersions[msg.id][id] = artifacts[id].versions.length;
    }
  }

  return { artifacts, messageVersions };
}
