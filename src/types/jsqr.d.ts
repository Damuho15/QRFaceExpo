declare module 'jsqr' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: any[];
    version: number;
    location: {
      topRightCorner: Point;
      topLeftCorner: Point;
      bottomRightCorner: Point;
      bottomLeftCorner: Point;
      topRightFinderPattern: Point;
      topLeftFinderPattern: Point;
      bottomLeftFinderPattern: Point;
      bottomRightAlignmentPattern?: Point;
    };
  }

  export interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth';
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null;
}
