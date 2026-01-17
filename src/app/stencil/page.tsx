'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StencilUploader from '@/components/stencil/StencilUploader';
import StencilPreview from '@/components/stencil/StencilPreview';
import StencilControls from '@/components/stencil/StencilControls';
import StencilReport from '@/components/stencil/StencilReport';

export interface AnalysisResult {
  technical: {
    width: number;
    height: number;
    hasTransparency: boolean;
    complexity: 'low' | 'medium' | 'high';
    estimatedIslands: number;
  };
  ai: {
    description: string;
    subjectType: string;
    complexity: string;
    estimatedIslands: number;
    suggestedBridgePositions: Array<{
      area: string;
      description: string;
      importance: string;
      position: string;
    }>;
    warnings: string[];
    recommendations: string[];
    stencilizationDifficulty: number;
    estimatedPrepTime: number;
  };
  preview: {
    original: string;
    preprocessed: string;
  };
}

export interface GenerationResult {
  svg: string;
  svgWithBridges: string;
  islands: number;
  bridges: number;
}

export interface ProcessingOptions {
  threshold: number;
  invert: boolean;
  blur: number;
  bridgeWidth: number;
}

export default function StencilPage() {
  const [step, setStep] = useState<'upload' | 'analyze' | 'customize' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ProcessingOptions>({
    threshold: 128,
    invert: false,
    blur: 0,
    bridgeWidth: 2,
  });

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setLoading(true);
    setStep('analyze');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/stencil/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nell\'analisi');
      }

      setAnalysis(result);
      setStep('customize');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('options', JSON.stringify(options));

      const response = await fetch('/api/stencil/generate', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nella generazione');
      }

      setGeneration(result);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [file, options]);

  const handleDownload = useCallback(() => {
    if (!generation) return;

    const blob = new Blob([generation.svgWithBridges], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stencil_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generation]);

  const handleReset = useCallback(() => {
    setFile(null);
    setAnalysis(null);
    setGeneration(null);
    setStep('upload');
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Stencil Generator</h1>
                <p className="text-xs text-gray-400">Da immagine a stencil con ponti</p>
              </div>
            </div>
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Torna ai preventivi
            </a>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between mb-8">
          {['Upload', 'Analisi AI', 'Personalizza', 'Risultato'].map((label, i) => {
            const stepIndex = ['upload', 'analyze', 'customize', 'result'].indexOf(step);
            const isActive = i === stepIndex;
            const isCompleted = i < stepIndex;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${isActive ? 'bg-violet-500 text-white scale-110' :
                      isCompleted ? 'bg-violet-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:inline ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < 3 && (
                  <div className={`w-12 sm:w-24 h-1 mx-2 rounded ${isCompleted ? 'bg-violet-500' : 'bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400"
            >
              {error}
            </motion.div>
          )}

          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StencilUploader onFileSelect={handleFileSelect} loading={loading} />
            </motion.div>
          )}

          {step === 'analyze' && loading && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Analisi in corso...</h2>
              <p className="text-gray-400">L'AI sta analizzando l'immagine per identificare le aree critiche</p>
            </motion.div>
          )}

          {step === 'customize' && analysis && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              <div>
                <StencilPreview
                  originalImage={analysis.preview.original}
                  preprocessedImage={analysis.preview.preprocessed}
                  options={options}
                />
              </div>
              <div className="space-y-6">
                <StencilReport analysis={analysis} />
                <StencilControls
                  options={options}
                  onOptionsChange={setOptions}
                  onGenerate={handleGenerate}
                  onReset={handleReset}
                  loading={loading}
                />
              </div>
            </motion.div>
          )}

          {step === 'result' && generation && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Stencil Generato!</h2>
                <p className="text-gray-400">
                  {generation.islands} isole rilevate, {generation.bridges} ponti generati
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Anteprima SVG</h3>
                <div
                  className="bg-white rounded-lg p-4 flex items-center justify-center min-h-[300px]"
                  dangerouslySetInnerHTML={{ __html: generation.svgWithBridges }}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Scarica SVG
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-all"
                >
                  Nuova Immagine
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            Stencil Generator by Cuttalo - Powered by Claude AI
          </p>
        </div>
      </footer>
    </main>
  );
}
