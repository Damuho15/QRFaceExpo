
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data');
  const filename = searchParams.get('filename') || 'qr-code.png';

  if (!data) {
    return new NextResponse('Missing data parameter', { status: 400 });
  }

  try {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrCodeUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch QR code from provider: ${response.statusText}`);
    }

    const imageBlob = await response.blob();
    
    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(imageBlob, { status: 200, headers });

  } catch (error) {
    console.error('Error in QR code proxy:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: 'Failed to generate QR code', details: errorMessage }), { status: 500 });
  }
}
