import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse('Failed to fetch from upstream', { status: response.status });
    }
    
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/webp';
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
