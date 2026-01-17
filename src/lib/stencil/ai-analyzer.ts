import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface AIAnalysisResult {
  description: string;
  subjectType: 'face' | 'logo' | 'text' | 'illustration' | 'photo' | 'pattern' | 'other';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedIslands: number;
  suggestedBridgePositions: BridgeSuggestion[];
  warnings: string[];
  recommendations: string[];
  stencilizationDifficulty: 1 | 2 | 3 | 4 | 5;
  estimatedPrepTime: number; // minuti
}

export interface BridgeSuggestion {
  area: string;
  description: string;
  importance: 'critical' | 'recommended' | 'optional';
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export async function analyzeImageWithAI(imageBase64: string, mimeType: string): Promise<AIAnalysisResult> {
  const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analizza questa immagine per la creazione di uno STENCIL per taglio laser.

Rispondi SOLO con un JSON valido (senza markdown, senza \`\`\`) con questa struttura esatta:

{
  "description": "Breve descrizione dell'immagine",
  "subjectType": "face|logo|text|illustration|photo|pattern|other",
  "complexity": "simple|medium|complex",
  "estimatedIslands": numero_stimato_di_isole_interne,
  "suggestedBridgePositions": [
    {
      "area": "nome_area (es: occhio sinistro, lettera O)",
      "description": "dove posizionare il ponte",
      "importance": "critical|recommended|optional",
      "position": "top|bottom|left|right|center"
    }
  ],
  "warnings": ["lista di problemi potenziali"],
  "recommendations": ["lista di suggerimenti per migliorare lo stencil"],
  "stencilizationDifficulty": 1-5,
  "estimatedPrepTime": minuti_stimati_preparazione
}

Considera:
- Uno stencil deve avere PONTI per tenere le isole interne connesse
- Le isole sono parti che "cadrebbero" senza ponti (es: interno di O, A, occhi)
- Dettagli troppo piccoli (<2mm) sono problematici
- I testi necessitano font stencil o ponti nelle lettere
- Le foto richiedono posterizzazione

Rispondi SOLO con il JSON, nessun altro testo.`,
          },
        ],
      },
    ],
  });

  // Estrai il contenuto testuale
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  try {
    // Pulisci eventuale markdown
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const result = JSON.parse(jsonStr) as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error('Failed to parse AI response:', textContent.text);
    // Ritorna un risultato di fallback
    return {
      description: 'Impossibile analizzare l\'immagine',
      subjectType: 'other',
      complexity: 'medium',
      estimatedIslands: 5,
      suggestedBridgePositions: [],
      warnings: ['Analisi AI non riuscita, procedere con cautela'],
      recommendations: ['Verificare manualmente le isole e i ponti necessari'],
      stencilizationDifficulty: 3,
      estimatedPrepTime: 15,
    };
  }
}

export function generateStencilReport(analysis: AIAnalysisResult): string {
  const difficultyLabels = ['', 'Molto Facile', 'Facile', 'Media', 'Difficile', 'Molto Difficile'];
  const difficultyColors = ['', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

  return `
## Analisi Stencil

**Tipo:** ${analysis.subjectType}
**Complessità:** ${analysis.complexity}
**Difficoltà stencilizzazione:** ${difficultyLabels[analysis.stencilizationDifficulty]} (${analysis.stencilizationDifficulty}/5)
**Tempo preparazione stimato:** ${analysis.estimatedPrepTime} minuti
**Isole stimate:** ${analysis.estimatedIslands}

### Descrizione
${analysis.description}

### Ponti Suggeriti
${analysis.suggestedBridgePositions.map(b =>
  `- **${b.area}** (${b.importance}): ${b.description} - posizione ${b.position}`
).join('\n')}

### Avvertenze
${analysis.warnings.map(w => `- ⚠️ ${w}`).join('\n') || '- Nessuna'}

### Raccomandazioni
${analysis.recommendations.map(r => `- 💡 ${r}`).join('\n') || '- Nessuna'}
  `.trim();
}
