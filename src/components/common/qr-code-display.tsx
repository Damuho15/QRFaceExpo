
'use client';

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  payload: string;
  size?: number;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ payload, size = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && payload) {
      QRCode.toCanvas(canvasRef.current, payload, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
      }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [payload, size]);

  return <canvas ref={canvasRef} data-ai-hint="qr code" />;
};

export default QrCodeDisplay;
