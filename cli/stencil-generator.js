#!/usr/bin/env node

/**
 * Stencil Generator CLI
 * Genera stencil con ponti automatici da immagini
 *
 * Uso:
 *   node stencil-generator.js immagine.png
 *   node stencil-generator.js immagine.jpg --output stencil.svg --threshold 150 --bridges 3
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const sharp = require('sharp');

// Colori console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logError(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

// Parse argomenti
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: null,
    threshold: 128,
    blur: 0,
    bridgeWidth: 2,
    invert: false,
    noAi: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--threshold' || arg === '-t') {
      options.threshold = parseInt(args[++i]) || 128;
    } else if (arg === '--blur' || arg === '-b') {
      options.blur = parseInt(args[++i]) || 0;
    } else if (arg === '--bridge-width' || arg === '-w') {
      options.bridgeWidth = parseFloat(args[++i]) || 2;
    } else if (arg === '--invert' || arg === '-i') {
      options.invert = true;
    } else if (arg === '--no-ai') {
      options.noAi = true;
    } else if (!arg.startsWith('-') && !options.input) {
      options.input = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.bright}Stencil Generator CLI${colors.reset}
Genera stencil con ponti automatici da immagini

${colors.cyan}Uso:${colors.reset}
  node stencil-generator.js <immagine> [opzioni]

${colors.cyan}Opzioni:${colors.reset}
  -o, --output <file>      File SVG output (default: <input>_stencil.svg)
  -t, --threshold <0-255>  Soglia binarizzazione (default: 128)
  -b, --blur <0-10>        Sfocatura pre-processing (default: 0)
  -w, --bridge-width <mm>  Larghezza ponti in mm (default: 2)
  -i, --invert             Inverti bianco/nero
  --no-ai                  Salta analisi AI (solo processing locale)
  -h, --help               Mostra questo messaggio

${colors.cyan}Esempi:${colors.reset}
  node stencil-generator.js logo.png
  node stencil-generator.js foto.jpg -t 100 -b 2 -o mio_stencil.svg
  node stencil-generator.js immagine.png --invert --bridge-width 3

${colors.cyan}Formati supportati:${colors.reset}
  PNG, JPG, JPEG, WebP, GIF
`);
}

// Analizza immagine con Claude CLI
async function analyzeWithClaude(imagePath) {
  logStep('AI', 'Analisi immagine con Claude Vision...');

  const prompt = `Analizza questa immagine per creare uno STENCIL per taglio laser.

Identifica:
1. Tipo di soggetto (logo, volto, testo, illustrazione, foto, pattern)
2. Aree che diventerebbero "isole" (parti isolate che cadrebbero senza ponti)
3. Dove posizionare i ponti per mantenere le isole connesse
4. Dettagli troppo piccoli che potrebbero essere problematici (<2mm)
5. Difficoltà di stencilizzazione (1-5)
6. Tempo stimato di preparazione file

Rispondi in modo strutturato con:
- TIPO: ...
- ISOLE RILEVATE: lista delle aree
- PONTI SUGGERITI: dove e perché
- PROBLEMI: dettagli piccoli o zone critiche
- DIFFICOLTA: X/5
- TEMPO PREP: X minuti
- SUGGERIMENTI: come migliorare`;

  return new Promise((resolve, reject) => {
    // Usa Claude CLI per analizzare l'immagine
    const claude = spawn('claude', [
      '-p', prompt,
      '--image', imagePath,
      '--no-stream'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('close', (code) => {
      if (code === 0 && output) {
        resolve(output.trim());
      } else {
        // Fallback se Claude CLI non disponibile
        resolve(null);
      }
    });

    claude.on('error', () => {
      resolve(null);
    });

    // Timeout 60 secondi
    setTimeout(() => {
      claude.kill();
      resolve(null);
    }, 60000);
  });
}

// Preprocessa immagine e converte in PBM per Potrace
async function preprocessImage(inputPath, options) {
  logStep('PREP', `Preprocessing immagine (threshold: ${options.threshold}, blur: ${options.blur})...`);

  const tempPng = `/tmp/stencil_prep_${Date.now()}.png`;
  const tempPbm = `/tmp/stencil_prep_${Date.now()}.pbm`;

  // Usa sharp per preprocessing
  let pipeline = sharp(inputPath).grayscale();

  if (options.blur > 0) {
    pipeline = pipeline.blur(options.blur);
  }

  pipeline = pipeline.threshold(options.threshold);

  if (options.invert) {
    pipeline = pipeline.negate();
  }

  await pipeline.png().toFile(tempPng);

  // Converti in PBM con ImageMagick (richiesto da Potrace)
  try {
    execSync(`convert "${tempPng}" "${tempPbm}"`, { stdio: 'pipe' });
    fs.unlinkSync(tempPng);
    return tempPbm;
  } catch (err) {
    // Fallback: prova direttamente
    return tempPng;
  }
}

// Vettorizza con Potrace
function vectorize(inputPath) {
  logStep('VEC', 'Vettorizzazione con Potrace...');

  const outputPath = `/tmp/stencil_vec_${Date.now()}.svg`;

  try {
    execSync(`potrace "${inputPath}" -s -t 5 -a 1.0 -O 0.2 -o "${outputPath}"`, {
      stdio: 'pipe'
    });

    return fs.readFileSync(outputPath, 'utf-8');
  } catch (err) {
    throw new Error('Potrace non installato. Installa con: sudo apt install potrace');
  }
}

// Analizza SVG per trovare isole (inclusi subpath con coordinate relative)
function findIslands(svgContent) {
  const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  const islands = [];
  let match;
  let pathIndex = 0;

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const pathData = match[1];

    // Dividi path in subpath (ogni M o m inizia un nuovo subpath, seguito da z o Z)
    const subpathRegex = /[Mm][^Mm]+?[Zz]/g;
    const subpaths = pathData.match(subpathRegex) || [pathData];

    // Traccia posizione corrente per coordinate relative
    let currentX = 0, currentY = 0;

    for (let i = 0; i < subpaths.length; i++) {
      const subpath = subpaths[i];

      // Calcola bounds considerando se è relativo (m) o assoluto (M)
      const isRelative = subpath.startsWith('m');
      let bounds;

      if (isRelative && i > 0) {
        // Coordinate relative: offset dalla posizione precedente
        const relativeBounds = estimateBounds(subpath);
        bounds = {
          x: currentX + relativeBounds.x,
          y: currentY + relativeBounds.y,
          width: relativeBounds.width,
          height: relativeBounds.height,
        };
      } else {
        bounds = estimateBounds(subpath);
        currentX = bounds.x;
        currentY = bounds.y;
      }

      if (bounds.width > 0 && bounds.height > 0) {
        islands.push({
          id: `${pathIndex}_${i}`,
          pathData: subpath,
          bounds,
          area: bounds.width * bounds.height,
          isSubpath: subpaths.length > 1,
          subpathIndex: i,
          isRelative,
        });
      }
    }
    pathIndex++;
  }

  // Trova isole interne
  // In Potrace, il secondo subpath di un path è tipicamente un buco (isola)
  for (let i = 0; i < islands.length; i++) {
    if (islands[i].isSubpath && islands[i].subpathIndex > 0) {
      // Subpath successivi sono probabilmente isole interne
      islands[i].isInner = true;
      islands[i].parent = islands.findIndex(
        isl => isl.id.startsWith(islands[i].id.split('_')[0]) && isl.subpathIndex === 0
      );
    }
  }

  return islands;
}

function estimateBounds(pathData) {
  const numbers = pathData.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = numbers[i], y = numbers[i + 1];
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function isInside(inner, outer) {
  return (
    inner.x > outer.x &&
    inner.y > outer.y &&
    inner.x + inner.width < outer.x + outer.width &&
    inner.y + inner.height < outer.y + outer.height
  );
}

// Genera ponti
function generateBridges(islands, bridgeWidth, svgWidth, svgHeight) {
  logStep('BRIDGE', 'Generazione ponti automatici...');

  const bridges = [];
  const innerIslands = islands.filter(i => i.isInner);

  for (const island of innerIslands) {
    const cx = island.bounds.x + island.bounds.width / 2;
    const cy = island.bounds.y + island.bounds.height / 2;

    // Numero ponti basato su dimensione
    const numBridges = island.area > 1000 ? 4 : island.area > 500 ? 3 : 2;

    const positions = [
      { fx: island.bounds.x, fy: cy, tx: Math.max(0, island.bounds.x - 30), ty: cy },
      { fx: island.bounds.x + island.bounds.width, fy: cy, tx: Math.min(svgWidth, island.bounds.x + island.bounds.width + 30), ty: cy },
      { fx: cx, fy: island.bounds.y, tx: cx, ty: Math.max(0, island.bounds.y - 30) },
      { fx: cx, fy: island.bounds.y + island.bounds.height, tx: cx, ty: Math.min(svgHeight, island.bounds.y + island.bounds.height + 30) },
    ];

    for (let i = 0; i < Math.min(numBridges, positions.length); i++) {
      const p = positions[i];
      bridges.push({
        id: `bridge_${island.id}_${i}`,
        from: { x: p.fx, y: p.fy },
        to: { x: p.tx, y: p.ty },
        width: bridgeWidth * 10, // Converti mm a unità SVG approssimative
      });
    }
  }

  return bridges;
}

// Genera SVG finale con ponti
function generateFinalSvg(originalSvg, bridges) {
  const viewBoxMatch = originalSvg.match(/viewBox="([^"]+)"/);
  const widthMatch = originalSvg.match(/width="([^"]+)"/);
  const heightMatch = originalSvg.match(/height="([^"]+)"/);

  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  const width = widthMatch ? widthMatch[1] : '100';
  const height = heightMatch ? heightMatch[1] : '100';

  const pathsMatch = originalSvg.match(/<path[^>]*>/g) || [];
  const paths = pathsMatch.join('\n    ');

  const bridgePaths = bridges.map(b => {
    const dx = b.to.x - b.from.x;
    const dy = b.to.y - b.from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    return `<rect x="${b.from.x}" y="${b.from.y - b.width / 2}" width="${len}" height="${b.width}" transform="rotate(${angle} ${b.from.x} ${b.from.y})" fill="#FFFFFF" stroke="none" class="bridge"/>`;
  }).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <style>
    path { fill: #000000; }
    .bridge { fill: #FFFFFF; }
  </style>
  <g id="stencil">
    ${paths}
  </g>
  <g id="bridges">
    ${bridgePaths}
  </g>
</svg>`;
}

// Main
async function main() {
  const options = parseArgs();

  if (options.help || !options.input) {
    showHelp();
    process.exit(options.help ? 0 : 1);
  }

  // Verifica file input
  if (!fs.existsSync(options.input)) {
    logError(`File non trovato: ${options.input}`);
    process.exit(1);
  }

  const inputPath = path.resolve(options.input);
  const outputPath = options.output || inputPath.replace(/\.[^.]+$/, '_stencil.svg');

  console.log();
  log('═══════════════════════════════════════════════', 'cyan');
  log('         STENCIL GENERATOR CLI', 'bright');
  log('═══════════════════════════════════════════════', 'cyan');
  console.log();

  log(`Input:  ${inputPath}`, 'yellow');
  log(`Output: ${outputPath}`, 'yellow');
  console.log();

  try {
    // 1. Analisi AI (opzionale)
    let aiAnalysis = null;
    if (!options.noAi) {
      aiAnalysis = await analyzeWithClaude(inputPath);
      if (aiAnalysis) {
        logSuccess('Analisi AI completata');
        console.log();
        log('─── ANALISI AI ───', 'magenta');
        console.log(aiAnalysis);
        console.log();
      } else {
        log('⚠ Claude CLI non disponibile, procedo senza analisi AI', 'yellow');
      }
    }

    // 2. Preprocessing
    const prepPath = await preprocessImage(inputPath, options);
    logSuccess('Preprocessing completato');

    // 3. Vettorizzazione
    const svg = vectorize(prepPath);
    logSuccess('Vettorizzazione completata');

    // 4. Trova isole
    const islands = findIslands(svg);
    const innerIslands = islands.filter(i => i.isInner);
    logSuccess(`Trovate ${islands.length} forme, ${innerIslands.length} isole interne`);

    // 5. Genera ponti
    const widthMatch = svg.match(/width="(\d+)/);
    const heightMatch = svg.match(/height="(\d+)/);
    const svgWidth = widthMatch ? parseInt(widthMatch[1]) : 500;
    const svgHeight = heightMatch ? parseInt(heightMatch[1]) : 500;

    const bridges = generateBridges(islands, options.bridgeWidth, svgWidth, svgHeight);
    logSuccess(`Generati ${bridges.length} ponti`);

    // 6. Genera SVG finale
    const finalSvg = generateFinalSvg(svg, bridges);
    fs.writeFileSync(outputPath, finalSvg);
    logSuccess(`SVG salvato: ${outputPath}`);

    // Cleanup
    fs.unlinkSync(prepPath);

    console.log();
    log('═══════════════════════════════════════════════', 'green');
    log('         STENCIL GENERATO CON SUCCESSO!', 'bright');
    log('═══════════════════════════════════════════════', 'green');
    console.log();

    // Riepilogo
    log('Riepilogo:', 'cyan');
    console.log(`  • Forme totali: ${islands.length}`);
    console.log(`  • Isole interne: ${innerIslands.length}`);
    console.log(`  • Ponti generati: ${bridges.length}`);
    console.log(`  • File output: ${outputPath}`);
    console.log();

  } catch (err) {
    logError(err.message);
    process.exit(1);
  }
}

main();
