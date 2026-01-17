import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface ImageAnalysis {
  width: number;
  height: number;
  hasTransparency: boolean;
  dominantColors: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedIslands: number;
}

export interface ProcessingOptions {
  threshold: number; // 0-255, soglia per binarizzazione
  invert: boolean;
  blur: number; // 0-10
  minIslandSize: number; // mm
  bridgeWidth: number; // mm
  targetWidth: number; // mm output
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  threshold: 128,
  invert: false,
  blur: 0,
  minIslandSize: 2,
  bridgeWidth: 2,
  targetWidth: 200,
};

export async function analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysis> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const stats = await image.stats();

  // Verifica trasparenza
  const hasTransparency = metadata.channels === 4;

  // Stima complessità basata su entropia/varianza
  const avgVariance = stats.channels.reduce((sum, ch) => sum + (ch.stdev || 0), 0) / stats.channels.length;
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (avgVariance > 80) complexity = 'high';
  else if (avgVariance > 40) complexity = 'medium';

  // Colori dominanti (semplificato)
  const dominantColors: string[] = [];

  // Stima isole (approssimativa basata su complessità)
  let estimatedIslands = 5;
  if (complexity === 'medium') estimatedIslands = 15;
  if (complexity === 'high') estimatedIslands = 30;

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    hasTransparency,
    dominantColors,
    complexity,
    estimatedIslands,
  };
}

export async function preprocessImage(
  imageBuffer: Buffer,
  options: Partial<ProcessingOptions> = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let image = sharp(imageBuffer);

  // Converti in grayscale
  image = image.grayscale();

  // Applica blur se richiesto
  if (opts.blur > 0) {
    image = image.blur(opts.blur);
  }

  // Binarizza con threshold
  image = image.threshold(opts.threshold);

  // Inverti se richiesto
  if (opts.invert) {
    image = image.negate();
  }

  return await image.png().toBuffer();
}

export async function vectorizeImage(
  imageBuffer: Buffer,
  options: Partial<ProcessingOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Preprocessa immagine
  const processedBuffer = await preprocessImage(imageBuffer, opts);

  // Crea file temporanei
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `stencil_input_${Date.now()}.png`);
  const outputPath = path.join(tempDir, `stencil_output_${Date.now()}.svg`);

  try {
    // Salva immagine preprocessata
    await fs.writeFile(inputPath, processedBuffer);

    // Esegui potrace
    // -s = SVG output
    // -t = turdsize (rimuovi piccoli artefatti)
    // -a = alphamax (smoothing angoli)
    // -O = optimize
    await execAsync(
      `potrace "${inputPath}" -s -t 5 -a 1.0 -O 0.2 -o "${outputPath}"`
    );

    // Leggi SVG risultante
    const svgContent = await fs.readFile(outputPath, 'utf-8');

    return svgContent;
  } finally {
    // Cleanup
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

export interface Island {
  id: string;
  pathData: string;
  bounds: { x: number; y: number; width: number; height: number };
  area: number;
  isInner: boolean; // true se è un'isola interna (buco in un'altra forma)
}

export interface Bridge {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  width: number;
}

export function parseSvgPaths(svgContent: string): Island[] {
  const islands: Island[] = [];

  // Regex per estrarre path
  const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  let match;
  let index = 0;

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const pathData = match[1];
    const bounds = estimatePathBounds(pathData);
    const area = bounds.width * bounds.height;

    islands.push({
      id: `island_${index++}`,
      pathData,
      bounds,
      area,
      isInner: false, // Sarà calcolato dopo
    });
  }

  // Determina quali isole sono interne
  for (let i = 0; i < islands.length; i++) {
    for (let j = 0; j < islands.length; j++) {
      if (i !== j && isInsideBounds(islands[i].bounds, islands[j].bounds)) {
        islands[i].isInner = true;
        break;
      }
    }
  }

  return islands;
}

function estimatePathBounds(pathData: string): { x: number; y: number; width: number; height: number } {
  // Estrai tutti i numeri dal path
  const numbers = pathData.match(/-?\d+\.?\d*/g)?.map(Number) || [];

  if (numbers.length < 2) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function isInsideBounds(
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    inner.x > outer.x &&
    inner.y > outer.y &&
    inner.x + inner.width < outer.x + outer.width &&
    inner.y + inner.height < outer.y + outer.height
  );
}

export function generateBridges(
  islands: Island[],
  bridgeWidth: number = 2,
  svgWidth: number = 100,
  svgHeight: number = 100
): Bridge[] {
  const bridges: Bridge[] = [];
  const innerIslands = islands.filter(i => i.isInner);

  for (const island of innerIslands) {
    // Trova il punto migliore per connettere l'isola al bordo esterno
    const centerX = island.bounds.x + island.bounds.width / 2;
    const centerY = island.bounds.y + island.bounds.height / 2;

    // Genera 2-4 ponti per isola a seconda della dimensione
    const numBridges = island.area > 1000 ? 4 : island.area > 500 ? 3 : 2;

    const bridgePositions = [
      { x: island.bounds.x, y: centerY }, // sinistra
      { x: island.bounds.x + island.bounds.width, y: centerY }, // destra
      { x: centerX, y: island.bounds.y }, // sopra
      { x: centerX, y: island.bounds.y + island.bounds.height }, // sotto
    ];

    for (let i = 0; i < Math.min(numBridges, bridgePositions.length); i++) {
      const pos = bridgePositions[i];

      // Trova il punto di ancoraggio sul bordo esterno o isola contenitore
      let targetX = pos.x;
      let targetY = pos.y;

      // Estendi verso il bordo
      if (i === 0) targetX = Math.max(0, island.bounds.x - 20);
      if (i === 1) targetX = Math.min(svgWidth, island.bounds.x + island.bounds.width + 20);
      if (i === 2) targetY = Math.max(0, island.bounds.y - 20);
      if (i === 3) targetY = Math.min(svgHeight, island.bounds.y + island.bounds.height + 20);

      bridges.push({
        id: `bridge_${island.id}_${i}`,
        from: pos,
        to: { x: targetX, y: targetY },
        width: bridgeWidth,
      });
    }
  }

  return bridges;
}

export function generateStencilSvg(
  originalSvg: string,
  bridges: Bridge[],
  options: { showBridges: boolean; bridgeColor: string } = { showBridges: true, bridgeColor: '#ffffff' }
): string {
  // Estrai viewBox e dimensioni
  const viewBoxMatch = originalSvg.match(/viewBox="([^"]+)"/);
  const widthMatch = originalSvg.match(/width="([^"]+)"/);
  const heightMatch = originalSvg.match(/height="([^"]+)"/);

  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  const width = widthMatch ? widthMatch[1] : '100';
  const height = heightMatch ? heightMatch[1] : '100';

  // Estrai tutti i path
  const pathsMatch = originalSvg.match(/<path[^>]*>/g) || [];
  const paths = pathsMatch.join('\n');

  // Genera i rettangoli per i ponti
  const bridgePaths = bridges.map(bridge => {
    const dx = bridge.to.x - bridge.from.x;
    const dy = bridge.to.y - bridge.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return `<rect
      x="${bridge.from.x}"
      y="${bridge.from.y - bridge.width / 2}"
      width="${length}"
      height="${bridge.width}"
      transform="rotate(${angle} ${bridge.from.x} ${bridge.from.y})"
      fill="${options.bridgeColor}"
      class="bridge"
      data-bridge-id="${bridge.id}"
    />`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${viewBox}"
     width="${width}"
     height="${height}"
     class="stencil-output">
  <style>
    .stencil-path { fill: #000000; }
    .bridge { fill: ${options.bridgeColor}; }
  </style>
  <g class="stencil-paths">
    ${paths}
  </g>
  ${options.showBridges ? `<g class="bridges">${bridgePaths}</g>` : ''}
</svg>`;
}

export async function processImageToStencil(
  imageBuffer: Buffer,
  options: Partial<ProcessingOptions> = {}
): Promise<{
  svg: string;
  svgWithBridges: string;
  islands: Island[];
  bridges: Bridge[];
  analysis: ImageAnalysis;
}> {
  // Analizza immagine
  const analysis = await analyzeImage(imageBuffer);

  // Vettorizza
  const svg = await vectorizeImage(imageBuffer, options);

  // Estrai isole
  const islands = parseSvgPaths(svg);

  // Estrai dimensioni SVG
  const widthMatch = svg.match(/width="(\d+)/);
  const heightMatch = svg.match(/height="(\d+)/);
  const svgWidth = widthMatch ? parseInt(widthMatch[1]) : 100;
  const svgHeight = heightMatch ? parseInt(heightMatch[1]) : 100;

  // Genera ponti
  const bridges = generateBridges(
    islands,
    options.bridgeWidth || DEFAULT_OPTIONS.bridgeWidth,
    svgWidth,
    svgHeight
  );

  // Genera SVG finale con ponti
  const svgWithBridges = generateStencilSvg(svg, bridges);

  return {
    svg,
    svgWithBridges,
    islands,
    bridges,
    analysis,
  };
}
