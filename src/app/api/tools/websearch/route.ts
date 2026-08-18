import { NextRequest, NextResponse } from 'next/server';
import { searchDuckDuckGo } from 'ts-duckduckgo-search';

/**
 * Perform a web search using ts-duckduckgo-search.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query' },
        { status: 400 }
      );
    }

    const searchResults = await searchDuckDuckGo(query);
    
    const results = searchResults.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: `Search proxy error: ${e instanceof Error ? e.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
