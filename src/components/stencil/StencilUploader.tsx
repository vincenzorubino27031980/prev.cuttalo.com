'use client';

import { useCallback, useState } from 'react';

interface StencilUploaderProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

export default function StencilUploader({ onFileSelect, loading }: StencilUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Carica la tua immagine
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Carica un'immagine e il nostro sistema AI analizzerà automaticamente
          le aree che necessitano di ponti per creare uno stencil perfetto.
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer
          ${dragActive
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />

        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
            ${dragActive ? 'bg-violet-500/20' : 'bg-gray-700/50'}`}>
            <svg
              className={`w-10 h-10 ${dragActive ? 'text-violet-400' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <p className="text-xl text-white mb-2">
            {dragActive ? 'Rilascia qui!' : 'Trascina un\'immagine'}
          </p>
          <p className="text-gray-400 mb-4">oppure clicca per selezionare</p>

          <div className="flex flex-wrap gap-2 justify-center">
            {['JPG', 'PNG', 'WebP', 'GIF'].map(format => (
              <span
                key={format}
                className="px-3 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300"
              >
                {format}
              </span>
            ))}
            <span className="px-3 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">
              Max 10MB
            </span>
          </div>
        </div>
      </div>

      {/* Esempi */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Ideale per</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Loghi e grafiche</li>
            <li>• Silhouette e sagome</li>
            <li>• Testi e scritte</li>
            <li>• Illustrazioni semplici</li>
          </ul>
        </div>

        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Richiede attenzione</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Fotografie</li>
            <li>• Immagini con sfumature</li>
            <li>• Dettagli molto piccoli</li>
            <li>• Testi elaborati</li>
          </ul>
        </div>

        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">L'AI rileva</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Isole (parti isolate)</li>
            <li>• Posizioni ottimali ponti</li>
            <li>• Dettagli problematici</li>
            <li>• Tempo di preparazione</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
