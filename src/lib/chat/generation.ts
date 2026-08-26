import { useChatStore, getActiveMessages } from '@/stores/chat-store';
import { useSettingsStore, DEFAULT_SYSTEM_PROMPT } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { getChatProvider } from '@/lib/providers';
import { getAllTools, toProviderTools } from '@/lib/tools/registry';
import { executeToolCalls } from './tool-executor';
import { parseBranchArtifacts } from './artifact-parser';
import { generateId } from '@/lib/utils/id';
import { saveConversation, saveArtifact } from '@/lib/storage/db';
import { extractBase64Data } from '@/lib/utils/image';
import { useArtifactStore } from '@/stores/artifact-store';
import { processScratchpadAsync, getActiveScratchpad } from './scratchpad';
import type {
  Conversation,
  Message,
  MessageContent,
  ProviderMessage,
  ProviderMessagePart,
  ToolCall,
  ToolResult,
} from '@/lib/types';

const MAX_TOOL_TURNS = 5;

export async function generateResponse(
  conv: Conversation,
  settings: ReturnType<typeof useSettingsStore.getState>,
  provider: ReturnType<typeof getChatProvider>,
  modelId: string
) {
  if (!provider) return;
  const store = useChatStore;

  const abortController = new AbortController();

  const updateGenState = (updates: Partial<import('@/stores/chat-store').GenerationState>) => {
    store.setState((state) => ({
      generations: {
        ...state.generations,
        [conv.id]: {
          ...(state.generations[conv.id] || {
            isGenerating: false,
            streamingContent: '',
            streamingThought: '',
            thoughtTimeMs: 0,
            pendingToolCalls: [],
            abortController: null,
          }),
          ...updates
        }
      }
    }));
  };

  updateGenState({
    isGenerating: true,
    abortController,
    streamingContent: '',
    streamingThought: '',
    thoughtTimeMs: 0,
    pendingToolCalls: []
  });

  try {
    // Build provider messages with context trimming, using only the active branch
    const activeMessages = getActiveMessages(conv);
    const providerMessages = buildProviderMessages(activeMessages, settings);

    let toolTurns = 0;
    let currentMessages = providerMessages;
    let fullText = '';
    let fullThought = '';
    let thoughtStart = 0;
    let currentThoughtTimeMs = 0;
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let generationError = '';

    // Loop to handle tool calls
    while (toolTurns <= MAX_TOOL_TURNS) {
      // Find tools queried in the current generation (don't inject past history tools)
      const usedToolNames = new Set<string>();
      for (const tc of allToolCalls) {
        if (tc.name === 'get_tool_definitions' && Array.isArray(tc.arguments?.tool_names)) {
          for (const name of tc.arguments.tool_names as string[]) {
            usedToolNames.add(name);
          }
        }
      }

      // Only inject discovery tools + previously used tools
      const dynamicToolsToInject = getAllTools().filter(t =>
        t.name === 'get_tool_definitions' ||
        usedToolNames.has(t.name)
      );

      const providerTools = dynamicToolsToInject.length > 0 ? toProviderTools(dynamicToolsToInject) : undefined;

      fullText = '';
      fullThought = '';
      thoughtStart = 0;
      currentThoughtTimeMs = 0;
      const pendingToolCalls: ToolCall[] = [];

      updateGenState({ streamingContent: '', streamingThought: '', thoughtTimeMs: 0, pendingToolCalls: [] });

      let clampedThinkingMode: import('@/lib/types').ThinkingMode | undefined = settings.modelThinkingModes?.[modelId] || settings.thinkingMode;
      const model = (await provider.listModels()).find(m => m.id === modelId);
      const thinkingCapability = model?.capabilities.thinking || 'none';

      if (thinkingCapability === 'always_on') {
        clampedThinkingMode = 'on';
      } else if (thinkingCapability === 'none') {
        clampedThinkingMode = undefined;
      } else if (thinkingCapability === 'on_off' && clampedThinkingMode !== 'off') {
        clampedThinkingMode = 'on';
      } else if (thinkingCapability === 'levels') {
        if (!clampedThinkingMode || clampedThinkingMode === 'off' || clampedThinkingMode === 'on') {
          clampedThinkingMode = 'low';
        }
      }

      // Gemma 4 specific logic: inject <|think|> into the system prompt if thinking is enabled
      const requestMessages = [...currentMessages];
      if (model?.id.toLowerCase().includes('gemma4') && clampedThinkingMode && clampedThinkingMode !== 'off') {
        const sysMsgIndex = requestMessages.findIndex(m => m.role === 'system');
        if (sysMsgIndex >= 0) {
          const sysText = requestMessages[sysMsgIndex].parts.find(p => p.type === 'text')?.text || '';
          requestMessages[sysMsgIndex] = {
            ...requestMessages[sysMsgIndex],
            parts: [{ type: 'text', text: `<|think|>\n\n${sysText}` }]
          };
        } else {
          requestMessages.unshift({
            role: 'system',
            parts: [{ type: 'text', text: '<|think|>' }]
          });
        }
      }

      // Log the full payload going to the provider to the server console
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          tools: providerTools
        })
      }).catch(() => { });

      const stream = provider.chat({
        model: modelId,
        messages: requestMessages,
        tools: providerTools,
        signal: abortController.signal,
        thinkingMode: clampedThinkingMode,
      });

      let displayedContent = '';
      let displayedThought = '';
      let isUnrolling = true;

      const unrollerPromise = (async () => {
        while (isUnrolling || displayedContent.length < fullText.length || displayedThought.length < fullThought.length) {
          if (abortController.signal.aborted) break;

          let stateUpdated = false;
          const newState: any = {};

          if (displayedThought.length < fullThought.length) {
            const remaining = fullThought.length - displayedThought.length;
            let step = 1;
            if (remaining > 100) step = Math.max(8, Math.ceil(remaining / 8));
            else if (remaining > 50) step = Math.max(5, Math.ceil(remaining / 7));
            else if (remaining > 20) step = 3;
            else if (remaining > 6) step = 2;

            displayedThought = fullThought.slice(0, displayedThought.length + step);
            newState.streamingThought = displayedThought;
            if (thoughtStart === 0) thoughtStart = Date.now();
            currentThoughtTimeMs = Date.now() - thoughtStart;
            newState.thoughtTimeMs = currentThoughtTimeMs;
            stateUpdated = true;
          } else if (displayedContent.length < fullText.length) {
            const remaining = fullText.length - displayedContent.length;
            let step = 1;
            if (remaining > 100) step = Math.max(8, Math.ceil(remaining / 8));
            else if (remaining > 50) step = Math.max(5, Math.ceil(remaining / 7));
            else if (remaining > 20) step = 3;
            else if (remaining > 6) step = 2;

            displayedContent = fullText.slice(0, displayedContent.length + step);
            newState.streamingContent = displayedContent;
            stateUpdated = true;
          }

          if (stateUpdated) {
            updateGenState(newState);
          }

          // ~60fps
          await new Promise(r => setTimeout(r, 16));
        }
      })();

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;

        if (chunk.type === 'text' && chunk.text) {
          fullText += chunk.text;
        }

        if (chunk.type === 'thought' && chunk.thought) {
          fullThought += chunk.thought;
        }

        if (chunk.type === 'tool_call' && chunk.toolCall) {
          const idx = pendingToolCalls.findIndex(
            (t) => (chunk.toolCall!.id && t.id === chunk.toolCall!.id) || (!chunk.toolCall!.id && t.name === chunk.toolCall!.name)
          );
          if (idx >= 0) {
            pendingToolCalls[idx] = chunk.toolCall;
          } else {
            pendingToolCalls.push(chunk.toolCall);
          }
          updateGenState({ pendingToolCalls: [...pendingToolCalls] });
        }

        if (chunk.type === 'error') {
          generationError = chunk.error || 'An error occurred.';
          useUIStore.getState().addToast({
            type: 'error',
            message: generationError,
          });
          break;
        }
      }

      isUnrolling = false;
      await unrollerPromise;

      // Log the exact raw response to the terminal for debugging
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawModelTextResponse: fullText,
          rawModelThoughtResponse: fullThought,
          toolCalls: pendingToolCalls
        })
      }).catch(() => { });

      // If we got tool calls, execute them and continue
      if (pendingToolCalls.length > 0) {
        toolTurns++;

        // Add assistant message with tool calls
        const contentBlocks: MessageContent[] = [];
        if (fullThought) {
          contentBlocks.push({ type: 'thought', thought: fullThought, thoughtTimeMs: currentThoughtTimeMs });
        }
        if (fullText) {
          contentBlocks.push({ type: 'text', text: fullText });
        }
        if (pendingToolCalls.length > 0) {
          pendingToolCalls.forEach((tc) => contentBlocks.push({ type: 'tool_call', toolCall: tc }));
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: contentBlocks,
          model: modelId,
          provider: settings.activeProvider,
          createdAt: Date.now(),
          parentId: conv.currentNodeId,
        };

        // Merge only metadata from store (title may have been updated by background title gen)
        const storeConv2 = store.getState().conversations.find((c) => c.id === conv.id);
        conv = {
          ...conv,
          ...(storeConv2 ? { title: storeConv2.title, isGeneratingTitle: storeConv2.isGeneratingTitle } : {}),
          messages: [...conv.messages, assistantMsg],
          currentNodeId: assistantMsg.id,
          updatedAt: Date.now(),
        };

        // Immediately update store so UI shows the tool in execution phase with live spinner
        const intermediateConvs = store
          .getState()
          .conversations.map((c) => (c.id === conv.id ? conv : c));
        store.setState({ conversations: intermediateConvs });

        // Clear streaming state immediately so StreamingBubble does not duplicate assistantMsg
        updateGenState({
          streamingContent: '',
          streamingThought: '',
          thoughtTimeMs: 0,
          pendingToolCalls: [],
        });

        // Clear consumed text and thought to prevent duplication if we break out of the loop
        fullText = '';
        fullThought = '';
        thoughtStart = 0;
        currentThoughtTimeMs = 0;

        // Check for infinite loops (identical tool calls to last turn)
        let isLoop = false;
        if (toolTurns > 1 && allToolCalls.length > 0) {
          const lastCalls = allToolCalls.slice(-pendingToolCalls.length);
          if (lastCalls.length === pendingToolCalls.length) {
            isLoop = pendingToolCalls.every((tc, i) =>
              tc.name === lastCalls[i].name &&
              JSON.stringify(tc.arguments) === JSON.stringify(lastCalls[i].arguments)
            );
          }
        }

        let currentScratchpad = getActiveScratchpad(conv);
        let scratchpadUpdated = false;

        let results: ToolResult[];
        if (isLoop || toolTurns >= MAX_TOOL_TURNS) {
          // Model is stuck in a loop or hit the maximum tool limit
          results = pendingToolCalls.map(tc => ({
            toolCallId: tc.id,
            name: tc.name,
            result: 'SYSTEM WARNING: You either repeated this exact tool call or reached the maximum tool limit. Do not call any more tools. Please provide a final text answer to the user based on the information you have.',
            isError: true
          }));
        } else {
          // Compute branch artifacts
          const { artifacts: branchArtifacts } = parseBranchArtifacts(conv.id, conv.messages);

          // Execute tools normally
          results = await executeToolCalls(pendingToolCalls, { 
            conversationId: conv.id, 
            scratchpad: currentScratchpad,
            branchArtifacts
          });
        }

        allToolCalls.push(...pendingToolCalls);
        allToolResults.push(...results);

        // Add tool result messages
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const tc = pendingToolCalls[i];

          // Auto-update scratchpad for artifacts and images
          if (!result.isError) {
            if (result.name === 'create_artifact') {
              const regex = /<artifact id="([^"]+)">/g;
              let match;
              let fileIndex = 0;
              const files = Array.isArray(tc.arguments.files) ? tc.arguments.files : [];
              while ((match = regex.exec(result.result as string)) !== null) {
                const file = files[fileIndex] || {};
                currentScratchpad.artifacts.push({
                  id: match[1],
                  filename: file.filename || 'unnamed_artifact',
                  description: `Created artifact: ${file.filename || 'unnamed'}`,
                  version: 1
                });
                scratchpadUpdated = true;
                fileIndex++;
              }
            } else if (result.name === 'image_generation') {
              try {
                const parsed = JSON.parse(result.result as string);
                if (parsed.type === 'generated_image') {
                  currentScratchpad.generatedImages.push({
                    promptUsed: parsed.prompt,
                    context: 'Generated by user request'
                  });
                  scratchpadUpdated = true;
                }
              } catch (e) { }
            }
          }

          // Check if this is an image generation result
          let toolContent: MessageContent[];
          try {
            const parsed = JSON.parse(result.result as string);
            if (parsed.type === 'generated_image' && parsed.imageUrl) {
              toolContent = [
                {
                  type: 'generated_image',
                  imageUrl: parsed.imageUrl,
                  imagePrompt: parsed.prompt,
                },
                { type: 'tool_result', toolResult: result },
              ];
            } else {
              toolContent = [{ type: 'tool_result', toolResult: result }];
            }
          } catch {
            toolContent = [{ type: 'tool_result', toolResult: result }];
          }

          const toolMsg: Message = {
            id: generateId(),
            role: 'tool',
            content: toolContent,
            createdAt: Date.now(),
            parentId: conv.currentNodeId,
            ...(scratchpadUpdated && i === results.length - 1 ? { scratchpad: { ...currentScratchpad } } : {})
          };

          conv = {
            ...conv,
            messages: [...conv.messages, toolMsg],
            currentNodeId: toolMsg.id,
            updatedAt: Date.now(),
          };
        }

        // Rebuild messages for next turn
        currentMessages = buildProviderMessages(conv.messages, settings, true);

        // Update conversations state
        const conversations = useChatStore
          .getState()
          .conversations.map((c) => (c.id === conv.id ? conv : c));
        store.setState({ conversations });
        await saveConversation(conv);

        // Professional Solution: Terminate the turn immediately if the tool definition requires it
        const shouldTerminate = pendingToolCalls.some((tc) => {
          const toolDef = getAllTools().find((t) => t.name === tc.name);
          return toolDef?.terminatesTurn === true;
        });

        if (shouldTerminate) {
          break;
        }

        continue;
      }

      // No more tool calls, finalize
      break;
    }

    // Add final assistant message
    if (fullText || fullThought || allToolCalls.length === 0 || generationError) {
      let currentScratchpad = getActiveScratchpad(conv);
      let scratchpadUpdated = false;

      // Extract artifacts to DB with flexible attribute parsing
      // Matches: ### File: `filename.ext`\n```language\ncontent\n```
      const artifactRegex = /(?:^|\n)### File:\s*`?([^`\n]+)`?\s*\n\s*```(\w*)\n([\s\S]*?)(?:```|$)/g;
      let match;
      while ((match = artifactRegex.exec(fullText)) !== null) {
        const filename = match[1].trim();
        const language = match[2].trim() || 'text';
        let rawContent = match[3];

        if (!filename) continue;

        const originalId = filename.replace(/[^a-zA-Z0-9]/g, '_');
        const dbId = `${conv.id}_${originalId}`;
        const extension = filename.includes('.') ? filename.split('.').pop()! : 'txt';

        if (rawContent.endsWith('\n')) {
          rawContent = rawContent.slice(0, -1);
        }

        const storeMeta = useArtifactStore.getState().getArtifact(dbId);

        await saveArtifact({
          id: dbId,
          conversationId: conv.id,
          filename,
          extension,
          language,
          content: rawContent,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        const newVersion = storeMeta ? (storeMeta.version ? storeMeta.version + 1 : (storeMeta as any).currentVersion ? (storeMeta as any).currentVersion + 1 : 2) : 1;
        useArtifactStore.getState().addArtifact(dbId, filename, extension, language, newVersion);

        // Deduplicate: remove if it already exists in the array (e.g. updating an existing artifact)
        currentScratchpad.artifacts = currentScratchpad.artifacts.filter(a => a.id !== dbId);
        currentScratchpad.artifacts.push({
          id: dbId,
          filename,
          description: `Created artifact: ${filename}`,
          version: newVersion
        });
        scratchpadUpdated = true;
      }

      const contentBlocks: MessageContent[] = [];
      if (fullThought) {
        contentBlocks.push({ type: 'thought', thought: fullThought, thoughtTimeMs: currentThoughtTimeMs });
      }
      if (fullText || generationError) {
        let finalOutput = fullText;
        if (generationError) {
          finalOutput += (finalOutput ? '\n\n' : '') + `**Error:** ${generationError}`;
        }
        contentBlocks.push({ type: 'text', text: finalOutput });
      }
      if (contentBlocks.length === 0) {
        contentBlocks.push({ type: 'text', text: '' });
      }

      // Merge only metadata from store (title may have been updated by background title gen)
      const storeConv1 = useChatStore.getState().conversations.find((c) => c.id === conv.id);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: contentBlocks,
        model: modelId,
        provider: settings.activeProvider,
        createdAt: Date.now(),
        parentId: conv.currentNodeId,
        ...(scratchpadUpdated ? { scratchpad: { ...currentScratchpad } } : {})
      };

      conv = {
        ...conv,
        ...(storeConv1 ? { title: storeConv1.title, isGeneratingTitle: storeConv1.isGeneratingTitle } : {}),
        messages: [...conv.messages, assistantMessage],
        currentNodeId: assistantMessage.id,
        updatedAt: Date.now(),
      };
    }

    // Final metadata merge before saving
    const finalStoreConv = useChatStore.getState().conversations.find((c) => c.id === conv.id);
    if (finalStoreConv) {
      conv = { ...conv, title: finalStoreConv.title, isGeneratingTitle: finalStoreConv.isGeneratingTitle };
    }

    const conversations = useChatStore
      .getState()
      .conversations.map((c) => (c.id === conv.id ? conv : c));
    store.setState({ conversations });

    updateGenState({
      isGenerating: false,
      abortController: null,
      streamingContent: '',
      streamingThought: '',
      thoughtTimeMs: 0,
      pendingToolCalls: [],
    });

    await saveConversation(conv);

    // Trigger background scratchpad processing without blocking
    processScratchpadAsync(conv, settings, settings.credentials).catch(console.error);
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      useUIStore.getState().addToast({
        type: 'error',
        message: `Error: ${e instanceof Error ? e.message : 'Unknown'}`,
      });
    }
    updateGenState({
      isGenerating: false,
      abortController: null,
      streamingContent: '',
      streamingThought: '',
      thoughtTimeMs: 0,
      pendingToolCalls: [],
    });
  }
}

/**
 * Build provider messages from conversation messages with context trimming.
 */
function buildProviderMessages(
  messages: Message[],
  settings: ReturnType<typeof useSettingsStore.getState>,
  preserveDiscoveryTools: boolean = false
): ProviderMessage[] {
  const result: ProviderMessage[] = [];

  // Get available tool names to inject into system prompt
  const baseTools = ['calculator', 'weather', 'current_time', 'read_artifact', 'read_scratchpad'];

  const hasImageCreds = (settings.credentials as any).puter?.signedIn ||
    ((settings.credentials as any).cloudflare?.accountId && (settings.credentials as any).cloudflare?.apiToken && (settings.credentials as any).cloudflare?.enabled !== false);
  const hasWebCreds = !!(settings.credentials as any).tavily?.apiKey;

  const availableToolNames = [...baseTools];
  if (hasImageCreds) availableToolNames.push('image_generation');
  if (hasWebCreds && settings.isWebSearchEnabled) availableToolNames.push('web_search');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const promptSections: string[] = [];

  // Base prompt / personality
  promptSections.push(settings.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT);

  // Current Context
  let contextSection = `# Current Context\n- Date: ${dateStr}\n- Time: ${timeStr}`;
  if (settings.userLocation?.trim()) {
    contextSection += `\n- User Location: ${settings.userLocation.trim()}`;
  }
  promptSections.push(contextSection);

  // Formatting Guidelines
  promptSections.push(
    `# Formatting & Guidelines\n` +
    `- Format your responses using clean GitHub Flavored Markdown (headers, bullet points, tables).\n` +
    `- For mathematical equations and formulas, use standard LaTeX syntax: inline with \`$...$\` and block formulas with \`$$...$$\`.\n` +
    `- Be direct, accurate, and concise. Avoid unnecessary conversational filler.`
  );

  // Tool Calling Workflow
  let toolSection = `# Tool Calling Workflow\n`;
  if (availableToolNames.length > 0) {
    toolSection += `You have access to the following tools: ${availableToolNames.join(', ')}.\n` +
      `- Before calling any tool you do not yet know the parameters for, you MUST call 'get_tool_definitions' with the tool names to fetch their JSON schemas.\n`;
  }
  toolSection += `- You are supported by an automated background Scratchpad that tracks important facts, generated artifacts, and images. If you need historical conversation context beyond your immediate memory, call 'read_scratchpad'.\n` +
    `- When you receive tool execution results, synthesize the information and provide a complete, direct user-facing response.\n` +
    `- NEVER output internal action markers or placeholder phrases (such as '[Executed tools]' or '[Action: ...]') in your final answer.`;
  promptSections.push(toolSection);

  // Artifact Guidelines
  promptSections.push(
    `# Artifact Guidelines\n` +
    `Artifacts are dedicated, interactive file containers rendered in the UI for complete, standalone code or structured documents.\n\n` +
    `1. **When to CREATE or UPDATE an Artifact**:\n` +
    `   - Substantial, standalone code files (scripts > 15 lines, full HTML/CSS/JS web pages, React components, complete programs) or complete structured data files (JSON, CSV, SVG diagrams).\n` +
    `   - **Format**: Directly stream the code in your response using a standard Markdown header and code block. You MUST use exactly this format:\n` +
    `     ### File: \`filename.ext\`\n` +
    `     \`\`\`language\n` +
    `     // complete code here\n` +
    `     \`\`\`\n` +
    `   - **CRITICAL**: An artifact represents a SINGLE RAW FILE. NEVER merge multiple files into one block. If you want to provide multiple files (e.g. a Python version and a JavaScript version), you MUST create multiple separate \`### File:\` blocks.\n` +
    `   - Do NOT call a tool to create artifacts. Stream them directly in your response text.\n` +
    `   - Do NOT put conversational text inside the code block.\n\n` +
    `2. **When to use Standard Code Blocks (NO Artifact)**:\n` +
    `   - Short code snippets, one-liners, shell/terminal commands (e.g. \`npm install\`, \`git commit\`), config examples, or small illustrative diffs.\n` +
    `   - Just use standard \`\`\`language ... \`\`\` code blocks WITHOUT the \`### File:\` header.`
  );

  // UI Action Buttons & Fallbacks
  const fallbackRules: string[] = [];
  if (!hasImageCreds) {
    fallbackRules.push(`- If the user asks to generate an image: Tell them Image Generation is not configured, and include this exact button in your response: <settings-btn tab="providers" />`);
  }
  if (!hasWebCreds || !settings.isWebSearchEnabled) {
    const reason = !hasWebCreds ? 'configure Web Search in Settings' : 'toggle on Web Search in the chat input area';
    const button = !hasWebCreds ? ` Include this exact button in your response: <settings-btn tab="services" />` : '';
    fallbackRules.push(`- If the user asks to search the web: Tell them they need to ${reason}.${button}`);
  }

  if (fallbackRules.length > 0) {
    promptSections.push(`# UI Action Buttons & Fallbacks\n` + fallbackRules.join('\n'));
  }

  const systemPrompt = promptSections.join('\n\n');

  // Always add system prompt
  result.push({
    role: 'system',
    parts: [{ type: 'text', text: systemPrompt }],
  });

  // Context trimming: keep last N messages
  const windowSize = settings.contextWindowSize;
  const trimmedMessages =
    messages.length > windowSize
      ? messages.slice(messages.length - windowSize)
      : messages;

  for (const msg of trimmedMessages) {
    const parts: ProviderMessagePart[] = [];
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];

    for (const content of msg.content) {
      switch (content.type) {
        case 'text':
          if (content.text) {
            let trimmedText = content.text;
            const artifactRegex = /(### File:\s*`?([^`\n]+)`?\s*\n\s*```\w*\n)([\s\S]*?)(```)/g;
            trimmedText = trimmedText.replace(artifactRegex, (match, header, filename, code, footer) => {
              return `${header}// Content omitted for brevity. Use read_artifact to view contents.\n${footer}`;
            });
            parts.push({ type: 'text', text: trimmedText });
          }
          break;
        case 'image':
          if (content.imageUrl) {
            const { mimeType, data } = extractBase64Data(content.imageUrl);
            parts.push({ type: 'image', mimeType, data });
          }
          break;
        case 'tool_call':
          if (content.toolCall) {
            // HISTORY CLEANUP: Skip all tool calls from past turns to prevent context bloat
            if (!preserveDiscoveryTools) {
              continue;
            }
            toolCalls.push(content.toolCall);
          }
          break;
        case 'tool_result':
          if (content.toolResult) {
            // HISTORY CLEANUP: Skip all tool results from past turns to prevent context bloat
            if (!preserveDiscoveryTools) {
              continue;
            }
            let resultData = content.toolResult.result;
            // Strip out huge base64 image data from tool results
            if (typeof resultData === 'string' && resultData.includes('"type":"generated_image"')) {
              try {
                const parsed = JSON.parse(resultData);
                if (parsed.type === 'generated_image' && parsed.imageUrl) {
                  resultData = JSON.stringify({
                    type: 'generated_image',
                    prompt: parsed.prompt,
                    status: 'success - image displayed to user'
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }

            toolResults.push({
              ...content.toolResult,
              result: resultData
            });
          }
          break;
        case 'generated_image':
          // Don't send image data back, just mention it
          parts.push({
            type: 'text',
            text: `[Generated image: ${content.imagePrompt || 'image'}]`,
          });
          break;
      }
    }

    // Add attachment images
    if (msg.attachments) {
      for (const att of msg.attachments) {
        parts.push({ type: 'image', mimeType: att.mimeType, data: att.data });
      }
    }

    if (parts.length > 0 || toolCalls.length > 0 || toolResults.length > 0) {
      result.push({
        role: msg.role,
        parts: parts.length > 0 ? parts : [{ type: 'text', text: '' }],
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      });
    }
  }

  return result;
}
