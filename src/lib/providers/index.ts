import { OllamaProvider } from './ollama';
import { GeminiProvider } from './gemini';
import { CloudflareImageProvider } from './cloudflare';
import type { AIProvider, ProviderType } from '@/lib/types';

// Singleton instances
const ollamaProvider = new OllamaProvider();
const geminiProvider = new GeminiProvider();
const cloudflareProvider = new CloudflareImageProvider();

/**
 * Get a chat provider by type.
 */
export function getChatProvider(type: ProviderType): AIProvider | null {
  switch (type) {
    case 'ollama':
      return ollamaProvider;
    case 'gemini':
      return geminiProvider;
    default:
      return null;
  }
}

/**
 * Get the Cloudflare image generation provider.
 */
export function getImageProvider(): CloudflareImageProvider {
  return cloudflareProvider;
}

/**
 * Get all available chat providers.
 */
export function getAllChatProviders(): AIProvider[] {
  return [ollamaProvider, geminiProvider];
}

/**
 * Get the Ollama provider specifically (for web search).
 */
export function getOllamaProvider(): OllamaProvider {
  return ollamaProvider;
}
