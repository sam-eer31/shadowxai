import { NextRequest, NextResponse } from 'next/server';

/**
 * Perform a web search using Tavily API.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, apiKey } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing Tavily API Key' },
        { status: 400 }
      );
    }

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: 'basic'
      })
    });

    if (!tavilyRes.ok) {
      const errorText = await tavilyRes.text();
      return NextResponse.json(
        { error: `Tavily API error: ${errorText}` },
        { status: tavilyRes.status }
      );
    }

    const searchResults = await tavilyRes.json();
    
    // Map Tavily results to our expected format
    const results = (searchResults.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: `Search proxy error: ${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
