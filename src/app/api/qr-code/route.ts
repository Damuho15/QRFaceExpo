
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');
  const filename = searchParams.get('filename') || 'qr-code.png';

  if (!data) {
    return new Response('Missing "data" query parameter', { status: 400 });
  }

  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;
    
    const response = await fetch(qrApiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch QR code: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();

    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    // CRITICAL: These headers prevent the browser from caching the response.
    // This ensures that every download click fetches a fresh file and works reliably.
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');


    return new NextResponse(imageBuffer, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('QR Code Proxy Error:', error);
    return new Response('Error fetching QR code file.', { status: 500 });
  }
}
