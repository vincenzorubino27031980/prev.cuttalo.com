import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'laser',
  password: 'jsJnm290zx0',
  database: 'laser',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

export interface QuoteItem {
  description: string;
  description1: string;
  price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  product_id?: number;
}

export interface TrainingData {
  id: number;
  category: string;
  description: string;
  material: string;
  dimensions: string;
  width_cm: number;
  height_cm: number;
  thickness_mm: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

export interface QuoteRequest {
  category: string;
  description: string;
  material: string;
  width_cm: number;
  height_cm: number;
  thickness_mm: number;
  quantity: number;
  urgency: 'normal' | 'express';
  notes?: string;
}

export interface GeneratedQuote {
  items: QuoteItem[];
  subtotal: number;
  shipping: number;
  urgency_fee: number;
  discount_percent: number;
  total: number;
  confidence: number;
  similar_quotes: number;
  estimated_days: number;
}
