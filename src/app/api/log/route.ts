import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('\n================ DATA SENT TO PROVIDER ================');
    console.dir(data, { depth: null, colors: true });
    console.log('=======================================================\n');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
