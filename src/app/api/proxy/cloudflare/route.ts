import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin CORS proxy for Cloudflare Workers AI.
 * Credentials are sent per-request from the client; never stored server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, apiToken, action, prompt, width, height } = body;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Missing accountId or apiToken' },
        { status: 400 }
      );
    }

    if (action === 'test') {
      // Test connection by listing available models
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`,
        {
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        return new Response(text, { status: res.status });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'generate') {
      // Generate image using Flux-1-schnell
      const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run`;
      const res = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: '@cf/black-forest-labs/flux-1-schnell',
            input: { prompt }
          }),
        }
      );

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const text = await res.text();
        return new Response(text, { status: res.status });
      }

      let imageUrl = '';

      if (contentType.includes("application/json")) {
        const data = await res.json();
        const base64 = data?.result?.image;
        if (!base64) {
          return NextResponse.json(
            { error: 'Cloudflare returned JSON but no result.image was found.', details: data },
            { status: 502 }
          );
        }
        imageUrl = `data:image/jpeg;base64,${base64}`;
      } else {
        // Fallback to binary image data
        const imageBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64}`;
      }

      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: `Proxy error: ${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
