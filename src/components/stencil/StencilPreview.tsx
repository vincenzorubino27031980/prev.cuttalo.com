'use client';

import { useState } from 'react';
import Image from 'next/image';

interface StencilPreviewProps {
  originalImage: string;
  preprocessedImage: string;
  options: {
    threshold: number;
    invert: boolean;
  };
}

export default function StencilPreview({
  originalImage,
  preprocessedImage,
}: StencilPreviewProps) {
  const [showOriginal, setShowOriginal] = useState(true);

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Anteprima</h3>
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all
              ${showOriginal ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Originale
          </button>
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all
              ${!showOriginal ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Processata
          </button>
        </div>
      </div>

      <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
        {showOriginal ? (
          <Image
            src={originalImage}
            alt="Immagine originale"
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <Image
            src={preprocessedImage}
            alt="Immagine processata"
            fill
            className="object-contain"
            unoptimized
          />
        )}

        {/* Checkerboard background for transparency */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #1f2937 25%, transparent 25%),
              linear-gradient(-45deg, #1f2937 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #1f2937 75%),
              linear-gradient(-45deg, transparent 75%, #1f2937 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            backgroundColor: '#111827',
          }}
        />
      </div>

      <p className="text-gray-400 text-sm mt-4 text-center">
        {showOriginal
          ? 'Immagine originale caricata'
          : 'Anteprima binarizzata (bianco = taglio, nero = materiale)'}
      </p>
    </div>
  );
}
