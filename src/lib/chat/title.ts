import { useSettingsStore } from '@/stores/settings-store';
import { getChatProvider } from '@/lib/providers';
import type { ChatParams } from '@/lib/types';

export async function generateConversationTitle(userText: string): Promise<string | null> {
  const settings = useSettingsStore.getState();
  const enabledProviders = settings.getEnabledProvidersList();
  
  if (enabledProviders.length === 0) return null;

  let providerType = enabledProviders[0];
  let modelId = '';

  // Prefer puter deepseek-v4-flash, fallback to ollama gemma4:cloud
  if (enabledProviders.includes('puter')) {
    providerType = 'puter';
    modelId = 'deepseek-v4-flash';
  } else if (enabledProviders.includes('ollama')) {
    providerType = 'ollama';
    modelId = settings.selectedModels['ollama'] || 'gemma4:cloud';
  } else {
    // Fallback to first enabled provider's selected model
    modelId = settings.selectedModels[providerType] || '';
  }

  const provider = getChatProvider(providerType);
  if (!provider) return null;

  const prompt = `Generate a very short, simple 3 to 5 word title for a conversation that starts with the following message. Do not include quotes, periods, or formatting, just the raw title text.\n\nMessage: "${userText}"`;

  const params: ChatParams = {
    model: modelId,
    messages: [
      {
        role: 'user',
        parts: [{ type: 'text', text: prompt }],
      }
    ]
  };

  try {
    let fullText = '';
    const generator = provider.chat(params);
    for await (const chunk of generator) {
      if (chunk.type === 'text') {
        fullText += chunk.text;
      }
      if (chunk.type === 'error') {
        console.error('Title generation error:', chunk.error);
        return null;
      }
    }
    
    const title = fullText.trim().replace(/^["']|["']$/g, '');
    return title.slice(0, 60); // Max length safety
  } catch (err) {
    console.error('Failed to generate title:', err);
    return null;
  }
}
