import { NextRequest, NextResponse } from 'next/server';
import { processImageToStencil, ProcessingOptions } from '@/lib/stencil/image-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const optionsStr = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nessuna immagine caricata' },
        { status: 400 }
      );
    }

    // Parse opzioni
    let options: Partial<ProcessingOptions> = {};
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr);
      } catch {
        // Ignora errori di parsing
      }
    }

    // Converti in buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Processa immagine
    const result = await processImageToStencil(buffer, options);

    return NextResponse.json({
      success: true,
      svg: result.svg,
      svgWithBridges: result.svgWithBridges,
      islands: result.islands.length,
      bridges: result.bridges.length,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error('Error generating stencil:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione dello stencil' },
      { status: 500 }
    );
  }
}
