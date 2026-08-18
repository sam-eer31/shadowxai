import type { ToolDefinition, ToolResult } from '@/lib/types';
import { getImageProvider } from '@/lib/providers';

export const imageGenerationTool: ToolDefinition = {
  name: 'image_generation',
  description:
    'Generate an image from a text description using AI. Returns a generated image based on the provided prompt.',
  icon: 'image',
  category: 'Creative',
  requiresConfig: ['cloudflare.accountId', 'cloudflare.apiToken'],
  terminatesTurn: true,
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description:
          'A detailed description of the image to generate, e.g. "A futuristic city at sunset, cyberpunk style"',
      },
      width: {
        type: 'string',
        description: 'Image width in pixels (default: 1024)',
        enum: ['512', '768', '1024'],
      },
      height: {
        type: 'string',
        description: 'Image height in pixels (default: 1024)',
        enum: ['512', '768', '1024'],
      },
    },
    required: ['prompt'],
  },
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const prompt = args.prompt as string;
    if (!prompt) {
      return {
        toolCallId: '',
        name: 'image_generation',
        result: 'No prompt provided for image generation.',
        isError: true,
      };
    }

    const provider = getImageProvider();
    if (!provider.isConfigured()) {
      return {
        toolCallId: '',
        name: 'image_generation',
        result:
          'Cloudflare credentials are required for image generation. Configure them in Settings.',
        isError: true,
      };
    }

    const width = parseInt(args.width as string) || 1024;
    const height = parseInt(args.height as string) || 1024;

    const result = await provider.generateImage(prompt, { width, height });

    if ('error' in result) {
      return {
        toolCallId: '',
        name: 'image_generation',
        result: result.error,
        isError: true,
      };
    }

    return {
      toolCallId: '',
      name: 'image_generation',
      result: JSON.stringify({
        type: 'generated_image',
        imageUrl: result.imageUrl,
        prompt,
      }),
    };
  },
};
