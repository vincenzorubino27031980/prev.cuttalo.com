import pool, { QuoteRequest, GeneratedQuote, QuoteItem } from './db';
import { RowDataPacket } from 'mysql2';

// Categorie e materiali supportati
export const CATEGORIES = [
  { id: 'taglio_laser', name: 'Taglio Laser', description: 'Taglio di precisione con laser CO2' },
  { id: 'stencil', name: 'Stencil', description: 'Stencil personalizzati per decorazioni' },
  { id: 'timbri', name: 'Timbri e Stampi', description: 'Timbri personalizzati in gomma/spugna' },
  { id: 'incisione', name: 'Incisione Laser', description: 'Incisione su vari materiali' },
  { id: 'stampa', name: 'Stampa UV/Digitale', description: 'Stampa diretta su materiali' },
  { id: 'sagome', name: 'Sagome e Forme', description: 'Sagome personalizzate in legno/plastica' },
  { id: 'targhe', name: 'Targhe e Insegne', description: 'Segnaletica e targhe personalizzate' },
  { id: 'espositori', name: 'Espositori', description: 'Display e stand espositivi' },
];

export const MATERIALS = [
  { id: 'pioppo', name: 'Legno Pioppo', category: 'legno', price_factor: 1.0 },
  { id: 'compensato', name: 'Compensato', category: 'legno', price_factor: 0.9 },
  { id: 'mdf', name: 'MDF', category: 'legno', price_factor: 0.8 },
  { id: 'plexiglas_trasparente', name: 'Plexiglas Trasparente', category: 'plastica', price_factor: 1.5 },
  { id: 'plexiglas_colorato', name: 'Plexiglas Colorato', category: 'plastica', price_factor: 1.7 },
  { id: 'plexiglas_specchiato', name: 'Plexiglas Specchiato', category: 'plastica', price_factor: 2.0 },
  { id: 'pet', name: 'PET (Stencil)', category: 'plastica', price_factor: 1.2 },
  { id: 'forex', name: 'Forex PVC', category: 'plastica', price_factor: 1.1 },
  { id: 'cartone', name: 'Cartone', category: 'carta', price_factor: 0.5 },
  { id: 'gomma', name: 'Gomma (Timbri)', category: 'gomma', price_factor: 1.8 },
  { id: 'spugna', name: 'Spugna (Timbri)', category: 'gomma', price_factor: 1.6 },
];

// Prezzi base per categoria (€/cm²)
const BASE_PRICES: Record<string, number> = {
  taglio_laser: 0.015,
  stencil: 0.025,
  timbri: 0.08,
  incisione: 0.02,
  stampa: 0.03,
  sagome: 0.018,
  targhe: 0.035,
  espositori: 0.05,
};

// Fattori spessore (mm)
const THICKNESS_FACTORS: Record<number, number> = {
  1: 0.8, 2: 0.9, 3: 1.0, 4: 1.1, 5: 1.2, 6: 1.3, 8: 1.5, 10: 1.8, 15: 2.2, 20: 2.8,
};

// Sconti quantità
const QUANTITY_DISCOUNTS = [
  { min: 1, max: 10, discount: 0 },
  { min: 11, max: 50, discount: 5 },
  { min: 51, max: 100, discount: 10 },
  { min: 101, max: 500, discount: 15 },
  { min: 501, max: 1000, discount: 20 },
  { min: 1001, max: Infinity, discount: 25 },
];

// Costi spedizione
const SHIPPING_COSTS = [
  { max_total: 50, cost: 8 },
  { max_total: 100, cost: 12 },
  { max_total: 300, cost: 18 },
  { max_total: 500, cost: 25 },
  { max_total: 1000, cost: 35 },
  { max_total: Infinity, cost: 50 },
];

interface SimilarQuote extends RowDataPacket {
  description: string;
  unit_price: number;
  quantity: number;
  area_cm2: number;
}

export async function generateQuote(request: QuoteRequest): Promise<GeneratedQuote> {
  const area = request.width_cm * request.height_cm;

  // 1. Cerca preventivi simili nel database
  const similarQuotes = await findSimilarQuotes(request);

  // 2. Calcola prezzo base
  let unitPrice = calculateBasePrice(request, area, similarQuotes);

  // 3. Applica sconto quantità
  const quantityDiscount = getQuantityDiscount(request.quantity);
  const discountedPrice = unitPrice * (1 - quantityDiscount / 100);

  // 4. Calcola subtotale
  const subtotal = discountedPrice * request.quantity;

  // 5. Calcola spedizione
  const shipping = calculateShipping(subtotal);

  // 6. Sovrapprezzo urgenza
  const urgencyFee = request.urgency === 'express' ? subtotal * 0.3 : 0;

  // 7. Totale finale
  const total = subtotal + shipping + urgencyFee;

  // 8. Calcola confidence score
  const confidence = calculateConfidence(similarQuotes.length, area, request.quantity);

  // 9. Stima giorni lavorazione
  const estimatedDays = estimateProductionDays(request, subtotal);

  // Costruisci item preventivo
  const material = MATERIALS.find(m => m.id === request.material);
  const category = CATEGORIES.find(c => c.id === request.category);

  const item: QuoteItem = {
    description: `${category?.name || request.category} - ${material?.name || request.material}`,
    description1: `Dimensioni: ${request.width_cm}x${request.height_cm}cm, Spessore: ${request.thickness_mm}mm${request.notes ? ` - ${request.notes}` : ''}`,
    price: Number(unitPrice.toFixed(2)),
    quantity: request.quantity,
    subtotal: Number((unitPrice * request.quantity).toFixed(2)),
    discount: quantityDiscount,
    total: Number(subtotal.toFixed(2)),
  };

  const items: QuoteItem[] = [item];

  // Aggiungi spedizione come voce separata
  if (shipping > 0) {
    items.push({
      description: 'Spedizione e imballaggio',
      description1: 'Corriere espresso con tracking',
      price: shipping,
      quantity: 1,
      subtotal: shipping,
      discount: 0,
      total: shipping,
    });
  }

  // Aggiungi urgenza se presente
  if (urgencyFee > 0) {
    items.push({
      description: 'Sovrapprezzo urgenza',
      description1: 'Lavorazione prioritaria',
      price: Number(urgencyFee.toFixed(2)),
      quantity: 1,
      subtotal: Number(urgencyFee.toFixed(2)),
      discount: 0,
      total: Number(urgencyFee.toFixed(2)),
    });
  }

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    urgency_fee: Number(urgencyFee.toFixed(2)),
    discount_percent: quantityDiscount,
    total: Number(total.toFixed(2)),
    confidence,
    similar_quotes: similarQuotes.length,
    estimated_days: estimatedDays,
  };
}

async function findSimilarQuotes(request: QuoteRequest): Promise<SimilarQuote[]> {
  try {
    // Query per trovare preventivi simili basati su categoria e materiale
    const categoryKeywords = getCategoryKeywords(request.category);
    const materialKeywords = getMaterialKeywords(request.material);

    const searchPattern = `%${categoryKeywords[0]}%`;

    const [rows] = await pool.query<SimilarQuote[]>(`
      SELECT
        pm_items.meta_value as items_raw
      FROM wp_posts p
      JOIN wp_postmeta pm_items ON p.ID = pm_items.post_id AND pm_items.meta_key = 'items'
      JOIN wp_postmeta pm_status ON p.ID = pm_status.post_id AND pm_status.meta_key = 'quote_status'
      WHERE p.post_type = 'custom-quotes'
      AND p.post_status = 'publish'
      AND pm_status.meta_value IN ('30', '40')
      AND pm_items.meta_value LIKE ?
      ORDER BY p.post_date DESC
      LIMIT 50
    `, [searchPattern]);

    // Deserializza e filtra
    const results: SimilarQuote[] = [];
    for (const row of rows) {
      try {
        const itemsRaw = (row as unknown as { items_raw: string }).items_raw;
        // Parse PHP serialized data (simplified)
        const priceMatches = itemsRaw.match(/"price";s:\d+:"([\d.]+)"/g);
        const qtyMatches = itemsRaw.match(/"quantity";s:\d+:"(\d+)"/g);
        const descMatches = itemsRaw.match(/"description";s:\d+:"([^"]+)"/g);

        if (priceMatches && qtyMatches && descMatches) {
          for (let i = 0; i < priceMatches.length; i++) {
            const priceMatch = priceMatches[i].match(/"([\d.]+)"/);
            const qtyMatch = qtyMatches[i]?.match(/"(\d+)"/);
            const descMatch = descMatches[i]?.match(/"([^"]+)"/);

            if (priceMatch && qtyMatch && descMatch) {
              results.push({
                description: descMatch[1],
                unit_price: parseFloat(priceMatch[1]),
                quantity: parseInt(qtyMatch[1]),
                area_cm2: 0, // Non sempre disponibile
              } as SimilarQuote);
            }
          }
        }
      } catch {
        // Skip malformed data
      }
    }

    return results.slice(0, 20);
  } catch (error) {
    console.error('Error finding similar quotes:', error);
    return [];
  }
}

function calculateBasePrice(request: QuoteRequest, area: number, similarQuotes: SimilarQuote[]): number {
  // Prezzo base dalla categoria
  const basePrice = BASE_PRICES[request.category] || 0.02;

  // Fattore materiale
  const material = MATERIALS.find(m => m.id === request.material);
  const materialFactor = material?.price_factor || 1.0;

  // Fattore spessore
  const thicknessFactor = THICKNESS_FACTORS[request.thickness_mm] ||
    (request.thickness_mm > 20 ? 3.0 : 1.0);

  // Calcola prezzo teorico
  let theoreticalPrice = basePrice * area * materialFactor * thicknessFactor;

  // Prezzo minimo
  theoreticalPrice = Math.max(theoreticalPrice, 5);

  // Se abbiamo preventivi simili, fai una media ponderata
  if (similarQuotes.length > 0) {
    const avgSimilarPrice = similarQuotes.reduce((sum, q) => sum + q.unit_price, 0) / similarQuotes.length;
    // 60% teorico, 40% storico
    theoreticalPrice = theoreticalPrice * 0.6 + avgSimilarPrice * 0.4;
  }

  return theoreticalPrice;
}

function getQuantityDiscount(quantity: number): number {
  const tier = QUANTITY_DISCOUNTS.find(d => quantity >= d.min && quantity <= d.max);
  return tier?.discount || 0;
}

function calculateShipping(subtotal: number): number {
  const tier = SHIPPING_COSTS.find(s => subtotal <= s.max_total);
  return tier?.cost || 50;
}

function calculateConfidence(similarCount: number, area: number, quantity: number): number {
  let confidence = 70; // Base confidence

  // Aumenta con preventivi simili trovati
  confidence += Math.min(similarCount * 2, 20);

  // Diminuisci per aree molto grandi o molto piccole
  if (area < 10 || area > 10000) confidence -= 10;

  // Diminuisci per quantità molto alte
  if (quantity > 1000) confidence -= 5;

  return Math.min(Math.max(confidence, 50), 95);
}

function estimateProductionDays(request: QuoteRequest, subtotal: number): number {
  let days = 7; // Base

  // Aumenta per ordini grandi
  if (subtotal > 500) days += 3;
  if (subtotal > 1000) days += 5;
  if (subtotal > 5000) days += 10;

  // Urgenza dimezza i tempi
  if (request.urgency === 'express') {
    days = Math.ceil(days / 2);
  }

  // Categorie speciali
  if (request.category === 'timbri' || request.category === 'stencil') {
    days = Math.max(days - 2, 3);
  }

  return days;
}

function getCategoryKeywords(category: string): string[] {
  const keywords: Record<string, string[]> = {
    taglio_laser: ['taglio', 'laser', 'cut'],
    stencil: ['stencil', 'mascherina'],
    timbri: ['timbro', 'stampo', 'stamp'],
    incisione: ['incisione', 'engrav'],
    stampa: ['stampa', 'print'],
    sagome: ['sagoma', 'forma', 'shape'],
    targhe: ['targa', 'insegna', 'sign'],
    espositori: ['espositore', 'display', 'stand'],
  };
  return keywords[category] || [category];
}

function getMaterialKeywords(material: string): string[] {
  const keywords: Record<string, string[]> = {
    pioppo: ['pioppo', 'legno'],
    compensato: ['compensato', 'multistrato'],
    mdf: ['mdf'],
    plexiglas_trasparente: ['plex', 'trasparente', 'acrilico'],
    plexiglas_colorato: ['plex', 'colorato', 'acrilico'],
    plexiglas_specchiato: ['specchio', 'mirror'],
    pet: ['pet', 'poliestere'],
    forex: ['forex', 'pvc'],
    cartone: ['cartone', 'carton'],
    gomma: ['gomma', 'rubber'],
    spugna: ['spugna', 'foam'],
  };
  return keywords[material] || [material];
}
