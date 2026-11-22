import { generateSpeech } from 'ai';
import { metric } from '@vercel/functions';
import { z } from 'zod';

const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(420),
  mode: z.enum(['es-CO', 'en', 'fr', 'mixed-en', 'mixed-fr']).default('es-CO'),
  slow: z.boolean().optional().default(false),
});

function buildVoiceInstructions(
  mode: 'es-CO' | 'en' | 'fr' | 'mixed-en' | 'mixed-fr',
  slow: boolean
): string {
  const basePersona =
    'Speak as a warm, encouraging, articulate young Colombian university language tutor (female voice). Sound completely human, conversational, and calm. Never read punctuation, hyphens, or symbols aloud.';
  const paceNote = slow
    ? 'Speak noticeably slowly and clearly (around 0.8x speed), articulating every syllable carefully.'
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

function sanitizeTtsText(rawText: string): string {
  return rawText
    .replace(/\{(?:en|fr):([^}]+)\}/g, '$1')
    .replace(/[—–·|«»[\]()✓✗]/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/_{2,}/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  const startedAt = performance.now();
  let modeForMetric = 'es-CO';

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
    const cleanText = sanitizeTtsText(text);

    const result = await generateSpeech({
      model: 'google/gemini-3.8-flash-lite-tts',
      text: cleanText,
      voice: 'Kore',
      instructions: buildVoiceInstructions(mode, slow),
      outputFormat: 'wav',
    });

    const audioBytes = result.audio.uint8Array;
    if (!audioBytes || audioBytes.byteLength === 0) {
      metric('tts.request', 1, { outcome: 'empty', mode });
      return Response.json({ fallback: true }, { status: 503 });
    }

    metric('tts.request', 1, { outcome: 'success', mode });
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
  } catch (err) {
    console.warn(
      '[tts] falling back to browser speech:',
      err instanceof Error ? err.message : 'error'
    );
    metric('tts.request', 1, { outcome: 'fallback_error', mode: modeForMetric });
    metric('tts.duration_ms', Math.round(performance.now() - startedAt), {
      mode: modeForMetric,
    });
    return Response.json({ fallback: true }, { status: 503 });
  }
}
