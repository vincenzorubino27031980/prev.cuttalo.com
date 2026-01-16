import { NextResponse } from 'next/server';
import { CATEGORIES } from '@/lib/pricing-engine';

export async function GET() {
  return NextResponse.json({
    success: true,
    categories: CATEGORIES,
  });
}
