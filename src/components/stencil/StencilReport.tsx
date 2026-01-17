'use client';

interface AnalysisResult {
  technical: {
    width: number;
    height: number;
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
}

interface StencilReportProps {
  analysis: AnalysisResult;
}

export default function StencilReport({ analysis }: StencilReportProps) {
  const difficultyColors = ['', 'bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
  const difficultyLabels = ['', 'Molto Facile', 'Facile', 'Media', 'Difficile', 'Molto Difficile'];

  const subjectLabels: Record<string, string> = {
    face: 'Volto/Ritratto',
    logo: 'Logo',
    text: 'Testo',
    illustration: 'Illustrazione',
    photo: 'Fotografia',
    pattern: 'Pattern',
    other: 'Altro',
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Analisi AI</h3>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tipo</p>
          <p className="text-white font-semibold">
            {subjectLabels[analysis.ai.subjectType] || analysis.ai.subjectType}
          </p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Isole stimate</p>
          <p className="text-white font-semibold">{analysis.ai.estimatedIslands}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Tempo prep.</p>
          <p className="text-white font-semibold">{analysis.ai.estimatedPrepTime} min</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Difficoltà</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${difficultyColors[analysis.ai.stencilizationDifficulty]}`} />
            <p className="text-white font-semibold text-sm">
              {difficultyLabels[analysis.ai.stencilizationDifficulty]}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Descrizione</p>
        <p className="text-gray-300 text-sm">{analysis.ai.description}</p>
      </div>

      {/* Bridge Suggestions */}
      {analysis.ai.suggestedBridgePositions.length > 0 && (
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Ponti suggeriti</p>
          <div className="space-y-2">
            {analysis.ai.suggestedBridgePositions.slice(0, 5).map((bridge, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-gray-900/30 rounded-lg p-3"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                    ${bridge.importance === 'critical' ? 'bg-red-500' :
                      bridge.importance === 'recommended' ? 'bg-yellow-500' : 'bg-gray-500'}`}
                />
                <div>
                  <p className="text-white text-sm font-medium">{bridge.area}</p>
                  <p className="text-gray-400 text-xs">{bridge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis.ai.warnings.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Avvertenze</p>
          <div className="space-y-1">
            {analysis.ai.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-yellow-400 text-sm">
                <span>⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.ai.recommendations.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Suggerimenti</p>
          <div className="space-y-1">
            {analysis.ai.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-violet-400 text-sm">
                <span>💡</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
