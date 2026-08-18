import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin CORS proxy for Ollama Cloud API.
 * Credentials are sent per-request from the client; never stored server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method, apiKey, body: reqBody, stream } = body;

    if (!endpoint || !apiKey) {
      return NextResponse.json(
        { error: 'Missing endpoint or apiKey' },
        { status: 400 }
      );
    }

    const url = `https://ollama.com${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: method || 'POST',
      headers,
    };

    if (method !== 'GET' && reqBody) {
      fetchOptions.body = JSON.stringify(reqBody);
    }

    const res = await fetch(url, fetchOptions);

    if (stream && res.body) {
      // Stream the response back
      return new Response(res.body, {
        status: res.status,
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Proxy error: ${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
