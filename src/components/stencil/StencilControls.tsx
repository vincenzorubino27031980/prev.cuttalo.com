'use client';

interface ProcessingOptions {
  threshold: number;
  invert: boolean;
  blur: number;
  bridgeWidth: number;
}

interface StencilControlsProps {
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  onGenerate: () => void;
  onReset: () => void;
  loading: boolean;
}

export default function StencilControls({
  options,
  onOptionsChange,
  onGenerate,
  onReset,
  loading,
}: StencilControlsProps) {
  const updateOption = <K extends keyof ProcessingOptions>(
    key: K,
    value: ProcessingOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-6">Parametri</h3>

      <div className="space-y-6">
        {/* Threshold */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-300 text-sm font-medium">
              Soglia bianco/nero
            </label>
            <span className="text-violet-400 text-sm font-mono">{options.threshold}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={options.threshold}
            onChange={(e) => updateOption('threshold', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <p className="text-gray-500 text-xs mt-1">
            Valori bassi = più dettagli, valori alti = più semplificato
          </p>
        </div>

        {/* Blur */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-300 text-sm font-medium">
              Sfocatura (smoothing)
            </label>
            <span className="text-violet-400 text-sm font-mono">{options.blur}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={options.blur}
            onChange={(e) => updateOption('blur', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <p className="text-gray-500 text-xs mt-1">
            Rimuove rumore e dettagli piccoli
          </p>
        </div>

        {/* Bridge Width */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-300 text-sm font-medium">
              Larghezza ponti (mm)
            </label>
            <span className="text-violet-400 text-sm font-mono">{options.bridgeWidth}mm</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={options.bridgeWidth}
            onChange={(e) => updateOption('bridgeWidth', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <p className="text-gray-500 text-xs mt-1">
            Ponti più larghi = più resistenti, ma meno dettaglio
          </p>
        </div>

        {/* Invert */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-gray-300 text-sm font-medium">
              Inverti colori
            </label>
            <p className="text-gray-500 text-xs">
              Scambia aree di taglio e materiale
            </p>
          </div>
          <button
            onClick={() => updateOption('invert', !options.invert)}
            className={`w-14 h-7 rounded-full transition-all relative
              ${options.invert ? 'bg-violet-500' : 'bg-gray-700'}`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all
                ${options.invert ? 'left-8' : 'left-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={onReset}
          className="flex-1 px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-all"
        >
          Ricomincia
        </button>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generazione...
            </span>
          ) : (
            'Genera Stencil'
          )}
        </button>
      </div>
    </div>
  );
}
