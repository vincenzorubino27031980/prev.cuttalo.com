'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'taglio_laser', name: 'Taglio Laser', icon: '✂️' },
  { id: 'stencil', name: 'Stencil', icon: '🎨' },
  { id: 'timbri', name: 'Timbri e Stampi', icon: '📌' },
  { id: 'incisione', name: 'Incisione Laser', icon: '✨' },
  { id: 'stampa', name: 'Stampa UV/Digitale', icon: '🖨️' },
  { id: 'sagome', name: 'Sagome e Forme', icon: '🔷' },
  { id: 'targhe', name: 'Targhe e Insegne', icon: '🪧' },
  { id: 'espositori', name: 'Espositori', icon: '🗂️' },
];

const MATERIALS = [
  { id: 'pioppo', name: 'Legno Pioppo', group: 'Legno' },
  { id: 'compensato', name: 'Compensato', group: 'Legno' },
  { id: 'mdf', name: 'MDF', group: 'Legno' },
  { id: 'plexiglas_trasparente', name: 'Plexiglas Trasparente', group: 'Plastica' },
  { id: 'plexiglas_colorato', name: 'Plexiglas Colorato', group: 'Plastica' },
  { id: 'plexiglas_specchiato', name: 'Plexiglas Specchiato', group: 'Plastica' },
  { id: 'pet', name: 'PET (Stencil)', group: 'Plastica' },
  { id: 'forex', name: 'Forex PVC', group: 'Plastica' },
  { id: 'cartone', name: 'Cartone', group: 'Carta' },
  { id: 'gomma', name: 'Gomma (Timbri)', group: 'Gomma' },
  { id: 'spugna', name: 'Spugna (Timbri)', group: 'Gomma' },
];

const THICKNESSES = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

const formSchema = z.object({
  category: z.string().min(1, 'Seleziona una categoria'),
  description: z.string().min(3, 'Descrivi il progetto').max(500),
  material: z.string().min(1, 'Seleziona un materiale'),
  width_cm: z.number().min(0.5, 'Min 0.5cm').max(300, 'Max 300cm'),
  height_cm: z.number().min(0.5, 'Min 0.5cm').max(300, 'Max 300cm'),
  thickness_mm: z.number().min(0.5).max(50),
  quantity: z.number().int().min(1, 'Min 1').max(100000, 'Max 100.000'),
  urgency: z.enum(['normal', 'express']),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuoteItem {
  description: string;
  description1: string;
  price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
}

interface QuoteResult {
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

export default function QuoteForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      description: '',
      material: '',
      width_cm: 10,
      height_cm: 10,
      thickness_mm: 3,
      quantity: 1,
      urgency: 'normal',
      notes: '',
    },
  });

  const selectedCategory = watch('category');
  const selectedMaterial = watch('material');
  const width = watch('width_cm');
  const height = watch('height_cm');
  const quantity = watch('quantity');

  const area = (width || 0) * (height || 0);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nella generazione');
      }

      setQuote(result.quote);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const groupedMaterials = MATERIALS.reduce((acc, mat) => {
    if (!acc[mat.group]) acc[mat.group] = [];
    acc[mat.group].push(mat);
    return acc;
  }, {} as Record<string, typeof MATERIALS>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {['Categoria', 'Materiale', 'Dettagli', 'Preventivo'].map((label, i) => (
            <div
              key={label}
              className={`flex items-center ${i < step ? 'text-emerald-500' : 'text-gray-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-2 transition-all
                  ${i + 1 === step ? 'bg-emerald-500 text-white scale-110' :
                    i + 1 < step ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className="hidden sm:inline text-sm">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* Step 1: Categoria */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Cosa vuoi realizzare?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setValue('category', cat.id);
                      setStep(2);
                    }}
                    className={`p-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg
                      ${selectedCategory === cat.id
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                  >
                    <div className="text-4xl mb-3">{cat.icon}</div>
                    <div className="text-white font-medium text-sm">{cat.name}</div>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="text-red-400 text-sm">{errors.category.message}</p>
              )}
            </motion.div>
          )}

          {/* Step 2: Materiale */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Scegli il materiale
              </h2>
              {Object.entries(groupedMaterials).map(([group, materials]) => (
                <div key={group} className="mb-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
                    {group}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => {
                          setValue('material', mat.id);
                          setStep(3);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all hover:scale-102
                          ${selectedMaterial === mat.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                      >
                        <div className="text-white font-medium">{mat.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Torna indietro
              </button>
            </motion.div>
          )}

          {/* Step 3: Dettagli */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Inserisci i dettagli
              </h2>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                {/* Descrizione */}
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Descrivi il tuo progetto *
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="Es: Logo aziendale da tagliare, decorazione per evento, segnaletica..."
                    className="w-full p-4 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>

                {/* Dimensioni */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Larghezza (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('width_cm', { valueAsNumber: true })}
                      className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {errors.width_cm && (
                      <p className="text-red-400 text-xs mt-1">{errors.width_cm.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Altezza (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('height_cm', { valueAsNumber: true })}
                      className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {errors.height_cm && (
                      <p className="text-red-400 text-xs mt-1">{errors.height_cm.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Spessore (mm)
                    </label>
                    <select
                      {...register('thickness_mm', { valueAsNumber: true })}
                      className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    >
                      {THICKNESSES.map((t) => (
                        <option key={t} value={t}>{t} mm</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Area preview */}
                <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Area singolo pezzo:</span>
                    <span className="text-emerald-400 font-bold">{area.toFixed(1)} cm²</span>
                  </div>
                </div>

                {/* Quantità */}
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Quantità
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-32 p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      {[1, 10, 50, 100, 500].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setValue('quantity', q)}
                          className={`px-3 py-1 rounded-lg text-sm transition-all
                            ${quantity === q
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  {errors.quantity && (
                    <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
                  )}
                </div>

                {/* Urgenza */}
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Tempistiche
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setValue('urgency', 'normal')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all
                        ${watch('urgency') === 'normal'
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-gray-700 hover:border-gray-600'}`}
                    >
                      <div className="text-white font-medium">Standard</div>
                      <div className="text-gray-400 text-sm">Tempi normali</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('urgency', 'express')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all
                        ${watch('urgency') === 'express'
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-gray-700 hover:border-gray-600'}`}
                    >
                      <div className="text-white font-medium">Express ⚡</div>
                      <div className="text-gray-400 text-sm">+30% sovrapprezzo</div>
                    </button>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Note aggiuntive (opzionale)
                  </label>
                  <textarea
                    {...register('notes')}
                    placeholder="Eventuali specifiche particolari..."
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Torna indietro
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Calcolo in corso...
                    </span>
                  ) : (
                    'Genera Preventivo →'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Preventivo */}
          {step === 4 && quote && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Preventivo Generato
                </h2>
                <p className="text-gray-400">
                  Stima basata su {quote.similar_quotes} preventivi simili
                </p>
              </div>

              {/* Confidence Badge */}
              <div className="flex justify-center mb-6">
                <div className={`px-4 py-2 rounded-full text-sm font-medium
                  ${quote.confidence >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                    quote.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-orange-500/20 text-orange-400'}`}>
                  Affidabilità stima: {quote.confidence}%
                </div>
              </div>

              {/* Quote Details */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Dettaglio voci</h3>
                  <div className="space-y-4">
                    {quote.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start pb-4 border-b border-gray-700 last:border-0">
                        <div className="flex-1">
                          <div className="text-white font-medium">{item.description}</div>
                          {item.description1 && (
                            <div className="text-gray-400 text-sm">{item.description1}</div>
                          )}
                          {item.quantity > 1 && (
                            <div className="text-gray-500 text-sm">
                              {item.quantity} x €{item.price.toFixed(2)}
                              {item.discount > 0 && (
                                <span className="text-emerald-400 ml-2">(-{item.discount}%)</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">€{item.total.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-900/50 p-6 border-t border-gray-700">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotale</span>
                      <span>€{quote.subtotal.toFixed(2)}</span>
                    </div>
                    {quote.discount_percent > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Sconto quantità ({quote.discount_percent}%)</span>
                        <span>-€{(quote.subtotal * quote.discount_percent / (100 - quote.discount_percent)).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-400">
                      <span>Spedizione</span>
                      <span>€{quote.shipping.toFixed(2)}</span>
                    </div>
                    {quote.urgency_fee > 0 && (
                      <div className="flex justify-between text-orange-400">
                        <span>Sovrapprezzo Express</span>
                        <span>€{quote.urgency_fee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-white">Totale (IVA esclusa)</span>
                        <span className="text-3xl font-bold text-emerald-400">€{quote.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-sm mt-1">
                        <span>Totale IVA inclusa (22%)</span>
                        <span>€{(quote.total * 1.22).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Production Time */}
                <div className="p-4 bg-blue-500/10 border-t border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Tempi di produzione stimati</span>
                    </div>
                    <span className="text-white font-bold">{quote.estimated_days} giorni lavorativi</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setQuote(null);
                  }}
                  className="px-6 py-3 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-all"
                >
                  Nuovo Preventivo
                </button>
                <a
                  href="https://cuttalo.com/contatti/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all text-center"
                >
                  Richiedi Preventivo Definitivo
                </a>
              </div>

              <p className="text-center text-gray-500 text-sm">
                * Questa è una stima automatica. Per un preventivo definitivo contattaci.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
