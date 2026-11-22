import { generateSpeech } from 'ai';
import { metric } from '@vercel/functions';
import { z } from 'zod';

const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(700),
  mode: z.enum(['es-CO', 'en', 'fr', 'mixed-en', 'mixed-fr']).default('es-CO'),
  slow: z.boolean().optional().default(false),
});

type TtsMode = z.infer<typeof TtsRequestSchema>['mode'];
type SpeechLang = 'es-CO' | 'en-US' | 'fr-FR';

interface SpeechSegment {
  text: string;
  tl: SpeechLang;
}

let gatewayCooldownUntil = 0;

function buildVoiceInstructions(mode: TtsMode, slow: boolean): string {
  const basePersona =
    'Speak as a warm, encouraging, articulate young Colombian university language tutor (female voice). Sound completely human, conversational, and calm. Never read punctuation, hyphens, or symbols aloud.';
  const paceNote = slow
    ? 'Speak noticeably slowly and clearly (around 0.85x speed), articulating every syllable carefully.'
    : 'Speak at a natural, friendly, conversational pace.';

  switch (mode) {
    case 'es-CO':
      return `${basePersona} Speak in natural, educated, neutral Colombian Spanish (warm Bogotá accent). ${paceNote}`;
    case 'en':
      return `${basePersona} Speak in natural, clear standard North American English with crisp native pronunciation. ${paceNote}`;
    case 'fr':
      return `${basePersona} Speak in natural, clear standard French (neutral Parisian cadence, accurate liaisons and nasal vowels). ${paceNote}`;
    case 'mixed-en':
      return `${basePersona} Code-switch seamlessly in the exact same female voice: pronounce English phrases in natural North American English and Spanish phrases in warm Colombian Spanish. ${paceNote}`;
    case 'mixed-fr':
      return `${basePersona} Code-switch seamlessly in the exact same female voice: pronounce French phrases in natural standard French and Spanish phrases in warm Colombian Spanish. ${paceNote}`;
  }
}

function sanitizeSegmentText(rawText: string, mode: TtsMode): string {
  const targetTag = mode === 'fr' || mode === 'mixed-fr' ? 'fr' : 'en';

  return rawText
    .replace(/[✓✗✔✕👉🔥✨⭐]/gu, '')
    .replace(/[«»[\]()]/g, ' ')
    .replace(/_{2,}/g, ', ')
    .replace(/(?:^|\s)-ing\b/gi, ` {${targetTag}:I N G}`)
    .replace(/(?:^|\s)-ed\b/gi, ` {${targetTag}:E D}`)
    .replace(/(?:^|\s)-ies\b/gi, ' i e ese')
    .replace(/(?:^|\s)-es\b/gi, ' e ese')
    .replace(/(?:^|\s)-s\b/gi, ' ese')
    .replace(/(?:^|\s)-ER\b/g, ' {fr:E R}')
    .replace(/(?:^|\s)-ir\b/g, ' {fr:I R}')
    .replace(/(?:^|\s)-tion\b/g, ' {fr:tion}')
    .replace(/(?:^|\s)-sion\b/g, ' {fr:sion}')
    .replace(/(?:^|\s)-eau\b/g, ' {fr:eau}')
    .replace(/(?:^|\s)-age\b/g, ' {fr:age}')
    .replace(/(?:^|\s)-ment\b/g, ' {fr:ment}')
    .replace(/(?:^|\s)-ent\b/g, ' {fr:E N T}')
    .replace(/(?:^|\s)-ger\b/g, ' {fr:G E R}')
    .replace(/→/g, ', pasa a ')
    .replace(/\s*\/\s*/g, ' o ')
    .replace(/[—–·|]/g, ', ')
    .replace(/\.\.\./g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/^-+|-+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function autoSegmentBilingualText(sanitized: string, mode: TtsMode): string {
  if (mode === 'en' || mode === 'fr' || mode === 'es-CO') return sanitized;
  if (/\{(?:en|fr):/.test(sanitized)) return sanitized;

  const langTag = mode === 'mixed-fr' ? 'fr' : 'en';
  return sanitized.replace(/["“]([^"”]{2,120})["”]/g, (_, inner: string) => {
    const cleanInner = inner.trim();
    if (!cleanInner) return '';
    return `{${langTag}:${cleanInner}}`;
  });
}

function stripTagsAndQuotes(text: string): string {
  return text
    .replace(/\{(?:en|fr):([^}]+)\}/g, '$1')
    .replace(/["“”]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractSpeechSegments(rawText: string, mode: TtsMode): SpeechSegment[] {
  const sanitized = sanitizeSegmentText(rawText, mode);

  if (mode === 'es-CO' && !/\{(?:en|fr):/.test(sanitized)) {
    const clean = stripTagsAndQuotes(sanitized);
    return clean ? [{ text: clean, tl: 'es-CO' }] : [];
  }
  if (mode === 'en') {
    const clean = stripTagsAndQuotes(sanitized);
    return clean ? [{ text: clean, tl: 'en-US' }] : [];
  }
  if (mode === 'fr') {
    const clean = stripTagsAndQuotes(sanitized);
    return clean ? [{ text: clean, tl: 'fr-FR' }] : [];
  }

  const segmented = autoSegmentBilingualText(sanitized, mode);
  const segments: SpeechSegment[] = [];
  const regex = /\{(en|fr):([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(segmented)) !== null) {
    if (match.index > lastIndex) {
      const before = stripTagsAndQuotes(segmented.slice(lastIndex, match.index));
      if (before) segments.push({ text: before, tl: 'es-CO' });
    }
    const segLang: SpeechLang = match[1] === 'en' ? 'en-US' : 'fr-FR';
    const segText = stripTagsAndQuotes(match[2]);
    if (segText) segments.push({ text: segText, tl: segLang });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < segmented.length) {
    const rest = stripTagsAndQuotes(segmented.slice(lastIndex));
    if (rest) segments.push({ text: rest, tl: 'es-CO' });
  }

  if (segments.length > 0) {
    return segments;
  }
  const fallbackClean = stripTagsAndQuotes(sanitized);
  return fallbackClean ? [{ text: fallbackClean, tl: 'es-CO' }] : [];
}

function chunkSegmentText(text: string, maxLen = 160): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen + 1);
    let splitIdx = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf(', '),
      slice.lastIndexOf('; ')
    );

    if (splitIdx < Math.floor(maxLen * 0.4)) {
      splitIdx = slice.lastIndexOf(' ');
    }
    if (splitIdx <= 0) {
      splitIdx = maxLen;
    }

    chunks.push(remaining.slice(0, splitIdx + 1).trim());
    remaining = remaining.slice(splitIdx + 1).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

async function synthesizeNeuralSegments(
  segments: SpeechSegment[]
): Promise<Buffer> {
  const chunkRequests: { text: string; tl: SpeechLang }[] = [];

  for (const seg of segments) {
    const normalized =
      seg.tl === 'es-CO'
        ? seg.text.replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ])-([a-zA-ZáéíóúñÁÉÍÓÚÑ])/g, '$1 $2')
        : seg.text;

    for (const part of chunkSegmentText(normalized, 160)) {
      if (part) {
        chunkRequests.push({ text: part, tl: seg.tl });
      }
    }
  }

  if (chunkRequests.length === 0) {
    return Buffer.alloc(0);
  }

  const buffers = await Promise.all(
    chunkRequests.map(async (chunk) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
        chunk.tl
      )}&q=${encodeURIComponent(chunk.text)}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });

      if (!res.ok) {
        throw new Error(`Neural TTS upstream returned ${res.status}`);
      }

      const arrBuf = await res.arrayBuffer();
      return Buffer.from(arrBuf);
    })
  );

  return Buffer.concat(buffers);
}

export async function POST(req: Request) {
  const startedAt = performance.now();
  let modeForMetric: TtsMode = 'es-CO';

  try {
    const body = await req.json();
    const parsed = TtsRequestSchema.safeParse(body);

    if (!parsed.success) {
      metric('tts.request', 1, { outcome: 'invalid', mode: 'unknown' });
      return Response.json(
        { error: 'Solicitud de audio inválida.' },
        { status: 400 }
      );
    }

    const { text, mode, slow } = parsed.data;
    modeForMetric = mode;

    // Capa 1: Vercel AI Gateway (solo cuando esté activo con clave válida)
    if (process.env.AI_GATEWAY_API_KEY && Date.now() >= gatewayCooldownUntil) {
      try {
        const plainGatewayText = stripTagsAndQuotes(sanitizeSegmentText(text, mode));
        if (plainGatewayText) {
          const result = await generateSpeech({
            model: 'google/gemini-3.8-flash-lite-tts',
            text: plainGatewayText,
            voice: 'Kore',
            instructions: buildVoiceInstructions(mode, slow),
            outputFormat: 'wav',
          });

          const audioBytes = result.audio.uint8Array;
          if (audioBytes && audioBytes.byteLength > 0) {
            metric('tts.request', 1, { outcome: 'gateway_success', mode });
            metric('tts.duration_ms', Math.round(performance.now() - startedAt), {
              mode,
            });

            return new Response(Buffer.from(audioBytes), {
              status: 200,
              headers: {
                'Content-Type': 'audio/wav',
                'Cache-Control': 'public, max-age=86400, s-maxage=604800',
              },
            });
          }
        }
      } catch {
        gatewayCooldownUntil = Date.now() + 10 * 60 * 1000;
      }
    }

    // Capa 2: Síntesis neural bilingüe por segmentos (es-CO, en-US, fr-FR) con HTTP 200 garantizado
    const segments = extractSpeechSegments(text, mode);
    const mp3Buffer = await synthesizeNeuralSegments(segments);

    if (mp3Buffer.byteLength === 0) {
      metric('tts.request', 1, { outcome: 'empty_fallback', mode });
      metric('tts.duration_ms', Math.round(performance.now() - startedAt), {
        mode,
      });
      return Response.json({ fallback: true }, { status: 200 });
    }

    metric('tts.request', 1, { outcome: 'neural_success', mode });
    metric('tts.duration_ms', Math.round(performance.now() - startedAt), {
      mode,
    });

    return new Response(new Uint8Array(mp3Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (err) {
    console.warn(
      '[tts] fallback JSON response:',
      err instanceof Error ? err.message : 'error'
    );
    metric('tts.request', 1, { outcome: 'fallback_error', mode: modeForMetric });
    metric('tts.duration_ms', Math.round(performance.now() - startedAt), {
      mode: modeForMetric,
    });
    return Response.json({ fallback: true }, { status: 200 });
  }
}
