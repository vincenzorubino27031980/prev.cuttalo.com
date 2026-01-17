import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithAI, AIAnalysisResult } from '@/lib/stencil/ai-analyzer';
import { analyzeImage, preprocessImage, ImageAnalysis } from '@/lib/stencil/image-processor';

function generateFallbackAnalysis(technical: ImageAnalysis): AIAnalysisResult {
  const complexityMap = { low: 1, medium: 3, high: 5 };
  const difficulty = complexityMap[technical.complexity] || 3;

  return {
    description: `Immagine ${technical.width}x${technical.height}px con complessità ${technical.complexity}`,
    subjectType: 'other',
    complexity: technical.complexity === 'low' ? 'simple' : technical.complexity === 'high' ? 'complex' : 'medium',
    estimatedIslands: technical.estimatedIslands,
    suggestedBridgePositions: [],
    warnings: [
      'Analisi AI non disponibile - configurare ANTHROPIC_API_KEY per suggerimenti dettagliati',
      'I ponti verranno generati automaticamente sulle isole rilevate',
    ],
    recommendations: [
      'Verifica manualmente le isole prima del taglio',
      'Considera di aumentare la soglia per semplificare dettagli piccoli',
    ],
    stencilizationDifficulty: difficulty as 1 | 2 | 3 | 4 | 5,
    estimatedPrepTime: difficulty * 5,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nessuna immagine caricata' },
        { status: 400 }
      );
    }

    // Verifica tipo file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo file non supportato. Usa JPG, PNG, WebP o GIF.' },
        { status: 400 }
      );
    }

    // Verifica dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File troppo grande. Massimo 10MB.' },
        { status: 400 }
      );
    }

    // Converti in buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analisi tecnica dell'immagine
    const technicalAnalysis = await analyzeImage(buffer);

    // Analisi AI (solo se API key configurata)
    const base64 = buffer.toString('base64');
    let aiAnalysis;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        aiAnalysis = await analyzeImageWithAI(base64, file.type);
      } catch (aiError) {
        console.error('AI analysis failed, using fallback:', aiError);
        aiAnalysis = generateFallbackAnalysis(technicalAnalysis);
      }
    } else {
      // Fallback senza AI
      aiAnalysis = generateFallbackAnalysis(technicalAnalysis);
    }

    // Genera anteprima preprocessata
    const preprocessedBuffer = await preprocessImage(buffer, {
      threshold: 128,
      invert: false,
      blur: 0,
    });
    const preprocessedBase64 = preprocessedBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      technical: technicalAnalysis,
      ai: aiAnalysis,
      preview: {
        original: `data:${file.type};base64,${base64}`,
        preprocessed: `data:image/png;base64,${preprocessedBase64}`,
      },
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Errore nell\'analisi dell\'immagine' },
      { status: 500 }
    );
  }
}
