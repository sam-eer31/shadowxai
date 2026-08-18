/**
 * Cloudflare Workers AI — Image Generation Only
 *
 * Uses the Cloudflare REST API via our proxy to avoid CORS.
 * This provider is NOT used for chat.
 */
export class CloudflareImageProvider {
  private getCredentials(): { accountId: string; apiToken: string } | null {
    if (typeof window === 'undefined') return null;
    const settings = localStorage.getItem('shadow-credentials');
    if (!settings) return null;
    try {
      const parsed = JSON.parse(settings);
      if (parsed.cloudflare?.accountId && parsed.cloudflare?.apiToken) {
        return parsed.cloudflare;
      }
      return null;
    } catch {
      return null;
    }
  }

  isConfigured(): boolean {
    return !!this.getCredentials();
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const creds = this.getCredentials();
    if (!creds)
      return {
        success: false,
        error: 'Cloudflare Account ID and API Token are required.',
      };

    try {
      const res = await fetch('/api/proxy/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: creds.accountId,
          apiToken: creds.apiToken,
          action: 'test',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Connection failed: ${text}` };
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: `Network error: ${e instanceof Error ? e.message : 'Unknown'}`,
      };
    }
  }

  async generateImage(
    prompt: string,
    options?: { width?: number; height?: number }
  ): Promise<{ imageUrl: string } | { error: string }> {
    const creds = this.getCredentials();
    if (!creds) {
      return { error: 'Cloudflare credentials are required for image generation.' };
    }

    try {
      const res = await fetch('/api/proxy/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: creds.accountId,
          apiToken: creds.apiToken,
          action: 'generate',
          prompt,
          width: options?.width || 1024,
          height: options?.height || 1024,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { error: `Image generation failed: ${text}` };
      }

      const data = await res.json();
      if (data.imageUrl) {
        return { imageUrl: data.imageUrl };
      }
      return { error: 'No image returned from Cloudflare.' };
    } catch (e) {
      return {
        error: `Network error: ${e instanceof Error ? e.message : 'Unknown'}`,
      };
    }
  }
}
