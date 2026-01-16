import { NextRequest, NextResponse } from 'next/server';
import { generateQuote, CATEGORIES, MATERIALS } from '@/lib/pricing-engine';
import { QuoteRequest } from '@/lib/db';
import { z } from 'zod';

const QuoteRequestSchema = z.object({
  category: z.string().refine(val => CATEGORIES.some(c => c.id === val), {
    message: 'Categoria non valida'
  }),
  description: z.string().min(3, 'Descrizione troppo corta').max(500),
  material: z.string().refine(val => MATERIALS.some(m => m.id === val), {
    message: 'Materiale non valido'
  }),
  width_cm: z.number().min(0.5).max(300),
  height_cm: z.number().min(0.5).max(300),
  thickness_mm: z.number().min(0.5).max(50),
  quantity: z.number().int().min(1).max(100000),
  urgency: z.enum(['normal', 'express']),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Valida input
    const validation = QuoteRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.issues },
        { status: 400 }
      );
    }

    const quoteRequest: QuoteRequest = validation.data;

    // Genera preventivo
    const quote = await generateQuote(quoteRequest);

    return NextResponse.json({
      success: true,
      quote,
      request: quoteRequest,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating quote:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione del preventivo' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API Preventivi Cuttalo',
    version: '1.0.0',
    endpoints: {
      'POST /api/quote': 'Genera un preventivo',
      'GET /api/categories': 'Lista categorie disponibili',
      'GET /api/materials': 'Lista materiali disponibili',
    }
  });
}
