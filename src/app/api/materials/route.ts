import { NextResponse } from 'next/server';
import { MATERIALS } from '@/lib/pricing-engine';

export async function GET() {
  return NextResponse.json({
    success: true,
    materials: MATERIALS,
  });
}
